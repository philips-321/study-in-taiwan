import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildMovieIndex, compactShowtime, knownAgeRating, movieIdForRow, screeningKey } from './movie-schema.mjs';
import { fetchMiramarShowtimes } from './sources/miramar.mjs';
import { fetchAmbassadorShowtimes } from './sources/ambassador.mjs';
import { fetchShowTimesShowtimes } from './sources/showtimes.mjs';
import { fetchSpotHuashanShowtimes } from './sources/spot-huashan.mjs';
import { fetchEsliteShowtimes } from './sources/eslite.mjs';
import { fetchAtMoviesTaipeiShowtimes } from './sources/atmovies-taipei.mjs';

const ROOT = path.resolve('cinema/data');
const CINEMAS_DIR = path.join(ROOT, 'cinemas');
const SHOWTIMES_DIR = path.join(ROOT, 'showtimes');
const MOVIE_API = 'https://cloud.culture.tw/frontsite/trans/SearchShowAction.do?method=doFindTypeJ&category=8';
const CINEMA_META_API = 'https://www.bamid.gov.tw/OpenData.aspx?SN=E6C57FC155564DEB';
const ENGLISH_NAMES_FILE = path.join(ROOT, 'cinema-names-en.json');
const englishCinemaNames = JSON.parse(await fs.readFile(ENGLISH_NAMES_FILE, 'utf8')).names || {};
const movieMetadataPayload = await fs.readFile(path.join(ROOT, 'movie-metadata', 'showtimes.json'), 'utf8')
  .then(text => JSON.parse(text)).catch(error => error?.code === 'ENOENT' ? { movies: [] } : Promise.reject(error));
const previousMovieCatalog = await fs.readFile(path.join(ROOT, 'movies', 'index.json'), 'utf8')
  .then(text => JSON.parse(text)).catch(error => error?.code === 'ENOENT' ? { movies: [] } : Promise.reject(error));

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
function movieKey(value) {
  return String(value || '')
    .replace(/&(?:amp|quot|apos|#39|rsquo|lsquo|rdquo|ldquo|ndash|mdash|hellip);/g, entity => ({
      '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&rsquo;': '’', '&lsquo;': '‘',
      '&rdquo;': '”', '&ldquo;': '“', '&ndash;': '–', '&mdash;': '—', '&hellip;': '…'
    })[entity] || entity)
    .normalize('NFKC').toLocaleLowerCase()
    .replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/[‐‑‒–—]/g, '-')
    .replace(/[\s\u00a0]+/g, ' ').trim();
}
const movieMetadataByTitle = new Map(), ambiguousMovieTitles = new Set();
const ambiguousMovieTitleCandidates = new Map();
const matchDiagnostics = {
  ambiguous_movie_metadata: [],
  ambiguous_cinema_matches: [],
  unmatched_cinema_matches: []
};
const diagnosticCounts = Object.fromEntries(Object.keys(matchDiagnostics).map(key => [key, 0]));
const diagnosticKeys = new Set();
function recordDiagnostic(kind, value) {
  const key = `${kind}|${JSON.stringify(value)}`;
  if (diagnosticKeys.has(key)) return;
  diagnosticKeys.add(key);
  diagnosticCounts[kind]++;
  const rows = matchDiagnostics[kind];
  if (rows.length < 200) rows.push(value);
}
for (const movie of movieMetadataPayload.movies || []) {
  for (const title of [movie.movie_title, movie.movie_title_en].filter(Boolean)) {
    const key = movieKey(title);
    if (!key || ambiguousMovieTitles.has(key)) continue;
    const prior = movieMetadataByTitle.get(key);
    if (prior && JSON.stringify([prior.movie_title_en, prior.genres, prior.rating, prior.poster_url]) !== JSON.stringify([movie.movie_title_en, movie.genres, movie.rating, movie.poster_url])) {
      movieMetadataByTitle.delete(key);
      ambiguousMovieTitles.add(key);
      ambiguousMovieTitleCandidates.set(key, [
        { title: prior.movie_title, title_en: prior.movie_title_en || null, poster_url: prior.poster_url || null },
        { title: movie.movie_title, title_en: movie.movie_title_en || null, poster_url: movie.poster_url || null }
      ]);
    } else movieMetadataByTitle.set(key, movie);
  }
}
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
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'study-in-taiwan-cinema-data/1.0' } });
      if (!r.ok) {
        const error = new Error(`${r.status} ${r.statusText}: ${url}`);
        if (r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429) throw error;
        lastError = error;
      } else {
        return await r.text();
      }
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) {
      console.warn(`Fetch attempt ${attempt}/${attempts} failed for ${url}: ${String(lastError?.message || lastError)}`);
      await sleep(attempt * 2000);
    }
  }
  throw lastError || new Error(`Unable to fetch ${url}`);
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
  for (const name of await fs.readdir(dir)) {
    const target = path.join(dir, name);
    const stat = await fs.stat(target);
    if (stat.isDirectory()) await removeOldJson(target);
    else if (name.endsWith('.json')) await fs.unlink(target);
  }
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

