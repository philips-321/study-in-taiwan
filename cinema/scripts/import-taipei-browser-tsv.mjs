import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildMovieIndex, compactShowtime, expandShowtime, knownAgeRating, movieIdForRow, screeningIdentityKey } from './movie-schema.mjs';
import { loadPosterDonors, writePosterIndex } from './poster-index.mjs';

const input = process.argv[2];
if (!input) throw new Error('Usage: node cinema/scripts/import-taipei-browser-tsv.mjs <snapshot.tsv>');

const MAX_DATE = '2026-12-07';
const ROOT = path.resolve('cinema/data');
const DATE_ROOT = path.join(ROOT, 'showtimes', 'by-date');
const MOVIES_FILE = path.join(ROOT, 'movies', 'index.json');
const MANIFEST_FILE = path.join(ROOT, 'manifest.json');
const CINEMAS_FILE = path.join(ROOT, 'cinemas', 'taipei.json');
const TAIPEI_STATUS_FILE = path.join(ROOT, 'showtimes', 'taipei.json');
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const write = async (file, value) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
};
const stableId = (...parts) => crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);

const text = await fs.readFile(path.resolve(input), 'utf8');
const metadata = {};
const dataLines = [];
for (const raw of text.split(/\r?\n/)) {
  const line = raw.trimEnd();
  if (!line) continue;
  if (line.startsWith('# ')) {
    const match = line.slice(2).match(/^([^=]+)=(.*)$/);
    if (match) metadata[match[1].trim()] = match[2].trim();
    continue;
  }
  dataLines.push(line);
}
for (const key of ['cinema_id','source','source_url','reviewed_on']) if (!metadata[key]) throw new Error(`Missing snapshot metadata: ${key}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.reviewed_on)) throw new Error('reviewed_on must be YYYY-MM-DD');

const cinemasDoc = await read(CINEMAS_FILE);
const cinema = cinemasDoc.cinemas.find(item => item.id === metadata.cinema_id);
if (!cinema) throw new Error(`Unknown Taipei cinema_id ${metadata.cinema_id}`);

const prefixInfo = title => {
  const value = String(title || '').trim();
  const match = value.match(/^\(([^)]+)\)\s*(.+)$/);
  if (!match) return { title: value, audio_language: null, prefix_format: null };
  const label = match[1], clean = match[2].trim();
  let audio_language = null;
  if (label.includes('中')) audio_language = 'zh';
  else if (label.includes('日')) audio_language = 'ja';
  else if (label.includes('英')) audio_language = 'en';
  else if (label.includes('韓')) audio_language = 'ko';
  return { title: clean, audio_language, prefix_format: label.includes('親子') ? '親子' : null };
};

const incoming = [];
for (const line of dataLines) {
  const [date, rawTitle, timeRaw, formatRaw = ''] = line.split('\t');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date > MAX_DATE) continue;
  if (!/^\d{2}:\d{2}$/.test(timeRaw || '') || !rawTitle) continue;
  const info = prefixInfo(rawTitle);
  const format = formatRaw || info.prefix_format || null;
  incoming.push({
    id: stableId(metadata.source, cinema.id, date, timeRaw, info.title, format || ''),
    cinema_id: cinema.id,
    start_time: `${date}T${timeRaw}:00+08:00`,
    format,
    audio_language: info.audio_language,
    source_url: metadata.source_url,
    source_role: metadata.source_role || 'browser-reviewed schedule',
    freshness: 'fresh',
    source: metadata.source,
    movie_title: info.title
  });
}
if (!incoming.length) throw new Error('Snapshot contains no importable sessions');

const previousMovies = await read(MOVIES_FILE);
const previousMovieById = new Map((previousMovies.movies || []).map(movie => [movie.movie_id, movie]));
const affectedDates = new Set(incoming.map(row => row.start_time.slice(0, 10)));
const rowsByDate = new Map();
for (const date of affectedDates) {
  const file = path.join(DATE_ROOT, date, 'taipei.json');
  const existing = await read(file).catch(error => error.code === 'ENOENT' ? { version: 2, schema: 'normalized-movie-references', city: 'taipei', date, showtimes: [] } : Promise.reject(error));
  rowsByDate.set(date, (existing.showtimes || []).map(row => expandShowtime(row, previousMovieById)));
}

const sourcePriority = source => /official|browser/.test(source || '') ? 3 : /atmovies|aggregator|fallback/.test(source || '') ? 1 : 2;
for (const row of incoming) {
  const date = row.start_time.slice(0, 10);
  const rows = rowsByDate.get(date);
  const key = screeningIdentityKey(row);
  const same = rows.findIndex(item => screeningIdentityKey(item) === key);
  if (same < 0) rows.push(row);
  else if (sourcePriority(row.source) > sourcePriority(rows[same].source)) rows[same] = row;
}

const posterDonors = await loadPosterDonors(ROOT, previousMovies.movies || []);
const movieIndex = buildMovieIndex(incoming, [], previousMovies.movies || [], posterDonors);
movieIndex.generated_at = new Date().toISOString();
await writePosterIndex(ROOT, [...posterDonors, ...movieIndex.movies]);
movieIndex.identity_policy = 'persistent normalized movie catalog; historical/unreferenced movie records are retained for future matching';
await write(MOVIES_FILE, movieIndex);
const movieById = new Map(movieIndex.movies.map(movie => [movie.movie_id, movie]));
const mappedCinemaIds = new Set(cinemasDoc.cinemas.map(item => item.id));

for (const [date, rows] of rowsByDate) {
  const deduped = new Map();
  for (const row of rows) {
    const key = screeningIdentityKey(row);
    const prior = deduped.get(key);
    if (!prior || sourcePriority(row.source) > sourcePriority(prior.source)) deduped.set(key, row);
  }
  const sorted = [...deduped.values()].sort((a,b) => String(a.start_time).localeCompare(String(b.start_time)) || String(a.cinema_id).localeCompare(String(b.cinema_id)));
  await write(path.join(DATE_ROOT, date, 'taipei.json'), {
    version: 2, schema: 'normalized-movie-references', city: 'taipei', date,
    showtimes: sorted.map(row => compactShowtime(row, mappedCinemaIds))
  });
}

// A fresh verified schedule proves this cinema is currently operating.
const now = new Date().toISOString();
cinema.operational_status = 'active';
cinema.recommendation_eligible = true;
cinema.status_evidence = 'fresh-showtime-source';
cinema.status_checked_at = now;
await write(CINEMAS_FILE, cinemasDoc);

// Recompute manifest/index/coverage without deleting any date chunk or movie catalog record.
const manifest = await read(MANIFEST_FILE);
const showtimesIndex = {};
const cityCounts = {};
const references = new Set();
let totalRows = 0, explicitSubtitleRows = 0, internationalTitleRows = 0, posterRows = 0, genreRows = 0, ratingRows = 0;
for (const date of (await fs.readdir(DATE_ROOT)).sort()) {
  const dateDir = path.join(DATE_ROOT, date);
  if (!(await fs.stat(dateDir)).isDirectory()) continue;
  for (const file of (await fs.readdir(dateDir)).filter(name => name.endsWith('.json'))) {
    const city = file.slice(0, -5);
    const chunk = await read(path.join(dateDir, file));
    const count = (chunk.showtimes || []).length;
    if (!count) continue;
    const entry = showtimesIndex[date] ||= { total: 0, cities: {} };
    entry.total += count; entry.cities[city] = count;
    cityCounts[city] = (cityCounts[city] || 0) + count;
    for (const row of chunk.showtimes || []) {
      totalRows++;
      if (row.movie_id) references.add(row.movie_id);
      if (Array.isArray(row.subtitles) && row.subtitles.length) explicitSubtitleRows++;
      const movie = movieById.get(row.movie_id);
      if (movie?.movie_title_en) internationalTitleRows++;
      if (movie?.poster_url) posterRows++;
      if (movie?.genres?.length) genreRows++;
      if (knownAgeRating(movie?.rating)) ratingRows++;
    }
  }
}
for (const entry of Object.values(showtimesIndex)) entry.cities = Object.fromEntries(Object.entries(entry.cities).sort(([a],[b]) => a.localeCompare(b)));
manifest.generated_at = now;
manifest.showtimes_index = showtimesIndex;
manifest.coverage ||= {};
Object.assign(manifest.coverage, {
  showtime_rows: totalRows,
  explicit_subtitle_rows: explicitSubtitleRows,
  international_title_rows: internationalTitleRows,
  poster_rows: posterRows,
  genre_rows: genreRows,
  rating_rows: ratingRows,
  unique_title_pairs: {
    ...(manifest.coverage.unique_title_pairs || {}),
    title_pairs: references.size,
    catalog_movies_retained: movieIndex.movies.length
  }
});
manifest.display_policy = { ...(manifest.display_policy || {}), max_date: MAX_DATE, reason: 'Airbnb guest planning horizon through 2026-12-07; data after this date may remain stored but is not shown.' };
manifest.sources ||= {}; manifest.sources.showtimes ||= {};
manifest.sources.showtimes[metadata.source] = {
  ok: true, browser_snapshot: true, health: 'healthy', circuit_state: 'closed',
  showtimes: incoming.length, fresh_showtimes: incoming.length, fallback_showtimes: 0,
  source_url: metadata.source_url, reviewed_at: metadata.reviewed_on, last_success_at: now
};
if (manifest.cities?.taipei) manifest.cities.taipei.showtimes = cityCounts.taipei || 0;
await write(MANIFEST_FILE, manifest);

const taipeiStatus = await read(TAIPEI_STATUS_FILE);
taipeiStatus.generated_at = now;
taipeiStatus.showtime_count = cityCounts.taipei || 0;
taipeiStatus.showtimes = [];
taipeiStatus.sources ||= {};
taipeiStatus.sources[metadata.source] = manifest.sources.showtimes[metadata.source];
await write(TAIPEI_STATUS_FILE, taipeiStatus);

console.log(JSON.stringify({ cinema: cinema.name_zh, source: metadata.source, imported: incoming.length, dates: [...affectedDates].sort(), max_date: MAX_DATE, catalog_movies_retained: movieIndex.movies.length }, null, 2));
