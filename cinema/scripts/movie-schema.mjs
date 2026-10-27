import crypto from 'node:crypto';

export function normalizeMovieTitle(value) {
  return String(value || '').replace(/&(?:amp|quot|apos|#39|rsquo|lsquo|rdquo|ldquo|ndash|mdash|hellip);/g, entity => ({
    '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&rsquo;': '’', '&lsquo;': '‘',
    '&rdquo;': '”', '&ldquo;': '“', '&ndash;': '–', '&mdash;': '—', '&hellip;': '…'
  })[entity] || entity).normalize('NFKC').toLocaleLowerCase()
    .replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/[‐‑‒–—]/g, '-')
    .replace(/[\s\u00a0]+/g, ' ').trim();
}

export function movieIdForTitle(title, alternateTitle = null) {
  const key = normalizeMovieTitle(title) || normalizeMovieTitle(alternateTitle);
  return key ? `m_${crypto.createHash('sha1').update(key).digest('hex').slice(0, 12)}` : null;
}

export function movieIdForRow(row) {
  return row.movie_id || movieIdForTitle(row.movie_title, row.movie_title_en);
}

export function screeningKey(row) {
  const key = [row.cinema_id, movieIdForRow(row) || normalizeMovieTitle(row.movie_title_en || row.movie_title), row.start_time, row.hall || '', row.format || ''].join('|');
  if (row.source === 'vieshow-official-browser') return `${key}|vieshow:${row.source_event_id || row.id || ''}`;
  return key;
}

export function screeningIdentityKey(row) {
  return [row.cinema_id, movieIdForRow(row) || normalizeMovieTitle(row.movie_title_en || row.movie_title), row.start_time, row.hall || '', row.format || ''].join('|');
}

export function knownAgeRating(value) {
  const raw = String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[\s　]/g, '');
  return ({ '普': 'g', '普遍級': 'g', g: 'g', '護': 'p', '保護級': 'p', p: 'p', '輔12': 'pg12', '輔12級': 'pg12', pg12: 'pg12', '輔15': 'pg15', '輔15級': 'pg15', pg15: 'pg15', '限制級': 'r', r: 'r' })[raw] || null;
}

export function buildMovieIndex(rows, programRecords = [], previousRecords = []) {
  const records = new Map();
  const ensure = (title, titleEn = null, movieId = null) => {
    const id = movieId || movieIdForTitle(title, titleEn);
    if (!id) return null;
    if (!records.has(id)) records.set(id, {
      movie_id: id,
      movie_title: title || null,
      international_titles: new Set(),
      genres: new Set(),
      ratings: new Set(),
      posters: new Map(),
      durations: new Map(),
      sources: new Set()
    });
    const record = records.get(id);
    if (!record.movie_title && title) record.movie_title = title;
    if (titleEn) record.international_titles.add(titleEn);
    return record;
  };
  const add = (row, sourceHint = '') => {
    const record = ensure(row.movie_title || row.title, row.movie_title_en || row.nameAlternative, row.movie_id);
    if (!record) return;
    for (const title of row.international_titles || []) if (title) record.international_titles.add(title);
    for (const genre of row.genres || []) if (genre) record.genres.add(genre);
    const rating = knownAgeRating(row.rating);
    if (rating) record.ratings.add(rating);
    const poster = row.poster_url || null;
    if (poster) {
      const candidate = record.posters.get(poster) || { count: 0, official: false };
      candidate.count++;
      candidate.official ||= /showtimes-official|official bootstrap/i.test(`${sourceHint} ${row.source || ''} ${row.metadata_source || ''}`);
      record.posters.set(poster, candidate);
    }
    if (Number.isFinite(row.duration_minutes) && row.duration_minutes > 0) record.durations.set(row.duration_minutes, (record.durations.get(row.duration_minutes) || 0) + 1);
    const source = sourceHint || row.source || row.source_name;
    if (source) record.sources.add(source);
    for (const source of row.metadata_sources || []) if (source) record.sources.add(source);
  };

  for (const record of previousRecords) add(record, 'previous-catalog');
  for (const program of programRecords) add(program, 'showtimes-official-program');
  for (const row of rows) add(row);

  const movies = [...records.values()].map(record => {
    const internationalTitles = [...record.international_titles];
    const poster = [...record.posters.entries()].sort((a, b) => Number(b[1].official) - Number(a[1].official) || b[1].count - a[1].count || a[0].localeCompare(b[0]))[0]?.[0] || null;
    const rating = record.ratings.size === 1 ? [...record.ratings][0] : null;
    const durationMinutes = [...record.durations.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] || null;
    return {
      movie_id: record.movie_id,
      movie_title: record.movie_title,
      movie_title_en: internationalTitles[0] || null,
      ...(internationalTitles.length > 1 ? { international_titles: internationalTitles } : {}),
      ...(poster ? { poster_url: poster } : {}),
      ...(record.genres.size ? { genres: [...record.genres].sort() } : {}),
      ...(rating ? { rating } : {}),
      ...(record.ratings.size > 1 ? { rating_conflict: [...record.ratings].sort() } : {}),
      ...(durationMinutes ? { duration_minutes: durationMinutes } : {}),
      ...(record.sources.size ? { metadata_sources: [...record.sources].sort() } : {})
    };
  }).sort((a, b) => String(a.movie_title || a.movie_title_en).localeCompare(String(b.movie_title || b.movie_title_en), 'zh-Hant'));
  return { version: 1, movies };
}

export function expandShowtime(row, movieById) {
  if (!row.movie_id) return row;
  const movie = movieById.get(row.movie_id);
  if (!movie) return row;
  return {
    ...row,
    movie_title: row.movie_title || movie.movie_title,
    movie_title_en: row.movie_title_en || movie.movie_title_en || null,
    poster_url: row.poster_url || movie.poster_url || null,
    genres: row.genres || movie.genres || [],
    rating: row.rating || movie.rating || null,
    duration_minutes: row.duration_minutes || movie.duration_minutes || null
  };
}

export function compactShowtime(row, mappedCinemaIds) {
  const movieId = movieIdForRow(row);
  const compact = { ...row };
  if (movieId) {
    compact.movie_id = movieId;
    for (const field of ['movie_title', 'movie_title_en', 'poster_url', 'genres', 'rating', 'duration_minutes', 'metadata_source']) delete compact[field];
  }
  if (mappedCinemaIds.has(compact.cinema_id)) delete compact.cinema_name;
  for (const [key, value] of Object.entries(compact)) {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) delete compact[key];
  }
  return compact;
}
