import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  buildMovieIndex,
  compactShowtime,
  knownAgeRating,
  movieIdForTitle,
  screeningIdentityKey
} from './movie-schema.mjs';
import { fetchMuvieSongrenShowtimes } from './sources/vieshow-muvie-songren.mjs';
import { fetchEsliteShowtimes } from './sources/eslite.mjs';
import { fetchSpotTaipeiShowtimes } from './sources/spot-taipei.mjs';

const ROOT = path.resolve('cinema/data');
const DATE_ROOT = path.join(ROOT, 'showtimes', 'by-date');
const STATUS_FILE = path.join(ROOT, 'showtimes', 'taipei.json');
const CINEMA_FILE = path.join(ROOT, 'cinemas', 'taipei.json');
const MOVIES_FILE = path.join(ROOT, 'movies', 'index.json');
const MANIFEST_FILE = path.join(ROOT, 'manifest.json');
const NOW = new Date().toISOString();

const SOURCES = {
  'vieshow-muvie-songren-official': {
    loader: fetchMuvieSongrenShowtimes,
    label: 'MUVIE CINEMAS Taipei Songren',
    fields: ['date', 'movie title', 'international title', 'showtime', 'format', 'explicit audio language'],
    subtitles: 'not supplied; stored as unknown'
  },
  'eslite-official-schedule': {
    loader: fetchEsliteShowtimes,
    label: 'Eslite Art House',
    fields: ['date', 'movie title', 'international title', 'showtime', 'rating', 'runtime', 'explicit subtitles'],
    subtitles: 'explicit values preserved from official schedule'
  },
  'spot-taipei-official-schedule': {
    loader: fetchSpotTaipeiShowtimes,
    label: 'SPOT Taipei / 光點台北',
    fields: ['date', 'movie title', 'international title', 'showtime', 'rating', 'runtime', 'explicit subtitles'],
    subtitles: 'explicit values preserved from official per-film detail pages'
  }
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sourceArg = args.find(arg => arg.startsWith('--source='))?.slice('--source='.length) || 'all';
const selectedSources = sourceArg === 'all' ? Object.keys(SOURCES) : sourceArg.split(',').map(v => v.trim()).filter(Boolean);
for (const source of selectedSources) if (!SOURCES[source]) throw new Error(`Unknown source: ${source}`);

const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const writeJson = async (file, value) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
const stableId = (...parts) => crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);
const isoStart = row => `${row.date}T${String(row.time).padStart(5, '0')}:00+08:00`;

function sourcePriority(source) {
  if (source === 'vieshow-muvie-songren-official' || source === 'eslite-official-schedule' || source === 'spot-taipei-official-schedule') return 5;
  if (/-official-(?:api|site|schedule)|official-api|official-site|official-schedule/.test(source || '')) return 4;
  if (source === 'vieshow-official-browser') return 3;
  if (/atmovies|aggregator|fallback/.test(source || '')) return 0;
  return 2;
}

function baseScreeningKey(row) {
  return [row.cinema_id || '', row.movie_id || '', row.start_time || ''].join('|');
}

function fullRowFromSource(row, source) {
  const movieId = movieIdForTitle(row.movie_title, row.movie_title_en);
  const startTime = isoStart(row);
  return {
    id: stableId(source, row.cinema_id || row.cinema_name, row.source_event_id || '', row.date, row.time, row.movie_title, row.format || ''),
    cinema_id: row.cinema_id,
    cinema_name: row.cinema_name,
    movie_id: movieId,
    movie_title: row.movie_title,
    movie_title_en: row.movie_title_en || null,
    rating: row.rating || null,
    start_time: startTime,
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
    source_role: row.source_role || `official direct source refreshed ${NOW}`,
    freshness: 'fresh',
    source
  };
}

function dedupeRows(rows) {
  // If a direct official source proves a cinema/movie/time, discard less-authoritative
  // representations for that same base screening. Keep multiple direct official rows at
  // the same time when they represent distinct official formats (Digital/MUCROWN/TITAN).
  const directOfficialBases = new Set(
    rows.filter(row => sourcePriority(row.source) >= 5).map(baseScreeningKey)
  );
  const eligible = rows.filter(row => {
    const base = baseScreeningKey(row);
    return !directOfficialBases.has(base) || sourcePriority(row.source) >= 5;
  });

  const result = new Map();
  for (const row of eligible) {
    const key = screeningIdentityKey(row);
    const prior = result.get(key);
    if (!prior || sourcePriority(row.source) > sourcePriority(prior.source)) result.set(key, row);
  }
  return [...result.values()].sort((a, b) =>
    String(a.start_time).localeCompare(String(b.start_time)) ||
    String(a.cinema_id).localeCompare(String(b.cinema_id)) ||
    String(a.movie_id || '').localeCompare(String(b.movie_id || '')) ||
    String(a.format || '').localeCompare(String(b.format || ''))
  );
}