function normName(value) {
  return String(value || '')
    .replace(/臺/g, '台')
    .toLowerCase()
    .replace(/(?:電影城|電影院|電影館|影城|戲院|劇院|威秀)/g, '')
    .replace(/[\s　・·()（）\-_/]/g, '');
}
function addressKey(value) {
  const normalized = String(value || '')
    .replace(/臺/g, '台')
    .replace(/[\s　，,、()（）\-]/g, '');
  return normalized.match(/^(.+?號)/)?.[1] || normalized;
}
function matchCinema(slug, venue, location, source) {
  const list = [...cinemasByCity.get(slug).values()];
  const v = normName(venue);
  const a = addressKey(location);
  const byName = list.filter(c => {
           const n = normName(c.name_zh);
           return v && n && (n.includes(v) || v.includes(n));
         });
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) {
    recordDiagnostic('ambiguous_cinema_matches', { source, city: slug, venue, address: location || null, match_by: 'name', candidates: byName.slice(0, 20).map(cinema => ({ id: cinema.id, name: cinema.name_zh, address: cinema.address || null })) });
    return null;
  }
  const byAddress = list.filter(c => a && c.address && addressKey(c.address) === a);
  if (byAddress.length === 1) return byAddress[0];
  if (byAddress.length > 1) {
    recordDiagnostic('ambiguous_cinema_matches', { source, city: slug, venue, address: location || null, match_by: 'address', candidates: byAddress.slice(0, 20).map(cinema => ({ id: cinema.id, name: cinema.name_zh, address: cinema.address || null })) });
    return null;
  }
  recordDiagnostic('unmatched_cinema_matches', { source, city: slug, venue, address: location || null });
  return null;
}

for (const event of events) {
  for (const show of Array.isArray(event.showInfo) ? event.showInfo : []) {
    const venue = clean(show.locationName) || clean(event.showUnit) || clean(event.title) || 'Unknown venue';
    const location = clean(show.location);
    const slug = citySlug(location, venue);
    const matched = matchCinema(slug, venue, location, 'moc-culture-movie-api');
    const cinemaId = matched?.id || stableId(slug, venue, location || '');
    showtimesByCity.get(slug).push({
      id: stableId('moc', event.UID || '', venue, show.time || '', event.title || ''), cinema_id: cinemaId,
      cinema_name: venue, movie_title: clean(event.title), movie_title_en: null,
      start_time: toIsoLocal(show.time), end_time: toIsoLocal(show.endTime), hall: null, format: null,
      audio_language: null, subtitles: null, duration_minutes: null,
      price: clean(show.price), on_sales: show.onSales ?? null, source_event_id: clean(event.UID),
      source_url: clean(event.sourceWebPromote) || clean(event.webSales), source: 'moc-culture-movie-api'
    });
  }
}

