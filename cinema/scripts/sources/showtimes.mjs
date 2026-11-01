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
