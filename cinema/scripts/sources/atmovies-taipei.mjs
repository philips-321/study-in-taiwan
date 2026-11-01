const BASE = 'https://www.atmovies.com.tw/showtime';
const CONCURRENCY = 6;

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

function posterTitleKey(value) {
  return cleanMovieTitle(value).normalize('NFKC').toLocaleLowerCase()
    .replace(/(?:4dx|imax|數位修復版|數位修復|十週年重映|特別場|重映|國語版|中文版)$/i, '')
    .replace(/[\p{P}\p{S}\s]/gu, '');
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] || null;
}

function parsePage(html, cinema, requestedDate, url) {
  const lines = htmlToLines(html);
  const posterByTitle = new Map();
  for (const match of String(html || '').matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const title = attribute(tag, 'alt') || attribute(tag, 'title');
    const image = attribute(tag, 'data-original') || attribute(tag, 'data-src') || attribute(tag, 'src');
    if (!title || !image || /(?:logo|loading|blank|placeholder|pixel)/i.test(image)) continue;
    try {
      const imageUrl = new URL(decodeHtml(image), url);
      if (imageUrl.protocol !== 'https:') continue;
      const key = posterTitleKey(title);
      if (key.length >= 4) posterByTitle.set(key, imageUrl.href);
    } catch { /* Ignore malformed or non-image page decoration URLs. */ }
  }
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
        city: cinema.city || 'taipei',
        address: cinema.address,
        movie_title: movie,
        movie_title_en: null,
        poster_url: posterByTitle.get(posterTitleKey(movie)) || null,
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
        source: cinema.source || 'atmovies-taipei-fallback'
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

const REGION_ALIASES = [
  ['taipei', ['台北', '臺北']], ['new-taipei', ['新北']], ['keelung', ['基隆']],
  ['taoyuan', ['桃園']], ['hsinchu-city', ['新竹']], ['miaoli', ['苗栗']],
  ['taichung', ['台中', '臺中']], ['changhua', ['彰化']], ['yunlin', ['雲林']],
  ['nantou', ['南投']], ['chiayi-city', ['嘉義']], ['tainan', ['台南', '臺南']],
  ['kaohsiung', ['高雄']], ['yilan', ['宜蘭']], ['hualien', ['花蓮']],
  ['taitung', ['台東', '臺東']], ['pingtung', ['屏東']], ['penghu', ['澎湖']],
  ['kinmen', ['金門']], ['lienchiang', ['連江']]
];

function regionSlug(label) {
  const text = String(label || '').replace(/[\s　]/g, '');
  return REGION_ALIASES.find(([, aliases]) => aliases.some(alias => text.includes(alias)))?.[0] || null;
}

function withoutRegionPrefix(value, slug) {
  const aliases = REGION_ALIASES.find(([key]) => key === slug)?.[1] || [];
  const text = String(value || '').normalize('NFKC').replace(/臺/g, '台').trim();
  const prefix = aliases.find(alias => text.startsWith(alias));
  return prefix ? text.slice(prefix.length) : text;
}

function regionKey(city) {
  if (city === 'new-taipei') return 'taipei';
  if (city === 'hsinchu-county') return 'hsinchu-city';
  if (city === 'chiayi-county') return 'chiayi-city';
  return city;
}

function normalizeCinemaName(value) {
  return String(value || '').normalize('NFKC').replace(/臺/g, '台').toLocaleLowerCase()
    .replace(/(?:電影城|電影院|電影館|影城|戲院|劇院)/g, '')
    .replace(/[\s　・·()（）\-_/]/g, '');
}

function anchorsFromHtml(html) {
  const output = [];
  for (const match of String(html || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)) {
    const href = match[1].match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (!href) continue;
    const textLabel = decodeHtml(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const imageTag = match[2].match(/<img\b[^>]*>/i)?.[0] || '';
    const imageLabel = imageTag.match(/\b(?:alt|title)\s*=\s*(["'])(.*?)\1/i)?.[2] || '';
    const label = textLabel || decodeHtml(imageLabel).replace(/\s+/g, ' ').trim();
    if (label) output.push({ href: new URL(decodeHtml(href), `${BASE}/`).href, label });
  }
  return output;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
      'user-agent': 'study-in-taiwan-cinema-data/1.0'
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

/**
 * AtMovies publishes static, machine-readable schedules for the ShowTimes
 * chain's cinemas. Use this only when the ShowTimes source is unavailable;
 * each cinema page contains several upcoming dates, so this avoids a browser
 * service and avoids requesting every cinema/date pair separately.
 */
export async function fetchAtMoviesShowtimesFallback(targetCinemas) {
  const targets = [...new Map((targetCinemas || []).filter(cinema => cinema?.id && cinema?.name_zh)
    .map(cinema => [cinema.id, cinema])).values()];
  if (!targets.length) throw new Error('No known ShowTimes cinemas are available for AtMovies fallback matching');

  const home = await fetchHtml(`${BASE}/`);
  const regionUrls = new Map();
  for (const link of anchorsFromHtml(home)) {
    const match = new URL(link.href).pathname.match(/^\/showtime\/(a\d+)\/?$/i);
    const slug = regionSlug(link.label);
    if (match && slug && targets.some(cinema => regionKey(cinema.city) === slug)) regionUrls.set(slug, link.href);
  }

  const listingErrors = [];
  const branchByCinema = new Map();
  for (const [slug, url] of regionUrls) {
    try {
      const html = await fetchHtml(url);
      for (const link of anchorsFromHtml(html)) {
        const match = new URL(link.href).pathname.match(/^\/showtime\/(t[a-z0-9]+)\/a\d+\/?$/i);
        if (!match) continue;
        const label = normalizeCinemaName(withoutRegionPrefix(link.label, slug));
        const candidates = targets.filter(cinema => regionKey(cinema.city) === slug &&
          (label === normalizeCinemaName(cinema.name_zh) ||
            (label.length >= 5 && normalizeCinemaName(cinema.name_zh).length >= 5 &&
              (label.includes(normalizeCinemaName(cinema.name_zh)) || normalizeCinemaName(cinema.name_zh).includes(label)))));
        if (candidates.length === 1) branchByCinema.set(candidates[0].id, { cinema: candidates[0], url: link.href });
        else if (candidates.length > 1) listingErrors.push(`${slug}: ambiguous AtMovies match for ${link.label}`);
      }
    } catch (error) {
      listingErrors.push(`${slug}: ${String(error?.message || error).slice(0, 180)}`);
    }
  }

  const rows = [], pageErrors = [];
  const tasks = [...branchByCinema.values()];
  let cursor = 0;
  const worker = async () => {
    while (cursor < tasks.length) {
      const { cinema, url } = tasks[cursor++];
      try {
        const html = await fetchHtml(url);
        const parsed = parsePage(html, {
          code: new URL(url).pathname.split('/')[2],
          cinema_name: cinema.name_zh,
          address: cinema.address,
          city: cinema.city,
          source_role: 'AtMovies HTML fallback for ShowTimes cinema'
        }, taipeiDate(), url);
        if (!parsed.length) throw new Error('No future sessions parsed from the cinema page');
        for (const row of parsed) row.source = 'atmovies-showtimes-fallback';
        rows.push(...parsed);
      } catch (error) {
        pageErrors.push(`${cinema.name_zh}: ${String(error?.message || error).slice(0, 180)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, tasks.length) }, worker));
  if (!rows.length) {
    throw new Error(`AtMovies fallback found no ShowTimes cinema sessions; matched ${tasks.length}/${targets.length} cinemas`);
  }
  rows.source_errors = [...listingErrors, ...pageErrors];
  rows.acquisition_method = 'atmovies-official-schedule-html';
  rows.cinema_pages = tasks.length;
  rows.cinema_pages_failed = pageErrors.length;
  rows.target_cinemas = targets.length;
  rows.matched_cinemas = tasks.length;
  rows.unmatched_cinemas = targets.filter(cinema => !branchByCinema.has(cinema.id)).map(cinema => cinema.name_zh);
  return rows;
}

async function fetchTask({ cinema, date }) {
  const url = `${BASE}/${cinema.code}/a02/${compactDate(date)}/`;
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
  return parsed;
}

export async function fetchAtMoviesTaipeiShowtimes(days = 6) {
  const rows = [];
  const errors = [];
  const tasks = [];

  for (const cinema of CINEMAS) {
    for (let offset = 0; offset < days; offset++) {
      tasks.push({ cinema, date: taipeiDate(offset) });
    }
  }

  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= tasks.length) return;
      const task = tasks[index];
      try {
        rows.push(...await fetchTask(task));
      } catch (error) {
        errors.push(`${task.cinema.code}/${task.date}: ${String(error?.message || error)}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker()));

  if (!rows.length) throw new Error(`AtMovies Taipei fallback failed: ${errors.slice(0, 8).join('; ')}`);
  rows.source_errors = errors;
  return rows;
}
