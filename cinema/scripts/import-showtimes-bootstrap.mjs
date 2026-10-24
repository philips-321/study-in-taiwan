import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const input = process.argv[2];
if (!input) throw new Error('Usage: node cinema/scripts/import-showtimes-bootstrap.mjs <bootstrap.json>');
const ROOT = path.resolve('cinema/data');
const SHOW_DIR = path.join(ROOT, 'showtimes');
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const write = async (file, data) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
};
const stableId = (...parts) => crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);
const normalize = value => String(value || '').replace(/臺/g, '台').replace(/電影城|電影院|電影館|影城|戲院|劇院/g, '').replace(/[\s　・·()（）\-_/]/g, '').toLowerCase();
const audioCodes = [
  ['英語', 'en'], ['日語', 'ja'], ['韓語', 'ko'], ['國語', 'zh'], ['普通話', 'zh'],
  ['粵語', 'yue'], ['越語', 'vi'], ['泰語', 'th'], ['菲語', 'fil'], ['法語', 'fr'],
  ['德語', 'de'], ['西語', 'es'], ['印尼語', 'id']
];
const localDateTime = value => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Date(date.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00');
};
const rowKey = row => [row.cinema_id, row.movie_title, row.start_time, row.hall || '', row.format || ''].join('|');
const data = (await read(path.resolve(input))).payload;
if (!data?.corporations || !data?.programs || !data?.eventsForCorporations) throw new Error('Unsupported ShowTimes bootstrap schema');

const cinemaFiles = (await fs.readdir(path.join(ROOT, 'cinemas'))).filter(name => name.endsWith('.json'));
const cinemas = [];
for (const file of cinemaFiles) cinemas.push(...(await read(path.join(ROOT, 'cinemas', file))).cinemas);
const cityById = new Map(cinemas.map(cinema => [cinema.id, cinema.city]));
const corporationMatches = new Map();
for (const corporation of data.corporations) {
  const name = normalize(corporation.name);
  const matches = cinemas.filter(cinema => {
    const candidate = normalize(cinema.name_zh);
    return candidate === name || (candidate.length >= 4 && (candidate.includes(name) || name.includes(candidate)));
  });
  if (matches.length !== 1) throw new Error(`Expected one cinema match for ${corporation.name}; got ${matches.map(c => `${c.city}/${c.name_zh}`).join(', ') || 'none'}`);
  corporationMatches.set(corporation.id, matches[0]);
}

const programs = new Map(data.programs.map(program => [program.id, program]));
const rowsByCity = new Map();
let skipped = 0;
for (const [corporationId, group] of Object.entries(data.eventsForCorporations)) {
  const cinema = corporationMatches.get(Number(corporationId));
  if (!cinema) continue;
  const venues = new Map((group.venues || []).map(venue => [venue.id, venue.room]));
  for (const event of group.events || []) {
    if (event.status !== 'active') continue;
    const program = programs.get(event.programId);
    const start = localDateTime(event.startedAt);
    if (!program || !start) { skipped++; continue; }
    const rawFormat = event.meta?.format || null;
    const audio = audioCodes.find(([label]) => rawFormat?.includes(label))?.[1] || null;
    const row = {
      id: stableId('showtimes-bootstrap', event.id),
      cinema_id: cinema.id,
      cinema_name: cinema.name_zh,
      movie_title: program.name,
      movie_title_en: program.nameAlternative || null,
      rating: program.rating || null,
      start_time: start,
      end_time: null,
      hall: venues.get(event.venueId) || null,
      format: rawFormat,
      audio_language: audio,
      subtitles: null,
      duration_minutes: Number.isFinite(program.duration) ? Math.round(program.duration / 60) : null,
      price: null,
      on_sales: null,
      source_event_id: String(event.id),
      source_url: `https://www.showtimes.com.tw/cinemas/${corporationId}/`,
      source_role: 'user-provided official bootstrap snapshot retrieved 2026-10-24',
      freshness: 'last-known-good',
      source: 'showtimes-official-api'
    };
    const cityRows = rowsByCity.get(cinema.city) || [];
    cityRows.push(row);
    rowsByCity.set(cinema.city, cityRows);
  }
}

