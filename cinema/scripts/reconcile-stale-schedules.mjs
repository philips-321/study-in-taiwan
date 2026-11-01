import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('cinema/data');
const canonicalRoot = path.join(root, 'canonical');
const incomingRoot = path.resolve(process.argv.find(arg => arg.startsWith('--incoming-root='))?.slice('--incoming-root='.length) || '/tmp/cinema-new-canonical/canonical');
const stateFile = path.join(canonicalRoot, 'reconciliation-state.json');
const asOf = process.argv.find(arg => arg.startsWith('--as-of='))?.slice('--as-of='.length) || taiwanDate(new Date());
const windowDays = Number(process.argv.find(arg => arg.startsWith('--window-days='))?.slice('--window-days='.length) || 30);
const windowEnd = addDays(asOf, windowDays);
const now = new Date().toISOString();
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readRows = file => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const datePattern = /(?:retrieved|reviewed|snapshot)\s*(?:on\s*)?(\d{4}-\d{2}-\d{2})/i;
const sourceIsFallback = (row, status, held) => held || status?.ok === false || status?.health === 'degraded' || status?.manual_snapshot === true
  || /last-known-good/i.test(String(row.source_role || ''));
const sourceTimestamp = (row, status, cityPayload, fallback) => {
  const explicit = row.source_observed_at || row.observed_at || (fallback ? status?.last_success_at : null)
    || status?.retrieved_at || (!fallback ? cityPayload?.generated_at : null);
  if (explicit && Number.isFinite(Date.parse(explicit))) return new Date(explicit).toISOString();
  if (fallback) {
    const date = String(row.source_role || '').match(datePattern)?.[1];
    if (date) return `${date}T00:00:00.000Z`;
  }
  return null;
};

