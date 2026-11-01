const API = 'https://capi.showtimes.com.tw/4/app/bootstrap';
const SCHEDULES_URL = 'https://www.showtimes.com.tw/cinemas/';

const CITY_ALIASES = [
  ['taipei', ['臺北市', '台北市']], ['new-taipei', ['新北市']], ['keelung', ['基隆市']],
  ['taoyuan', ['桃園市']], ['hsinchu-city', ['新竹市']], ['hsinchu-county', ['新竹縣']],
  ['miaoli', ['苗栗縣']], ['taichung', ['臺中市', '台中市']], ['changhua', ['彰化縣']],
  ['nantou', ['南投縣']], ['yunlin', ['雲林縣']], ['chiayi-city', ['嘉義市']],
  ['chiayi-county', ['嘉義縣']], ['tainan', ['臺南市', '台南市']], ['kaohsiung', ['高雄市']],
  ['pingtung', ['屏東縣']], ['yilan', ['宜蘭縣']], ['hualien', ['花蓮縣', '花蓮市']],
  ['taitung', ['臺東縣', '台東縣', '台東市']], ['penghu', ['澎湖縣']], ['kinmen', ['金門縣']],
  ['lienchiang', ['連江縣']]
];

const AUDIO_LANGUAGES = [
  ['英語', 'en'], ['日語', 'ja'], ['韓語', 'ko'], ['國語', 'zh'],
  ['粵語', 'yue'], ['越語', 'vi'], ['泰語', 'th'], ['菲語', 'fil'],
  ['法語', 'fr'], ['德語', 'de'], ['西語', 'es'], ['印尼語', 'id'],
  ['馬來語', 'ms'], ['印度語', 'hi']
];

function cityFromAddress(address) {
  const text = String(address || '');
  return CITY_ALIASES.find(([, aliases]) => aliases.some(alias => text.includes(alias)))?.[0] || 'unknown';
}

