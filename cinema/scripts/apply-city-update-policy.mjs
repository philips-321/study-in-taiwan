import fs from 'node:fs/promises';
import path from 'node:path';
import { inheritUnambiguousTitlePosters } from './movie-schema.mjs';
import { loadPosterDonors, writePosterIndex } from './poster-index.mjs';

const dataRoot = path.resolve('cinema/data');
const previousRoot = path.resolve(process.env.CINEMA_PREVIOUS_DATA_DIR || '/tmp/cinema-data-prev');
const stateFile = path.resolve(process.env.CINEMA_CITY_UPDATE_STATE || '.github/cinema-city-update-health.json');
const summaryFile = process.env.GITHUB_STEP_SUMMARY || null;
const taiwanDateParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
}).formatToParts(new Date()).map(part => [part.type, part.value]));
const today = `${taiwanDateParts.year}-${taiwanDateParts.month}-${taiwanDateParts.day}`;

async function readJson(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error?.code === 'ENOENT') return fallback; throw error; }
}
async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
async function copyIfPresent(from, to) {
  try {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}
function yesterday(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

const manifestPath = path.join(dataRoot, 'manifest.json');
const manifest = await readJson(manifestPath);
if (!manifest) throw new Error('Cinema manifest missing before city update policy');
const state = await readJson(stateFile, { version: 1, cities: {} });
state.cities ||= {};
const failures = [];
const held = [];

// A city-level summary mismatch is isolated from the nationwide refresh. It is
// counted once per Taiwan calendar day, not once per workflow retry.
for (const [city, summary] of Object.entries(manifest.cities || {})) {
  const payload = await readJson(path.join(dataRoot, 'showtimes', `${city}.json`));
  const actual = payload?.showtime_count;
  const expected = summary?.showtimes;
  const entry = state.cities[city] ||= { consecutive_failure_days: 0, manual_browser_research_required: false };
  if (entry.manual_browser_research_required) {
    held.push(city);
    continue;
  }
  if (Number.isInteger(actual) && Number.isInteger(expected) && actual === expected) {
    entry.consecutive_failure_days = 0;
    entry.last_success_taiwan_date = today;
    entry.last_error = null;
    continue;
  }
  if (entry.last_failure_taiwan_date !== today) {
    entry.consecutive_failure_days = entry.last_failure_taiwan_date === yesterday(today)
      ? (entry.consecutive_failure_days || 0) + 1
      : 1;
  }
  entry.last_failure_taiwan_date = today;
  entry.last_error = `City showtime count mismatch: city file=${actual ?? 'missing'}, manifest=${expected ?? 'missing'}`;
  failures.push({ city, actual, expected, streak: entry.consecutive_failure_days });
  if (entry.consecutive_failure_days >= 2) {
    entry.manual_browser_research_required = true;
    entry.manual_browser_research_since = today;
    held.push(city);
  }
}

// Once a city has failed on two consecutive Taiwan dates, retain its last
// committed city records and date chunks while the rest of Taiwan refreshes.
for (const city of new Set(held)) {
  await copyIfPresent(path.join(previousRoot, 'cinemas', `${city}.json`), path.join(dataRoot, 'cinemas', `${city}.json`));
  await copyIfPresent(path.join(previousRoot, 'showtimes', `${city}.json`), path.join(dataRoot, 'showtimes', `${city}.json`));
  const currentByDate = path.join(dataRoot, 'showtimes', 'by-date');
  for (const date of await fs.readdir(currentByDate).catch(error => error?.code === 'ENOENT' ? [] : Promise.reject(error))) {
    await fs.rm(path.join(currentByDate, date, `${city}.json`), { force: true });
  }
  const previousByDate = path.join(previousRoot, 'showtimes', 'by-date');
  for (const date of await fs.readdir(previousByDate).catch(error => error?.code === 'ENOENT' ? [] : Promise.reject(error))) {
    const source = path.join(previousByDate, date, `${city}.json`);
    await copyIfPresent(source, path.join(currentByDate, date, `${city}.json`));
  }
}

// Rebuild the index and movie references after restoring held cities. The date
// chunks remain the source of truth for counts and the published schedule.
const movieFile = path.join(dataRoot, 'movies', 'index.json');
const currentMovies = await readJson(movieFile, { movies: [] });
const previousMovies = await readJson(path.join(previousRoot, 'movies', 'index.json'), { movies: [] });
const movieById = new Map([...(previousMovies.movies || []), ...(currentMovies.movies || [])]
  .filter(movie => movie?.movie_id).map(movie => [movie.movie_id, movie]));
const referencedMovieIds = new Set();
const showtimesIndex = {};
const countsByCity = {};
let totalRows = 0, explicitSubtitleRows = 0, internationalTitleRows = 0;
let posterRows = 0, genreRows = 0, ratingRows = 0;
for (const date of await fs.readdir(path.join(dataRoot, 'showtimes', 'by-date')).catch(error => error?.code === 'ENOENT' ? [] : Promise.reject(error))) {
  const dir = path.join(dataRoot, 'showtimes', 'by-date', date);
  for (const name of (await fs.readdir(dir)).filter(name => name.endsWith('.json'))) {
    const city = name.slice(0, -5);
    const chunk = await readJson(path.join(dir, name));
    if (!chunk || !Array.isArray(chunk.showtimes)) continue;
    const rows = chunk.showtimes;
    if (!rows.length) continue;
    const index = showtimesIndex[date] ||= { total: 0, cities: {} };
    index.total += rows.length;
    index.cities[city] = rows.length;
    countsByCity[city] = (countsByCity[city] || 0) + rows.length;
    totalRows += rows.length;
    for (const row of rows) {
      if (row.movie_id) referencedMovieIds.add(row.movie_id);
      if (Array.isArray(row.subtitles) && row.subtitles.length) explicitSubtitleRows++;
      const movie = movieById.get(row.movie_id);
      if (movie?.movie_title_en || row.movie_title_en) internationalTitleRows++;
      if (movie?.poster_url || row.poster_url) posterRows++;
      if (Array.isArray(movie?.genres) && movie.genres.length) genreRows++;
      if (['g', 'p', 'pg12', 'pg15', 'r'].includes(movie?.rating)) ratingRows++;
    }
  }
}
const movies = [...referencedMovieIds].map(id => movieById.get(id)).filter(Boolean);
const posterDonors = await loadPosterDonors(dataRoot, [...(previousMovies.movies || []), ...(currentMovies.movies || [])]);
inheritUnambiguousTitlePosters(movies, posterDonors);
currentMovies.movies = movies;
currentMovies.generated_at = new Date().toISOString();
await writeJson(movieFile, currentMovies);
await writePosterIndex(dataRoot, [...posterDonors, ...movies]);
for (const [city, value] of Object.entries(manifest.cities || {})) {
  value.showtimes = countsByCity[city] || 0;
  const file = path.join(dataRoot, 'showtimes', `${city}.json`);
  const payload = await readJson(file);
  if (payload) {
    payload.showtime_count = countsByCity[city] || 0;
    payload.showtimes = [];
    await writeJson(file, payload);
  }
}
manifest.showtimes_index = showtimesIndex;
manifest.coverage ||= {};
manifest.coverage.showtime_rows = totalRows;
manifest.coverage.explicit_subtitle_rows = explicitSubtitleRows;
manifest.coverage.international_title_rows = internationalTitleRows;
manifest.coverage.poster_rows = posterRows;
manifest.coverage.genre_rows = genreRows;
manifest.coverage.rating_rows = ratingRows;
manifest.coverage.unique_title_pairs ||= {};
manifest.coverage.unique_title_pairs.title_pairs = referencedMovieIds.size;
manifest.coverage.unique_title_pairs.with_international_title = movies.filter(movie => movie.movie_title_en).length;
manifest.coverage.unique_title_pairs.with_poster = movies.filter(movie => movie.poster_url).length;
manifest.coverage.unique_title_pairs.distinct_posters = new Set(movies.map(movie => movie.poster_url).filter(Boolean)).size;
manifest.coverage.unique_title_pairs.with_genres = movies.filter(movie => Array.isArray(movie.genres) && movie.genres.length).length;
manifest.coverage.unique_title_pairs.distinct_genre_codes = new Set(movies.flatMap(movie => movie.genres || [])).size;
manifest.coverage.unique_title_pairs.with_known_age_rating = movies.filter(movie => ['g', 'p', 'pg12', 'pg15', 'r'].includes(movie.rating)).length;
await writeJson(manifestPath, manifest);

state.version = 1;
state.updated_at = new Date().toISOString();
state.last_taiwan_date = today;
state.cities = Object.fromEntries(Object.entries(state.cities).filter(([city]) => Object.hasOwn(manifest.cities || {}, city)));
await writeJson(stateFile, state);

const lines = [
  `## Cinema city refresh report — ${today} (Taiwan time)`,
  '',
  `- City count mismatches today: ${failures.length}`,
  `- Cities held at last-known-good data pending manual browser research: ${held.length ? held.join(', ') : 'none'}`,
  '- A city is held only after mismatches on two consecutive Taiwan calendar days; other cities continue refreshing.',
  '- Manual follow-up: open each listed city’s cinema source one by one, verify schedules, then clear its hold after the data is corrected.'
];
if (failures.length) {
  lines.push('', '| City | City file | Manifest | Consecutive failed days |', '|---|---:|---:|---:|');
  for (const failure of failures) lines.push(`| ${failure.city} | ${failure.actual ?? 'missing'} | ${failure.expected ?? 'missing'} | ${failure.streak} |`);
}
for (const city of new Set(held)) {
  const cityPayload = await readJson(path.join(dataRoot, 'cinemas', `${city}.json`), { cinemas: [] });
  const venues = (cityPayload.cinemas || []).map(cinema => `${cinema.name_zh || cinema.name || 'Unnamed cinema'} (${cinema.id || 'no id'})`);
  lines.push('', `### Manual browser queue: ${city}`, '');
  if (venues.length) for (const venue of venues) lines.push(`- ${venue}`);
  else lines.push('- No cinema records are available in the city file; inspect the city source tracker.');
}
if (summaryFile) await fs.appendFile(summaryFile, `${lines.join('\n')}\n`);
console.log(JSON.stringify({ taiwan_date: today, failures, held_cities: [...new Set(held)] }, null, 2));
