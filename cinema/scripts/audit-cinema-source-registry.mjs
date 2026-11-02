import fs from 'node:fs/promises';
import path from 'node:path';
import { browseOfficialPages } from './sources/browser.mjs';

const ROOT = path.resolve('cinema/data');
const REGISTRY_FILE = path.join(ROOT, 'canonical/cinema-source-registry.json');
const MANIFEST_FILE = path.join(ROOT, 'manifest.json');
const REPORT_FILE = path.join(ROOT, 'reports/cinema-browser-source-run.json');
const CLOSED_INDEX_FILE = path.join(ROOT, 'canonical/closed-cinema-index.json');
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const CITY_FILES = [
  'changhua', 'chiayi-city', 'chiayi-county', 'hsinchu-city', 'hsinchu-county',
  'hualien', 'kaohsiung', 'keelung', 'kinmen', 'lienchiang', 'miaoli', 'nantou',
  'new-taipei', 'penghu', 'pingtung', 'taichung', 'tainan', 'taipei', 'taitung',
  'taoyuan', 'yilan', 'yunlin'
];

const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const registry = await readJson(REGISTRY_FILE);
const manifest = await readJson(MANIFEST_FILE);
const previous = await fs.readFile(REPORT_FILE, 'utf8').then(JSON.parse).catch(error => {
  if (error?.code === 'ENOENT') return null;
  throw error;
});

const master = [];
for (const city of CITY_FILES) {
  const data = await readJson(path.join(ROOT, 'cinemas', `${city}.json`));
  for (const cinema of data.cinemas || []) master.push(cinema);
}
const registryCinemas = registry.tables?.CINEMA || [];
const bindings = registry.tables?.CINEMA_SOURCE_BINDING || [];
const masterIds = new Set(master.map(row => row.id));
const registryIds = new Set(registryCinemas.map(row => row.cinema_id));
const bindingIds = new Set(bindings.map(row => row.cinema_id));
if (master.length !== 107 || masterIds.size !== 107 || registryCinemas.length !== 107 || registryIds.size !== 107) {
  throw new Error(`Expected 107 unique master and registry cinema records; got master=${master.length}/${masterIds.size}, registry=${registryCinemas.length}/${registryIds.size}`);
}
const missingRegistryIds = [...masterIds].filter(id => !registryIds.has(id));
const missingBindingIds = [...masterIds].filter(id => !bindingIds.has(id));
if (missingRegistryIds.length || missingBindingIds.length || bindings.length !== 107) {
  throw new Error(`Registry coverage mismatch; missing cinemas=${missingRegistryIds.join(',')}; missing bindings=${missingBindingIds.join(',')}; bindings=${bindings.length}`);
}

const taipeiDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
function currentUrl(raw) {
  const url = new URL(raw);
  for (const key of [...url.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (lower === 'dt') url.searchParams.set(key, taipeiDate.replaceAll('-', '/'));
    else if (lower === 'date' || lower === 'showdate') url.searchParams.set(key, taipeiDate);
  }
  return url.toString();
}
function hostOf(raw) {
  try { return new URL(raw).hostname; } catch { return null; }
}
function scheduleSignals(html) {
  const text = String(html || '')
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ');
  const times = [...text.matchAll(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g)].map(match => match[0]);
  const dates = [...text.matchAll(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}|\d{1,2}月\d{1,2}日/g)].map(match => match[0]);
  return { time_marker_count: times.length, date_marker_count: dates.length, sample_times: [...new Set(times)].slice(0, 8) };
}

const sourceStatus = manifest.sources?.showtimes || {};
const adapterKeys = {
  SRC_SHOWTIMES: 'showtimes-official-browser',
  SRC_ESLITE: 'eslite-official-browser'
};
const previousHost403 = new Map();
for (const row of previous?.entries || []) {
  if (row.http_status !== 403 || !row.host || !row.checked_at) continue;
  const observedAt = Date.parse(row.checked_at);
  if (Number.isFinite(observedAt) && Date.now() - observedAt < COOLDOWN_MS) {
    const retryAfter = new Date(observedAt + COOLDOWN_MS).toISOString();
    const prior = previousHost403.get(row.host);
    if (!prior || retryAfter > prior) previousHost403.set(row.host, retryAfter);
  }
}

