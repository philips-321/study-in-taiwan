import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildMovieIndex, compactShowtime, expandShowtime, knownAgeRating, movieIdForRow, screeningIdentityKey, screeningKey } from './movie-schema.mjs';
import { loadPosterDonors, writePosterIndex } from './poster-index.mjs';

const input = process.argv[2];
if (!input) throw new Error('Usage: node cinema/scripts/import-vieshow-browser-snapshot.mjs <browser-review.json>');
const snapshot = JSON.parse(await fs.readFile(path.resolve(input), 'utf8'));
const reviewedOn = snapshot.reviewed_on;
if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn || '') || !Array.isArray(snapshot.entries)) {
  throw new Error('Browser review snapshot requires reviewed_on and entries');
}

const ROOT = path.resolve('cinema/data');
const SHOW_ROOT = path.join(ROOT, 'showtimes');
const DATE_ROOT = path.join(SHOW_ROOT, 'by-date');
const MANIFEST_FILE = path.join(ROOT, 'manifest.json');
const MOVIES_FILE = path.join(ROOT, 'movies', 'index.json');
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const write = async (file, value) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
};
const importedAt = new Date().toISOString();
const stableId = (...parts) => crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);
const normalize = value => String(value || '').normalize('NFKC').replace(/臺/g, '台').toLowerCase()
  .replace(/(?:電影城|電影院|電影館|影城|戲院|劇院|威秀)/g, '')
  .replace(/[\s　・·()（）\-_/]/g, '');
const cityAliases = [
  ['taipei', ['台北市']], ['new-taipei', ['新北市']], ['keelung', ['基隆市']], ['taoyuan', ['桃園市']],
  ['hsinchu-city', ['新竹市']], ['hsinchu-county', ['新竹縣']], ['miaoli', ['苗栗縣']], ['taichung', ['台中市']],
  ['changhua', ['彰化縣']], ['nantou', ['南投縣']], ['yunlin', ['雲林縣']], ['chiayi-city', ['嘉義市']],
  ['chiayi-county', ['嘉義縣']], ['tainan', ['台南市']], ['kaohsiung', ['高雄市']], ['pingtung', ['屏東縣']],
  ['yilan', ['宜蘭縣']], ['hualien', ['花蓮縣', '花蓮市']], ['taitung', ['台東縣', '台東市']],
  ['penghu', ['澎湖縣']], ['kinmen', ['金門縣']], ['lienchiang', ['連江縣']]
];
const cityForAddress = address => cityAliases.find(([, aliases]) => aliases.some(alias => String(address || '').includes(alias)))?.[0] || null;
const toDigit = value => {
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (value === '十') return '10';
  if (value.startsWith('十')) return String(10 + (map[value[1]] || 0));
  if (value.endsWith('十')) return String((map[value[0]] || 1) * 10);
  if (value.includes('十')) return String((map[value[0]] || 1) * 10 + (map[value[2]] || 0));
  return String(map[value] || value);
};
const addressKey = value => String(value || '').normalize('NFKC').replace(/臺/g, '台')
  .replace(/\([^)]*\)/g, '').replace(/[一二三四五六七八九十]+(?=段)/g, n => toDigit(n))
  .replace(/[\s　，,、()（）\-]/g, '').match(/^(.+?號)/)?.[1] || '';
const audioFromFormat = value => {
  const label = String(value || '').match(/[（(]([^）)]+)[）)]/)?.[1] || '';
  return ({ 英: 'en', 國: 'zh', 日: 'ja', 韓: 'ko', 粵: 'yue', 法: 'fr', 德: 'de', 西: 'es', 泰: 'th', 越: 'vi' })[label] || null;
};

const cinemas = [];
for (const file of (await fs.readdir(path.join(ROOT, 'cinemas'))).filter(name => name.endsWith('.json'))) {
  cinemas.push(...(await read(path.join(ROOT, 'cinemas', file))).cinemas);
}
const cinemaById = new Map(cinemas.map(cinema => [cinema.id, cinema]));
function matchCinema(entry) {
  const city = cityForAddress(entry.address);
  const candidates = cinemas.filter(cinema => cinema.city === city);
  const n = normalize(entry.name);
  const byName = candidates.filter(cinema => {
    const c = normalize(cinema.name_zh);
    return c && n && (c === n || (c.length >= 4 && (c.includes(n) || n.includes(c))));
  });
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) throw new Error(`Ambiguous cinema name match for ${entry.name}: ${byName.map(c => c.id).join(', ')}`);
  const key = addressKey(entry.address);
  const byAddress = candidates.filter(cinema => key && addressKey(cinema.address) === key);
  if (byAddress.length === 1) return byAddress[0];
  throw new Error(`Could not uniquely match ${entry.name} (${entry.address || 'no address'}); candidates=${byAddress.map(c => c.id).join(', ') || 'none'}`);
}