async function loadTaipeiDateRows() {
  const output = new Map();
  for (const date of await fs.readdir(DATE_ROOT)) {
    const dateDir = path.join(DATE_ROOT, date);
    const stat = await fs.stat(dateDir).catch(() => null);
    if (!stat?.isDirectory()) continue;
    const file = path.join(dateDir, 'taipei.json');
    const payload = await readJson(file).catch(error => error?.code === 'ENOENT' ? null : Promise.reject(error));
    if (payload) output.set(date, payload.showtimes || []);
  }
  return output;
}

async function rebuildManifestIndexAndCoverage(manifest, movieCatalog) {
  const movieById = new Map((movieCatalog.movies || []).map(movie => [movie.movie_id, movie]));
  const index = {};
  const coverage = {
    showtime_rows: 0,
    explicit_subtitle_rows: 0,
    international_title_rows: 0,
    poster_rows: 0,
    genre_rows: 0,
    rating_rows: 0
  };
  const uniqueMovies = new Map();
  const distinctPosters = new Set();
  const distinctGenres = new Set();

  for (const date of await fs.readdir(DATE_ROOT)) {
    const dateDir = path.join(DATE_ROOT, date);
    const stat = await fs.stat(dateDir).catch(() => null);
    if (!stat?.isDirectory()) continue;
    for (const name of (await fs.readdir(dateDir)).filter(name => name.endsWith('.json'))) {
      const city = name.slice(0, -5);
      const payload = await readJson(path.join(dateDir, name));
      const rows = payload.showtimes || [];
      if (!rows.length) continue;
      const dateIndex = index[date] ||= { total: 0, cities: {} };
      dateIndex.total += rows.length;
      dateIndex.cities[city] = rows.length;
      for (const row of rows) {
        coverage.showtime_rows++;
        if (Array.isArray(row.subtitles) && row.subtitles.length) coverage.explicit_subtitle_rows++;
        const movie = movieById.get(row.movie_id);
        if (movie?.movie_title_en) coverage.international_title_rows++;
        if (movie?.poster_url) { coverage.poster_rows++; distinctPosters.add(movie.poster_url); }
        if (movie?.genres?.length) { coverage.genre_rows++; for (const genre of movie.genres) distinctGenres.add(genre); }
        if (knownAgeRating(movie?.rating)) coverage.rating_rows++;
        if (row.movie_id) uniqueMovies.set(row.movie_id, movie || {});
      }
    }
  }

  for (const entry of Object.values(index)) {
    entry.cities = Object.fromEntries(Object.entries(entry.cities).sort(([a], [b]) => a.localeCompare(b)));
  }
  coverage.unique_title_pairs = {
    title_pairs: uniqueMovies.size,
    with_international_title: [...uniqueMovies.values()].filter(movie => movie.movie_title_en).length,
    with_poster: [...uniqueMovies.values()].filter(movie => movie.poster_url).length,
    distinct_posters: distinctPosters.size,
    with_genres: [...uniqueMovies.values()].filter(movie => movie.genres?.length).length,
    distinct_genre_codes: distinctGenres.size,
    with_known_age_rating: [...uniqueMovies.values()].filter(movie => knownAgeRating(movie.rating)).length
  };
  manifest.showtimes_index = Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
  manifest.coverage = coverage;
}

const cinemas = await readJson(CINEMA_FILE);
const mappedCinemaIds = new Set((cinemas.cinemas || []).map(cinema => cinema.id));
const previousMovies = await readJson(MOVIES_FILE);
const manifest = await readJson(MANIFEST_FILE);
const status = await readJson(STATUS_FILE);
const rowsByDate = await loadTaipeiDateRows();
const sourceResults = {};
const fullNewRows = [];
const touchedDates = new Set();

for (const source of selectedSources) {
  const config = SOURCES[source];
  try {
    const rows = await config.loader();
    if (!rows.length) throw new Error(`${config.label} returned zero rows`);
    for (const row of rows) {
      if (row.city !== 'taipei') throw new Error(`${config.label} unexpectedly returned non-Taipei row`);
      if (!row.cinema_id) {
        const cinema = (cinemas.cinemas || []).find(item => item.name_zh === row.cinema_name);
        row.cinema_id = cinema?.id || null;
      }
      if (!mappedCinemaIds.has(row.cinema_id)) throw new Error(`${config.label} cinema_id not found in Taipei master: ${row.cinema_id || row.cinema_name}`);
    }

    // Only a successfully fetched source is replaced. A failed source keeps its last-known-good rows.
    for (const [date, existing] of rowsByDate) {
      const filtered = existing.filter(row => row.source !== source);
      if (filtered.length !== existing.length) {
        rowsByDate.set(date, filtered);
        touchedDates.add(date);
      }
    }

    for (const sourceRow of rows) {
      const full = fullRowFromSource(sourceRow, source);
      fullNewRows.push(full);
      touchedDates.add(sourceRow.date);
    }
    sourceResults[source] = { ok: true, rows, count: rows.length, config };
  } catch (error) {
    sourceResults[source] = { ok: false, error: String(error?.message || error), config };
  }
}

