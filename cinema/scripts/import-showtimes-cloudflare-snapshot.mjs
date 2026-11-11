import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { buildMovieIndex, movieIdForTitle, normalizeMovieTitle, screeningKey } from './movie-schema.mjs';

const root = path.resolve('cinema/data');
const research = path.join(root, 'research');
const source = 'showtimes-official-cloudflare-bootstrap';
const files = fs.readdirSync(research).filter(name => /^showtimes-cloudflare-batch\d+-\d+\.json$/.test(name)).sort();
if (!files.length) throw new Error('No Cloudflare ShowTimes snapshot files found');
const incoming = files.flatMap(name => JSON.parse(fs.readFileSync(path.join(research, name), 'utf8')));
if (!incoming.length) throw new Error('Cloudflare ShowTimes snapshots are empty');
const programFile = path.join(research, 'showtimes-cloudflare-programs.json');
const programs = fs.existsSync(programFile) ? JSON.parse(fs.readFileSync(programFile, 'utf8')) : [];

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
};
const hash = value => crypto.createHash('sha1').update(value).digest('hex').slice(0, 16);
const audioLanguage = format => {
  const match = String(format || '').match(/(英語|日語|韓語|國語|粵語|越語|泰語|菲語|法語|德語|西語|印尼語|馬來語|印度語|印地語)$/);
  return match ? ({
    '英語': 'en', '日語': 'ja', '韓語': 'ko', '國語': 'zh', '粵語': 'yue',
    '越語': 'vi', '泰語': 'th', '菲語': 'fil', '法語': 'fr', '德語': 'de',
    '西語': 'es', '印尼語': 'id', '馬來語': 'ms', '印度語': 'hi', '印地語': 'hi'
  }[match[1]] || null) : null;
};
const programByTitle = new Map();
for (const program of programs) {
  for (const title of [program.name, program.nameAlternative].filter(Boolean)) {
    const key = normalizeMovieTitle(title);
    if (key && !programByTitle.has(key)) programByTitle.set(key, program);
  }
}
const cityFiles = new Map();
for (const city of new Set(incoming.map(row => row.city))) {
  const file = path.join(root, 'cinemas', city + '.json');
  if (fs.existsSync(file)) cityFiles.set(city, readJson(file));
}
const previousCatalog = readJson(path.join(root, 'movies', 'index.json'));
const registry = readJson(path.join(root, 'canonical', 'cinema-source-registry.json'));
const showtimesCinemaIds = new Map((registry.tables?.CINEMA_SOURCE_BINDING || [])
  .filter(binding => binding.source_id === 'SRC_SHOWTIMES' && binding.official_schedule_url)
  .map(binding => [String(binding.official_schedule_url).match(new RegExp('/cinemas/([0-9]+)'))?.[1], binding.cinema_id])
  .filter(([page, cinemaId]) => page && cinemaId));
const movieByTitle = new Map();
for (const movie of previousCatalog.movies || []) {
  const key = normalizeMovieTitle(movie.movie_title);
  if (key && !movieByTitle.has(key)) movieByTitle.set(key, movie);
}
const normalizedIncoming = incoming.map(row => ({
  ...row,
  cinema_id: showtimesCinemaIds.get(String(row.cinema_id)) || row.cinema_id,
  audio_language: row.audio_language || audioLanguage(row.format),
  movie_title_en: row.movie_title_en || programByTitle.get(normalizeMovieTitle(row.movie_title))?.nameAlternative || null,
  poster_url: row.poster_url || programByTitle.get(normalizeMovieTitle(row.movie_title))?.poster_url || null,
  genres: row.genres?.length ? row.genres : (programByTitle.get(normalizeMovieTitle(row.movie_title))?.genres || []),
  rating: row.rating || programByTitle.get(normalizeMovieTitle(row.movie_title))?.rating || null,
  duration_minutes: row.duration_minutes || (Number(programByTitle.get(normalizeMovieTitle(row.movie_title))?.duration) > 0 ? Math.round(Number(programByTitle.get(normalizeMovieTitle(row.movie_title)).duration) / 60) : null)
}));
const cinemaIds = new Set([...normalizedIncoming.map(row => row.cinema_id), ...incoming.map(row => row.cinema_id)]);
const fullRows = normalizedIncoming.map(row => {
  const existing = movieByTitle.get(normalizeMovieTitle(row.movie_title));
  const movieId = existing?.movie_id || movieIdForTitle(row.movie_title, row.movie_title_en);
  return {
    ...row,
    movie_id: movieId,
    id: hash([source, row.cinema_id, row.source_event_id, row.date, row.time].join('|')),
    start_time: row.date + 'T' + row.time + ':00+08:00',
    source
  };
});

