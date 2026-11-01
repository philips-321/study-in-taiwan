const BASE = 'https://www.showtimes.com.tw/cinemas';
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

function dateParts(label, today) {
  const match = String(label || '').match(/(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;
  const month = Number(match[1]), day = Number(match[2]);
  const now = new Date(`${today}T12:00:00+08:00`);
  let year = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Taipei', year: 'numeric' }).format(now));
  const currentMonth = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Taipei', month: 'numeric' }).format(now));
  if (month - currentMonth > 6) year--;
  else if (currentMonth - month > 6) year++;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseShowTimesHtml(html, cinema) {
  const rows = [];
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const article = String(html || '').match(/<article\b[^>]*>[\s\S]*?<h2>\s*場次表\s*<\/h2>([\s\S]*?)<\/article>/i)?.[1];
  if (!article) return rows;
  const movieBlocks = [...article.matchAll(/<h3\b[^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>\s*<\/h3>([\s\S]*?)(?=<h3\b|$)/gi)];
  for (const movieBlock of movieBlocks) {
    const title = tagText(movieBlock[1]);
    if (!title) continue;
    for (const dateBlock of movieBlock[2].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>\s*<div\b[^>]*class=["'][^"']*seo-showtime-grid[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
      const date = dateParts(tagText(dateBlock[1]), today);
      if (!date) continue;
      for (const showing of dateBlock[2].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
        const time = tagText(showing[2].match(/<span\b[^>]*class=["'][^"']*\bt\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]);
        const format = tagText(showing[2].match(/<span\b[^>]*class=["'][^"']*\bf\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]) || null;
        const eventId = showing[1].match(/\/selectTicketTypes\/(\d+)/)?.[1] || null;
        if (!/^\d{2}:\d{2}$/.test(time)) continue;
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
          source_event_id: eventId,
          source_url: `${BASE}/${encodeURIComponent(cinema.showtimes_cinema_id)}/`,
          source_role: 'first-party ShowTimes cinema schedule HTML',
          source: 'showtimes-official-html-fallback'
        });
      }
    }
  }
  return rows;
}

export async function fetchShowTimesHtmlFallback(targetCinemas) {
  const targets = [...new Map((targetCinemas || []).filter(cinema => cinema?.id && cinema?.showtimes_cinema_id)
    .map(cinema => [cinema.id, cinema])).values()];
  if (!targets.length) throw new Error('No known ShowTimes cinemas have official HTML page IDs');

  const rows = [];
  const errors = [];
  const matchedCinemaIds = new Set();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const cinema = targets[cursor++];
      const url = `${BASE}/${encodeURIComponent(cinema.showtimes_cinema_id)}/`;
      try {
        const response = await fetch(url, {
          headers: {
            accept: 'text/html,application/xhtml+xml',
            'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
            'user-agent': 'study-in-taiwan-cinema-data/1.0 (+https://study-in-taiwan.com/cinema/)'
          },
          signal: AbortSignal.timeout(20000)
        });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        const parsed = parseShowTimesHtml(await response.text(), cinema);
        if (!parsed.length) throw new Error('Official cinema HTML had no parseable showtime cards');
        for (const row of parsed) {
          if (row.date >= today) matchedCinemaIds.add(cinema.id);
          rows.push(row);
        }
      } catch (error) {
        errors.push(`${cinema.name_zh}: ${String(error?.message || error).slice(0, 180)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, targets.length) }, worker));
  if (!rows.length) throw new Error(`Official ShowTimes HTML fallback returned no sessions (${errors.slice(0, 5).join('; ')})`);

  const futureRows = rows.filter(row => row.date >= today);
  if (!futureRows.length) throw new Error('Official ShowTimes HTML had no current or future sessions');
  futureRows.source_errors = errors;
  futureRows.acquisition_method = 'first-party-showtimes-html';
  futureRows.cinema_pages = targets.length;
  futureRows.cinema_pages_failed = errors.length;
  futureRows.target_cinemas = targets.length;
  futureRows.matched_cinemas = matchedCinemaIds.size;
  futureRows.unmatched_cinemas = targets.filter(cinema => !matchedCinemaIds.has(cinema.id)).map(cinema => cinema.name_zh);
  return futureRows;
}
