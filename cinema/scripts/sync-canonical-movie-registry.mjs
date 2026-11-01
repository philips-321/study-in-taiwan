import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { inheritUnambiguousTitlePosters, posterMatchKey } from './movie-schema.mjs';
import { writePosterIndex } from './poster-index.mjs';

const DATA_ROOT = path.resolve('cinema/data');
const CANONICAL_ROOT = path.join(DATA_ROOT, 'canonical');
const REGISTRY_FILE = path.join(CANONICAL_ROOT, 'movie-registry.jsonl');
const CATALOG_FILE = path.join(DATA_ROOT, 'movies/index.json');
const POSTER_INDEX_FILE = path.join(DATA_ROOT, 'movie-metadata/poster-index.json');
const MANIFEST_FILE = path.join(CANONICAL_ROOT, 'manifest.json');
const LOOKUP_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_LOOKUPS = Math.max(0, Number(process.env.CINEMA_MAX_POSTER_LOOKUPS || 60));
const token = process.env.TMDB_API_READ_ACCESS_TOKEN || '';
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const readJsonl = async file => fs.readFile(file, 'utf8').then(text => text.split('\n').filter(Boolean).map(JSON.parse)).catch(error => error?.code === 'ENOENT' ? [] : Promise.reject(error));
const titleHash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
const usefulKey = key => key && (/[\p{Script=Han}]/u.test(key) ? key.length >= 4 : key.length >= 7);
const titleValues = movie => [...new Set([
  movie.movie_title, movie.title, movie.movie_title_en,
  ...(movie.international_titles || []), ...(movie.title_aliases || []), ...(movie.aliases || [])
].filter(value => typeof value === 'string' && value.trim()))];
const keysFor = movie => [...new Set(titleValues(movie).map(posterMatchKey).filter(usefulKey))];
const today = new Date();
const now = today.toISOString();

const [catalog, posterIndex, priorRecords, canonicalManifest] = await Promise.all([
  readJson(CATALOG_FILE),
  readJson(POSTER_INDEX_FILE).catch(error => error?.code === 'ENOENT' ? { movies: [] } : Promise.reject(error)),
  readJsonl(REGISTRY_FILE),
  readJson(MANIFEST_FILE).catch(error => error?.code === 'ENOENT' ? {} : Promise.reject(error))
]);
catalog.movies ||= [];
posterIndex.movies ||= [];
const movieById = new Map(catalog.movies.map(movie => [movie.movie_id, movie]));
const parent = new Map([...movieById.keys()].map(id => [id, id]));
const find = id => {
  let root = id;
  while (parent.get(root) !== root) root = parent.get(root);
  while (parent.get(id) !== id) { const next = parent.get(id); parent.set(id, root); id = next; }
  return root;
};
const join = (a, b) => { const left = find(a), right = find(b); if (left !== right) parent.set([left, right].sort()[1], [left, right].sort()[0]); };
const idsByAlias = new Map();
for (const movie of catalog.movies) for (const key of keysFor(movie)) {
  const ids = idsByAlias.get(key) || [];
  ids.push(movie.movie_id);
  idsByAlias.set(key, ids);
}
for (const ids of idsByAlias.values()) for (const id of ids.slice(1)) join(ids[0], id);

const groups = new Map();
for (const movie of catalog.movies) {
  const root = find(movie.movie_id);
  const group = groups.get(root) || { movies: [], aliases: new Set(), lookupKeys: new Set() };
  group.movies.push(movie);
  for (const title of titleValues(movie)) group.aliases.add(title);
  for (const key of keysFor(movie)) group.lookupKeys.add(key);
  groups.set(root, group);
}
const priorByAlias = new Map();
const priorByMovieId = new Map();
for (const record of priorRecords) for (const key of record.lookup_keys || keysFor(record)) {
  const list = priorByAlias.get(key) || [];
  list.push(record);
  priorByAlias.set(key, list);
}
for (const record of priorRecords) for (const id of record.movie_ids || []) {
  const list = priorByMovieId.get(id) || [];
  list.push(record);
  priorByMovieId.set(id, list);
}
const posterByAlias = new Map();
for (const record of posterIndex.movies) {
  if (!record.poster_url) continue;
  const aliases = [...new Set([record.movie_title, ...(record.aliases || [])].filter(Boolean))];
  for (const alias of aliases) {
    const key = posterMatchKey(alias);
    if (!usefulKey(key)) continue;
    const urls = posterByAlias.get(key) || new Map();
    urls.set(record.poster_url, record);
    posterByAlias.set(key, urls);
  }
}

// First reuse an unambiguous local poster. This runs before any remote lookup.
inheritUnambiguousTitlePosters(catalog.movies, posterIndex.movies);