const touchedDates = new Set(fullRows.map(row => row.date));
const byDateCity = new Map();
for (const date of touchedDates) {
  const dir = path.join(root, 'showtimes', 'by-date', date);
  for (const city of cityFiles.keys()) {
    const file = path.join(dir, city + '.json');
    if (fs.existsSync(file)) byDateCity.set(date + '/' + city, readJson(file));
  }
}
for (const [key, current] of byDateCity) {
  current.showtimes = current.showtimes.filter(item => !(item.source === source && cinemaIds.has(item.cinema_id)));
}
for (const row of fullRows) {
  const key = row.date + '/' + row.city;
  const current = byDateCity.get(key) || { version: 2, schema: 'normalized-movie-references', city: row.city, date: row.date, showtimes: [] };
  const preserved = current.showtimes;
  const compact = {
    id: row.id,
    cinema_id: row.cinema_id,
    movie_id: row.movie_id,
    start_time: row.start_time,
    ...(row.hall ? { hall: row.hall } : {}),
    ...(row.format ? { format: row.format } : {}),
    ...(row.audio_language ? { audio_language: row.audio_language } : {}),
    source_event_id: row.source_event_id,
    source_url: row.source_url,
    source_role: row.source_role,
    source,
    retrieved_at: row.retrieved_at
  };
  if (!preserved.some(item => screeningKey(item) === screeningKey(compact))) preserved.push(compact);
  current.showtimes = preserved.sort((a, b) => (a.start_time + '|' + a.cinema_id + '|' + a.movie_id + '|' + (a.hall || '')).localeCompare(b.start_time + '|' + b.cinema_id + '|' + b.movie_id + '|' + (b.hall || '')));
  byDateCity.set(key, current);
}
for (const [key, payload] of byDateCity) {
  const [date, city] = key.split('/');
  writeJson(path.join(root, 'showtimes', 'by-date', date, city + '.json'), payload);
}

const movieCatalog = buildMovieIndex(fullRows, [], previousCatalog.movies || []);
movieCatalog.generated_at = new Date().toISOString();
movieCatalog.identity_policy = previousCatalog.identity_policy || 'stable movie_id from normalized primary title; metadata stored once in this catalog';
writeJson(path.join(root, 'movies', 'index.json'), movieCatalog);
if (programs.length) {
  writeJson(path.join(root, 'movie-metadata', 'showtimes.json'), {
    version: 1,
    source: 'ShowTimes official bootstrap program records',
    retrieved_at: fullRows.map(row => row.retrieved_at).sort().at(-1) || new Date().toISOString(),
    movies: programs.map(program => ({
      id: program.id,
      movie_title: program.name,
      movie_title_en: program.nameAlternative || null,
      genres: Array.isArray(program.genres) ? program.genres : [],
      rating: program.rating || null,
      duration_minutes: Number(program.duration) > 0 ? Math.round(Number(program.duration) / 60) : null,
      poster_url: program.poster_url || null
    }))
  });
}

const manifestFile = path.join(root, 'manifest.json');
const manifest = readJson(manifestFile);
const showtimesIndex = {};
const cityCounts = {};
const sourceCounts = {};
const movieRefs = new Set();
let total = 0;
for (const date of fs.readdirSync(path.join(root, 'showtimes', 'by-date')).filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name)).sort()) {
  const dir = path.join(root, 'showtimes', 'by-date', date);
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
    const city = file.slice(0, -5), rows = readJson(path.join(dir, file)).showtimes || [];
    if (!rows.length) continue;
    showtimesIndex[date] ||= { total: 0, cities: {} };
    showtimesIndex[date].total += rows.length;
    showtimesIndex[date].cities[city] = rows.length;
    cityCounts[city] = (cityCounts[city] || 0) + rows.length;
    total += rows.length;
    for (const row of rows) { movieRefs.add(row.movie_id); sourceCounts[row.source] = (sourceCounts[row.source] || 0) + 1; }
  }
}
manifest.generated_at = new Date().toISOString();
manifest.showtimes_index = showtimesIndex;
manifest.coverage = { ...(manifest.coverage || {}), showtime_rows: total, unique_title_pairs: { ...(manifest.coverage?.unique_title_pairs || {}), title_pairs: movieRefs.size } };
manifest.sources ||= {};
manifest.sources.showtimes ||= {};
manifest.sources.showtimes[source] = {
  ok: true, health: 'healthy', circuit_state: 'closed', showtimes: sourceCounts[source] || 0,
  fresh_showtimes: sourceCounts[source] || 0, fallback_showtimes: 0, fallback: null,
  retrieved_at: fullRows.map(row => row.retrieved_at).sort().at(-1) || new Date().toISOString(),
  access_path: 'Cloudflare Browser Run official ShowTimes bootstrap', direct_refresh: true
};
for (const [city, count] of Object.entries(cityCounts)) {
  const statusFile = path.join(root, 'showtimes', city + '.json');
  if (!fs.existsSync(statusFile)) continue;
  const status = readJson(statusFile);
  status.generated_at = manifest.generated_at;
  status.showtime_count = count;
  status.sources ||= {};
  status.sources[source] = { ...manifest.sources.showtimes[source], showtimes: sourceCounts[source] || 0 };
  writeJson(statusFile, status);
  if (manifest.cities?.[city]) manifest.cities[city].showtimes = count;
}
writeJson(manifestFile, manifest);
console.log(JSON.stringify({ files, incoming_rows: incoming.length, touched_dates: [...touchedDates].sort(), source_rows: sourceCounts[source], total_rows: total, movies: movieCatalog.movies.length }, null, 2));
