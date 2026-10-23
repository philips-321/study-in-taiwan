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

function cellLines(html) {
  return decodeHtml(
    String(html || '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\r/g, '')
    .split(/\n+/)
    .map(v => v.replace(/\s+/g, ' ').trim())
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

function normalizeSubtitles(code) {
  if (!code) return null;
  const compact = code.toUpperCase().replace(/\s+/g, '');
  if (compact === 'C/E' || compact === 'E/C') return ['zh', 'en'];
  if (compact === 'C') return ['zh'];
  if (compact === 'E') return ['en'];
  return [compact];
}

function parseRows(html) {
  const rows = [];
  let currentDate = null;

  for (const tr of String(html || '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(match => cellLines(match[1]))
      .filter(lines => lines.length);
    if (!cells.length) continue;

    let date = currentDate;
    for (const lines of cells) {
      const joined = lines.join(' ');
      const dm = joined.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\s|$)/);
      if (dm) {
        date = resolveDate(Number(dm[1]), Number(dm[2]));
        currentDate = date;
        break;
      }
    }
    if (!date) continue;

    let timeCellIndex = -1;
    let time = null;
    for (let i = 0; i < cells.length; i++) {
      const joined = cells[i].join(' ');
      const tm = joined.match(/(?:^|\s)(\d{1,2}:\d{2})(?:\s|$)/);
      if (tm) {
        timeCellIndex = i;
        time = tm[1].padStart(5, '0');
        break;
      }
    }
    if (!time || timeCellIndex < 0) continue;

    const timeCell = cells[timeCellIndex].join(' ');
    const afterTime = timeCell.replace(/^.*?\d{1,2}:\d{2}\s*/, '').trim();

    let titleCellIndex = timeCellIndex;
    let titleLines = afterTime ? [afterTime] : [];
    if (!titleLines.length) {
      for (let i = timeCellIndex + 1; i < cells.length; i++) {
        const joined = cells[i].join(' ').trim();
        if (!joined) continue;
        if (/^\d{2,3}$/.test(joined) || /^(?:C\/E|E\/C|C|E)$/i.test(joined) || /^(?:普|護|輔12|輔15|限)$/.test(joined)) continue;
        titleCellIndex = i;
        titleLines = cells[i];
        break;
      }
    }
    if (!titleLines.length) continue;

    const chineseTitle = titleLines[0].trim();
    if (!chineseTitle || /台灣國際女性影展/.test(chineseTitle)) continue;
    const englishTitle = titleLines.slice(1).join(' ').trim() || null;

    let duration = null;
    let subtitleCode = null;
    let rating = null;
    for (let i = titleCellIndex + 1; i < cells.length; i++) {
      const joined = cells[i].join(' ').trim();
      if (duration == null && /^\d{2,3}$/.test(joined)) {
        duration = Number(joined);
        continue;
      }
      if (!subtitleCode && /^(?:C\/E|E\/C|C|E)$/i.test(joined)) {
        subtitleCode = joined.toUpperCase();
        continue;
      }
      if (!rating && /^(?:普|護|輔12|輔15|限)$/.test(joined)) rating = joined;
    }

    // Some layouts keep title/meta in one cell. Recover trailing metadata if needed.
    if (duration == null || !subtitleCode) {
      const combined = titleLines.join(' ').trim();
      const meta = combined.match(/^(.*?)(?:\s+)(\d{2,3})\s+(C\/E|E\/C|C|E)(?:\s+(普|護|輔12|輔15|限))?$/i);
      if (meta) {
        duration ??= Number(meta[2]);
        subtitleCode ||= meta[3].toUpperCase();
        rating ||= meta[4] || null;
      }
    }

    rows.push({
      cinema_name: '光點華山電影館',
      city: 'taipei',
      address: '台北市中正區八德路一段1號',
      movie_title: chineseTitle,
      movie_title_en: englishTitle,
      rating,
      date,
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
