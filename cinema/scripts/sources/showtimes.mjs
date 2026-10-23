const CINEMAS = [
  {
    id: 2,
    cinema_name: '台北欣欣秀泰影城',
    city: 'taipei',
    address: '台北市中山區林森北路247號'
  },
  {
    id: 91,
    cinema_name: '大巨蛋秀泰影城',
    city: 'taipei',
    address: '台北市信義區光復南路105號2樓'
  }
];

const BASE = 'https://www.showtimes.com.tw';

function decodeHtml(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function htmlToLines(html) {
  return decodeHtml(
    String(html || '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\n')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/\s*(?:p|div|li|h[1-6]|tr|td|th|section|article)\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function resolveDate(month, day) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  let year = currentYear;
  if (month < currentMonth - 6) year += 1;
  else if (month > currentMonth + 6) year -= 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseSessions(line) {
  const matches = [...String(line || '').matchAll(/(\d{2}:\d{2})(?:\s+([^\d]*?))?(?=\s+\d{2}:\d{2}|$)/g)];
  return matches.map(match => {
    const details = (match[2] || '').replace(/\s+/g, ' ').trim();
    const languageMatch = details.match(/(?:^|\s)(英語|日語|國語|韓語|粵語|越語|泰語|菲語|法語|德語|西語|阿拉伯語|多元語)$/);
    const audio_language = languageMatch?.[1] || null;
    const format = audio_language ? details.slice(0, details.length - audio_language.length).trim() || null : details || null;
    return { time: match[1], format, audio_language };
  });
}

function parsePage(html, cinema) {
  const lines = htmlToLines(html);
  const rows = [];
  let movie = null;
  let date = null;
  let started = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === '場次表' || line.includes('場次表')) {
      started = true;
      continue;
    }
    if (!started) continue;

    const dateMatch = line.match(/^(\d{1,2})月(\d{1,2})日(?:\s+週.)?$/);
    if (dateMatch) {
      date = resolveDate(Number(dateMatch[1]), Number(dateMatch[2]));
      continue;
    }

    const sessions = parseSessions(line);
    if (sessions.length && movie && date) {
      for (const session of sessions) {
        rows.push({
          cinema_name: cinema.cinema_name,
          city: cinema.city,
          address: cinema.address,
          movie_title: movie,
          movie_title_en: null,
          rating: null,
          date,
          time: session.time,
          hall: null,
          format: session.format,
          audio_language: session.audio_language,
          subtitles: null,
          source_url: `${BASE}/cinemas/${cinema.id}/`,
          source: 'showtimes-official-site'
        });
      }
      continue;
    }

    const next = lines[i + 1] || '';
    if (/^\d{1,2}月\d{1,2}日(?:\s+週.)?$/.test(next)) {
      movie = line.replace(/^#+\s*/, '').trim();
      date = null;
    }
  }

  return rows;
}

export async function fetchShowTimesShowtimes() {
  const rows = [];
  const errors = [];

  for (const cinema of CINEMAS) {
    const url = `${BASE}/cinemas/${cinema.id}/`;
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
          'user-agent': 'study-in-taiwan-cinema-data/1.0'
        }
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const parsed = parsePage(await response.text(), cinema);
      if (!parsed.length) throw new Error('No showtimes parsed; site format may have changed');
      rows.push(...parsed);
    } catch (error) {
      errors.push(`${cinema.cinema_name}: ${String(error?.message || error)}`);
    }
  }

  if (!rows.length) throw new Error(`ShowTimes source failed: ${errors.join('; ')}`);
  rows.source_errors = errors;
  return rows;
}
