const URL = 'https://www.vscinemas.com.tw/theater/detail2.aspx?id=23';
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

const BRANCH = {
  cinema_id: '1b9c4a9b7ed385ea',
  cinema_name: 'MUVIE CINEMAS威秀影城',
  city: 'taipei',
  address: '臺北市信義區松仁路58號10、11、12、13樓'
};

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

function stripHtml(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function taipeiNowParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const get = type => Number(parts.find(part => part.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

function mapAudio(format) {
  const label = String(format || '').match(/[（(]([^）)]+)[）)]/)?.[1]?.trim() || '';
  return ({ 英: 'en', 國: 'zh', 日: 'ja', 韓: 'ko', 粵: 'yue', 法: 'fr', 德: 'de', 西: 'es', 泰: 'th', 越: 'vi' })[label] || null;
}

function dateMapFromHtml(html) {
  const now = taipeiNowParts();
  const rows = [...String(html || '').matchAll(/<a href="#(movieTime[^\"]+)">\s*(\d{1,2})\/(\d{1,2})\s*\([^)]+\)<\/a>/gi)]
    .map(match => ({ id: match[1], month: Number(match[2]), day: Number(match[3]) }));
  let year = now.year;
  let previousMonth = now.month;
  const output = new Map();
  for (const row of rows) {
    if (row.month < previousMonth && previousMonth >= 11) year += 1;
    if (row.month > previousMonth && previousMonth <= 2 && row.month >= 11) year -= 1;
    output.set(row.id, `${year}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`);
    previousMonth = row.month;
  }
  return output;
}

export function parseMuvieSongrenHtml(html) {
  const source = String(html || '');
  const dates = dateMapFromHtml(source);
  const rows = [];
  for (const articleMatch of source.matchAll(/<article id="(movieTime[^\"]+)"[^>]*>([\s\S]*?)<\/article>/gi)) {
    const date = dates.get(articleMatch[1]);
    if (!date) continue;
    const article = articleMatch[2];
    const movies = [...article.matchAll(/<h1>([\s\S]*?)<span[^>]*>[\s\S]*?<\/span><\/h1>\s*<h2>([\s\S]*?)<\/h2>/gi)];
    for (let movieIndex = 0; movieIndex < movies.length; movieIndex++) {
      const movieMatch = movies[movieIndex];
      const movieTitle = stripHtml(movieMatch[1]);
      const movieTitleEn = stripHtml(movieMatch[2]) || null;
      if (!movieTitle) continue;
      const segmentStart = movieMatch.index + movieMatch[0].length;
      const segmentEnd = movieIndex + 1 < movies.length ? movies[movieIndex + 1].index : article.length;
      const segment = article.slice(segmentStart, segmentEnd);
      const formats = [...segment.matchAll(/<h4>([\s\S]*?)<\/h4>/gi)];
      for (let formatIndex = 0; formatIndex < formats.length; formatIndex++) {
        const formatMatch = formats[formatIndex];
        const format = stripHtml(formatMatch[1]);
        const blockStart = formatMatch.index + formatMatch[0].length;
        const blockEnd = formatIndex + 1 < formats.length ? formats[formatIndex + 1].index : segment.length;
        const block = segment.slice(blockStart, blockEnd);
        for (const session of block.matchAll(/txtSessionId=(\d+)[^>]*>(\d{1,2}:\d{2})<\/a>/gi)) {
          rows.push({
            cinema_id: BRANCH.cinema_id, cinema_name: BRANCH.cinema_name, city: BRANCH.city, address: BRANCH.address,
            movie_title: movieTitle, movie_title_en: movieTitleEn, date, time: session[2].padStart(5, '0'), hall: null,
            format: format || null, audio_language: mapAudio(format), subtitles: null, duration_minutes: null,
            source_event_id: session[1], source_url: URL,
            source_role: 'official MUVIE CINEMAS / VieShow Songren branch schedule', source: 'vieshow-muvie-songren-official'
          });
        }
      }
    }
  }
  return rows;
}

export async function fetchMuvieSongrenShowtimes() {
  const response = await fetch(URL, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
      'user-agent': BROWSER_UA
    }
  });
  if (!response.ok) throw new Error(`MUVIE Songren ${response.status} ${response.statusText}`);
  const rows = parseMuvieSongrenHtml(await response.text());
  if (!rows.length) throw new Error('MUVIE Songren returned no parseable showtimes');
  return rows;
}

export { URL as MUVIE_SONGREN_URL, BRANCH as MUVIE_SONGREN_BRANCH };
