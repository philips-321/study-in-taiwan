import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  buildMovieIndex,
  compactShowtime,
  knownAgeRating,
  normalizeMovieTitle,
  movieIdForTitle
} from './movie-schema.mjs';
import { dedupeRows } from './direct-source-dedup.mjs';
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
const snapshotDir = args.find(arg => arg.startsWith('--snapshot-dir='))?.slice('--snapshot-dir='.length);
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

async function loadSnapshot(source) {
  const slug = source === 'vieshow-muvie-songren-official' ? 'muvie' : source === 'eslite-official-schedule' ? 'eslite' : 'spot-taipei';
  const directory = path.resolve(snapshotDir, slug);
  const rows = [];
  for (const name of (await fs.readdir(directory)).filter(name => name.endsWith('.json')).sort()) {
    const snapshot = await readJson(path.join(directory, name));
    if (snapshot.source !== source || !snapshot.retrieved_at) throw new Error(`Invalid snapshot: ${name}`);
    for (const value of snapshot.rows) {
      const row = Array.isArray(value) ? {
        cinema_id: snapshot.cinema_id, cinema_name: 'MUVIE CINEMAS威秀影城', city: snapshot.city,
        date: snapshot.date, time: value[0], movie_title: value[1], movie_title_en: value[2],
        format: value[3], audio_language: value[4], source_event_id: value[5],
        source_url: snapshot.source_url
      } : value;
      const earlierSavedAt = snapshot.earlier_saved_events?.[row.source_event_id];
      rows.push({ ...row, retrieved_at: earlierSavedAt ? null : (row.retrieved_at || snapshot.retrieved_at),
        ...(earlierSavedAt ? { source_saved_at: earlierSavedAt } : {}) });
    }
  }
  return rows;
}

function fullRowFromSource(row, source) {
  // Source version/event prefixes describe the screening, not a different film.
  const primary = normalizeMovieTitle(row.movie_title).replace(/^\((?:特別場|中文特別場\s*|法)\)\s*/, '');
  const candidates = previousMovies.movies.filter(movie => normalizeMovieTitle(movie.movie_title) === primary);
  const match = candidates.length === 1 ? candidates[0] : null;
  const movieId = match?.movie_id || movieIdForTitle(row.movie_title, row.movie_title_en);
  const startTime = isoStart(row);
  return {
    id: stableId(source, row.cinema_id || row.cinema_name, row.source_event_id || '', row.date, row.time, row.movie_title, row.format || ''),
    cinema_id: row.cinema_id,
    cinema_name: row.cinema_name,
    movie_id: movieId,
    movie_title: row.movie_title,
    movie_title_en: row.movie_title_en || null,
    ...(match && normalizeMovieTitle(row.movie_title) !== primary ? { source_movie_title: row.movie_title } : {}),
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
    source_role: row.source_role || 'official direct source snapshot',
    freshness: 'fresh',
    retrieved_at: snapshotDir ? row.retrieved_at : NOW,
    ...(row.source_saved_at ? { source_saved_at: row.source_saved_at } : {}),
    source
  };
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
  const cityCounts = {};
  const publishedBySource = {};
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
      if (payload.version !== 2 && rows.every(row => row.movie_id)) {
        await writeJson(path.join(dateDir, name), { ...payload, version: 2, schema: 'normalized-movie-references' });
      }
      cityCounts[city] = (cityCounts[city] || 0) + rows.length;
      if (!rows.length) continue;
      const dateIndex = index[date] ||= { total: 0, cities: {} };
      dateIndex.total += rows.length;
      dateIndex.cities[city] = rows.length;
      for (const row of rows) {
        publishedBySource[row.source] = (publishedBySource[row.source] || 0) + 1;
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
  for (const [city, count] of Object.entries(cityCounts)) {
    if (manifest.cities[city]) manifest.cities[city].showtimes = count;
    const file = path.join(ROOT, 'showtimes', `${city}.json`);
    const summary = await readJson(file);
    if (summary.showtime_count !== count) {
      summary.showtime_count = count;
      summary.count_reconciled_at = NOW;
      await writeJson(file, summary);
    }
  }
  for (const [source, details] of Object.entries(manifest.sources.showtimes)) {
    details.published_showtimes = publishedBySource[source] || 0;
  }
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
    const rows = snapshotDir ? await loadSnapshot(source) : await config.loader();
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
for (const full of fullNewRows) {
  const compact = compactShowtime(full, mappedCinemaIds);
  const date = String(full.start_time).slice(0, 10);
  const current = rowsByDate.get(date) || [];
  current.push(compact);
  rowsByDate.set(date, current);
}

for (const date of touchedDates) rowsByDate.set(date, dedupeRows(rowsByDate.get(date) || []));

// Keep metadata once, and only for films still referenced anywhere in the dataset.
const referencedMovies = new Set([...rowsByDate.values()].flat().map(row => row.movie_id));
for (const date of await fs.readdir(DATE_ROOT)) {
  const directory = path.join(DATE_ROOT, date);
  if (!(await fs.stat(directory)).isDirectory()) continue;
  for (const name of (await fs.readdir(directory)).filter(name => name.endsWith('.json') && name !== 'taipei.json')) {
    for (const row of (await readJson(path.join(directory, name))).showtimes || []) referencedMovies.add(row.movie_id);
  }
}
movieCatalog.movies = movieCatalog.movies.filter(movie => referencedMovies.has(movie.movie_id));

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
      last_success_at: result.rows.map(row => row.retrieved_at).filter(Boolean).sort().at(-1) || NOW,
      retrieved_at: result.rows.map(row => row.retrieved_at).filter(Boolean).sort().at(-1) || NOW,
      error: null,
      last_error: null,
      next_probe_at: null,
      access_path: snapshotDir ? 'saved direct official source snapshot' : 'direct official source',
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
if (manifest.cities?.taipei) {
  manifest.cities.taipei.active_cinemas = cinemas.cinemas.filter(cinema => cinema.operational_status === 'active').length;
  manifest.cities.taipei.unknown_cinemas = cinemas.cinemas.filter(cinema => cinema.operational_status === 'unknown').length;
}

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
  movie_catalog_rows_after_merge: movieCatalog.movies.length,
  github_actions_used: false
}, null, 2));
