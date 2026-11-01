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
const reconciliation = manifest.schedule_reconciliation || null;
const canonicalMovieRecords = await fs.readFile(path.join(ROOT, 'canonical/movie-registry.jsonl'), 'utf8')
  .then(text => text.split('\n').filter(Boolean).map(JSON.parse))
  .catch(error => error?.code === 'ENOENT' ? [] : Promise.reject(error));
const issueHistoryFile = path.join(ROOT, 'reports/source-issue-history.json');
let issueHistory = await fs.readFile(issueHistoryFile, 'utf8').then(JSON.parse).catch(error => {
  if (error?.code === 'ENOENT') return { schema: 'cinema-source-issue-history', version: 1, issues: [] };
  throw error;
});
const movieById = new Map((catalog.movies || []).map(movie => [movie.movie_id, movie]));
const sourceStatuses = manifest.sources?.showtimes || {};
const reportGeneratedAt = new Date().toISOString();
const sourceSummaries = Object.fromEntries(Object.entries(sourceStatuses).map(([source, status]) => [source, {
  health: status.health || (status.ok === false ? 'degraded' : 'healthy'),
  ok: status.ok !== false,
  showtimes: status.showtimes || 0,
  fresh_showtimes: status.fresh_showtimes ?? status.showtimes ?? 0,
  fallback_showtimes: status.fallback_showtimes || 0,
  error: status.error || null,
  retrieved_at: status.retrieved_at || null,
  last_success_at: status.last_success_at || null,
  next_probe_at: status.next_probe_at || null,
  retry_suppressed: status.retry_suppressed === true,
  retry_after: status.retry_after || null
}]));
const failedSources = Object.entries(sourceStatuses)
  .filter(([, status]) => status?.ok === false || status?.health === 'degraded')
  .map(([source, status]) => ({ source, error: status.error || null, health: status.health || null, showtimes: status.showtimes || 0, retry_suppressed: status.retry_suppressed === true, retry_after: status.retry_after || null }));

