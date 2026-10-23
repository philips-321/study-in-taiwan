import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve('cinema/data');
const CINEMAS_DIR = path.join(ROOT, 'cinemas');
const SHOWTIMES_DIR = path.join(ROOT, 'showtimes');
const MOVIE_API = 'https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=8';

const CITY_MAP = [
  ['taipei', ['臺北市','台北市']],
  ['new-taipei', ['新北市']],
  ['keelung', ['基隆市']],
  ['taoyuan', ['桃園市']],
  ['hsinchu-city', ['新竹市']],
  ['hsinchu-county', ['新竹縣']],
  ['miaoli', ['苗栗縣']],
  ['taichung', ['臺中市','台中市']],
  ['changhua', ['彰化縣']],
  ['nantou', ['南投縣']],
  ['yunlin', ['雲林縣']],
  ['chiayi-city', ['嘉義市']],
  ['chiayi-county', ['嘉義縣']],
  ['tainan', ['臺南市','台南市']],
  ['kaohsiung', ['高雄市']],
  ['pingtung', ['屏東縣']],
  ['yilan', ['宜蘭縣']],
  ['hualien', ['花蓮縣']],
  ['taitung', ['臺東縣','台東縣']],
  ['penghu', ['澎湖縣']],
  ['kinmen', ['金門縣']],
  ['lienchiang', ['連江縣']]
];

function citySlug(...parts) {
  const text = parts.filter(Boolean).join(' ');
  for (const [slug, names] of CITY_MAP) {
    if (names.some(name => text.includes(name))) return slug;
  }
  return 'unknown';
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : value ?? null;
}

function stableId(...parts) {
  return crypto.createHash('sha1').update(parts.filter(Boolean).join('|')).digest('hex').slice(0, 16);
}

function toIsoLocal(value) {
  if (!value || typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return value.trim();
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}+08:00`;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'study-in-taiwan-cinema-data/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function removeOldJson(dir) {
  await fs.mkdir(dir, { recursive: true });
  for (const name of await fs.readdir(dir)) {
    if (name.endsWith('.json')) await fs.unlink(path.join(dir, name));
  }
}

const generatedAt = new Date().toISOString();
const events = await fetchJson(MOVIE_API);
if (!Array.isArray(events)) throw new Error('Movie API did not return an array');

const cinemasByCity = new Map();
const showtimesByCity = new Map();
for (const [slug] of CITY_MAP) {
  cinemasByCity.set(slug, new Map());
  showtimesByCity.set(slug, []);
}
cinemasByCity.set('unknown', new Map());
showtimesByCity.set('unknown', []);

for (const event of events) {
  const showInfo = Array.isArray(event.showInfo) ? event.showInfo : [];
  for (const show of showInfo) {
    const venue = clean(show.locationName) || clean(event.showUnit) || clean(event.title) || 'Unknown venue';
    const location = clean(show.location);
    const slug = citySlug(location, venue);
    const cinemaId = stableId(slug, venue, location || '');

    const cinema = {
      id: cinemaId,
      name_zh: venue,
      city: slug,
      address: location,
      latitude: clean(show.latitude),
      longitude: clean(show.longitude),
      source: 'moc-culture-movie-api'
    };
    cinemasByCity.get(slug).set(cinemaId, cinema);

    showtimesByCity.get(slug).push({
      id: stableId(event.UID || '', venue, show.time || '', event.title || ''),
      cinema_id: cinemaId,
      movie_title: clean(event.title),
      start_time: toIsoLocal(show.time),
      end_time: toIsoLocal(show.endTime),
      price: clean(show.price),
      on_sales: show.onSales ?? null,
      source_event_id: clean(event.UID),
      source_url: clean(event.sourceWebPromote) || clean(event.webSales),
      updated_at: generatedAt
    });
  }
}

await removeOldJson(CINEMAS_DIR);
await removeOldJson(SHOWTIMES_DIR);

const citySummary = {};
for (const [slug] of [...CITY_MAP.map(([s]) => s), 'unknown']) {
  const cinemas = [...cinemasByCity.get(slug).values()].sort((a, b) => a.name_zh.localeCompare(b.name_zh, 'zh-Hant'));
  const showtimes = showtimesByCity.get(slug).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));

  await writeJson(path.join(CINEMAS_DIR, `${slug}.json`), {
    version: 1,
    city: slug,
    generated_at: generatedAt,
    coverage: 'venues appearing in the Ministry of Culture movie-event feed; not yet a complete national cinema master',
    cinemas
  });

  await writeJson(path.join(SHOWTIMES_DIR, `${slug}.json`), {
    version: 1,
    city: slug,
    generated_at: generatedAt,
    source: MOVIE_API,
    showtimes
  });

  citySummary[slug] = { cinemas: cinemas.length, showtimes: showtimes.length };
}

await writeJson(path.join(ROOT, 'manifest.json'), {
  version: 1,
  generated_at: generatedAt,
  timezone: 'Asia/Taipei',
  model: 'fixed city files overwritten on every refresh; no per-date archive files',
  sources: {
    showtimes: MOVIE_API,
    cinema_master: 'phase-1 derives venues from the showtime feed; official national cinema master will replace/augment this without changing output paths'
  },
  cities: citySummary
});

console.log(`Updated cinema JSON for ${events.length} movie events.`);
