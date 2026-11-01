import fs from 'node:fs/promises';
import path from 'node:path';
import { ambiguousPosterTitleMatches } from './movie-schema.mjs';

const ROOT = path.resolve('cinema/data');
const read = file => fs.readFile(path.join(ROOT, file), 'utf8').then(JSON.parse);
const manifest = await read('manifest.json');
const publicManifest = await read('showtimes-public/manifest.json');
const catalog = await read('movies/index.json');
const diagnostics = await read('reports/collector-diagnostics.json').catch(error => {
  if (error?.code === 'ENOENT') return {};
  throw error;
});
const movieById = new Map((catalog.movies || []).map(movie => [movie.movie_id, movie]));
const sourceStatuses = manifest.sources?.showtimes || {};
const sourceSummaries = Object.fromEntries(Object.entries(sourceStatuses).map(([source, status]) => [source, {
  health: status.health || (status.ok === false ? 'degraded' : 'healthy'),
  ok: status.ok !== false,
  showtimes: status.showtimes || 0,
  fresh_showtimes: status.fresh_showtimes ?? status.showtimes ?? 0,
  fallback_showtimes: status.fallback_showtimes || 0,
  error: status.error || null,
  retrieved_at: status.retrieved_at || null,
  last_success_at: status.last_success_at || null,
  next_probe_at: status.next_probe_at || null
}]));
const failedSources = Object.entries(sourceStatuses)
  .filter(([, status]) => status?.ok === false || status?.health === 'degraded')
  .map(([source, status]) => ({ source, error: status.error || null, health: status.health || null, showtimes: status.showtimes || 0 }));
const activeMovieIds = new Set();
const missingMovieReferences = [];
const unknownCinemaReferences = [];
let publicRows = 0;
const cinemaIdsByCity = new Map();

for (const date of await fs.readdir(path.join(ROOT, 'showtimes-public/by-date'))) {
  const dateDir = path.join(ROOT, 'showtimes-public/by-date', date);
  if (!(await fs.stat(dateDir)).isDirectory()) continue;
  for (const filename of await fs.readdir(dateDir)) {
    if (!filename.endsWith('.json')) continue;
    const city = filename.slice(0, -5);
    if (!cinemaIdsByCity.has(city)) {
      const cinemas = await read(`cinemas/${city}.json`).catch(error => error?.code === 'ENOENT' ? { cinemas: [] } : Promise.reject(error));
      cinemaIdsByCity.set(city, new Set((cinemas.cinemas || []).map(cinema => cinema.id)));
    }
    const chunk = JSON.parse(await fs.readFile(path.join(dateDir, filename), 'utf8'));
    for (const row of chunk.showtimes || []) {
      publicRows++;
      if (row.movie_id) {
        activeMovieIds.add(row.movie_id);
        if (!movieById.has(row.movie_id) && missingMovieReferences.length < 200) missingMovieReferences.push({ date, city, movie_id: row.movie_id });
      }
      if (row.cinema_id && !cinemaIdsByCity.get(city).has(row.cinema_id) && row.source !== 'moc-culture-movie-api' && unknownCinemaReferences.length < 200) {
        unknownCinemaReferences.push({ date, city, cinema_id: row.cinema_id, source: row.source || null });
      }
    }
  }
}

const activeMovies = [...activeMovieIds].map(id => movieById.get(id)).filter(Boolean);
const missingPosters = activeMovies.filter(movie => !movie.poster_url);
const invalidPosters = [];
for (const movie of catalog.movies || []) {
  if (!movie.poster_url) continue;
  try {
    const url = new URL(movie.poster_url);
    if (url.protocol !== 'https:') throw new Error('poster URL must use HTTPS');
  } catch (error) {
    invalidPosters.push({ movie_id: movie.movie_id, movie_title: movie.movie_title || null, poster_url: movie.poster_url, error: error.message });
  }
}
const posterAmbiguities = ambiguousPosterTitleMatches(catalog.movies || []);
const movieAmbiguities = diagnostics.ambiguous_movie_metadata || [];
const cinemaAmbiguities = diagnostics.ambiguous_cinema_matches || [];
const unmatchedCinemas = diagnostics.unmatched_cinema_matches || [];
const report = {
  schema: 'cinema-automation-health',
  generated_at: new Date().toISOString(),
  public_window: { as_of: publicManifest.as_of, end_date: publicManifest.end_date, rows: publicRows, expected_rows: publicManifest.public_rows },
  sources: { checked: Object.keys(sourceStatuses).length, statuses: sourceSummaries, failed_or_degraded: failedSources },
  ids: {
    active_movies: activeMovieIds.size,
    missing_movie_references: missingMovieReferences,
    missing_movie_reference_samples_capped_at: 200,
    unknown_non_moc_cinema_references: unknownCinemaReferences,
    unknown_cinema_samples_capped_at: 200
  },
  posters: {
    active_movies: activeMovies.length,
    available: activeMovies.length - missingPosters.length,
    missing: missingPosters.length,
    missing_movies: missingPosters.slice(0, 200).map(movie => ({ movie_id: movie.movie_id, movie_title: movie.movie_title || movie.movie_title_en || null })),
    missing_samples_capped_at: 200,
    invalid_https_urls: invalidPosters,
    ambiguous_title_matches: posterAmbiguities
  },
  matching: {
    collector_diagnostic_counts: diagnostics.counts || {},
    ambiguous_movie_metadata: movieAmbiguities,
    ambiguous_cinema_matches: cinemaAmbiguities,
    unmatched_cinema_matches: unmatchedCinemas
  },
  manual_review_required: Boolean(failedSources.length || missingMovieReferences.length || unknownCinemaReferences.length || invalidPosters.length || posterAmbiguities.length || movieAmbiguities.length || cinemaAmbiguities.length || unmatchedCinemas.length || missingPosters.length)
};

