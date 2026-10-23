const URL = 'https://www.spot-hs.org.tw/movie/schedule.html';

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

function stripHtml(html) {
  return decodeHtml(
    String(html || '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '\n')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/\s*(?:p|div|li|h[1-6]|tr|td|th|section|article)\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\r/g, '')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n+/g, '\n');
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

function normalizeSubtitles(code) {
  if (!code) return null;
  const compact = code.toUpperCase().replace(/\s+/g, '');
  if (compact === 'C/E' || compact === 'E/C') return ['zh', 'en'];
  if (compact === 'C') return ['zh'];
  if (compact === 'E') return ['en'];
  return [compact];
}

function parseRows(html) {
  const text = stripHtml(html);
  const lines = text.split('\n').map(v => v.trim()).filter(Boolean);
  const rows = [];
  let currentDate = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (dateMatch) {
      currentDate = resolveDate(Number(dateMatch[1]), Number(dateMatch[2]));
      continue;
    }
    if (!currentDate) continue;

    const start = line.match(/^(?:\([^)]*\)\s*)?(\d{2}:\d{2})\s+(.+)$/);
    if (!start) continue;

    const time = start[1];
    let title = start[2].trim();
    if (/台灣國際女性影展/.test(title)) continue;

    let englishTitle = null;
    let duration = null;
    let subtitleCode = null;
    let rating = null;

    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      const next = lines[j];
      if (/^\d{1,2}\/\d{1,2}$/.test(next) || /^(?:\([^)]*\)\s*)?\d{2}:\d{2}\s+/.test(next)) break;
      const meta = next.match(/^(.*?)(?:\s+)(\d{2,3})(?:\s+)(C\/E|E\/C|C|E)(?:\s+)(普|護|輔12|輔15|限)$/i);
      if (meta) {
        englishTitle = meta[1].trim() || null;
        duration = Number(meta[2]);
        subtitleCode = meta[3].toUpperCase();
        rating = meta[4];
        break;
      }
      const metaNoEnglish = next.match(/^(\d{2,3})\s+(C\/E|E\/C|C|E)\s+(普|護|輔12|輔15|限)$/i);
      if (metaNoEnglish) {
        duration = Number(metaNoEnglish[1]);
        subtitleCode = metaNoEnglish[2].toUpperCase();
        rating = metaNoEnglish[3];
        break;
      }
      if (!englishTitle && /[A-Za-z]/.test(next) && !/^https?:/.test(next)) englishTitle = next;
    }

    rows.push({
      cinema_name: '光點華山電影館',
      city: 'taipei',
      address: '台北市中正區八德路一段1號',
      movie_title: title,
      movie_title_en: englishTitle,
      rating,
      date: currentDate,
      time,
      hall: null,
      format: null,
      audio_language: null,
      subtitles: normalizeSubtitles(subtitleCode),
      duration_minutes: duration,
      source_url: URL,
      source: 'spot-huashan-official-schedule'
    });
  }

  return rows;
}

export async function fetchSpotHuashanShowtimes() {
  const response = await fetch(URL, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
      'user-agent': 'study-in-taiwan-cinema-data/1.0'
    }
  });
  if (!response.ok) throw new Error(`SPOT Huashan ${response.status} ${response.statusText}`);
  const rows = parseRows(await response.text());
  if (!rows.length) throw new Error('SPOT Huashan returned no parseable showtimes');
  return rows;
}
