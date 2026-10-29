const LISTING_URL = 'https://www.spot.org.tw/movies/201404/movies201404.html';
const CINEMA = {
  cinema_id: '31d9eecd32050b08',
  cinema_name: '光點台北電影館',
  city: 'taipei',
  address: '台北市中山區中山北路二段18號'
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

function resolveDate(month, day) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date());
  let year = Number(parts.find(p => p.type === 'year')?.value);
  const currentMonth = Number(parts.find(p => p.type === 'month')?.value);
  if (month < currentMonth - 6) year += 1;
  else if (month > currentMonth + 6) year -= 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeSubtitles(metadata) {
  const text = String(metadata || '').toUpperCase();
  if (/C\s*\/\s*E\s+SUBTITLES|E\s*\/\s*C\s+SUBTITLES/.test(text)) return ['zh', 'en'];
  if (/CHINESE\s+SUBTITLES/.test(text)) return ['zh'];
  if (/ENGLISH\s+SUBTITLES/.test(text)) return ['en'];
  return null;
}

export function discoverSpotTaipeiDetailUrls(html) {
  const urls = new Set();
  for (const match of String(html || '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    let href = decodeHtml(match[1]).trim();
    if (!href) continue;
    try {
      const url = new URL(href, LISTING_URL);
      if (url.hostname !== 'www.spot.org.tw' && url.hostname !== 'spot.org.tw') continue;
      url.protocol = 'https:';
      if (!/^\/movies\/\d+\/m\d+\/movies\d+_m\d+\.html$/i.test(url.pathname)) continue;
      urls.add(url.href);
    } catch {
      // Ignore malformed upstream links.
    }
  }
  return [...urls];
}

function metadataLine(html) {
  const candidates = [...String(html || '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(match => stripHtml(match[1]))
    .filter(Boolean);
  return candidates.find(line => /\b\d{2,3}\s*min\b/i.test(line) && /Subtitles/i.test(line)) || null;
}

function titleFromClass(html, className) {
  const regex = new RegExp(`<td\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/td>`, 'gi');
  const values = [...String(html || '').matchAll(regex)]
    .map(match => stripHtml(match[1]))
    .filter(Boolean)
    .sort((a, b) => a.length - b.length);
  return values[0] || null;
}

function scheduleRows(html) {
  const marker = String(html || '').search(/本片放映時刻/);
  if (marker < 0) return [];
  const scheduleHtml = String(html || '').slice(marker);
  const rows = [];
  let currentDate = null;

  for (const tr of scheduleHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...tr[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(match => stripHtml(match[1]))
      .filter(Boolean);
    if (!cells.length) continue;

    for (const cell of cells) {
      const dm = cell.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})\s*\([^)]+\)/);
      if (dm) {
        currentDate = resolveDate(Number(dm[1]), Number(dm[2]));
        break;
      }
    }
    if (!currentDate) continue;

    for (const cell of cells) {
      for (const tm of cell.matchAll(/(?:^|\s)(\d{1,2}:\d{2})(?=\s|$)/g)) {
        rows.push({ date: currentDate, time: tm[1].padStart(5, '0') });
      }
    }
  }
  return rows;
}

export function parseSpotTaipeiDetail(html, sourceUrl) {
  const movieTitle = titleFromClass(html, 'movie_title');
  const movieTitleEn = titleFromClass(html, 'movie_title_eng');
  const metadata = metadataLine(html);
  if (!movieTitle || !metadata) return [];

  const durationMatch = metadata.match(/\b(\d{2,3})\s*min\b/i);
  const duration = durationMatch ? Number(durationMatch[1]) : null;
  const rating = metadata.split('|').map(part => part.trim()).filter(Boolean).at(-1) || null;
  const subtitles = normalizeSubtitles(metadata);

  return scheduleRows(html).map(({ date, time }) => ({
    cinema_id: CINEMA.cinema_id,
    cinema_name: CINEMA.cinema_name,
    city: CINEMA.city,
    address: CINEMA.address,
    movie_title: movieTitle,
    movie_title_en: movieTitleEn,
    rating,
    date,
    time,
    hall: null,
    format: null,
    audio_language: null,
    subtitles,
    duration_minutes: duration,
    source_url: sourceUrl,
    source_role: 'official SPOT Taipei per-film schedule',
    source: 'spot-taipei-official-schedule'
  }));
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
      'user-agent': 'study-in-taiwan-cinema-data/1.0'
    }
  });
  if (!response.ok) throw new Error(`SPOT Taipei ${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

export async function fetchSpotTaipeiShowtimes() {
  const listingHtml = await fetchText(LISTING_URL);
  const detailUrls = discoverSpotTaipeiDetailUrls(listingHtml);
  if (!detailUrls.length) throw new Error('SPOT Taipei listing returned no deterministic detail URLs');

  const rows = [];
  const errors = [];
  // Small bounded batches avoid hammering this legacy official site.
  for (let i = 0; i < detailUrls.length; i += 3) {
    const batch = detailUrls.slice(i, i + 3);
    const results = await Promise.all(batch.map(async url => {
      try {
        return parseSpotTaipeiDetail(await fetchText(url), url);
      } catch (error) {
        errors.push(`${url}: ${error?.message || error}`);
        return [];
      }
    }));
    rows.push(...results.flat());
  }

  if (!rows.length) {
    throw new Error(`SPOT Taipei returned no parseable current showtimes${errors.length ? `; ${errors.slice(0, 3).join(' | ')}` : ''}`);
  }
  return rows;
}

export { LISTING_URL as SPOT_TAIPEI_LISTING_URL, CINEMA as SPOT_TAIPEI_CINEMA };
