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
const MAX_OFFICIAL_DETAIL_LOOKUPS = Math.max(0, Number(process.env.CINEMA_MAX_OFFICIAL_POSTER_LOOKUPS || process.env.CINEMA_MAX_KFA_POSTER_LOOKUPS || 6));
const token = process.env.TMDB_API_READ_ACCESS_TOKEN || '';
const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const readJsonl = async file => fs.readFile(file, 'utf8').then(text => text.split('\n').filter(Boolean).map(JSON.parse)).catch(error => error?.code === 'ENOENT' ? [] : Promise.reject(error));
const titleHash = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
const usefulKey = key => key && (/[\p{Script=Han}]/u.test(key) ? key.length >= 4 : key.length >= 7);
const titleVariants = value => {
  const title = String(value || '').trim();
  if (!title) return [];
  const variants = [title];
  const suffix = title.match(/[｜|]\s*([^｜|]+)$/)?.[1];
  if (suffix) variants.push(suffix);
  const quoted = (title.match(/《/g) || []).length === 1 ? title.match(/《([^《》]+)》/)?.[1] : null;
  if (quoted) variants.push(quoted);
  const program = title.match(/〖[^〗]*[：:]\s*([^〗]+)〗/)?.[1];
  if (program) variants.push(program);
  const unwrapped = title.replace(/^[【\[][^】\]]+[】\]]\s*/, '').replace(/^紀錄片放映院\s*/, '').replace(/^《|》$/g, '');
  if (unwrapped !== title) variants.push(unwrapped);
  const special = title.replace(/^(?:（[^）]+）|\([^)]*\))\s*/, '');
  if (special !== title) variants.push(special);
  return [...new Set(variants.filter(Boolean))];
};
const posterLookupVariants = value => {
  const title = String(value || '').trim();
  if (!title) return [];
  const variants = [...titleVariants(title)];
  const catalogPrefix = title.match(/^[A-Z]\d?[-:]\s*(.+)$/i)?.[1];
  if (catalogPrefix) variants.push(catalogPrefix);
  const encoreReplay = title.replace(/安可直播/g, '安可重播');
  if (encoreReplay !== title) variants.push(encoreReplay);
  const specialEdition = title.replace(/(?:[_\s]*(?:特別場|特別放映)\s*\d*)$/i, '');
  if (specialEdition !== title) variants.push(specialEdition);
  return [...new Set(variants.filter(Boolean))];
};
const titleValues = movie => [...new Set([
  movie.movie_title, movie.title, movie.movie_title_en,
  ...(movie.international_titles || []), ...(movie.title_aliases || []), ...(movie.aliases || [])
].filter(value => typeof value === 'string' && value.trim()).flatMap(titleVariants))];
const keysFor = movie => [...new Set(titleValues(movie).map(posterMatchKey).filter(usefulKey))];
const languageForQuery = value => /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(value) ? 'ja-JP'
  : /\p{Script=Hangul}/u.test(value) ? 'ko-KR'
    : /\p{Script=Han}/u.test(value) ? 'zh-TW' : 'en-US';
const querySignature = (query, language) => `${language}|${posterMatchKey(query)}`;
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
  for (const alias of aliases.flatMap(posterLookupVariants)) {
    const key = posterMatchKey(alias);
    if (!usefulKey(key)) continue;
    const urls = posterByAlias.get(key) || new Map();
    const existing = urls.get(record.poster_url);
    if (!existing || record.preferred === true) urls.set(record.poster_url, record);
    posterByAlias.set(key, urls);
  }
}

// First reuse an unambiguous local poster. This runs before any remote lookup.
inheritUnambiguousTitlePosters(catalog.movies, posterIndex.movies);

let remoteLookups = 0, reused = 0, fetched = 0, ambiguous = 0, deferred = 0, notFound = 0;
let kfaCalendarRequests = 0, fuzhongScheduleRequests = 0, officialPosterLookups = 0, officialPosterMatches = 0;
const cachedQueries = new Map();
let providerCircuitError = null;
let kfaCalendarPromise = null;
let fuzhongSchedulePromise = null;
const kfaPageCache = new Map();
const fuzhongPageCache = new Map();