const previousMovies = await read(MOVIES_FILE);
const movieById = new Map((previousMovies.movies || []).map(movie => [movie.movie_id, movie]));
const rowsByCity = new Map([...cityAliases.map(([city]) => city), 'unknown'].map(city => [city, []]));
for (const date of await fs.readdir(DATE_ROOT)) {
  const dateDir = path.join(DATE_ROOT, date);
  if (!(await fs.stat(dateDir)).isDirectory()) continue;
  for (const file of (await fs.readdir(dateDir)).filter(name => name.endsWith('.json'))) {
    const city = file.slice(0, -5);
    const chunk = await read(path.join(dateDir, file));
    for (const compact of chunk.showtimes || []) {
      const row = expandShowtime(compact, movieById);
      if (row.source === 'vieshow-official-browser') continue;
      const bucket = rowsByCity.get(city) || rowsByCity.get('unknown');
      bucket.push(row);
    }
  }
}

let importedRows = 0;
const matchedBranches = [];
for (const entry of snapshot.entries) {
  if (entry.error) throw new Error(`Browser review failed for ${entry.name}: ${entry.error}`);
  if (!Array.isArray(entry.sessions)) throw new Error(`Missing sessions array for ${entry.name}`);
  const cinema = matchCinema(entry);
  matchedBranches.push({ name: entry.name, cinema_id: cinema.id, city: cinema.city, source_url: entry.href });
  for (const session of entry.sessions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(session.date || '') || session.date < reviewedOn) continue;
    if (!/^\d{1,2}:\d{2}$/.test(session.time || '') || !session.movie_title) continue;
    const time = session.time.padStart(5, '0');
    const row = {
      id: stableId('vieshow-official-browser', cinema.id, session.source_event_id || '', session.date, time, session.movie_title),
      cinema_id: cinema.id,
      start_time: `${session.date}T${time}:00+08:00`,
      hall: null,
      format: session.format || null,
      audio_language: session.audio_language || audioFromFormat(session.format),
      subtitles: null,
      source_event_id: session.source_event_id || null,
      source_url: entry.href,
      source_role: `official VieShow branch schedule reviewed ${reviewedOn}`,
      freshness: 'fresh',
      source: 'vieshow-official-browser',
      movie_title: session.movie_title,
      movie_title_en: session.movie_title_en || null
    };
    rowsByCity.get(cinema.city).push(row);
    importedRows++;
  }
}