const sourceStatus = {
  'moc-culture-movie-api': { ok: true, showtimes: [...showtimesByCity.values()].reduce((n, rows) => n + rows.length, 0) },
  'miramar-official-api': { ok: false, showtimes: 0 },
  'ambassador-official-site': { ok: false, showtimes: 0 },
  'showtimes-official-api': { ok: false, showtimes: 0 },
  'spot-huashan-official-schedule': { ok: false, showtimes: 0 },
  'eslite-official-schedule': { ok: false, showtimes: 0 },
  'atmovies-taipei-fallback': { ok: false, showtimes: 0, role: 'fallback only for sources blocked/incomplete from GitHub Actions' },
  'vieshow-official-browser': {
    ok: true,
    showtimes: 0,
    manual_snapshot: true,
    role: 'manual browser snapshot; refresh from official branch pages, not GitHub Actions'
  }
};

function mergeExternalRows(rows, sourceName) {
  for (const row of rows) {
    const slug = row.city || citySlug(row.address, row.cinema_name);
    const target = showtimesByCity.has(slug) ? slug : 'unknown';
    const matched = matchCinema(target, row.cinema_name, row.address || null, sourceName);
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
      audio_language: row.audio_language || null,
      subtitles: Array.isArray(row.subtitles) ? row.subtitles : null,
      duration_minutes: Number.isFinite(row.duration_minutes) ? row.duration_minutes : null,
      price: null,
      on_sales: null,
      source_event_id: row.source_event_id || null,
      source_url: row.source_url || null,
      source_role: row.source_role || null,
      source: sourceName
    });
  }
  sourceStatus[sourceName] = {
    ok: true,
    showtimes: rows.length,
    ...(sourceStatus[sourceName]?.role ? { role: sourceStatus[sourceName].role } : {}),
    ...(Array.isArray(rows.source_errors) && rows.source_errors.length ? { warnings: rows.source_errors.slice(0, 10) } : {})
  };
}

async function runSource(sourceName, label, loader) {
  try {
    mergeExternalRows(await loader(), sourceName);
  } catch (error) {
    sourceStatus[sourceName] = {
      ...(sourceStatus[sourceName] || {}),
      ok: false,
      showtimes: 0,
      error: String(error?.message || error).slice(0, 300)
    };
    console.error(`${label} source failed:`, error);
  }
}

await runSource('miramar-official-api', 'Miramar', fetchMiramarShowtimes);
await runSource('ambassador-official-site', 'Ambassador', fetchAmbassadorShowtimes);
await runSource('showtimes-official-api', 'ShowTimes', fetchShowTimesShowtimes);
await runSource('spot-huashan-official-schedule', 'SPOT Huashan', fetchSpotHuashanShowtimes);
await runSource('eslite-official-schedule', 'Eslite', fetchEsliteShowtimes);
await runSource('atmovies-taipei-fallback', 'AtMovies Taipei fallback', fetchAtMoviesTaipeiShowtimes);

let metadataEnrichedRows = 0;
for (const [city, rows] of showtimesByCity) for (const row of rows) {
  const titleKeys = [...new Set([row.movie_title, row.movie_title_en].filter(Boolean).map(movieKey))];
  for (const key of titleKeys) if (ambiguousMovieTitles.has(key)) {
    recordDiagnostic('ambiguous_movie_metadata', {
      source: row.source || null, city,
      title: row.movie_title || row.movie_title_en || null,
      alternate_title: row.movie_title_en || null,
      metadata_candidates: ambiguousMovieTitleCandidates.get(key) || []
    });
  }
  const match = titleKeys.map(key => movieMetadataByTitle.get(key)).filter(Boolean);
  const unique = [...new Map(match.map(movie => [movie.id, movie])).values()];
  if (unique.length !== 1) continue;
  const movie = unique[0]; let changed = false;
  if (!row.movie_title_en && movie.movie_title_en) { row.movie_title_en = movie.movie_title_en; changed = true; }
  if ((!Array.isArray(row.genres) || !row.genres.length) && Array.isArray(movie.genres) && movie.genres.length) { row.genres = movie.genres; changed = true; }
  if (!row.rating && movie.rating) { row.rating = movie.rating; changed = true; }
  if (!row.poster_url && movie.poster_url) { row.poster_url = movie.poster_url; changed = true; }
  if (changed) { row.metadata_source = 'exact-title-match:showtimes-official-program'; metadataEnrichedRows++; }
}