const decodeHtml = value => String(value || '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
  .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)));
const htmlText = value => decodeHtml(String(value || '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const kfaTitleKeys = values => [...new Set(values.flatMap(value => {
  const text = String(value || '').trim();
  const unprefixed = text.replace(/^.*[｜|：:]\s*/, '').replace(/^【[^】]*】\s*/, '').replace(/^紀錄片放映院\s*/, '');
  const quoted = text.match(/《([^》]+)》/)?.[1];
  return [text, unprefixed, quoted].filter(Boolean).map(value => posterMatchKey(value)).filter(usefulKey);
}))];

async function readKfaCalendar() {
  if (!kfaCalendarPromise) kfaCalendarPromise = (async () => {
    kfaCalendarRequests++;
    const response = await fetch('https://kfa.kcg.gov.tw/tw/calendar', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`KFA calendar HTTP ${response.status}`);
    const html = await response.text();
    const pages = [];
    for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = match[1].match(/\bhref\s*=\s*['"]([^'"]+)['"]/i)?.[1];
      if (!href || !/\/tw\/movies-content\//i.test(href)) continue;
      const title = htmlText(match[2]);
      if (!title) continue;
      pages.push({ title, url: new URL(href, 'https://kfa.kcg.gov.tw').href, key: posterMatchKey(title) });
    }
    return [...new Map(pages.map(page => [page.url, page])).values()];
  })();
  return kfaCalendarPromise;
}

