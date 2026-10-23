const BASE = 'https://www.ambassador.com.tw';
const DAYS = 7;

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function taipeiDate(offset = 0) {
  const now = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

async function get(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'study-in-taiwan-cinema-data/1.0' }
  });
  if (!response.ok) throw new Error(`Ambassador ${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

function cityFromAddress(address) {
  const value = String(address || '');
  const aliases = [
    ['taipei', ['台北市','臺北市']], ['new-taipei', ['新北市']], ['taoyuan', ['桃園市']],
    ['hsinchu-city', ['新竹市']], ['hsinchu-county', ['新竹縣']], ['taichung', ['台中市','臺中市']],
    ['tainan', ['台南市','臺南市']], ['kaohsiung', ['高雄市']], ['pingtung', ['屏東縣']]
  ];
  for (const [slug, names] of aliases) if (names.some(n => value.includes(n))) return slug;
  return null;
}

export async function fetchAmbassadorShowtimes() {
  const index = await get(`${BASE}/home/TheaterList`);
  const theaters = [];
  const seen = new Set();

  for (const match of index.matchAll(/href=["'][^"']*Showtime\?ID=([a-f0-9-]{36})[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    if (seen.has(match[1])) continue;
    const parts = stripHtml(match[2]);
    if (!parts.length) continue;
    const name = parts[0];
    const address = parts.slice(1).find(v => /[縣市區鄉鎮路街號樓]/.test(v)) || parts[1] || '';
    seen.add(match[1]);
    theaters.push({ id: match[1], name, address, city: cityFromAddress(address) });
  }

  const rows = [];
  for (const theater of theaters) {
    for (let offset = 0; offset < DAYS; offset++) {
      const date = taipeiDate(offset);
      const dt = encodeURIComponent(date.replaceAll('-', '/'));
      let html;
      try {
        html = await get(`${BASE}/home/Showtime?ID=${theater.id}&DT=${dt}`);
      } catch (error) {
        console.error(`Ambassador ${theater.name} ${date}:`, error.message);
        continue;
      }

      const movieBlocks = html.split(/<div\s+class=['"]showtime-item['"]>/i).slice(1);
      for (const block of movieBlocks) {
        const titleMatch = block.match(/<h3[^>]*>\s*<a[^>]*>\s*([^<]+?)\s*(?:<span\s+class=['"]eng['"]>([^<]*)<\/span>)?/i);
        if (!titleMatch) continue;
        const title = titleMatch[1].trim();
        const titleEn = (titleMatch[2] || '').trim() || null;
        const movieId = block.match(/MovieContent\?MID=([a-f0-9-]{36})/i)?.[1] || null;

        const versionBlocks = block.split(/<p\s+class=['"]tag-seat['"]>/i).slice(1);
        for (const versionBlock of versionBlocks) {
          const version = versionBlock.match(/^\s*\(([^)]*)\)/)?.[1]?.trim() || null;
          for (const session of versionBlock.matchAll(/<h6[^>]*>\s*([0-9]{1,2}:[0-9]{2})\s*<\/h6>[\s\S]*?<span\s+class=['"]float-left info['"]>([^<]*)/gi)) {
            rows.push({
              cinema_name: theater.name,
              city: theater.city,
              address: theater.address || null,
              movie_title: title,
              movie_title_en: titleEn,
              date,
              time: session[1].padStart(5, '0'),
              hall: session[2].trim() || null,
              format: version,
              source_event_id: movieId,
              source_url: `${BASE}/home/Showtime?ID=${theater.id}&DT=${dt}`,
              source: 'ambassador-official-site'
            });
          }
        }
      }
    }
  }

  return rows;
}