const cityFiles = (await fs.readdir(SHOW_DIR)).filter(name => name.endsWith('.json'));
const manifestFile = path.join(ROOT, 'manifest.json');
const manifest = await read(manifestFile);
const completeRowsByCity = new Map();
for (const file of cityFiles) {
  const city = file.replace(/\.json$/, '');
  const payload = await read(path.join(SHOW_DIR, file));
  payload.showtimes = payload.showtimes.filter(row => row.source !== 'showtimes-official-api');
  const incoming = rowsByCity.get(city) || [];
  payload.showtimes = payload.showtimes.filter(row => row.source !== 'showtimes-official-api');
  const seen = new Set(payload.showtimes.map(rowKey));
  for (const row of incoming) {
    const key = rowKey(row);
    if (!seen.has(key)) { payload.showtimes.push(row); seen.add(key); }
  }
  const completeRows = payload.showtimes;
  completeRowsByCity.set(city, completeRows);
  const importedKeys = new Set(incoming.map(rowKey));
  payload.showtimes = payload.showtimes.filter(row => !importedKeys.has(rowKey(row)) || row.source !== 'showtimes-official-api');
  const uniqueIncoming = importedKeys.size;
  payload.showtimes.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  payload.generated_at = '2026-10-24T00:00:00.000Z';
  payload.sources ||= {};
  payload.sources['showtimes-official-api'] = {
    ok: false,
    showtimes: uniqueIncoming,
    fresh_showtimes: 0,
    fallback_showtimes: uniqueIncoming,
    fallback: uniqueIncoming ? 'imported-bootstrap-snapshot' : 'unavailable',
    health: 'degraded',
    error: 'Official ShowTimes API returned 403 to scheduled collector; rows loaded from supplied official bootstrap snapshot'
  };
  if (manifest.cities?.[city]) manifest.cities[city].showtimes = completeRows.length;
  await write(path.join(SHOW_DIR, file), payload);
}

const importedUniqueRows = [...rowsByCity.values()].reduce((sum, rows) => sum + new Set(rows.map(rowKey)).size, 0);
const oldIndex = new Map();
let explicitSubtitleRows = 0;
for (const city of cityFiles.map(name => name.replace(/\.json$/, ''))) {
  const byDate = new Map();
  for (const show of completeRowsByCity.get(city) || []) {
    if (Array.isArray(show.subtitles) && show.subtitles.length) explicitSubtitleRows++;
    const date = String(show.start_time || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    (byDate.get(date) || byDate.set(date, []).get(date)).push(show);
  }
  for (const [date, shows] of byDate) {
    const entry = oldIndex.get(date) || { total: 0, cities: {} };
    entry.total += shows.length;
    entry.cities[city] = shows.length;
    oldIndex.set(date, entry);
    await write(path.join(SHOW_DIR, 'by-date', date, `${city}.json`), { version: 1, city, date, showtimes: shows });
  }
}
for (const dateDir of await fs.readdir(path.join(SHOW_DIR, 'by-date'))) {
  const dir = path.join(SHOW_DIR, 'by-date', dateDir);
  if (!(await fs.stat(dir)).isDirectory()) continue;
  for (const file of await fs.readdir(dir)) {
    const city = file.replace(/\.json$/, '');
    if (!oldIndex.get(dateDir)?.cities[city]) await fs.rm(path.join(dir, file));
  }
}
for (const entry of oldIndex.values()) entry.cities = Object.fromEntries(Object.entries(entry.cities).sort(([a], [b]) => a.localeCompare(b)));
manifest.showtimes_index = Object.fromEntries([...oldIndex.entries()].sort(([a], [b]) => a.localeCompare(b)));
manifest.coverage = {
  showtime_rows: [...oldIndex.values()].reduce((sum, item) => sum + item.total, 0),
  explicit_subtitle_rows: explicitSubtitleRows
};
manifest.sources ||= {};
manifest.sources.showtimes ||= {};
manifest.sources.showtimes['showtimes-official-api'] = {
  ...manifest.sources.showtimes['showtimes-official-api'],
  ok: false,
  showtimes: importedUniqueRows,
  fresh_showtimes: 0,
  fallback_showtimes: importedUniqueRows,
  fallback: 'imported-bootstrap-snapshot',
  error: 'Official ShowTimes API returned 403 to scheduled collector; rows loaded from supplied official bootstrap snapshot'
};
manifest.snapshot_import = {
  source: 'ShowTimes official bootstrap supplied by user',
  retrieved_at: '2026-10-24',
  imported_active_events: importedUniqueRows,
  note: 'Snapshot rows are labeled last-known-good; future API refreshes replace them when fresh records arrive.'
};
await write(manifestFile, manifest);
console.log(JSON.stringify({ branches: corporationMatches.size, imported_active_events: importedUniqueRows, skipped, cities: Object.fromEntries([...rowsByCity].map(([city, rows]) => [city, new Set(rows.map(rowKey)).size])) }, null, 2));