function taiwanDate(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function addDays(date, amount) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

const cityState = fs.existsSync('.github/cinema-city-update-health.json')
  ? readJson('.github/cinema-city-update-health.json') : { cities: {} };
const cityPayloads = new Map();
const sourceStatuses = new Map();
for (const file of fs.readdirSync(path.join(root, 'showtimes')).filter(name => name.endsWith('.json'))) {
  const city = file.slice(0, -5);
  const payload = readJson(path.join(root, 'showtimes', file));
  cityPayloads.set(city, payload);
  for (const [source, status] of Object.entries(payload.sources || {})) sourceStatuses.set(`${city}|${source}`, status);
}
const heldCities = new Set(Object.entries(cityState.cities || {})
  .filter(([, value]) => value.manual_browser_research_required).map(([city]) => city));

const existing = new Map();
for (const filename of fs.readdirSync(canonicalRoot).filter(name => /^\d{4}-\d{2}\.jsonl$/.test(name))) {
  for (const row of readRows(path.join(canonicalRoot, filename))) existing.set(row.screening_id, row);
}
const incoming = new Map();
for (const filename of fs.readdirSync(incomingRoot).filter(name => /^\d{4}-\d{2}\.jsonl$/.test(name))) {
  for (const row of readRows(path.join(incomingRoot, filename))) if (row.status === 'canonical') incoming.set(row.screening_id, row);
}

const currentFreshIds = new Set();
const freshScopes = new Set();
let freshRows = 0, fallbackRows = 0;
for (const row of incoming.values()) {
  const city = row.city || 'unknown';
  const payload = cityPayloads.get(city);
  const status = sourceStatuses.get(`${city}|${row.source_id}`);
  const held = heldCities.has(city);
  const fallback = sourceIsFallback(row, status, held);
  const observation = sourceTimestamp(row, status, payload, fallback);
  const prior = existing.get(row.screening_id);
  row.source_freshness = fallback ? 'last-known-good' : (status?.ok === true ? 'fresh' : 'unknown');
  row.source_observed_at = observation || prior?.source_observed_at || null;
  if (fallback) fallbackRows++;
  if (status?.ok === true && status?.health !== 'degraded' && !status.manual_snapshot && !held && !fallback) {
    currentFreshIds.add(row.screening_id);
    freshScopes.add([row.source_id, row.cinema_id, row.business_date].join('|'));
    freshRows++;
  }
  if (prior) {
    const restored = currentFreshIds.has(row.screening_id);
    const merged = restored ? { ...prior, ...row, status: 'canonical' } : { ...prior, source_freshness: row.source_freshness, source_observed_at: row.source_observed_at };
    if (restored) {
      delete merged.stale_since;
      delete merged.stale_reason;
      delete merged.schedule_check;
    }
    existing.set(row.screening_id, merged);
  } else existing.set(row.screening_id, row);
}

const state = fs.existsSync(stateFile) ? readJson(stateFile) : { schema: 'cinema-stale-schedule-state', version: 1, candidates: {} };
state.candidates ||= {};
const windowCandidates = [...existing.values()].filter(row => row.business_date >= asOf && row.business_date <= windowEnd);
let candidateCount = 0, newlyStale = 0, scopesWithoutFreshEvidence = 0;
for (const row of windowCandidates) {
  if (currentFreshIds.has(row.screening_id)) {
    delete state.candidates[row.screening_id];
    continue;
  }
  if (row.status === 'stale') continue;
  const status = sourceStatuses.get(`${row.city}|${row.source_id}`);
  if (status?.ok !== true || status?.health === 'degraded' || status?.manual_snapshot || heldCities.has(row.city)) continue;
  const scope = [row.source_id, row.cinema_id, row.business_date].join('|');
  if (!freshScopes.has(scope)) {
    scopesWithoutFreshEvidence++;
    continue;
  }

  const candidate = state.candidates[row.screening_id] || {
    screening_id: row.screening_id,
    source_id: row.source_id,
    cinema_id: row.cinema_id,
    business_date: row.business_date,
    first_missing_taiwan_date: asOf,
    consecutive_missing_taiwan_dates: 0,
    last_missing_taiwan_date: null
  };
  if (candidate.last_missing_taiwan_date !== asOf) {
    candidate.consecutive_missing_taiwan_dates = candidate.last_missing_taiwan_date === addDays(asOf, -1)
      ? candidate.consecutive_missing_taiwan_dates + 1 : 1;
    candidate.last_missing_taiwan_date = asOf;
  }
  candidateCount++;
  row.schedule_check = 'pending';
  if (candidate.consecutive_missing_taiwan_dates >= 2) {
    row.status = 'stale';
    row.stale_since = now;
    row.stale_reason = 'absent-from-two-consecutive-complete-source-scopes';
    delete row.schedule_check;
    delete state.candidates[row.screening_id];
    newlyStale++;
  } else state.candidates[row.screening_id] = candidate;
}

for (const [id, candidate] of Object.entries(state.candidates)) {
  if (candidate.business_date < asOf || candidate.business_date > windowEnd || !existing.has(id)) delete state.candidates[id];
}
state.schema = 'cinema-stale-schedule-state';
state.version = 1;
state.updated_at = now;
state.last_taiwan_date = asOf;
state.policy = 'A screening is marked stale only after it is absent from two consecutive Taiwan-day snapshots in which the same source, cinema, and date scope still returns fresh rows. Stale rows remain archived and are excluded from the public view.';

const byMonth = new Map();
for (const row of existing.values()) {
  const month = row.business_date.slice(0, 7);
  if (!byMonth.has(month)) byMonth.set(month, []);
  byMonth.get(month).push(row);
}
for (const [month, rows] of byMonth) {
  rows.sort((a, b) => a.screening_id.localeCompare(b.screening_id));
  fs.writeFileSync(path.join(canonicalRoot, `${month}.jsonl`), `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
}
fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);

const staleActive = [...existing.values()].filter(row => row.status === 'stale' && row.business_date >= asOf && row.business_date <= windowEnd).length;
const canonicalManifestFile = path.join(canonicalRoot, 'manifest.json');
const manifest = readJson(canonicalManifestFile);
manifest.schedule_reconciliation = {
  checked_at: now,
  as_of: asOf,
  window_days: windowDays,
  stale_marked_this_run: newlyStale,
  stale_screenings_in_window: staleActive,
  pending_candidates: Object.values(state.candidates).filter(candidate => candidate.business_date >= asOf && candidate.business_date <= windowEnd).length,
  fresh_snapshot_rows: freshRows,
  last_known_good_rows: fallbackRows,
  scopes_without_fresh_evidence: scopesWithoutFreshEvidence,
  policy: state.policy
};
manifest.updated_at = now;
fs.writeFileSync(canonicalManifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest.schedule_reconciliation, null, 2));
