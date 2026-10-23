const BASE = 'https://www.atmovies.com.tw/showtime';

const CINEMAS = [
  { code: 't02a01', cinema_name: '台北信義威秀影城', address: '台北市信義區松壽路20號', source_role: 'vieshow-waf-fallback' },
  { code: 't02a11', cinema_name: 'MUVIE CINEMAS 台北松仁', address: '台北市信義區松仁路58號10樓', source_role: 'vieshow-waf-fallback' },
  { code: 't02a12', cinema_name: '台北南港LaLaport威秀影城', address: '台北市南港區經貿二路131號5樓', source_role: 'vieshow-waf-fallback' },
  { code: 't02b14', cinema_name: '台北京站威秀影城', address: '台北市大同區市民大道一段209號5樓', source_role: 'vieshow-waf-fallback' },
  { code: 't02b08', cinema_name: '台北西門威秀影城', address: '台北市萬華區漢中街52號8-11樓', source_role: 'vieshow-waf-fallback' },
  { code: 't02a08', cinema_name: '誠品電影院', address: '台北市信義區菸廠路80號B1', source_role: 'eslite-fallback' },
  { code: 't02b07', cinema_name: '真善美戲院', address: '台北市萬華區漢中街116號', source_role: 'wonderful-fallback' },
  { code: 't02d20', cinema_name: '光點台北電影院', address: '台北市中山區中山北路二段18號', source_role: 'spot-taipei-fallback' }
];

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
      .replace(/<\/\s*(?:p|div|li|h[1-6]|tr|td|th|section|article|ul|ol)\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function taipeiDate(offset = 0) {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000 + offset * 86400000);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function compactDate(iso) { return iso.replaceAll('-', ''); }

function normalizeTime(value) {
  const m = String(value || '').replace('：', ':').match(/^(\d{2}:\d{2})$/);
  return m?.[1] || null;
}

function inferAudio(label) {
  const value = String(label || '');
  if (/英語|英文/.test(value)) return '英語';
  if (/日語|日文/.test(value)) return '日語';
  if (/韓語|韓文/.test(value)) return '韓語';
  if (/國語|中文/.test(value)) return '國語';
  if (/粵語/.test(value)) return '粵語';
  if (/法語|法文/.test(value)) return '法語';
  if (/越語|越文/.test(value)) return '越語';
  if (/泰語|泰文/.test(value)) return '泰語';
  return null;
}

function cleanMovieTitle(value) {
  return String(value || '')
    .replace(/^Image\s*/i, '')
    .replace(/^電影\s*/i, '')
    .trim();
}

function parsePage(html, cinema, requestedDate, url) {
  const lines = htmlToLines(html);
  const rows = [];
  let pageDate = requestedDate;
  let movie = null;
  let duration = null;
  let pendingLabel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(/^(\d{4})\/(\d{2})\/(\d{2})(?:\s|$)/);
    if (dateMatch) {
      pageDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      continue;
    }

    const durationHere = line.match(/片長[：:]\s*(\d+)分/);
    if (durationHere && movie) {
      duration = Number(durationHere[1]);
      continue;
    }

    const nextFew = lines.slice(i + 1, i + 4).join(' ');
    if (!normalizeTime(line) && !/其他戲院/.test(line) && /片長[：:]\s*\d+分/.test(nextFew)) {
      const candidate = cleanMovieTitle(line);
      if (candidate && !candidate.includes('開眼') && !candidate.includes('選擇日期')) {
        movie = candidate;
        duration = null;
        pendingLabel = null;
      }
      continue;
    }

    if (!movie) continue;
    const time = normalizeTime(line);
    if (time) {
      rows.push({
        cinema_name: cinema.cinema_name,
        city: 'taipei',
        address: cinema.address,
        movie_title: movie,
        movie_title_en: null,
        rating: null,
        date: pageDate,
        time,
        hall: null,
        format: pendingLabel || null,
        audio_language: inferAudio(pendingLabel),
        subtitles: null,
        duration_minutes: duration,
        source_url: url,
        source_role: cinema.source_role,
        source: 'atmovies-taipei-fallback'
      });
      continue;
    }

    if (/其他戲院/.test(line)) {
      pendingLabel = null;
      continue;
    }

    if (/^(?:PRE|特別場|應援場|口述影像場|[A-Z0-9 ]{2,20}|.*(?:版|廳|語|文))$/.test(line) && line.length <= 30) {
      pendingLabel = line;
    }
  }

  return rows;
}

export async function fetchAtMoviesTaipeiShowtimes(days = 6) {
  const rows = [];
  const errors = [];

  for (const cinema of CINEMAS) {
    for (let offset = 0; offset < days; offset++) {
      const date = taipeiDate(offset);
      const url = `${BASE}/${cinema.code}/a02/${compactDate(date)}/`;
      try {
        const response = await fetch(url, {
          headers: {
            accept: 'text/html,application/xhtml+xml',
            'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
            'user-agent': 'study-in-taiwan-cinema-data/1.0'
          }
        });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        const parsed = parsePage(await response.text(), cinema, date, url);
        if (!parsed.length) throw new Error('No showtimes parsed');
        rows.push(...parsed);
      } catch (error) {
        errors.push(`${cinema.code}/${date}: ${String(error?.message || error)}`);
      }
    }
  }

  if (!rows.length) throw new Error(`AtMovies Taipei fallback failed: ${errors.slice(0, 8).join('; ')}`);
  rows.source_errors = errors;
  return rows;
}
