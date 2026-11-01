const URL = 'https://meet.eslite.com/tw/tc/gallery/movieschedule/201803020001?v=1';
const CINEMA_ID = '43ef84bf160e6886';
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

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
  const text = stripHtml(value).replace(/\s+/g, '');
  if (/中[\/／]?英|中文.*英文|英文.*中文/.test(text)) return ['zh', 'en'];
  if (/英文/.test(text)) return ['en'];
  if (/中文/.test(text)) return ['zh'];
  return null;
}

export function splitEsliteTitle(value) {
  const text = stripHtml(value);
  if (!text || !/[\u3400-\u9fff]/u.test(text)) return { zh: text, en: null };
  const trailingLatin = text.match(/\s+([A-Za-z][\x20-\x7EÀ-ž–—’]*)$/u);
  if (!trailingLatin) return { zh: text, en: null };
  const en = trailingLatin[1].trim();
  const zh = text.slice(0, trailingLatin.index).trim();
  if (!zh || !/[\u3400-\u9fff]/u.test(zh)) return { zh: text, en: null };
  return { zh, en };
}

export function parseEsliteSchedule(html) {
  const source = String(html || '');
  const starts = [...source.matchAll(/<div class="box" style="width:100%;">/g)].map(match => match.index);
  const rows = [];

  for (let i = 0; i < starts.length; i++) {
    const block = source.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : source.length);
    const titleRaw = block.match(/<div class="left"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i)?.[1];
    if (!titleRaw) continue;

    const title = splitEsliteTitle(titleRaw);
    const rating = stripHtml(block.match(/<li>級別[：:]([\s\S]*?)<\/li>/i)?.[1] || '') || null;
    const durationMatch = block.match(/<li>片長[：:]\s*(\d+)\s*分鐘?\s*<\/li>/i);
    const duration = durationMatch ? Number(durationMatch[1]) : null;
    const subtitleRaw = block.match(/<li>字幕[：:]([\s\S]*?)<\/li>/i)?.[1];
    const subtitles = subtitleRaw ? normalizeSubtitles(subtitleRaw) : null;

    for (const dateMatch of block.matchAll(/<div class="swiper-slide"[^>]*>[\s\S]*?<p>(\d{1,2})\/(\d{1,2})\s*\([^)]+\)<\/p>[\s\S]*?<ul>([\s\S]*?)<\/ul>/gi)) {
      const date = isoDate(Number(dateMatch[1]), Number(dateMatch[2]));
      for (const timeMatch of dateMatch[3].matchAll(/<li>(\d{1,2}:\d{2})<\/li>/g)) {
        rows.push({
          cinema_id: CINEMA_ID,
          cinema_name: '誠品電影院',
          city: 'taipei',
          address: '台北市信義區菸廠路80號B2',
          movie_title: title.zh,
          movie_title_en: title.en,
          rating,
          date,
          time: timeMatch[1].padStart(5, '0'),
          hall: null,
          format: null,
          audio_language: null,
          subtitles,
          duration_minutes: duration,
          source_url: URL,
          source_role: 'official Eslite Art House schedule',
          source: 'eslite-official-schedule'
        });
      }
    }
  }

  return rows;
}

export async function fetchEsliteShowtimes() {
  const response = await fetch(URL, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
      'user-agent': BROWSER_UA
    }
  });
  if (!response.ok) throw new Error(`Eslite ${response.status} ${response.statusText}`);
  const rows = parseEsliteSchedule(await response.text());
  if (!rows.length) throw new Error('Eslite returned no parseable showtimes');
  return rows;
}
