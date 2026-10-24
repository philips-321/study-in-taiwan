import fs from 'node:fs/promises';
import path from 'node:path';

const CURRENT_DIR = path.resolve('cinema/data/showtimes');
const PREVIOUS_DIR = path.resolve(process.env.CINEMA_PREVIOUS_SHOWTIMES_DIR || '/tmp/cinema-showtimes-prev');
const MANIFEST = path.resolve('cinema/data/manifest.json');
const forcedFailures = new Set(
  String(process.env.CINEMA_FORCE_FAILED_SOURCES || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);
const forcedError = process.env.CINEMA_FORCED_SOURCE_ERROR || 'Source probe failed before collector run';
const now = new Date();
const nowIso = now.toISOString();
const nextProbeIso = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
const minimumFallbackTime = now.getTime() - 2 * 60 * 60 * 1000;

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function removeJsonFiles(dir) {
  try {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await removeJsonFiles(target);
      else if (entry.name.endsWith('.json')) await fs.unlink(target);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function rowKey(row) {
  return [row.cinema_id, row.movie_title, row.start_time, row.hall || '', row.format || ''].join('|');
}

function fallbackEligible(row) {
  const timestamp = Date.parse(row?.start_time || '');
  return Number.isFinite(timestamp) && timestamp >= minimumFallbackTime;
}

const names = (await fs.readdir(CURRENT_DIR)).filter(name => name.endsWith('.json')).sort();
if (!names.length) throw new Error('No current cinema showtime files found after refresh');

const currentByCity = new Map();
const previousByCity = new Map();
for (const name of names) {
  const city = name.replace(/\.json$/, '');
  const current = await readJson(path.join(CURRENT_DIR, name));
  if (!current || !Array.isArray(current.showtimes)) throw new Error(`Invalid current showtime file: ${name}`);
  currentByCity.set(city, current);
  const previous = await readJson(path.join(PREVIOUS_DIR, name));
  if (previous && Array.isArray(previous.showtimes)) previousByCity.set(city, previous);
}

const firstCurrent = currentByCity.values().next().value;
const firstPrevious = previousByCity.values().next().value || null;
const currentStatus = structuredClone(firstCurrent?.sources || {});
const previousStatus = firstPrevious?.sources || {};

for (const source of forcedFailures) {
  currentStatus[source] = {
    ...(currentStatus[source] || {}),
    ok: false,
    error: forcedError
  };
}

const failedSources = new Set(
  Object.entries(currentStatus)
    .filter(([source, status]) => forcedFailures.has(source) || status?.ok === false)
    .map(([source]) => source)
);

const fallbackCounts = Object.fromEntries([...failedSources].map(source => [source, 0]));

for (const [city, current] of currentByCity) {
  const previous = previousByCity.get(city);
  if (!previous) continue;

  const seen = new Set(current.showtimes.map(rowKey));
  for (const row of previous.showtimes) {
    if (!failedSources.has(row?.source) || !fallbackEligible(row)) continue;
    const key = rowKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    fallbackCounts[row.source] = (fallbackCounts[row.source] || 0) + 1;
    current.showtimes.push({
      ...row,
      source_role: row.source_role
        ? `${row.source_role};last-known-good`
        : 'last-known-good',
      freshness: 'last-known-good'
    });
  }

  current.showtimes.sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
}

const normalizedStatus = {};
for (const [source, status] of Object.entries(currentStatus)) {
  const old = previousStatus[source] || {};
  if (failedSources.has(source)) {
    const freshCount = Number.isInteger(status?.showtimes) ? status.showtimes : 0;
    const fallbackCount = fallbackCounts[source] || 0;
    normalizedStatus[source] = {
      ...status,
      ok: false,
      health: 'degraded',
      circuit_state: 'open',
      failure_count: Number(old.failure_count || 0) + 1,
      fresh_showtimes: freshCount,
      fallback_showtimes: fallbackCount,
      showtimes: freshCount + fallbackCount,
      fallback: fallbackCount > 0 ? 'last-known-good' : 'unavailable',
      last_success_at: old.last_success_at || (old.ok ? firstPrevious?.generated_at || null : null),
      last_failure_at: nowIso,
      next_probe_at: nextProbeIso,
      error: forcedFailures.has(source) ? forcedError : status?.error || old.error || 'source unavailable'
    };
  } else {
    normalizedStatus[source] = {
      ...status,
      health: 'healthy',
      circuit_state: 'closed',
      failure_count: 0,
      fresh_showtimes: Number.isInteger(status?.showtimes) ? status.showtimes : 0,
      fallback_showtimes: 0,
      fallback: null,
      last_success_at: nowIso,
      last_failure_at: old.last_failure_at || null,
      next_probe_at: null
    };
  }
}

for (const [city, payload] of currentByCity) {
  payload.sources = normalizedStatus;
  payload.resilience = {
    policy: 'failed collectors preserve eligible future last-known-good rows while independent collectors continue',
    restored_sources: [...failedSources],
    restored_at: nowIso
  };
  await writeJson(path.join(CURRENT_DIR, `${city}.json`), payload);
}

const datePayloadRoot = path.join(CURRENT_DIR, 'by-date');
await removeJsonFiles(datePayloadRoot);
const showtimesIndex = {}, coverage = { showtime_rows: 0, explicit_subtitle_rows: 0 };
for (const [city, payload] of currentByCity) {
  const byDate = new Map();
  for (const show of payload.showtimes) {
    coverage.showtime_rows++;
    if (Array.isArray(show.subtitles) && show.subtitles.length) coverage.explicit_subtitle_rows++;
    const date = String(show.start_time || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(show);
  }
  for (const [date, rows] of byDate) {
    const entry = showtimesIndex[date] ||= { total: 0, cities: {} };
    entry.total += rows.length;
    entry.cities[city] = rows.length;
    await writeJson(path.join(datePayloadRoot, date, `${city}.json`), {
      version: 1, city, date, showtimes: rows
    });
  }
}
for (const entry of Object.values(showtimesIndex)) {
  entry.cities = Object.fromEntries(Object.entries(entry.cities).sort(([a], [b]) => a.localeCompare(b)));
}

const manifest = await readJson(MANIFEST);
if (!manifest) throw new Error('Cinema manifest missing after refresh');
manifest.sources ||= {};
manifest.sources.showtimes = normalizedStatus;
manifest.showtimes_index = showtimesIndex;
manifest.coverage = coverage;
manifest.resilience_policy = {
  retry_policy: 'one short workflow probe for the MOC source; source adapters remain independently isolated',
  circuit_breaker: 'failed source is marked degraded/open; no repeated hammering in the same run',
  fallback_policy: 'eligible future last-known-good rows are retained and explicitly labeled; fresh rows win deduplication',
  stale_status_policy: 'fallback rows are restored after cinema operational status is computed, so stale fallback does not mark a cinema active'
};
for (const [city, payload] of currentByCity) {
  if (manifest.cities?.[city]) manifest.cities[city].showtimes = payload.showtimes.length;
}
await writeJson(MANIFEST, manifest);

console.log(JSON.stringify({ failed_sources: [...failedSources], fallback_counts: fallbackCounts, source_status: normalizedStatus }, null, 2));