async function readFuzhongSchedule() {
  if (!fuzhongSchedulePromise) fuzhongSchedulePromise = (async () => {
    fuzhongScheduleRequests++;
    const taipei = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit'
    }).formatToParts(today).map(part => [part.type, part.value]));
    const year = Number(taipei.year), month = Number(taipei.month);
    const date = value => value.toISOString().slice(0, 10);
    const firstDay = date(new Date(Date.UTC(year, month - 1, 1)));
    const lastDayNextMonth = date(new Date(Date.UTC(year, month + 2, 0)));
    const scheduleUrl = new URL('https://www.fuzhong15.ntpc.gov.tw/xcmovie');
    scheduleUrl.search = new URLSearchParams({ bdate: firstDay, edate: lastDayNextMonth, xsmsid: '0M361641875264878260' }).toString();
    const response = await fetch(scheduleUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Fuzhong 15 schedule HTTP ${response.status}`);
    const html = await response.text();
    const pages = [];
    for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const attrs = match[1];
      const href = attrs.match(/\bhref\s*=\s*['"]([^'"]+)['"]/i)?.[1];
      if (!href || !/\/xcmovie\/cont\?[^'"\s]*\bsid=/i.test(href)) continue;
      const title = htmlText(match[2])
        || attrs.match(/\b(?:title|aria-label)\s*=\s*['"]([^'"]+)['"]/i)?.[1]
        || match[2].match(/<img\b[^>]*\balt\s*=\s*['"]([^'"]+)['"]/i)?.[1]
        || '';
      if (!title) continue;
      pages.push({ title, url: new URL(href.replaceAll('&amp;', '&'), 'https://www.fuzhong15.ntpc.gov.tw').href, key: posterMatchKey(title) });
    }
    return [...new Map(pages.map(page => [page.url, page])).values()];
  })();
  return fuzhongSchedulePromise;
}

function findKfaPage(group, pages) {
  const keys = kfaTitleKeys([...group.aliases, ...group.movies.flatMap(movie => [movie.movie_title, movie.movie_title_en])]);
  const ranked = pages.map(page => {
    const score = Math.max(0, ...keys.map(key => page.key === key ? 1000 + key.length
      : key.length >= 4 && page.key.includes(key) ? 500 + key.length
        : page.key.length >= 4 && key.includes(page.key) ? 250 + page.key.length : 0));
    return { ...page, score };
  }).filter(page => page.score > 0).sort((a, b) => b.score - a.score);
  return ranked[0] || null;
}

function findOfficialPage(group, pages) {
  const keys = kfaTitleKeys([...group.aliases, ...group.movies.flatMap(movie => [movie.movie_title, movie.movie_title_en])]);
  const ranked = pages.map(page => {
    const pageKey = page.key || posterMatchKey(page.title);
    const score = Math.max(0, ...keys.map(key => pageKey === key ? 1000 + key.length
      : key.length >= 4 && pageKey.includes(key) ? 500 + key.length
        : pageKey.length >= 4 && key.includes(pageKey) ? 250 + pageKey.length : 0));
    return { ...page, key: pageKey, score };
  }).filter(page => page.score > 0).sort((a, b) => b.score - a.score);
  if (!ranked.length || (ranked[1] && ranked[0].score === ranked[1].score && ranked[0].url !== ranked[1].url)) return null;
  return ranked[0];
}

function posterImageFromOfficialPage(html, baseUrl) {
  const links = [...String(html || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(match => {
    const href = match[1].match(/\bhref\s*=\s*['"]([^'"]+)['"]/i)?.[1];
    return { href, label: htmlText(match[2]), body: match[2] };
  }).filter(link => link.href && /\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(link.href) && /\/files\//i.test(link.href));
  const posterLink = links.find(link => /\bimage\b|\bposter\b|海報|圖片/i.test(link.label)) || links[0];
  if (posterLink) return new URL(posterLink.href, baseUrl).href;
  const image = String(html || '').match(/<img\b[^>]*\bsrc\s*=\s*['"]([^'"]*\/files\/[^'"]+\.(?:jpe?g|png|webp)(?:[?#][^'"]*)?)['"]/i)?.[1];
  return image ? new URL(image, baseUrl).href : null;
}

async function fetchKfaPoster(group) {
  const pages = await readKfaCalendar();
  const page = findKfaPage(group, pages);
  if (!page || officialPosterLookups >= MAX_OFFICIAL_DETAIL_LOOKUPS) return { attempted: false, poster_url: null };
  const requested = !kfaPageCache.has(page.url);
  if (!kfaPageCache.has(page.url)) {
    const promise = (async () => {
      officialPosterLookups++;
      const response = await fetch(page.url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`KFA film page HTTP ${response.status}`);
      return posterImageFromOfficialPage(await response.text(), 'https://kfa.kcg.gov.tw');
    })();
    kfaPageCache.set(page.url, promise);
  }
  return { attempted: true, requested, poster_url: await kfaPageCache.get(page.url), source_url: page.url };
}

async function fetchFuzhongPoster(group) {
  const pages = await readFuzhongSchedule();
  const page = findOfficialPage(group, pages);
  if (!page || officialPosterLookups >= MAX_OFFICIAL_DETAIL_LOOKUPS) return { attempted: false, poster_url: null };
  const requested = !fuzhongPageCache.has(page.url);
  if (!fuzhongPageCache.has(page.url)) {
    const promise = (async () => {
      officialPosterLookups++;
      const response = await fetch(page.url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Fuzhong 15 film page HTTP ${response.status}`);
      return posterImageFromOfficialPage(await response.text(), 'https://www.fuzhong15.ntpc.gov.tw');
    })();
    fuzhongPageCache.set(page.url, promise);
  }
  return { attempted: true, requested, poster_url: await fuzhongPageCache.get(page.url), source_url: page.url };
}