const allShowtimeRows = [...showtimesByCity.values()].flat();
const activeMovieIds = new Set(allShowtimeRows.map(movieIdForRow).filter(Boolean));
const activePreviousMovies = (previousMovieCatalog.movies || []).filter(movie => activeMovieIds.has(movie.movie_id));
const activeProgramMetadata = (movieMetadataPayload.movies || []).filter(movie => activeMovieIds.has(movieIdForRow(movie)));
const movieIndex = buildMovieIndex(allShowtimeRows, activeProgramMetadata, activePreviousMovies);
movieIndex.generated_at = generatedAt;
movieIndex.identity_policy = 'stable movie_id from normalized primary title; metadata stored once in this catalog';
const mappedCinemaIds = new Set([...cinemasByCity.values()].flatMap(cinemaMap => [...cinemaMap.keys()]));

await removeOldJson(CINEMAS_DIR); await removeOldJson(SHOWTIMES_DIR);
await writeJson(path.join(ROOT, 'movies', 'index.json'), movieIndex);
const citySummary = {}, showtimesIndex = {};
const coverage = { showtime_rows: 0, explicit_subtitle_rows: 0, international_title_rows: 0, poster_rows: 0, genre_rows: 0, rating_rows: 0 };
const uniqueMovieCoverage = new Map(), distinctPosterUrls = new Set(), distinctGenreCodes = new Set();
for (const slug of [...CITY_MAP.map(([s]) => s), 'unknown']) {
  const seen = new Set();
  const showtimes = showtimesByCity.get(slug)
    .filter(row => {
      const key = screeningKey(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a,b) => String(a.start_time).localeCompare(String(b.start_time)));

  const activeCinemaIds = new Set(showtimes.map(row => row.cinema_id).filter(Boolean));
  const cinemas = [...cinemasByCity.get(slug).values()]
    .map(cinema => {
      const active = activeCinemaIds.has(cinema.id);
      return {
        ...cinema,
        name_en: englishCinemaNames[cinema.id] || cinema.name_en || null,
        operational_status: active ? 'active' : 'unknown',
        recommendation_eligible: active,
        status_evidence: active ? 'fresh-showtime-source' : 'no-fresh-showtime-evidence',
        status_checked_at: generatedAt
      };
    })
    .sort((a,b) => a.name_zh.localeCompare(b.name_zh, 'zh-Hant'));

  const activeCount = cinemas.filter(cinema => cinema.operational_status === 'active').length;
  const unknownCount = cinemas.length - activeCount;

  await writeJson(path.join(CINEMAS_DIR, `${slug}.json`), {
    version: 2,
    city: slug,
    source_year: master.year,
    source: master.url,
    status_policy: 'active requires fresh showtime evidence; absence of showtimes is unknown, never inferred closed',
    cinemas
  });
  await writeJson(path.join(SHOWTIMES_DIR, `${slug}.json`), {
    version: 4, city: slug, generated_at: generatedAt, showtime_count: showtimes.length,
    sources: sourceStatus, showtimes: []
  });
  const byDate = new Map();
  for (const show of showtimes) {
    coverage.showtime_rows++;
    if (Array.isArray(show.subtitles) && show.subtitles.length) coverage.explicit_subtitle_rows++;
    if (show.movie_title_en) coverage.international_title_rows++;
    if (show.poster_url) { coverage.poster_rows++; distinctPosterUrls.add(show.poster_url); }
    if (Array.isArray(show.genres) && show.genres.length) { coverage.genre_rows++; for (const genre of show.genres) distinctGenreCodes.add(genre); }
    if (knownAgeRating(show.rating)) coverage.rating_rows++;
    const titleKey = movieIdForRow(show);
    if (titleKey !== '|') {
      const unique = uniqueMovieCoverage.get(titleKey) || { international: false, poster: false, genres: false, rating: false };
      unique.international ||= Boolean(show.movie_title_en);
      unique.poster ||= Boolean(show.poster_url);
      unique.genres ||= Array.isArray(show.genres) && show.genres.length > 0;
      unique.rating ||= Boolean(knownAgeRating(show.rating));
      uniqueMovieCoverage.set(titleKey, unique);
    }
    const date = String(show.start_time || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(show);
  }
  for (const [date, rows] of byDate) {
    const index = showtimesIndex[date] ||= { total: 0, cities: {} };
    index.total += rows.length;
    index.cities[slug] = rows.length;
    await writeJson(path.join(SHOWTIMES_DIR, 'by-date', date, `${slug}.json`), {
      version: 2, schema: 'normalized-movie-references', city: slug, date,
      showtimes: rows.map(row => compactShowtime(row, mappedCinemaIds))
    });
  }
  citySummary[slug] = { cinemas: cinemas.length, active_cinemas: activeCount, unknown_cinemas: unknownCount, showtimes: showtimes.length };
}
coverage.unique_title_pairs = {
  title_pairs: uniqueMovieCoverage.size,
  with_international_title: [...uniqueMovieCoverage.values()].filter(movie => movie.international).length,
  with_poster: [...uniqueMovieCoverage.values()].filter(movie => movie.poster).length,
  distinct_posters: distinctPosterUrls.size,
  with_genres: [...uniqueMovieCoverage.values()].filter(movie => movie.genres).length,
  distinct_genre_codes: distinctGenreCodes.size,
  with_known_age_rating: [...uniqueMovieCoverage.values()].filter(movie => movie.rating).length
};
for (const entry of Object.values(showtimesIndex)) entry.cities = Object.fromEntries(Object.entries(entry.cities).sort(([a], [b]) => a.localeCompare(b)));
await writeJson(path.join(ROOT, 'manifest.json'), {
  version: 8, generated_at: generatedAt, timezone: 'Asia/Taipei',
  model: 'normalized movie catalog plus per-date/per-city screening references; collectors keep source rows in memory and date chunks are the only persisted showtime records',
  showtimes_index: showtimesIndex,
  coverage,
  movie_catalog: 'movies/index.json; movie title, poster, genres, rating, and runtime are stored once and referenced by movie_id',
  showtimes_payload: 'The app loads only the selected date-and-city chunks from showtimes/by-date. Each screening row references movie_id; cinema labels resolve through cinema_id.',
  source_policy: 'official sources preferred; clearly labeled fallback used only where official automation is blocked or incomplete',
  operational_status_policy: 'fresh showtime evidence marks a cinema active; no fresh evidence stays unknown; closed status requires explicit verified evidence and is never inferred from missing showtimes',
  recommendation_policy: 'automatic recommendations should use recommendation_eligible=true; unknown cinemas require separate verification before recommendation',
  dedup_policy: 'same normalized cinema/movie/time/hall/format is emitted once; official sources run before fallback sources and therefore win exact duplicates',
  fields: {
    audio_language: 'source-declared spoken/dubbed language when available',
    subtitles: 'verified subtitle language codes when source explicitly declares them; null means unknown',
    duration_minutes: 'source-declared running time when available',
    source_role: 'why a fallback record was used, when applicable',
    operational_status: 'active when supported by fresh showtime evidence; otherwise unknown unless explicitly verified closed in a future override layer',
    recommendation_eligible: 'true only when current evidence supports automatic recommendation'
  },
  sources: {
    cinema_master: { metadata: CINEMA_META_API, year: master.year, csv: master.url },
    showtimes: sourceStatus,
    movie_metadata: { source: movieMetadataPayload.source || null, retrieved_at: movieMetadataPayload.retrieved_at || null, programs: (movieMetadataPayload.movies || []).length, cross_source_exact_title_enriched_rows: metadataEnrichedRows }
  },
  cities: citySummary
});
const diagnosticsRoot = path.join(ROOT, 'reports');
await fs.mkdir(diagnosticsRoot, { recursive: true });
await writeJson(path.join(diagnosticsRoot, 'collector-diagnostics.json'), {
  generated_at: generatedAt,
  counts: diagnosticCounts,
  ambiguous_movie_metadata: matchDiagnostics.ambiguous_movie_metadata,
  ambiguous_cinema_matches: matchDiagnostics.ambiguous_cinema_matches,
  unmatched_cinema_matches: matchDiagnostics.unmatched_cinema_matches,
  samples_capped: 200
});
console.log(`Cinema master ${master.year}: ${cinemaRows.length} rows; sources: ${JSON.stringify(sourceStatus)}`);
