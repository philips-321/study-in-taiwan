const BASE = 'https://twshowtimes.com';
const DIRECTORY = `${BASE}/cinemas/`;
const CONCURRENCY = 3;
const AUDIO_LANGUAGES = [
  ['英語', 'en'], ['日語', 'ja'], ['韓語', 'ko'], ['國語', 'zh'], ['粵語', 'yue'],
  ['越語', 'vi'], ['泰語', 'th'], ['菲語', 'fil'], ['法語', 'fr'], ['德語', 'de'],
  ['西語', 'es'], ['印尼語', 'id'], ['馬來語', 'ms'], ['印度語', 'hi']
];

function decodeHtml(value) {
  return String(value || '').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function tagText(value) {
  return decodeHtml(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalizeCinemaName(value) {
  return String(value || '').normalize('NFKC').replace(/臺/g, '台').toLocaleLowerCase()
    .replace(/(?:電影城|電影院|電影館|影城|戲院|劇院)/g, '')
    .replace(/[\s　・·()（）\-_/]/g, '');
}

function localDate(offset = 0) {
  const now = new Date(Date.now() + offset * 86400000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const date = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${date.year}-${date.month}-${date.day}`;
}

function cinemaLinks(html) {
  return [...String(html || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)]
    .map(match => {
      const href = match[1].match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
      const label = tagText(match[2]);
      if (!href || !label) return null;
      const url = new URL(decodeHtml(href), `${BASE}/`);
      if (!url.pathname.startsWith('/cinemas/showtimes-')) return null;
      return { href: url.href.replace(/\/$/, ''), label };
    })
    .filter(Boolean);
}

export function matchTwShowtimesCinemas(html, targetCinemas) {
  const links = cinemaLinks(html);
  const matches = new Map();
  const ambiguous = [];
  for (const cinema of targetCinemas || []) {
    const target = normalizeCinemaName(cinema.name_zh);
    const candidates = links.filter(link => {
      const label = normalizeCinemaName(link.label);
      return target.length >= 4 && label.length >= 4 &&
        (label === target || label.includes(target) || target.includes(label));
    });
    if (candidates.length === 1) matches.set(cinema.id, { cinema, url: candidates[0].href });
    else if (candidates.length > 1) ambiguous.push(`${cinema.name_zh}: ${candidates.map(item => item.label).join(', ')}`);
  }
  return { matches, unmatched: (targetCinemas || []).filter(cinema => !matches.has(cinema.id)).map(cinema => cinema.name_zh), ambiguous };
}

export function parseTwShowtimesDailyHtml(html, cinema, sourceUrl) {
  const text = String(html || '');
  const date = text.match(/<h2\b[^>]*>\s*(20\d{2}-\d{2}-\d{2})\s*片單/i)?.[1];
  if (!date) return [];
  const cardsStart = text.indexOf('片單', text.search(/<h2\b[^>]*>\s*20\d{2}-\d{2}-\d{2}\s*片單/i));
  const cards = text.slice(cardsStart).match(/<a\b([^>]*)class=["'][^"']*card-title[^"']*["'][^>]*>([\s\S]*?)<\/a>([\s\S]*?)(?=<a\b[^>]*class=["'][^"']*card-title|<footer\b|$)/gi) || [];
  const rows = [];
  for (const card of cards) {
    const movieLink = card.match(/<a\b([^>]*)class=["'][^"']*card-title[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    const title = tagText(movieLink?.[2]);
    if (!title) continue;
    const groups = [...card.matchAll(/<div\b[^>]*class=["'][^"']*flex-wrap[^"']*gap-2[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)];
    for (const group of groups) {
      const spans = [...group[1].matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map(span => tagText(span[1])).filter(Boolean);
      const format = spans.find(value => !/^\d{2}:\d{2}$/.test(value)) || null;
      for (const time of spans.filter(value => /^\d{2}:\d{2}$/.test(value))) {
        rows.push({
          cinema_id: cinema.id,
          cinema_name: cinema.name_zh,
          city: cinema.city,
          address: cinema.address || null,
          movie_title: title,
          movie_title_en: null,
          poster_url: null,
          rating: null,
          date,
          time,
          hall: null,
          format,
          audio_language: AUDIO_LANGUAGES.find(([label]) => String(format || '').endsWith(label))?.[1] || null,
          subtitles: null,
          duration_minutes: null,
          source_event_id: null,
          source_url: sourceUrl,
          source_role: 'Taiwan cinema showtime aggregator daily server-rendered HTML',
          source: 'twshowtimes-aggregator-fallback'
        });
      }
    }
  }
  return rows;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
      'user-agent': 'study-in-taiwan-cinema-data/1.0 (+https://study-in-taiwan.com/cinema/)'
    },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

export async function fetchTwShowtimesFallback(targetCinemas, days = 7) {
  const targets = [...new Map((targetCinemas || []).filter(cinema => cinema?.id && cinema?.name_zh)
    .map(cinema => [cinema.id, cinema])).values()];
  if (!targets.length) throw new Error('No known ShowTimes cinemas are available for third-party HTML fallback');

  const directory = await fetchHtml(DIRECTORY);
  const { matches, unmatched: listingUnmatched, ambiguous } = matchTwShowtimesCinemas(directory, targets);
  const tasks = [...matches.values()].flatMap(match => Array.from({ length: days }, (_, offset) => ({
    ...match,
    date: localDate(offset)
  })));
  const rows = [];
  const errors = [...ambiguous];
  const failedCinemas = new Set();
  let cursor = 0;
  let blocked = false;
  async function worker() {
    while (!blocked && cursor < tasks.length) {
      const task = tasks[cursor++];
      const url = `${task.url}/${task.date}/`;
      try {
        const parsed = parseTwShowtimesDailyHtml(await fetchHtml(url), task.cinema, url);
        if (!parsed.length) throw new Error('No showtime cards parsed');
        rows.push(...parsed);
      } catch (error) {
        const message = String(error?.message || error).slice(0, 220);
        if (/\b403\b/.test(message)) blocked = true;
        failedCinemas.add(task.cinema.id);
        errors.push(`${task.cinema.name_zh}/${task.date}: ${message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker));
  if (!rows.length) throw new Error(`Third-party HTML fallback returned no sessions (${errors.slice(0, 5).join('; ')})`);

  const coveredCinemaIds = new Set(rows.map(row => row.cinema_id));
  rows.acquisition_method = 'twshowtimes-daily-html';
  rows.cinema_pages = tasks.length;
  rows.cinema_pages_failed = errors.length;
  rows.target_cinemas = targets.length;
  rows.matched_cinemas = coveredCinemaIds.size;
  rows.unmatched_cinemas = [...new Set([
    ...listingUnmatched,
    ...targets.filter(cinema => !coveredCinemaIds.has(cinema.id)).map(cinema => cinema.name_zh)
  ])];
  rows.source_errors = errors.slice(0, 50);
  rows.fetch_blocked = blocked;
  rows.cinemas_with_partial_days = [...failedCinemas].map(id => targets.find(cinema => cinema.id === id)?.name_zh).filter(Boolean);
  return rows;
}