const endpointHints = {
  'showtimes-official-api': 'https://capi.showtimes.com.tw/4/app/bootstrap',
  'eslite-official-schedule': 'https://meet.eslite.com/tw/tc/gallery/movieschedule/201803020001?v=1'
};
const guidance = {
  'showtimes-official-api': {
    known_cause: 'GitHub Actions runner has repeatedly received HTTP 403 from the public bootstrap endpoint. Repository notes say the endpoint was reachable in the manual browser environment; investigate runner access/WAF before changing the parser.',
    next_steps: ['Check endpoint reachability from GitHub Actions before changing parsing code.', 'If the runner still receives 403, use the reviewed browser/API bootstrap snapshot or another approved access path.', 'Preserve last-known-good ShowTimes rows in canonical storage.']
  },
  'eslite-official-schedule': {
    known_cause: 'GitHub Actions runner has repeatedly received HTTP 403 from the official schedule page, so the parser cannot inspect its schedule response.',
    next_steps: ['Check endpoint reachability from GitHub Actions before changing parsing code.', 'If the runner still receives 403, use a verified manual snapshot or another approved access path.', 'Preserve last-known-good Eslite rows in canonical storage.']
  }
};
const recordSourceHistory = process.argv.includes('--record-source-history');
const incidentForSource = new Map();
const errorClass = error => {
  const status = String(error || '').match(/\b([45]\d\d)\b/)?.[1];
  return status ? { type: 'http_status', status: Number(status), key: `http_${status}` } : { type: 'collector_error', status: null, key: 'collector_error' };
};
const hostFor = (error, source) => {
  const url = String(error || '').match(/https?:\/\/[^\s)]+/)?.[0] || endpointHints[source] || null;
  try { return url ? new URL(url).host : null; } catch { return null; }
};
if (recordSourceHistory) {
  issueHistory.schema = 'cinema-source-issue-history';
  issueHistory.version = 1;
  issueHistory.issues ||= [];
  issueHistory.generated_at = reportGeneratedAt;
  for (const [source, status] of Object.entries(sourceStatuses)) {
    const failed = status?.ok === false || status?.health === 'degraded';
    if (!failed) {
      if (status?.ok === true && status?.health !== 'degraded') {
        for (const issue of issueHistory.issues.filter(item => item.source === source && item.state === 'open')) {
          issue.state = 'resolved';
          issue.resolved_at = reportGeneratedAt;
          issue.last_success_at = status.last_success_at || reportGeneratedAt;
          issue.consecutive_failures = 0;
        }
      }
      continue;
    }

    const error = String(status.error || 'Source reported degraded health');
    const classification = errorClass(error);
    const host = hostFor(error, source);
    const issueId = `${source}:${classification.key}:${host || 'unknown-host'}`;
    let issue = issueHistory.issues.find(item => item.issue_id === issueId);
    if (!issue) {
      issue = {
        issue_id: issueId, source, error_type: classification.type,
        http_status: classification.status, host, endpoint: endpointHints[source] || null,
        state: 'open', first_seen: reportGeneratedAt, last_seen: null,
        last_success_at: null, total_occurrence_count: 0,
        historical_observation_count: 0, consecutive_failures: 0, reopen_count: 0,
        known_cause: guidance[source]?.known_cause || null,
        next_steps: guidance[source]?.next_steps || ['Inspect the recorded error and source endpoint before changing the parser.'],
        observations: []
      };
      issueHistory.issues.push(issue);
    }
    if (status.retry_suppressed) {
      issue.retry_suppressed_run_count = Number(issue.retry_suppressed_run_count || 0) + 1;
      issue.last_retry_suppressed_at = reportGeneratedAt;
      issue.retry_after = status.retry_after || null;
      incidentForSource.set(source, issue);
      continue;
    }
    if (issue.state === 'resolved') {
      issue.reopen_count = Number(issue.reopen_count || 0) + 1;
      issue.resolved_at = null;
      issue.consecutive_failures = 0;
    }
    issue.state = 'open';
    issue.last_seen = reportGeneratedAt;
    issue.last_error = error;
    issue.last_fresh_showtimes = status.fresh_showtimes ?? status.showtimes ?? 0;
    issue.last_fallback_showtimes = status.fallback_showtimes || 0;
    issue.total_occurrence_count = Number(issue.total_occurrence_count || 0) + 1;
    issue.consecutive_failures = Number(issue.consecutive_failures || 0) + 1;
    issue.retry_after = new Date(Date.parse(reportGeneratedAt) + 7 * 24 * 60 * 60 * 1000).toISOString();
    issue.observations ||= [];
    issue.observations.push({ observed_at: reportGeneratedAt, error, fresh_showtimes: issue.last_fresh_showtimes, fallback_showtimes: issue.last_fallback_showtimes });
    if (issue.observations.length > 100) issue.observations.splice(0, issue.observations.length - 100);
    incidentForSource.set(source, issue);
  }
  await fs.mkdir(path.dirname(issueHistoryFile), { recursive: true });
  await fs.writeFile(issueHistoryFile, `${JSON.stringify(issueHistory, null, 2)}\n`);
} else {
  for (const issue of issueHistory.issues || []) if (issue.state === 'open') incidentForSource.set(issue.source, issue);
}
for (const source of failedSources) {
  const issue = incidentForSource.get(source.source);
  if (issue) source.recurring_issue = {
    issue_id: issue.issue_id,
    state: issue.state,
    total_occurrence_count: issue.total_occurrence_count,
    consecutive_failures: issue.consecutive_failures,
    first_seen: issue.first_seen,
    last_seen: issue.last_seen,
    known_cause: issue.known_cause,
    next_steps: issue.next_steps
  };
}
const issueHistorySummary = (issueHistory.issues || []).map(issue => ({
  issue_id: issue.issue_id,
  source: issue.source,
  error_type: issue.error_type,
  http_status: issue.http_status,
  host: issue.host,
  state: issue.state,
  total_occurrence_count: issue.total_occurrence_count,
  consecutive_failures: issue.consecutive_failures,
  first_seen: issue.first_seen,
  last_seen: issue.last_seen,
  last_success_at: issue.last_success_at,
  next_steps: issue.next_steps
}));
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
const activeCanonicalMovies = canonicalMovieRecords.filter(movie => (movie.movie_ids || []).some(id => activeMovieIds.has(id)));
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
  generated_at: reportGeneratedAt,
  public_window: { as_of: publicManifest.as_of, end_date: publicManifest.end_date, rows: publicRows, expected_rows: publicManifest.public_rows },
  schedule_freshness: {
    checked_at: reconciliation?.checked_at || null,
    as_of: reconciliation?.as_of || null,
    stale_screenings_in_window: reconciliation?.stale_screenings_in_window || 0,
    stale_marked_this_run: reconciliation?.stale_marked_this_run || 0,
    pending_candidates: reconciliation?.pending_candidates || 0,
    fresh_snapshot_rows: reconciliation?.fresh_snapshot_rows || 0,
    last_known_good_rows: reconciliation?.last_known_good_rows || 0,
    public_excluded_stale_status_rows: publicManifest.excluded_stale_status_rows || 0,
    public_excluded_stale_fallback_rows: publicManifest.excluded_stale_fallback_rows || 0,
    public_excluded_stale_fallback_by_source: publicManifest.excluded_stale_fallback_by_source || {},
    fallback_max_age_hours: publicManifest.fallback_max_age_hours || 168,
    policy: reconciliation?.policy || null
  },
  sources: {
    checked: Object.keys(sourceStatuses).length,
    statuses: sourceSummaries,
    failed_or_degraded: failedSources,
    issue_history: { file: 'cinema/data/reports/source-issue-history.json', recorded_this_run: recordSourceHistory, issues: issueHistorySummary }
  },
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
    canonical_registry: {
      unique_active_films: activeCanonicalMovies.length,
      poster_yes: activeCanonicalMovies.filter(movie => movie.poster_status === 'yes').length,
      poster_no: activeCanonicalMovies.filter(movie => movie.poster_status === 'no').length,
      fetch_states: Object.fromEntries([...new Set(activeCanonicalMovies.map(movie => movie.poster_fetch_state))].sort().map(state => [state, activeCanonicalMovies.filter(movie => movie.poster_fetch_state === state).length]))
    },
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
    `- Schedule freshness: ${report.schedule_freshness.pending_candidates} pending checks; ${report.schedule_freshness.stale_screenings_in_window} stale archived; excluded from public view: ${report.schedule_freshness.public_excluded_stale_status_rows} stale and ${report.schedule_freshness.public_excluded_stale_fallback_rows} expired fallback rows`,
    `- Sources failed/degraded: ${failedSources.length}`,
    `- Active films without posters: ${missingPosters.length}`,
    `- Canonical film registry: ${activeCanonicalMovies.length} unique active films; ${activeCanonicalMovies.filter(movie => movie.poster_status === 'yes').length} poster yes; ${activeCanonicalMovies.filter(movie => movie.poster_status === 'no').length} poster no`,
    `- Invalid poster URLs: ${invalidPosters.length}`,
    `- Missing movie IDs: ${missingMovieReferences.length}`,
    `- Unknown cinema IDs: ${unknownCinemaReferences.length}`,
    `- Ambiguous movie matches: ${movieAmbiguities.length + posterAmbiguities.length}`,
    `- Ambiguous or unmatched cinema matches: ${cinemaAmbiguities.length + unmatchedCinemas.length}`,
    '',
    'Full report files:',
    '- `cinema/data/reports/source-health.json`',
    '- `cinema/data/reports/source-issue-history.json`',
    '- `cinema/data/reports/matching-review.json`',
    '- `cinema/data/reports/poster-id-audit.json`',
    '- `cinema/data/reports/automation-health.json`'
  ];
  if (failedSources.length) {
    lines.push('', '### Sources needing attention');
    for (const source of failedSources) {
      const issue = source.recurring_issue;
      lines.push(`- ${source.source}: ${source.error || source.health}${issue ? `; ${issue.consecutive_failures} consecutive failures, ${issue.total_occurrence_count} total observations` : ''}`);
      if (issue?.next_steps?.length) lines.push(`  - Next: ${issue.next_steps[0]}`);
    }
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
