import { screeningIdentityKey } from './movie-schema.mjs';

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

export function dedupeRows(rows) {
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

