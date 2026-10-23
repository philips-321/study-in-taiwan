import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fetchMiramarShowtimes } from './sources/miramar.mjs';
import { fetchAmbassadorShowtimes } from './sources/ambassador.mjs';

const ROOT = path.resolve('cinema/data');
const CINEMAS_DIR = path.join(ROOT, 'cinemas');
const SHOWTIMES_DIR = path.join(ROOT, 'showtimes');
const MOVIE_API = 'https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=8';
const CINEMA_META_API = 'https://www.bamid.gov.tw/OpenData.aspx?SN=E6C57FC155564DEB';

const CITY_MAP = [
  ['taipei', ['臺北市','台北市']], ['new-taipei', ['新北市']], ['keelung', ['基隆市']],
  ['taoyuan', ['桃園市']], ['hsinchu-city', ['新竹市']], ['hsinchu-county', ['新竹縣']],
  ['miaoli', ['苗栗縣']], ['taichung', ['臺中市','台中市']], ['changhua', ['彰化縣']],
  ['nantou', ['南投縣']], ['yunlin', ['雲林縣']], ['chiayi-city', ['嘉義市']],
  ['chiayi-county', ['嘉義縣']], ['tainan', ['臺南市','台南市']], ['kaohsiung', ['高雄市']],
  ['pingtung', ['屏東縣']], ['yilan', ['宜蘭縣']], ['hualien', ['花蓮縣']],
  ['taitung', ['臺東縣','台東縣']], ['penghu', ['澎湖縣']], ['kinmen', ['金門縣']],
  ['lienchiang', ['連江縣']]
];

function citySlug(...parts) {
  const text = parts.filter(Boolean).join(' ');
  for (const [slug, names] of CITY_MAP) if (names.some(name => text.includes(name))) return slug;
  return 'unknown';
}
function clean(v) { return typeof v === 'string' ? v.replace(/^\uFEFF/, '').trim() : v ?? null; }
function stableId(...parts) { return crypto.createHash('sha1').update(parts.filter(Boolean).join('|')).digest('hex').slice(0, 16); }
function toIsoLocal(value) {
  if (!value || typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}+08:00` : value.trim();
}
function dateTimeToIso(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) return null;
  return `${date}T${time}:00+08:00`;
}
async function fetchText(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'study-in-taiwan-cinema-data/1.0' } });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}: ${url}`);
  return r.text();
}
async function fetchJson(url) { return JSON.parse((await fetchText(url)).replace(/^\uFEFF/, '')); }
function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (quoted) {
      if (c === '"' && n === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  const headers = (rows.shift() || []).map(clean);
  return rows.filter(r => r.some(v => clean(v))).map(r => Object.fromEntries(headers.map((h, i) => [h, clean(r[i] || '')])));
}
async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
async function removeOldJson(dir) {
  await fs.mkdir(dir, { recursive: true });
  for (const name of await fs.readdir(dir)) if (name.endsWith('.json')) await fs.unlink(path.join(dir, name));
}

const generatedAt = new Date().toISOString();
const [events, cinemaMeta] = await Promise.all([fetchJson(MOVIE_API), fetchJson(CINEMA_META_API)]);
if (!Array.isArray(events)) throw new Error('Movie API did not return an array');
if (!Array.isArray(cinemaMeta) || !cinemaMeta[0]?.['相關檔案']) throw new Error('Cinema master metadata unavailable');

const files = [...cinemaMeta[0]['相關檔案'].matchAll(/(20\d{2})年?[^()]*\((https:\/\/[^)]+\.csv)\)/g)]
  .map(m => ({ year: Number(m[1]), url: m[2] }))
  .sort((a, b) => b.year - a.year);
if (!files.length) throw new Error('No cinema CSV found in official metadata');
const master = files[0];
const cinemaRows = parseCsv(await fetchText(master.url));

const cinemasByCity = new Map(), showtimesByCity = new Map();
for (const slug of [...CITY_MAP.map(([s]) => s), 'unknown']) { cinemasByCity.set(slug, new Map()); showtimesByCity.set(slug, []); }

for (const r of cinemaRows) {
  const name = clean(r['事業名稱']) || clean(r['公司名稱']) || 'Unknown cinema';
  const address = clean(r['地址']);
  const slug = citySlug(r['縣市'], address, name);
  const id = stableId(slug, name, address || '', r['統一編號'] || '');
  cinemasByCity.get(slug).set(id, {
    id, name_zh: name, company_name: clean(r['公司名稱']), city: slug, address,
    business_id: clean(r['統一編號']), screens: Number.parseInt(r['廳數'], 10) || null,
    phone: clean(r['電話']), notes: clean(r['備註']), source: 'bamid-national-cinema-master', source_year: master.year
  });
}