async function searchTmdb(query, language) {
  const cacheKey = querySignature(query, language);
  if (cachedQueries.has(cacheKey)) return { results: await cachedQueries.get(cacheKey), requested: false };
  if (remoteLookups >= MAX_LOOKUPS) return { results: [], requested: false, budget_exhausted: true };
  const promise = (async () => {
    const url = new URL('https://api.themoviedb.org/3/search/movie');
    url.searchParams.set('query', query);
    url.searchParams.set('language', language);
    url.searchParams.set('include_adult', 'false');
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      const error = new Error(`TMDB HTTP ${response.status}`);
      if ([401, 403, 429].includes(response.status)) providerCircuitError = error.message;
      throw error;
    }
    const payload = await response.json();
    return payload.results || [];
  })();
  remoteLookups++;
  cachedQueries.set(cacheKey, promise);
  return { results: await promise, requested: true };
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
  const indexedRanks = new Map();
  const rawTitleKeys = new Set(group.movies.map(movie => movie.movie_title).filter(Boolean).map(posterMatchKey));
  const expandedLookupKeys = new Set(lookupKeys.flatMap(key => posterLookupVariants(key).map(posterMatchKey).filter(usefulKey)));
  const rememberIndexed = (url, record, rank) => {
    const existing = indexedRanks.get(url);
    if (!existing || rank > existing.rank) indexedRanks.set(url, { record, rank });
  };
  for (const key of expandedLookupKeys) for (const [url, record] of posterByAlias.get(key) || []) {
    rememberIndexed(url, record, rawTitleKeys.has(key) ? 3 : 2);
  }
  if (!indexedRanks.size) for (const key of lookupKeys.filter(value => value.length >= 20 && !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(value))) {
    for (const [candidateKey, urls] of posterByAlias) {
      if (candidateKey.length >= key.length && candidateKey.startsWith(key)) {
        for (const [url, record] of urls) rememberIndexed(url, record, 1);
      }
    }
  }
  const bestIndexRank = Math.max(0, ...[...indexedRanks.values()].map(candidate => candidate.rank));
  const indexedByPoster = new Map([...indexedRanks].map(([url, candidate]) => [url, candidate.record]));
  const knownPosters = new Map([...oldByPoster, ...currentByPoster, ...indexedByPoster]);
  const manualPosters = new Map(old.filter(record => record.poster_fetch_state === 'found_manual' && record.poster_url).map(record => [record.poster_url, record]));
  const preferredPosters = new Map([...indexedByPoster].filter(([, record]) => record.preferred === true));
  const protectedPosters = new Map([...manualPosters, ...preferredPosters]);
  const bestIndexedPosters = new Map([...indexedRanks].filter(([, candidate]) => candidate.rank === bestIndexRank));
  let posterUrl = manualPosters.size === 1 ? [...manualPosters.keys()][0]
    : currentByPoster.size === 1 ? [...currentByPoster.keys()][0]
      : bestIndexedPosters.size === 1 ? [...bestIndexedPosters.keys()][0]
        : preferredPosters.size === 1 ? [...preferredPosters.keys()][0]
          : protectedPosters.size === 0 && knownPosters.size === 1 ? [...knownPosters.keys()][0] : null;
  let posterSource = posterUrl ? (manualPosters.get(posterUrl)?.poster_source || currentByPoster.get(posterUrl)?.metadata_sources?.[0] || indexedByPoster.get(posterUrl)?.sources?.[0] || oldByPoster.get(posterUrl)?.poster_source || 'poster-index') : null;
  let fetchState = posterUrl ? (manualPosters.has(posterUrl) ? 'found_manual'
    : preferredPosters.has(posterUrl) ? (indexedByPoster.get(posterUrl)?.sources?.some(source => ['kaohsiung-film-archive-official', 'fuzhong15-official-movie-page'].includes(source)) ? 'found_official' : 'found_manual') : 'reused')
    : knownPosters.size > 1 || protectedPosters.size > 1 ? 'ambiguous' : 'waiting_for_provider';
  let fetchError = old.map(record => record.poster_fetch_error).filter(Boolean).at(-1) || null;
  let lastLookupAt = old.map(record => record.last_poster_lookup_at).filter(Boolean).sort().at(-1) || null;
  let nextLookupAt = old.map(record => record.next_poster_lookup_at).filter(Boolean).sort().at(-1) || null;
  let attempts = Math.max(0, ...old.map(record => Number(record.poster_lookup_attempts || 0)));
  const attemptedQueries = new Set(old.flatMap(record => Array.isArray(record.poster_lookup_queries) ? record.poster_lookup_queries : []));
  const orderedAliases = [...new Set([
    ...group.movies.map(movie => movie.movie_title),
    ...aliases,
    ...group.movies.map(movie => movie.movie_title_en)
  ].filter(Boolean))];
  const queryPlan = [
    ...orderedAliases.filter(alias => languageForQuery(alias) !== 'en-US').sort((a, b) => posterMatchKey(a).length - posterMatchKey(b).length),
    ...orderedAliases.filter(alias => languageForQuery(alias) === 'en-US').sort((a, b) => posterMatchKey(a).length - posterMatchKey(b).length)
  ].map(query => ({ query, language: languageForQuery(query), signature: querySignature(query, languageForQuery(query)) }))
    .filter((item, index, all) => usefulKey(posterMatchKey(item.query)) && all.findIndex(candidate => candidate.signature === item.signature) === index);
  let officialPosterLookupState = old.map(record => record.official_poster_lookup_state).filter(Boolean).at(-1) || null;
  let officialPosterLookupError = old.map(record => record.official_poster_lookup_error).filter(Boolean).at(-1) || null;
  let officialPosterNextLookupAt = old.map(record => record.official_poster_next_lookup_at).filter(Boolean).sort().at(-1) || null;
  let officialPosterLookupAttempts = Math.max(0, ...old.map(record => Number(record.official_poster_lookup_attempts || 0)));
  if (posterUrl && posterUrl !== currentByPoster.keys().next().value && indexedByPoster.has(posterUrl)) {
    const sourceRecord = indexedByPoster.get(posterUrl);
    for (const movie of group.movies) {
      if (!movie.poster_url) movie.poster_url = posterUrl;
      movie.metadata_sources = [...new Set([...(movie.metadata_sources || []), ...(sourceRecord.sources || []), 'canonical-poster-title-match'])];
    }
  }
  if (!posterUrl && knownPosters.size === 0 && (!officialPosterNextLookupAt || Date.parse(officialPosterNextLookupAt) <= today.getTime())) {
    let official = null;
    const sourceErrors = [];
    try { official = await fetchKfaPoster(group); }
    catch (error) { sourceErrors.push(`KFA: ${error?.message || error}`); }
    if (!official?.poster_url) {
      try {
        const fuzhong = await fetchFuzhongPoster(group);
        if (fuzhong.attempted || fuzhong.poster_url) official = { ...fuzhong, source: 'fuzhong15-official-movie-page' };
      } catch (error) { sourceErrors.push(`Fuzhong 15: ${error?.message || error}`); }
    }
    if (official?.attempted) {
      officialPosterLookupAttempts++;
      officialPosterNextLookupAt = new Date(today.getTime() + (official.poster_url ? LOOKUP_COOLDOWN_MS : 7 * 86400000)).toISOString();
      officialPosterLookupState = official.poster_url ? 'found_official' : 'not_found';
      officialPosterLookupError = null;
      if (official.poster_url) {
        posterUrl = official.poster_url;
        posterSource = official.source || 'kaohsiung-film-archive-official';
        fetchState = 'found_official';
        officialPosterMatches++;
        for (const movie of group.movies) {
          movie.poster_url = posterUrl;
          movie.metadata_sources = [...new Set([...(movie.metadata_sources || []), posterSource])];
          movie.preferred = true;
        }
      }
    } else if (sourceErrors.length) {
      officialPosterLookupAttempts++;
      officialPosterLookupState = 'error';
      officialPosterLookupError = sourceErrors.join(' | ').slice(0, 200);
      officialPosterNextLookupAt = new Date(today.getTime() + 7 * 86400000).toISOString();
    }
  }
  // Older records only stored a count. Mark the original single-title zh-TW query as tried,
  // then continue with the remaining local-language and international aliases.
  if (attempts > 0 && !old.some(record => Array.isArray(record.poster_lookup_queries))) {
    const legacyQuery = [group.movies[0]?.movie_title_en, group.movies[0]?.movie_title, ...aliases].find(Boolean);
    if (legacyQuery) attemptedQueries.add(querySignature(legacyQuery, 'zh-TW'));
  }

  if (fetchState === 'ambiguous') ambiguous++;
  if (!posterUrl && knownPosters.size === 0) {
    const hasUntriedAlias = queryPlan.some(item => !attemptedQueries.has(item.signature));
    const errorCooldown = old.some(record => ['error', 'provider_circuit_open'].includes(record.poster_fetch_state));
    const notDue = nextLookupAt && Date.parse(nextLookupAt) > today.getTime() && (!hasUntriedAlias || errorCooldown);
    if (notDue) fetchState = old.some(record => record.poster_fetch_state === 'not_found') ? 'not_found' : 'cooldown';
    else if (!token) { fetchState = 'waiting_for_provider'; deferred++; }
    else if (providerCircuitError) {
      fetchState = 'provider_circuit_open';
      fetchError = providerCircuitError;
      lastLookupAt ||= now;
      nextLookupAt = new Date(today.getTime() + 7 * 86400000).toISOString();
      deferred++;
    }
    else {
      const keySet = expandedLookupKeys;
      const remoteCandidates = new Map();
      let budgetExhausted = false;
      let searchFailed = false;
      for (const item of queryPlan) {
        if (attemptedQueries.has(item.signature)) continue;
        let response;
        const lookupsBeforeRequest = remoteLookups;
        try {
          response = await searchTmdb(item.query, item.language);
        } catch (error) {
          if (remoteLookups > lookupsBeforeRequest) { attempts++; lastLookupAt = now; }
          fetchError = String(error?.message || error).slice(0, 200);
          searchFailed = true;
          break;
        }
        if (response.budget_exhausted) { budgetExhausted = true; break; }
        attemptedQueries.add(item.signature);
        if (response.requested) { attempts++; lastLookupAt = now; }
        for (const candidate of response.results || []) {
          if (!candidate.poster_path || ![candidate.title, candidate.original_title].some(title => keySet.has(posterMatchKey(title)))) continue;
          const url = `https://image.tmdb.org/t/p/w500${candidate.poster_path}`;
          remoteCandidates.set(url, candidate);
        }
        if (providerCircuitError) { searchFailed = true; break; }
      }
      if (remoteCandidates.size === 1) {
        posterUrl = [...remoteCandidates.keys()][0];
        posterSource = 'the-movie-database';
        fetchState = 'found';
        fetched++;
      } else if (remoteCandidates.size > 1) {
        fetchState = 'ambiguous';
        ambiguous++;
        nextLookupAt = new Date(today.getTime() + LOOKUP_COOLDOWN_MS).toISOString();
      } else if (searchFailed) {
        fetchState = providerCircuitError ? 'provider_circuit_open' : 'error';
        nextLookupAt = new Date(today.getTime() + 7 * 86400000).toISOString();
        deferred++;
      } else if (budgetExhausted || queryPlan.some(item => !attemptedQueries.has(item.signature))) {
        fetchState = 'queued';
        nextLookupAt = null;
        deferred++;
      } else {
        fetchState = 'not_found';
        notFound++;
        nextLookupAt = new Date(today.getTime() + LOOKUP_COOLDOWN_MS).toISOString();
      }
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
    source_poster_candidates: [...new Map([...oldByPoster, ...currentByPoster, ...indexedByPoster].values()
      .filter(record => record.poster_url && record.poster_url !== posterUrl)
      .map(record => [record.poster_url, { poster_url: record.poster_url, title: record.movie_title || record.title || null, sources: record.sources || record.metadata_sources || [] }])).values()],
    poster_status: posterUrl ? 'yes' : 'no',
    has_poster: Boolean(posterUrl),
    poster_url: posterUrl,
    poster_source: posterSource,
    poster_fetch_state: fetchState,
    poster_lookup_attempts: attempts,
    poster_lookup_queries: [...attemptedQueries].sort(),
    official_poster_lookup_attempts: officialPosterLookupAttempts,
    official_poster_lookup_state: officialPosterLookupState,
    official_poster_next_lookup_at: officialPosterNextLookupAt,
    official_poster_lookup_error: officialPosterLookupError,
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
    official_poster_calendar_requests_this_run: kfaCalendarRequests,
    official_poster_schedule_requests_this_run: fuzhongScheduleRequests,
    official_poster_page_requests_this_run: officialPosterLookups,
    official_poster_matches_this_run: officialPosterMatches,
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
  official_poster_calendar_requests: kfaCalendarRequests,
  official_poster_schedule_requests: fuzhongScheduleRequests,
  official_poster_page_requests: officialPosterLookups,
  official_posters_fetched: officialPosterMatches,
  posters_fetched: fetched,
  lookups_deferred: deferred,
  ambiguous_matches: ambiguous,
  no_results: notFound,
  provider_configured: Boolean(token)
}, null, 2));