const movieCatalog = buildMovieIndex(fullNewRows, [], previousMovies.movies || []);
movieCatalog.generated_at = NOW;
movieCatalog.identity_policy = 'stable movie_id from normalized primary title; metadata stored once in this catalog';
const movieById = new Map((movieCatalog.movies || []).map(movie => [movie.movie_id, movie]));

for (const full of fullNewRows) {
  const compact = compactShowtime(full, mappedCinemaIds);
  const date = String(full.start_time).slice(0, 10);
  const current = rowsByDate.get(date) || [];
  current.push(compact);
  rowsByDate.set(date, current);
}

for (const date of touchedDates) rowsByDate.set(date, dedupeRows(rowsByDate.get(date) || []));

for (const [source, result] of Object.entries(sourceResults)) {
  status.sources ||= {};
  manifest.sources ||= {};
  manifest.sources.showtimes ||= {};
  if (result.ok) {
    const rowCount = [...rowsByDate.values()].flat().filter(row => row.source === source).length;
    const cinemaIds = new Set(result.rows.map(row => row.cinema_id));
    const details = {
      ok: true,
      showtimes: rowCount,
      fresh_showtimes: rowCount,
      fallback_showtimes: 0,
      fallback: null,
      health: 'healthy',
      circuit_state: 'closed',
      failure_count: 0,
      last_success_at: NOW,
      retrieved_at: NOW,
      direct_refresh: true,
      github_actions_used: false,
      fields: result.config.fields,
      subtitles: result.config.subtitles
    };
    status.sources[source] = details;
    manifest.sources.showtimes[source] = details;
    for (const cinema of cinemas.cinemas || []) {
      if (!cinemaIds.has(cinema.id)) continue;
      cinema.operational_status = 'active';
      cinema.recommendation_eligible = true;
      cinema.status_evidence = `fresh-direct-official-source:${source}`;
      cinema.status_checked_at = NOW;
    }
  } else {
    const prior = status.sources[source] || manifest.sources.showtimes[source] || {};
    const failure = {
      ...prior,
      ok: false,
      health: 'degraded',
      circuit_state: 'open',
      failure_count: Number(prior.failure_count || 0) + 1,
      last_failure_at: NOW,
      last_error: result.error,
      fallback: 'last-known-good rows retained because direct refresh failed',
      github_actions_used: false
    };
    status.sources[source] = failure;
    manifest.sources.showtimes[source] = failure;
  }
}

status.showtime_count = [...rowsByDate.values()].reduce((sum, rows) => sum + rows.length, 0);
status.showtimes = [];
status.generated_at = NOW;
manifest.generated_at = NOW;
if (manifest.cities?.taipei) manifest.cities.taipei.showtimes = status.showtime_count;

if (!dryRun) {
  for (const date of touchedDates) {
    const file = path.join(DATE_ROOT, date, 'taipei.json');
    const rows = rowsByDate.get(date) || [];
    await writeJson(file, {
      version: 2,
      schema: 'normalized-movie-references',
      city: 'taipei',
      date,
      showtimes: rows
    });
  }
  await writeJson(MOVIES_FILE, movieCatalog);
  await writeJson(CINEMA_FILE, cinemas);
  await writeJson(STATUS_FILE, status);
  await rebuildManifestIndexAndCoverage(manifest, movieCatalog);
  await writeJson(MANIFEST_FILE, manifest);
}

console.log(JSON.stringify({
  dry_run: dryRun,
  generated_at: NOW,
  selected_sources: selectedSources,
  touched_dates: [...touchedDates].sort(),
  sources: Object.fromEntries(Object.entries(sourceResults).map(([source, result]) => [source, result.ok ? {
    ok: true,
    rows: result.count,
    dates: [...new Set(result.rows.map(row => row.date))].sort(),
    cinemas: [...new Set(result.rows.map(row => row.cinema_name))]
  } : { ok: false, error: result.error }])),
  taipei_showtime_rows_after_merge: status.showtime_count,
  movie_catalog_rows_after_merge: movieById.size,
  github_actions_used: false
}, null, 2));