let remoteLookups = 0, reused = 0, fetched = 0, ambiguous = 0, deferred = 0, notFound = 0;
const cachedQueries = new Map();
let providerCircuitError = null;
async function searchTmdb(query, keySet) {
  const cacheKey = `${posterMatchKey(query)}|${[...keySet].sort().join(',')}`;
  if (cachedQueries.has(cacheKey)) return cachedQueries.get(cacheKey);
  const promise = (async () => {
    const url = new URL('https://api.themoviedb.org/3/search/movie');
    url.searchParams.set('query', query);
    url.searchParams.set('language', 'zh-TW');
    url.searchParams.set('include_adult', 'false');
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      const error = new Error(`TMDB HTTP ${response.status}`);
      if ([401, 403, 429].includes(response.status)) providerCircuitError = error.message;
      throw error;
    }
    const payload = await response.json();
    const candidates = (payload.results || []).filter(movie => movie.poster_path && [movie.title, movie.original_title].some(title => keySet.has(posterMatchKey(title))));
    const byPoster = new Map(candidates.map(movie => [`https://image.tmdb.org/t/p/w500${movie.poster_path}`, movie]));
    if (byPoster.size > 1) return { state: 'ambiguous', candidates: [...byPoster.keys()] };
    if (!byPoster.size) return { state: 'not_found', candidates: [] };
    return { state: 'found', poster_url: [...byPoster.keys()][0], result: [...byPoster.values()][0] };
  })();
  cachedQueries.set(cacheKey, promise);
  return promise;
}

const nextRecords = [];
const matchedPrior = new Set();
const groupItems = [...groups.values()].sort((a, b) => String(a.movies[0]?.movie_title).localeCompare(String(b.movies[0]?.movie_title), 'zh-Hant'));
for (const group of groupItems) {
  const movieIds = group.movies.map(movie => movie.movie_id).sort();
  const aliases = [...group.aliases].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const lookupKeys = [...group.lookupKeys].sort();
  const old = [...new Set([
    ...lookupKeys.flatMap(key => priorByAlias.get(key) || []),
    ...movieIds.flatMap(id => priorByMovieId.get(id) || [])
  ])];
  old.forEach(record => matchedPrior.add(record));
  const oldByPoster = new Map(old.filter(record => record.poster_url).map(record => [record.poster_url, record]));
  const currentByPoster = new Map(group.movies.filter(movie => movie.poster_url).map(movie => [movie.poster_url, movie]));
  const indexedByPoster = new Map();
  for (const key of lookupKeys) for (const [url, record] of posterByAlias.get(key) || []) indexedByPoster.set(url, record);
  const knownPosters = new Map([...oldByPoster, ...currentByPoster, ...indexedByPoster]);
  let posterUrl = knownPosters.size === 1 ? [...knownPosters.keys()][0] : null;
  let posterSource = posterUrl ? (currentByPoster.get(posterUrl)?.metadata_sources?.[0] || indexedByPoster.get(posterUrl)?.sources?.[0] || oldByPoster.get(posterUrl)?.poster_source || 'poster-index') : null;
  let fetchState = posterUrl ? 'reused' : knownPosters.size > 1 ? 'ambiguous' : 'waiting_for_provider';
  let fetchError = old.map(record => record.poster_fetch_error).filter(Boolean).at(-1) || null;
  let lastLookupAt = old.map(record => record.last_poster_lookup_at).filter(Boolean).sort().at(-1) || null;
  let nextLookupAt = old.map(record => record.next_poster_lookup_at).filter(Boolean).sort().at(-1) || null;
  let attempts = Math.max(0, ...old.map(record => Number(record.poster_lookup_attempts || 0)));

  if (knownPosters.size > 1) ambiguous++;
  if (!posterUrl && knownPosters.size === 0) {
    const notDue = nextLookupAt && Date.parse(nextLookupAt) > today.getTime();
    if (notDue) fetchState = old.some(record => record.poster_fetch_state === 'not_found') ? 'not_found' : 'cooldown';
    else if (!token) { fetchState = 'waiting_for_provider'; deferred++; }
    else if (providerCircuitError) {
      fetchState = 'provider_circuit_open';
      fetchError = providerCircuitError;
      lastLookupAt ||= now;
      nextLookupAt = new Date(today.getTime() + 7 * 86400000).toISOString();
      deferred++;
    }
    else if (remoteLookups >= MAX_LOOKUPS) { fetchState = 'queued'; deferred++; }
    else {
      remoteLookups++;
      attempts++;
      lastLookupAt = now;
      const keySet = new Set(lookupKeys);
      const query = [
        group.movies[0]?.movie_title_en,
        group.movies[0]?.movie_title,
        ...aliases
      ].find(Boolean);
      let result = { state: 'not_found', candidates: [] };
      try {
        if (query) result = await searchTmdb(query, keySet);
      } catch (error) {
        result = { state: 'error', error: String(error?.message || error).slice(0, 200) };
        fetchError = result.error;
      }
      if (result.state === 'found') {
        posterUrl = result.poster_url;
        posterSource = 'the-movie-database';
        fetchState = 'found';
        fetched++;
      } else if (result.state === 'ambiguous') {
        fetchState = 'ambiguous';
        ambiguous++;
      } else {
        fetchState = result.state;
        if (result.state === 'not_found') notFound++;
      }
      nextLookupAt = new Date(today.getTime() + (result.state === 'error' ? 7 * 86400000 : LOOKUP_COOLDOWN_MS)).toISOString();
    }
  }

  if (posterUrl) for (const movie of group.movies) {
    if (!movie.poster_url) {
      movie.poster_url = posterUrl;
      movie.metadata_sources = [...new Set([...(movie.metadata_sources || []), posterSource === 'the-movie-database' ? 'the-movie-database' : 'canonical-poster-title-match'])];
      reused++;
    }
  }
  const priorId = old.map(record => record.canonical_movie_id).filter(Boolean).sort()[0];
  const primaryKey = posterMatchKey(group.movies[0]?.movie_title) || lookupKeys[0] || movieIds[0];
  const canonicalMovieId = priorId || `film_${titleHash(primaryKey)}`;
  nextRecords.push({
    canonical_movie_id: canonicalMovieId,
    lookup_key: primaryKey,
    lookup_keys: lookupKeys,
    movie_ids: movieIds,
    title: group.movies[0]?.movie_title || aliases[0] || null,
    title_aliases: aliases,
    poster_status: posterUrl ? 'yes' : 'no',
    has_poster: Boolean(posterUrl),
    poster_url: posterUrl,
    poster_source: posterSource,
    poster_fetch_state: fetchState,
    poster_lookup_attempts: attempts,
    last_poster_lookup_at: lastLookupAt,
    next_poster_lookup_at: nextLookupAt,
    poster_fetch_error: fetchError,
    updated_at: now
  });
}