function taipeiDateTime(iso) {
  const value = new Date(iso);
  if (!Number.isFinite(value.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(value);
  const part = Object.fromEntries(parts.map(item => [item.type, item.value]));
  return { date: `${part.year}-${part.month}-${part.day}`, time: `${part.hour}:${part.minute}` };
}

function audioLanguage(format) {
  const value = String(format || '');
  return AUDIO_LANGUAGES.find(([label]) => value.endsWith(label))?.[1] || null;
}

export async function fetchShowTimesShowtimes() {
  const response = await fetch(API, {
    headers: {
      accept: 'application/json',
      'accept-language': 'zh-TW,zh;q=0.9,en;q=0.7',
      origin: 'https://www.showtimes.com.tw',
      referer: 'https://www.showtimes.com.tw/',
      'user-agent': 'study-in-taiwan-cinema-data/1.0'
    }
  });
  if (!response.ok) throw new Error(`ShowTimes public API ${response.status} ${response.statusText}`);

  const payload = (await response.json())?.payload;
  if (!payload || !Array.isArray(payload.corporations) || !Array.isArray(payload.programs) || !payload.eventsForCorporations) {
    throw new Error('ShowTimes public API response format changed');
  }

  const corporations = new Map(payload.corporations.map(corporation => [Number(corporation.id), corporation]));
  const programs = new Map(payload.programs.map(program => [Number(program.id), program]));
  const rows = [];

  for (const [corporationId, group] of Object.entries(payload.eventsForCorporations)) {
    const corporation = corporations.get(Number(corporationId));
    if (!corporation) continue;
    const city = cityFromAddress(corporation.address);
    const rooms = new Map((group.venues || []).map(venue => [Number(venue.id), venue.room]));

    for (const event of group.events || []) {
      if (event.status !== 'active') continue;
      const program = programs.get(Number(event.programId));
      const session = taipeiDateTime(event.startedAt);
      if (!program || !session || !program.name) continue;
      const format = event.meta?.format || null;
      const duration = Number(program.duration);

      rows.push({
        cinema_name: corporation.name,
        city,
        address: corporation.address || null,
        movie_title: program.name,
        movie_title_en: program.nameAlternative || null,
        rating: program.rating || null,
        date: session.date,
        time: session.time,
        hall: rooms.get(Number(event.venueId)) || null,
        format,
        audio_language: audioLanguage(format),
        subtitles: null,
        duration_minutes: Number.isFinite(duration) && duration > 0 ? Math.round(duration / 60) : null,
        source_event_id: String(event.id),
        source_url: `${SCHEDULES_URL}${corporation.id}/`,
        source: 'showtimes-official-api'
      });
    }
  }

  if (!rows.length) throw new Error('ShowTimes public API returned no active showtimes');
  return rows;
}

function taipeiYearForMonth(month) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  const year = Number(parts.year), currentMonth = Number(parts.month);
  if (month < currentMonth - 6) return year + 1;
  if (month > currentMonth + 6) return year - 1;
  return year;
}

function currentTaipeiDate() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseBranchDate(line) {
  const match = String(line || '').match(/(?:^|\s)(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;
  const month = Number(match[1]), day = Number(match[2]);
  return `${taipeiYearForMonth(month)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const branchAudio = new Map([
  ['英語', 'en'], ['日語', 'ja'], ['韓語', 'ko'], ['國語', 'zh'], ['粵語', 'yue'],
  ['越語', 'vi'], ['泰語', 'th'], ['菲語', 'fil'], ['法語', 'fr'], ['德語', 'de'],
  ['西語', 'es'], ['印尼語', 'id'], ['馬來語', 'ms'], ['印度語', 'hi']
]);

function parseBranchShowtimes(text, movieTitles, cinemaName, address, sourceUrl) {
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const scheduleAt = lines.findIndex(line => line.includes('場次表'));
  if (scheduleAt < 0) return [];
  const titles = new Set(movieTitles.map(title => String(title || '').trim()).filter(Boolean));
  const rows = [];
  let movieTitle = null, date = null;
  for (const line of lines.slice(scheduleAt + 1)) {
    if (titles.has(line)) { movieTitle = line; date = null; continue; }
    const parsedDate = parseBranchDate(line);
    if (parsedDate) { date = parsedDate; continue; }
    if (!movieTitle || !date || date < currentTaipeiDate()) continue;
    const sessions = [...line.matchAll(/(\d{1,2}:\d{2})(?:\s+(.+?))?(?=\s+\d{1,2}:\d{2}(?:\s|$)|$)/g)];
    for (const session of sessions) {
      const time = session[1].padStart(5, '0');
      const labels = String(session[2] || '').trim().split(/\s+/).filter(Boolean);
      const audioLabel = [...labels].reverse().find(label => branchAudio.has(label));
      const formatLabels = audioLabel ? labels.slice(0, labels.lastIndexOf(audioLabel)) : labels;
      rows.push({
        cinema_name: cinemaName,
        address,
        movie_title: movieTitle,
        date,
        time,
        hall: null,
        format: formatLabels.join(' ') || null,
        audio_language: audioLabel ? branchAudio.get(audioLabel) : null,
        subtitles: null,
        source_url: sourceUrl,
        source_role: 'official ShowTimes branch schedule rendered in headless browser',
        source: 'showtimes-official-api'
      });
    }
  }
  return rows;
}

export async function fetchShowTimesShowtimesInBrowser(browser) {
  const context = await browser.newContext({ locale: 'zh-TW', timezoneId: 'Asia/Taipei' });
  const landing = await context.newPage();
  const listingResponse = await landing.goto(SCHEDULES_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!listingResponse?.ok()) throw new Error(`ShowTimes cinema directory browser HTTP ${listingResponse?.status() || 'no response'}`);
  await landing.waitForFunction(() => [...document.querySelectorAll('a[href]')].some(link => /\/cinemas\/\d+\/?$/.test(new URL(link.href).pathname)), { timeout: 20000 });
  const branches = await landing.locator('a[href]').evaluateAll(links => [...new Map(links
    .map(link => new URL(link.href, location.href))
    .filter(url => url.origin === location.origin && /^\/cinemas\/\d+\/?$/.test(url.pathname))
    .map(url => [url.href, url.href])).values()]);
  await landing.close();
  if (!branches.length) { await context.close(); throw new Error('ShowTimes directory loaded but contained no cinema branch links'); }

  const rows = [], errors = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < branches.length) {
      const index = cursor++, url = branches[index], page = await context.newPage();
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (!response?.ok()) throw new Error(`HTTP ${response?.status() || 'no response'}`);
        await page.waitForFunction(() => document.body?.innerText.includes('場次表'), { timeout: 20000 });
        const details = await page.evaluate(() => {
          const lines = document.body.innerText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
          const addressLine = lines.find(line => /[📍][^\n]*(?:市|縣)/.test(line)) || '';
          return {
            cinemaName: document.querySelector('h1')?.innerText?.trim() || '',
            address: addressLine.replace(/^.*?📍\s*/, '').trim(),
            text: document.body.innerText,
            movieTitles: [...document.querySelectorAll('h3')].map(node => node.innerText.trim())
          };
        });
        const branchRows = parseBranchShowtimes(details.text, details.movieTitles, details.cinemaName, details.address, url);
        if (!details.cinemaName || !details.address || !branchRows.length) throw new Error('Page loaded but no complete future showtimes were parsed');
        rows.push(...branchRows);
      } catch (error) {
        errors.push(`${url}: ${String(error?.message || error).slice(0, 180)}`);
      } finally { await page.close(); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, branches.length) }, worker));
  await context.close();
  if (!rows.length) throw new Error(`ShowTimes browser extraction found no future sessions${errors.length ? `; ${errors.slice(0, 3).join(' | ')}` : ''}`);
  rows.source_errors = errors;
  rows.acquisition_method = 'playwright-chromium-branch-pages';
  rows.branch_pages = branches.length;
  rows.branch_pages_failed = errors.length;
  return rows;
}