// Exact duplicates are resolved with official rows preferred over aggregators.
const priority = source => source === 'vieshow-official-browser' || /-official/.test(source || '') ? 2 : /atmovies|aggregator/.test(source || '') ? 0 : 1;
const canonicalRows = new Map();
for (const [city, rows] of rowsByCity) {
  const deduped = new Map();
  for (const row of rows) {
    const base = screeningIdentityKey(row);
    const isVieShowSession = row.source === 'vieshow-official-browser';
    const key = isVieShowSession ? `${base}|vieshow:${row.source_event_id || row.id || ''}` : base;
    const prior = deduped.get(key);
    if (!prior || priority(row.source) > priority(prior.source)) deduped.set(key, row);
    if (isVieShowSession) {
      const fallback = deduped.get(base);
      if (fallback && priority(row.source) > priority(fallback.source)) deduped.delete(base);
    }
  }
  rowsByCity.set(city, [...deduped.values()].sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
  canonicalRows.set(city, rowsByCity.get(city));
}

const allRows = [...canonicalRows.values()].flat();
const posterDonors = await loadPosterDonors(ROOT, previousMovies.movies || []);
const movieIndex = buildMovieIndex(allRows, [], previousMovies.movies || [], posterDonors);
movieIndex.generated_at = importedAt;
await writePosterIndex(ROOT, [...posterDonors, ...movieIndex.movies]);
movieIndex.identity_policy = 'stable movie_id from normalized primary title; metadata stored once in this catalog';
await write(MOVIES_FILE, movieIndex);

const manifest = await read(MANIFEST_FILE);
const cityFileNames = (await fs.readdir(SHOW_ROOT)).filter(name => name.endsWith('.json'));
const showtimesIndex = {};
const coverage = { showtime_rows: 0, explicit_subtitle_rows: 0, international_title_rows: 0, poster_rows: 0, genre_rows: 0, rating_rows: 0 };
const uniqueMovies = new Map(), distinctPosters = new Set(), distinctGenres = new Set();
const mappedCinemaIds = new Set(cinemas.map(cinema => cinema.id));
for (const city of [...cityAliases.map(([slug]) => slug), 'unknown']) {
  const rows = canonicalRows.get(city) || [];
  const statusFile = path.join(SHOW_ROOT, `${city}.json`);
  const status = await read(statusFile).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
  if (!status) continue;
  status.showtime_count = rows.length;
  status.showtimes = [];
  status.generated_at = importedAt;
  status.sources ||= {};
  status.sources['vieshow-official-browser'] = {
    ok: true, manual_snapshot: true, health: 'healthy', circuit_state: 'closed', failure_count: 0,
    showtimes: rows.filter(row => row.source === 'vieshow-official-browser').length,
    fresh_showtimes: rows.filter(row => row.source === 'vieshow-official-browser').length,
    fallback_showtimes: 0, fallback: null, retrieved_at: reviewedOn, last_success_at: importedAt,
    reviewed_branches: matchedBranches.filter(branch => branch.city === city).length
  };
  await write(statusFile, status);
  if (manifest.cities?.[city]) manifest.cities[city].showtimes = rows.length;

  const byDate = new Map();
  for (const row of rows) {
    coverage.showtime_rows++;
    if (Array.isArray(row.subtitles) && row.subtitles.length) coverage.explicit_subtitle_rows++;
    if (row.movie_title_en) coverage.international_title_rows++;
    if (row.poster_url) { coverage.poster_rows++; distinctPosters.add(row.poster_url); }
    if (Array.isArray(row.genres) && row.genres.length) { coverage.genre_rows++; for (const genre of row.genres) distinctGenres.add(genre); }
    if (knownAgeRating(row.rating)) coverage.rating_rows++;
    const id = movieIdForRow(row);
    if (id) {
      const known = uniqueMovies.get(id) || { international: false, poster: false, genres: false, rating: false };
      known.international ||= Boolean(row.movie_title_en);
      known.poster ||= Boolean(row.poster_url);
      known.genres ||= Boolean(row.genres?.length);
      known.rating ||= Boolean(knownAgeRating(row.rating));
      uniqueMovies.set(id, known);
    }
    const date = String(row.start_time || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) (byDate.get(date) || byDate.set(date, []).get(date)).push(row);
  }
  for (const [date, dayRows] of byDate) {
    const index = showtimesIndex[date] ||= { total: 0, cities: {} };
    index.total += dayRows.length;
    index.cities[city] = dayRows.length;
    await write(path.join(DATE_ROOT, date, `${city}.json`), {
      version: 2, schema: 'normalized-movie-references', city, date,
      showtimes: dayRows.map(row => compactShowtime(row, mappedCinemaIds))
    });
  }
}

for (const date of await fs.readdir(DATE_ROOT)) {
  const dateDir = path.join(DATE_ROOT, date);
  if (!(await fs.stat(dateDir)).isDirectory()) continue;
  for (const file of await fs.readdir(dateDir)) {
    const city = file.slice(0, -5);
    if (file.endsWith('.json') && !showtimesIndex[date]?.cities?.[city]) await fs.rm(path.join(dateDir, file));
  }
}
for (const entry of Object.values(showtimesIndex)) entry.cities = Object.fromEntries(Object.entries(entry.cities).sort(([a], [b]) => a.localeCompare(b)));
coverage.unique_title_pairs = {
  title_pairs: uniqueMovies.size,
  with_international_title: [...uniqueMovies.values()].filter(movie => movie.international).length,
  with_poster: [...uniqueMovies.values()].filter(movie => movie.poster).length,
  distinct_posters: distinctPosters.size,
  with_genres: [...uniqueMovies.values()].filter(movie => movie.genres).length,
  distinct_genre_codes: distinctGenres.size,
  with_known_age_rating: [...uniqueMovies.values()].filter(movie => movie.rating).length
};
manifest.generated_at = importedAt;
manifest.showtimes_index = showtimesIndex;
manifest.coverage = coverage;
manifest.sources ||= {};
manifest.sources.showtimes ||= {};
manifest.sources.showtimes['vieshow-official-browser'] = {
  ok: true, manual_snapshot: true, health: 'healthy', circuit_state: 'closed', failure_count: 0,
  showtimes: importedRows, fresh_showtimes: importedRows, fallback_showtimes: 0, fallback: null,
  reviewed_at: reviewedOn, reviewed_branches: matchedBranches.length, source_url: snapshot.index_url,
  fields: ['date', 'movie title', 'international title', 'showtime', 'format', 'explicit audio language'],
  subtitles: 'not supplied; stored as unknown',
  last_success_at: importedAt
};
manifest.vieshow_browser_snapshot = {
  source: 'official VieShow branch pages, sequential browser review',
  index_url: snapshot.index_url,
  reviewed_at: reviewedOn,
  imported_at: importedAt,
  branches: matchedBranches.length,
  sessions: importedRows,
  branches_list: matchedBranches
};
await write(MANIFEST_FILE, manifest);
console.log(JSON.stringify({ reviewed_at: reviewedOn, branches: matchedBranches.length, imported_sessions: importedRows, saved_rows: coverage.showtime_rows, films: movieIndex.movies.length, cities: Object.fromEntries([...rowsByCity].map(([city, rows]) => [city, rows.filter(row => row.source === 'vieshow-official-browser').length]).filter(([, n]) => n)),}, null, 2));
