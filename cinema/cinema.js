(() => {
  const $ = (selector) => document.querySelector(selector);
  const citySelect = $('#city');
  const dateInput = $('#date');
  const searchInput = $('#search');
  const resultsEl = $('#results');
  const summaryEl = $('#summary');
  const mapCaption = $('#map-caption');
  const cityNames = {
    taipei:'Taipei City','new-taipei':'New Taipei City',keelung:'Keelung City',taoyuan:'Taoyuan City',
    'hsinchu-city':'Hsinchu City','hsinchu-county':'Hsinchu County',miaoli:'Miaoli County',taichung:'Taichung City',
    changhua:'Changhua County',nantou:'Nantou County',yunlin:'Yunlin County','chiayi-city':'Chiayi City',
    'chiayi-county':'Chiayi County',tainan:'Tainan City',kaohsiung:'Kaohsiung City',pingtung:'Pingtung County',
    yilan:'Yilan County',hualien:'Hualien County',taitung:'Taitung County',penghu:'Penghu County',
    kinmen:'Kinmen County',lienchiang:'Lienchiang County',unknown:'Other / unassigned'
  };
  const zhNames = {
    taipei:'臺北市','new-taipei':'新北市',keelung:'基隆市',taoyuan:'桃園市','hsinchu-city':'新竹市',
    'hsinchu-county':'新竹縣',miaoli:'苗栗縣',taichung:'臺中市',changhua:'彰化縣',nantou:'南投縣',
    yunlin:'雲林縣','chiayi-city':'嘉義市','chiayi-county':'嘉義縣',tainan:'臺南市',kaohsiung:'高雄市',
    pingtung:'屏東縣',yilan:'宜蘭縣',hualien:'花蓮縣',taitung:'臺東縣',penghu:'澎湖縣',kinmen:'金門縣',lienchiang:'連江縣'
  };
  const langNames = {en:'English',zh:'中文',ja:'日本語',ko:'한국어',fr:'Français',de:'Deutsch',es:'Español',it:'Italiano',
    th:'ไทย',vi:'Tiếng Việt',id:'Bahasa Indonesia',ms:'Bahasa Melayu',fil:'Filipino',my:'မြန်မာ',hi:'हिन्दी'};
  let cityDefs = [];
  let cinemaByCity = {};
  let showsByCity = {};
  let markers = [];
  let selectedCity = 'all';
  let map;

  function todayTaiwan() {
    return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function loadJson(url) {
    return fetch(url, {cache:'no-cache'}).then((r) => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); });
  }
  function buildMap() {
    if (!window.maplibregl) {
      $('#map-error').hidden = false;
      $('#map-error').textContent = 'The map library did not load. You can still browse cinemas from the list.';
      return;
    }
    map = new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:[121,23.8],zoom:6.4,attributionControl:false});
    map.addControl(new maplibregl.NavigationControl({showCompass:false}), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({compact:true}), 'bottom-left');
    map.on('error', () => { $('#map-error').hidden = false; });
    map.on('load', () => {
      if (cityDefs.length) renderMarkers();
    });
  }
  function displayName(slug) { return cityNames[slug] || slug; }
  function cinemaCount(slug) { return (cinemaByCity[slug]?.cinemas || []).length; }
  function renderMarkers() {
    if (!map || !map.loaded()) return;
    markers.forEach((m) => m.remove());
    markers = [];
    cityDefs.forEach((city) => {
      const slug = city.slug;
      const count = cinemaCount(slug);
      if (!count || !city.center) return;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `cinema-marker${selectedCity === slug ? ' selected' : ''}`;
      el.textContent = String(count);
      el.setAttribute('aria-label', `${displayName(slug)}: ${count} cinemas`);
      const popup = new maplibregl.Popup({offset:20,closeButton:false}).setHTML(`<b>${esc(displayName(slug))}</b><br>${count} cinemas`);
      const marker = new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(city.center).setPopup(popup).addTo(map);
      el.addEventListener('click', () => selectCity(slug, true));
      markers.push(marker);
    });
    if (selectedCity === 'all') {
      const bounds = new maplibregl.LngLatBounds([119.3,21.7],[122.1,25.5]);
      map.fitBounds(bounds,{padding:{top:70,right:65,bottom:90,left:65},duration:0});
    }
  }
  function setupCityOptions() {
    citySelect.innerHTML = '<option value="all">All Taiwan</option>' + cityDefs
      .filter((c) => cinemaCount(c.slug) > 0)
      .map((c) => `<option value="${esc(c.slug)}">${esc(displayName(c.slug))} · ${cinemaCount(c.slug)}</option>`).join('');
    if (cinemaCount('unknown')) citySelect.insertAdjacentHTML('beforeend', `<option value="unknown">${displayName('unknown')} · ${cinemaCount('unknown')}</option>`);
  }
  function selectedShowtimes(slug) {
    return (showsByCity[slug]?.showtimes || []).filter((s) => (s.start_time || '').slice(0,10) === dateInput.value);
  }
  function selectedCities() {
    if (selectedCity !== 'all') return [selectedCity];
    return [...new Set([...Object.keys(cinemaByCity), ...Object.keys(showsByCity)])].sort((a,b) => displayName(a).localeCompare(displayName(b)));
  }
  function subtitleLabels(subs) {
    if (!Array.isArray(subs) || !subs.length) return 'Subtitle info unavailable';
    return `Sub: ${subs.map((s) => langNames[s] || s).join(', ')}`;
  }
  function audioLabel(code) { return code ? `Audio: ${langNames[code] || code}` : ''; }
  function formatTime(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);
  }
  function movieCard(showtimes) {
    const filmTitle = showtimes[0].movie_title || 'Untitled screening';
    const titleEn = showtimes[0].movie_title_en;
    const sessions = showtimes.map((s) => {
      const time = formatTime(s.start_time);
      const metadata = [s.format, s.hall].filter(Boolean);
      const audio = audioLabel(s.audio_language);
      if (audio) metadata.push(audio);
      metadata.push(subtitleLabels(s.subtitles));
      const link = s.source_url ? `<a class="detail-link" href="${esc(s.source_url)}" target="_blank" rel="noopener">Source schedule ↗</a>` : '';
      return `<div class="showtime-row">${time ? `<span class="time-chip">${esc(time)}</span>` : ''}${metadata.map((x) => `<span class="tag ${x.startsWith('Sub:') ? 'sub' : x.startsWith('Audio:') ? 'audio' : ''}">${esc(x)}</span>`).join('')}</div>${link}`;
    }).join('');
    return `<div class="movie"><div class="movie-title">${esc(filmTitle)}</div>${titleEn ? `<div class="movie-en">${esc(titleEn)}</div>` : ''}${sessions}</div>`;
  }
  function renderResults() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    const groups = [];
    let cinemaTotal = 0;
    let showtimeTotal = 0;
    for (const slug of selectedCities()) {
      const cinemas = cinemaByCity[slug]?.cinemas || [];
      const byId = new Map(cinemas.map((c) => [c.id, c]));
      const todays = selectedShowtimes(slug);
      const perCinema = new Map();
      for (const s of todays) {
        const key = s.cinema_id || `name:${s.cinema_name || ''}`;
        if (!perCinema.has(key)) perCinema.set(key, []);
        perCinema.get(key).push(s);
      }
      const records = cinemas.map((c) => ({cinema:c, shows:perCinema.get(c.id) || []}));
      for (const [key, shows] of perCinema) {
        if (!byId.has(key)) records.push({cinema:{id:key,name_zh:shows[0].cinema_name,city:slug,address:''},shows});
      }
      const filtered = records.filter(({cinema,shows}) => {
        if (!query) return true;
        return [cinema.name_zh,cinema.name_en,cinema.address,...shows.flatMap((s) => [s.movie_title,s.movie_title_en])]
          .some((value) => String(value || '').toLocaleLowerCase().includes(query));
      }).sort((a,b) => (b.shows.length - a.shows.length) || String(a.cinema.name_zh).localeCompare(String(b.cinema.name_zh)));
      if (filtered.length) groups.push({slug,records:filtered});
      cinemaTotal += filtered.length;
      showtimeTotal += filtered.reduce((n,x) => n + x.shows.length,0);
    }
    summaryEl.textContent = `${cinemaTotal} ${cinemaTotal === 1 ? 'cinema' : 'cinemas'} · ${showtimeTotal} showtimes on ${dateInput.value}`;
    mapCaption.textContent = selectedCity === 'all' ? `${cityDefs.length} cities and counties · ${Object.keys(cinemaByCity).length ? Object.values(cinemaByCity).reduce((n,x) => n + (x.cinemas?.length || 0),0) : 0} cinemas` : `${displayName(selectedCity)} · ${cinemaCount(selectedCity)} cinemas`;
    if (!groups.length) {
      resultsEl.innerHTML = `<div class="no-results">No cinemas or showtimes match this search.<br>Try another date, city, or search term.</div>`;
      return;
    }
    resultsEl.innerHTML = groups.map(({slug,records}) => {
      const showCount = records.reduce((n,x) => n + x.shows.length,0);
      const heading = selectedCity === 'all' ? `<div class="city-heading"><h2>${esc(displayName(slug))}</h2><span>${records.length} cinemas · ${showCount} sessions</span></div>` : '';
      return `${heading}${records.map(({cinema,shows}) => {
        const address = cinema.address ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cinema.address)}" target="_blank" rel="noopener">${esc(cinema.address)} ↗</a>` : 'Address unavailable';
        const active = shows.length > 0;
        const movies = new Map();
        shows.sort((a,b) => String(a.start_time).localeCompare(String(b.start_time))).forEach((s) => {
          const key = `${s.movie_title || ''}|${s.movie_title_en || ''}`;
          if (!movies.has(key)) movies.set(key,[]);
          movies.get(key).push(s);
        });
        const movieHtml = active ? [...movies.values()].map(movieCard).join('') : '<div class="empty-show">No showtimes listed for this date · schedule data may be incomplete</div>';
        return `<article class="cinema"><div class="cinema-top"><div class="cinema-name">${esc(cinema.name_zh || cinema.name_en || 'Cinema')}</div><span class="status-pill ${active ? '' : 'unknown'}">${active ? `${shows.length} sessions` : 'No schedule'}</span></div><div class="address">${address}</div>${movieHtml}</article>`;
      }).join('')}`;
    }).join('');
  }
  function selectCity(slug, fly) {
    selectedCity = slug;
    citySelect.value = slug;
    renderResults();
    renderMarkers();
    if (fly && map) {
      const city = cityDefs.find((c) => c.slug === slug);
      if (city?.center) map.flyTo({center:city.center,zoom:10.3,duration:850});
      else if (slug === 'all') renderMarkers();
    }
  }
  async function init() {
    dateInput.value = todayTaiwan();
    buildMap();
    try {
      const citiesData = await loadJson('../garbage-truck/v2/data/cities.json');
      cityDefs = citiesData.cities.map((c) => ({slug:c.slug,center:c.center}));
      const slugs = [...cityDefs.map((c) => c.slug),'unknown'];
      await Promise.all(slugs.map(async (slug) => {
        const [cinemas,shows] = await Promise.all([
          loadJson(`data/cinemas/${slug}.json`).catch(() => ({cinemas:[]})),
          loadJson(`data/showtimes/${slug}.json`).catch(() => ({showtimes:[]}))
        ]);
        cinemaByCity[slug] = cinemas;
        showsByCity[slug] = shows;
      }));
      setupCityOptions();
      if (map?.loaded()) renderMarkers();
      $('#updated').textContent = 'Showtime data · Taiwan local time';
      renderResults();
    } catch (error) {
      console.error('Cinema data could not be loaded',error);
      resultsEl.innerHTML = '<div class="no-results">Cinema data could not be loaded.<br>Please refresh the page and try again.</div>';
      summaryEl.textContent = 'Data unavailable';
    }
  }
  citySelect.addEventListener('change', (e) => selectCity(e.target.value,true));
  dateInput.addEventListener('change',renderResults);
  searchInput.addEventListener('input',renderResults);
  $('#reset').addEventListener('click',() => {searchInput.value='';dateInput.value=todayTaiwan();selectCity('all',true);});
  document.addEventListener('keydown',(e) => {
    if (e.key === '/' && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) {e.preventDefault();searchInput.focus();}
    if (e.key === 'Escape' && document.activeElement === searchInput) {searchInput.value='';renderResults();searchInput.blur();}
  });
  init();
})();