// Keep historical titles even when they have no screening in today's window.
for (const record of priorRecords) if (!matchedPrior.has(record)) nextRecords.push(record);
// Different release variants can intentionally normalize to the same display key.
// Keep canonical IDs unique by adding the stable catalog IDs only when keys collide.
const claimedCanonicalIds = new Set();
for (const record of nextRecords) {
  const originalId = record.canonical_movie_id;
  let candidateId = originalId;
  let salt = 0;
  while (!candidateId || claimedCanonicalIds.has(candidateId)) {
    const identity = `${record.lookup_key || record.title || ''}|${(record.movie_ids || []).slice().sort().join('|')}|${salt++}`;
    candidateId = `film_${titleHash(identity)}`;
  }
  record.canonical_movie_id = candidateId;
  claimedCanonicalIds.add(candidateId);
}
catalog.generated_at = now;
await fs.writeFile(CATALOG_FILE, `${JSON.stringify(catalog, null, 2)}\n`);
await writePosterIndex(DATA_ROOT, catalog.movies);
await fs.mkdir(CANONICAL_ROOT, { recursive: true });
nextRecords.sort((a, b) => String(a.canonical_movie_id).localeCompare(String(b.canonical_movie_id)));
await fs.writeFile(REGISTRY_FILE, `${nextRecords.map(record => JSON.stringify(record)).join('\n')}\n`);

const posterYes = nextRecords.filter(record => record.poster_status === 'yes').length;
const posterNo = nextRecords.length - posterYes;
const updatedManifest = {
  ...canonicalManifest,
  schema: 'canonical-screening-manifest',
  version: 1,
  movie_registry: {
    file: 'movie-registry.jsonl',
    unique_films: nextRecords.length,
    poster_yes: posterYes,
    poster_no: posterNo,
    poster_lookups_attempted_this_run: remoteLookups,
    poster_fetches_this_run: fetched,
    poster_lookups_deferred: deferred,
    ambiguous_poster_matches: ambiguous,
    last_poster_sync_at: now
  },
  updated_at: now
};
await fs.writeFile(MANIFEST_FILE, `${JSON.stringify(updatedManifest, null, 2)}\n`);
console.log(JSON.stringify({
  canonical_films: nextRecords.length,
  poster_yes: posterYes,
  poster_no: posterNo,
  local_poster_reuses: reused,
  poster_lookups_attempted: remoteLookups,
  posters_fetched: fetched,
  lookups_deferred: deferred,
  ambiguous_matches: ambiguous,
  no_results: notFound,
  provider_configured: Boolean(token)
}, null, 2));