function matchCinema(slug, venue, location) {
  const list = [...cinemasByCity.get(slug).values()];
  const norm = s => (s || '').replace(/[\s　・·()（）影城電影城戲院]/g, '').toLowerCase();
  const v = norm(venue), a = norm(location);
  return list.find(c => v && (norm(c.name_zh).includes(v) || v.includes(norm(c.name_zh)))) ||
         list.find(c => a && c.address && (norm(c.address).includes(a) || a.includes(norm(c.address)))) || null;
}

for (const event of events) {
  for (const show of Array.isArray(event.showInfo) ? event.showInfo : []) {
    const venue = clean(show.locationName) || clean(event.showUnit) || clean(event.title) || 'Unknown venue';
    const location = clean(show.location);
    const slug = citySlug(location, venue);
    const matched = matchCinema(slug, venue, location);
    const cinemaId = matched?.id || stableId(slug, venue, location || '');
    showtimesByCity.get(slug).push({
      id: stableId('moc', event.UID || '', venue, show.time || '', event.title || ''), cinema_id: cinemaId,
      cinema_name: venue, movie_title: clean(event.title), start_time: toIsoLocal(show.time), end_time: toIsoLocal(show.endTime),
      price: clean(show.price), on_sales: show.onSales ?? null, source_event_id: clean(event.UID),
      source_url: clean(event.sourceWebPromote) || clean(event.webSales), source: 'moc-culture-movie-api'
    });
  }
}

const sourceStatus = {
  'moc-culture-movie-api': { ok: true, showtimes: [...showtimesByCity.values()].reduce((n, rows) => n + rows.length, 0) },
  'miramar-official-api': { ok: false, showtimes: 0 },
  'ambassador-official-site': { ok: false, showtimes: 0 }
};

function mergeExternalRows(rows, sourceName) {
  for (const row of rows) {
    const slug = row.city || citySlug(row.address, row.cinema_name);
    const target = showtimesByCity.has(slug) ? slug : 'unknown';
    const matched = matchCinema(target, row.cinema_name, row.address || null);
    const cinemaId = matched?.id || stableId(target, row.cinema_name, row.address || '');
    showtimesByCity.get(target).push({
      id: stableId(sourceName, row.cinema_name, row.movie_title, row.date, row.time, row.hall || '', row.format || ''),
      cinema_id: cinemaId,
      cinema_name: row.cinema_name,
      movie_title: row.movie_title,
      movie_title_en: row.movie_title_en || null,
      rating: row.rating || null,
      start_time: dateTimeToIso(row.date, row.time),
      end_time: null,
      hall: row.hall || null,
      format: row.format || null,
      price: null,
      on_sales: null,
      source_event_id: row.source_event_id || null,
      source_url: row.source_url || null,
      source: sourceName
    });
  }
  sourceStatus[sourceName] = { ok: true, showtimes: rows.length };
}

try {
  mergeExternalRows(await fetchMiramarShowtimes(), 'miramar-official-api');
} catch (error) {
  sourceStatus['miramar-official-api'] = { ok: false, showtimes: 0, error: String(error?.message || error).slice(0, 300) };
  console.error('Miramar source failed:', error);
}

try {
  mergeExternalRows(await fetchAmbassadorShowtimes(), 'ambassador-official-site');
} catch (error) {
  sourceStatus['ambassador-official-site'] = { ok: false, showtimes: 0, error: String(error?.message || error).slice(0, 300) };
  console.error('Ambassador source failed:', error);
}

await removeOldJson(CINEMAS_DIR); await removeOldJson(SHOWTIMES_DIR);
const citySummary = {};
for (const slug of [...CITY_MAP.map(([s]) => s), 'unknown']) {
  const cinemas = [...cinemasByCity.get(slug).values()].sort((a,b) => a.name_zh.localeCompare(b.name_zh, 'zh-Hant'));
  const seen = new Set();
  const showtimes = showtimesByCity.get(slug)
    .filter(row => {
      const key = [row.cinema_id, row.movie_title, row.start_time, row.hall || '', row.source].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a,b) => String(a.start_time).localeCompare(String(b.start_time)));
  await writeJson(path.join(CINEMAS_DIR, `${slug}.json`), { version: 1, city: slug, source_year: master.year, source: master.url, cinemas });
  await writeJson(path.join(SHOWTIMES_DIR, `${slug}.json`), { version: 1, city: slug, generated_at: generatedAt, sources: sourceStatus, showtimes });
  citySummary[slug] = { cinemas: cinemas.length, showtimes: showtimes.length };
}
await writeJson(path.join(ROOT, 'manifest.json'), {
  version: 3, generated_at: generatedAt, timezone: 'Asia/Taipei',
  model: 'fixed per-city JSON files overwritten on refresh; no per-date archive files',
  sources: {
    cinema_master: { metadata: CINEMA_META_API, year: master.year, csv: master.url },
    showtimes: sourceStatus
  },
  cities: citySummary
});
console.log(`Cinema master ${master.year}: ${cinemaRows.length} rows; sources: ${JSON.stringify(sourceStatus)}`);