const closedCinemas = registryCinemas.filter(row => row.operational_status === 'closed');
const closedCinemaIds = new Set(closedCinemas.map(row => row.cinema_id));
const outcomes = new Map();
const browserTargets = [];
for (const binding of bindings) {
  const cinema = registryCinemas.find(row => row.cinema_id === binding.cinema_id);
  if (closedCinemaIds.has(binding.cinema_id) || binding.binding_status === 'closed') {
    outcomes.set(binding.binding_id, { run_status: 'cinema_closed', http_status: null, host: null, request_url: null, checked_at: new Date().toISOString() });
    continue;
  }
  if (!binding.official_schedule_url || binding.binding_status !== 'ready_for_browser') {
    outcomes.set(binding.binding_id, {
      run_status: 'needs_official_schedule_url',
      http_status: null,
      host: null,
      request_url: null,
      checked_at: new Date().toISOString()
    });
    continue;
  }
  const host = hostOf(binding.official_schedule_url);
  const adapterKey = adapterKeys[binding.source_id];
  if (adapterKey) {
    const status = sourceStatus[adapterKey] || {};
    const warning = (status.warnings || []).find(message => String(message).startsWith(`${registryCinemas.find(row => row.cinema_id === binding.cinema_id)?.name_zh}:`));
    const error = String(warning || status.error || '');
    const blocked = /403/.test(error);
    const skippedAfterBlock = /Skipped after/.test(error);
    outcomes.set(binding.binding_id, {
      run_status: status.showtimes > 0
        ? 'handled_by_schedule_adapter'
        : blocked
          ? 'schedule_adapter_http_403'
          : skippedAfterBlock
            ? 'skipped_after_host_403'
            : status.retry_suppressed
              ? 'schedule_adapter_retry_suppressed'
              : status.pages_requested > 0
                ? 'not_attempted_after_host_circuit'
                : 'schedule_adapter_no_rows',
      http_status: blocked ? 403 : null,
      host,
      request_url: binding.official_schedule_url,
      pages_requested_by_adapter: status.pages_requested ?? null,
      schedule_rows: status.showtimes || 0,
      adapter_id: adapterKey,
      error: error || null,
      checked_at: new Date().toISOString()
    });
    continue;
  }
  const retryAfter = host && previousHost403.get(host);
  if (retryAfter) {
    outcomes.set(binding.binding_id, {
      run_status: 'suppressed_after_recent_host_403',
      http_status: 403,
      host,
      request_url: null,
      retry_after: retryAfter,
      checked_at: new Date().toISOString()
    });
    continue;
  }
  browserTargets.push({
    binding,
    url: currentUrl(binding.official_schedule_url)
  });
}

const pageResults = await browseOfficialPages(browserTargets, {
  concurrency: 5,
  settleMs: 500,
  navigationTimeoutMs: 12_000
});
for (const result of pageResults) {
  const binding = result.target.binding;
  const host = hostOf(result.target.url);
  const signals = scheduleSignals(result.html);
  const status = result.status === 403
    ? 'http_403_host_blocked'
    : result.status === null
      ? /Skipped after this official host returned HTTP 403/.test(result.error || '') ? 'skipped_after_host_403' : 'browser_navigation_failed'
      : result.status >= 200 && result.status < 300
        ? signals.time_marker_count ? 'page_loaded_schedule_signals_found' : 'page_loaded_no_schedule_signals'
        : 'http_error';
  outcomes.set(binding.binding_id, {
    run_status: status,
    http_status: result.status,
    host,
    request_url: result.target.url,
    page_title: result.title || null,
    body_length: result.bodyLength || 0,
    ...signals,
    error: result.error || null,
    checked_at: new Date().toISOString()
  });
}

const entries = bindings.map(binding => {
  const cinema = registryCinemas.find(row => row.cinema_id === binding.cinema_id);
  return {
    binding_id: binding.binding_id,
    cinema_id: binding.cinema_id,
    cinema_name_zh: cinema?.name_zh || null,
    city: cinema?.city || null,
    source_id: binding.source_id,
    official_schedule_url: binding.official_schedule_url,
    binding_status: binding.binding_status,
    ...(outcomes.get(binding.binding_id) || { run_status: 'not_processed' })
  };
});
const counts = Object.fromEntries([...new Set(entries.map(row => row.run_status))]
  .sort().map(status => [status, entries.filter(row => row.run_status === status).length]));
const report = {
  schema: 'CINEMA_BROWSER_SOURCE_RUN',
  schema_version: 1,
  run_id: process.env.GITHUB_RUN_ID || null,
  workflow: process.env.GITHUB_WORKFLOW || null,
  commit_sha: process.env.GITHUB_SHA || null,
  checked_at: new Date().toISOString(),
  taipei_date: taipeiDate,
  browser: 'Playwright Chromium',
  registry_file: 'cinema/data/canonical/cinema-source-registry.json',
  registry_cinema_count: registryCinemas.length,
  registry_bindings_count: bindings.length,
  confirmed_official_url_count: bindings.filter(row => row.binding_status === 'ready_for_browser').length,
  official_url_missing_count: bindings.filter(row => row.binding_status === 'needs_official_schedule_url' && !closedCinemaIds.has(row.cinema_id)).length,
  closed_cinema_count: closedCinemas.length,
  page_navigations_attempted: pageResults.pages_requested,
  hosts_blocked_by_403: pageResults.blocked_hosts || [],
  status_counts: counts,
  entries
};
await fs.mkdir(path.dirname(REPORT_FILE), { recursive: true });
const closedIndex = { schema: 'TAIWAN_CINEMA_CLOSED_INDEX', schema_version: 1, generated_at: report.checked_at, registry_file: 'cinema/data/canonical/cinema-source-registry.json', closed_cinema_ids: closedCinemas.map(row => row.cinema_id), closed_cinemas: closedCinemas.map(row => ({ cinema_id: row.cinema_id, name_zh: row.name_zh, city: row.city, closed_on: row.closed_on })) };
await fs.writeFile(CLOSED_INDEX_FILE, `${JSON.stringify(closedIndex, null, 2)}\n`);
await fs.writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  registry_cinemas: report.registry_cinema_count,
  confirmed_official_urls: report.confirmed_official_url_count,
  missing_official_urls: report.official_url_missing_count,
  page_navigations_attempted: report.page_navigations_attempted,
  blocked_hosts: report.hosts_blocked_by_403,
  status_counts: report.status_counts,
  output: REPORT_FILE
}, null, 2));
