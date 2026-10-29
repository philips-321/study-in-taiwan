const URL = 'https://meet.eslite.com/tw/tc/gallery/movieschedule/201803020001?v=1';

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

function taipeiYearFor(month) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date());
  const year = Number(parts.find(p => p.type === 'year')?.value);
  const currentMonth = Number(parts.find(p => p.type === 'month')?.value);
  if (month < currentMonth - 6) return year + 1;
  if (month > currentMonth + 6) return year - 1;
  return year;
}

function isoDate(month, day) {
  return `${taipeiYearFor(month)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeSubtitles(value) {
  const text = String(value || '').replace(/\s+/g, '');
  if (/中[\/／]?英|中文.*英文|英文.*中文/.test(text)) return ['zh', 'en'];
  if (/英文/.test(text)) return ['en'];
  if (/中文/.test(text)) return ['zh'];
  return null;
}

export function splitEsliteTitle(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || !/[\u3400-\u9fff]/u.test(text)) return { zh: text, en: null };

  // The Chinese title can itself contain Latin fragments such as 4K, 2+2=5 or a
  // proper name. Only split a final Latin/ASCII title run that follows whitespace.
  const trailingLatin = text.match(/\s+([A-Za-z][\x20-\x7EÀ-ž–—’]*)$/u);
  if (!trailingLatin) return { zh: text, en: null };

  const en = trailingLatin[1].trim();
  const zh = text.slice(0, trailingLatin.index).trim();
  if (!zh || !/[\u3400-\u9fff]/u.test(zh)) return { zh: text, en: null };
  return { zh, en };
}

export function parseEsliteSchedule(html) {
  const lines = htmlToLines(html);
  const rows = [];
  let movie = null;
  let currentDate = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lookAhead = lines.slice(i + 1, i + 9).join(' | ');
    if (!/^電影介紹$/.test(line) && /級別[：:]/.test(lookAhead) && /片長[：:]/.test(lookAhead) && /字幕[：:]/.test(lookAhead)) {
      const title = splitEsliteTitle(line);
      movie = {
        title_zh: title.zh,
        title_en: title.en,
        rating: null,
        duration: null,
        subtitles: null
      };
      currentDate = null;
      continue;
    }

    if (!movie) continue;
    const rating = line.match(/^級別[：:]\s*(.+)$/);
    if (rating) { movie.rating = rating[1].trim(); continue; }
    const duration = line.match(/^片長[：:]\s*(\d+)\s*分鐘?/);
    if (duration) { movie.duration = Number(duration[1]); continue; }
    const subtitle = line.match(/^字幕[：:]\s*(.+)$/);
    if (subtitle) { movie.subtitles = normalizeSubtitles(subtitle[1]); continue; }
    const date = line.match(/^(\d{1,2})\/(\d{1,2})\s*\([^)]*\)$/);
    if (date) { currentDate = isoDate(Number(date[1]), Number(date[2])); continue; }
    const time = line.match(/^(\d{1,2}:\d{2})$/);
    if (time && currentDate) {
      rows.push({
        cinema_name: '誠品電影院',
        city: 'taipei',
        address: '台北市信義區菸廠路80號B2',
        movie_title: movie.title_zh,
        movie_title_en: movie.title_en,
        rating: movie.rating,
        date: currentDate,
        time: time[1].padStart(5, '0'),
        hall: null,
        format: null,
        audio_language: null,
        subtitles: movie.subtitles,
        duration_minutes: movie.duration,
        source_url: URL,
        source: 'eslite-official-schedule'
      });
    }
  }
  return rows;
}

export async function fetchEsliteShowtimes() {
  const response = await fetch(URL, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
      'user-agent': 'study-in-taiwan-cinema-data/1.0'
    }
  });
  if (!response.ok) throw new Error(`Eslite ${response.status} ${response.statusText}`);
  const rows = parseEsliteSchedule(await response.text());
  if (!rows.length) throw new Error('Eslite returned no parseable showtimes');
  return rows;
}