const reportsRoot = path.join(ROOT, 'reports');
await fs.mkdir(reportsRoot, { recursive: true });
const sourceReport = { schema: 'cinema-source-health', generated_at: report.generated_at, ...report.sources };
const matchingReport = {
  schema: 'cinema-matching-review',
  generated_at: report.generated_at,
  ...report.matching,
  manual_review_required: Boolean(movieAmbiguities.length || cinemaAmbiguities.length || unmatchedCinemas.length || posterAmbiguities.length)
};
const posterIdReport = {
  schema: 'cinema-poster-id-audit',
  generated_at: report.generated_at,
  public_window: report.public_window,
  ids: report.ids,
  posters: report.posters
};
const outputs = [
  ['automation-health.json', report],
  ['source-health.json', sourceReport],
  ['matching-review.json', matchingReport],
  ['poster-id-audit.json', posterIdReport]
];
for (const [filename, value] of outputs) await fs.writeFile(path.join(reportsRoot, filename), `${JSON.stringify(value, null, 2)}\n`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    '## Cinema automation health',
    '',
    `- Public window: ${report.public_window.rows} sessions (${report.public_window.as_of} to ${report.public_window.end_date})`,
    `- Sources failed/degraded: ${failedSources.length}`,
    `- Active films without posters: ${missingPosters.length}`,
    `- Invalid poster URLs: ${invalidPosters.length}`,
    `- Missing movie IDs: ${missingMovieReferences.length}`,
    `- Unknown cinema IDs: ${unknownCinemaReferences.length}`,
    `- Ambiguous movie matches: ${movieAmbiguities.length + posterAmbiguities.length}`,
    `- Ambiguous or unmatched cinema matches: ${cinemaAmbiguities.length + unmatchedCinemas.length}`,
    '',
    'Full report files:',
    '- `cinema/data/reports/source-health.json`',
    '- `cinema/data/reports/matching-review.json`',
    '- `cinema/data/reports/poster-id-audit.json`',
    '- `cinema/data/reports/automation-health.json`'
  ];
  if (failedSources.length) {
    lines.push('', '### Sources needing attention');
    for (const source of failedSources) lines.push(`- ${source.source}: ${source.error || source.health}`);
  }
  if (missingPosters.length) lines.push('', `### Active films without a poster (first 10)`, `- ${missingPosters.slice(0, 10).map(movie => movie.movie_title || movie.movie_title_en || movie.movie_id).join(', ')}`);
  if (invalidPosters.length) lines.push('', '### Invalid poster URLs (first 5)', ...invalidPosters.slice(0, 5).map(item => `- ${item.movie_title || item.movie_id}: ${item.error}`));
  if (posterAmbiguities.length) lines.push('', '### Ambiguous poster matches (first 5)', ...posterAmbiguities.slice(0, 5).map(item => `- ${item.titles.join(' / ')} (${item.poster_count} poster candidates)`));
  if (movieAmbiguities.length) lines.push('', `### Ambiguous movie metadata (first 5)`, ...movieAmbiguities.slice(0, 5).map(item => `- ${item.title || '(untitled)'} [${item.source || 'unknown source'}]`));
  if (cinemaAmbiguities.length) lines.push('', '### Ambiguous cinema matches (first 5)', ...cinemaAmbiguities.slice(0, 5).map(item => `- ${item.venue} (${item.city})`));
  if (unmatchedCinemas.length) lines.push('', '### Unmatched cinema matches (first 5)', ...unmatchedCinemas.slice(0, 5).map(item => `- ${item.venue} (${item.city})`));
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

console.log(JSON.stringify({
  output: outputs.map(([filename]) => path.posix.join('cinema/data/reports', filename)),
  sources_failed_or_degraded: failedSources.length,
  active_films_without_posters: missingPosters.length,
  invalid_poster_urls: invalidPosters.length,
  missing_movie_references: missingMovieReferences.length,
  unknown_cinema_references: unknownCinemaReferences.length,
  manual_review_required: report.manual_review_required
}, null, 2));
