(() => {
  const $ = (selector) => document.querySelector(selector);
  const citySelect = $('#city');
  const dateSelect = $('#date');
  const searchInput = $('#search');
  const resultsEl = $('#results');
  const summaryEl = $('#summary');
  const mapCaption = $('#map-caption');
  const languageSelect = $('#language');
  const subtitleSelect = $('#subtitle-filter');
  const audioSelect = $('#audio-filter');
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
  const localeInfo = {
    en:{html:'en',date:'en-GB',ui:{eyebrow:'SCREENINGS ACROSS TAIWAN',title:'Find a film.<br>Pick your version.',intro:'Search Taiwan showtimes by movie, subtitle, audio, and city.',language:'Language',city:'City',allTaiwan:'All Taiwan',locate:'Use my location',previous:'Previous available date',next:'Next available date',subtitles:'Subtitles',audio:'Audio',anySubtitles:'Any subtitle',anyAudio:'Any audio',allDates:'All recorded dates',search:'Search films or cinemas',placeholder:'Search a movie, international title, or cinema…',reset:'Reset',loading:'Loading cinemas…',dataNote:'Subtitles are shown only when a source explicitly lists them. Missing details stay unverified.',noResults:'No screenings match these filters.',noSchedules:'No schedules indexed for this date.',sessions:'sessions',cinemas:'cinemas',titleSource:'Source title',international:'International title',subtitleUnknown:'Subtitle unverified',audioUnknown:'Audio unverified',addressUnavailable:'Address unavailable',source:'Schedule source',locating:'Finding your nearest city…',locationDenied:'Location access was not available.',near:'Nearest mapped city center',km:'km away',today:'Today',localTime:'Taiwan local time',dataUpdated:'Data refreshed',allScreenings:'screenings across all recorded dates',sourceLink:'Source schedule ↗',unknownCity:'Other / unassigned'}},
    'zh-TW':{html:'zh-TW',date:'zh-TW',ui:{eyebrow:'全台院線場次',title:'找一部電影。<br>選你要的版本。',intro:'依電影、字幕、語音和城市搜尋全台場次。',language:'語言',city:'城市',allTaiwan:'全台灣',locate:'使用我的位置',previous:'上一個有場次的日期',next:'下一個有場次的日期',subtitles:'字幕',audio:'語音',anySubtitles:'不限字幕',anyAudio:'不限語音',allDates:'所有已收錄日期',search:'搜尋電影或影城',placeholder:'搜尋電影、國際片名或影城…',reset:'重設',loading:'正在載入影城…',dataNote:'只有來源明確列出的字幕才會顯示；未提供的資訊會標示為未確認。',noResults:'沒有符合條件的場次。',noSchedules:'這一天沒有收錄到場次。',sessions:'場次',cinemas:'影城',titleSource:'來源片名',international:'國際片名',subtitleUnknown:'字幕未確認',audioUnknown:'語音未確認',addressUnavailable:'沒有地址資料',source:'場次來源',locating:'正在尋找最近的城市…',locationDenied:'無法取得位置。',near:'最近的地圖城市中心',km:'公里',today:'今天',localTime:'台灣時間',dataUpdated:'資料更新時間',allScreenings:'個已收錄場次',sourceLink:'來源場次 ↗',unknownCity:'其他／未分類'}},
    id:{html:'id',date:'id-ID',ui:{eyebrow:'JADWAL BIOSKOP TAIWAN',title:'Cari film.<br>Pilih versinya.',intro:'Cari jadwal film di Taiwan berdasarkan subtitle, audio, dan kota.',language:'Bahasa',city:'Kota',allTaiwan:'Seluruh Taiwan',locate:'Gunakan lokasi saya',previous:'Tanggal tersedia sebelumnya',next:'Tanggal tersedia berikutnya',subtitles:'Subtitle',audio:'Audio',anySubtitles:'Semua subtitle',anyAudio:'Semua audio',allDates:'Semua tanggal yang tercatat',search:'Cari film atau bioskop',placeholder:'Cari film, judul internasional, atau bioskop…',reset:'Atur ulang',loading:'Memuat bioskop…',dataNote:'Subtitle hanya ditampilkan jika disebutkan oleh sumber. Info yang tidak tersedia tetap belum terverifikasi.',noResults:'Tidak ada jadwal yang cocok.',noSchedules:'Belum ada jadwal yang tercatat untuk tanggal ini.',sessions:'jadwal',cinemas:'bioskop',titleSource:'Judul dari sumber',international:'Judul internasional',subtitleUnknown:'Subtitle belum terverifikasi',audioUnknown:'Audio belum terverifikasi',addressUnavailable:'Alamat tidak tersedia',source:'Sumber jadwal',locating:'Mencari kota terdekat…',locationDenied:'Lokasi tidak bisa diakses.',near:'Pusat kota terdekat di peta',km:'km',today:'Hari ini',localTime:'Waktu Taiwan',dataUpdated:'Data diperbarui',allScreenings:'jadwal tercatat untuk semua tanggal',sourceLink:'Sumber jadwal ↗',unknownCity:'Lainnya / belum terpetakan'}},
    ja:{html:'ja',date:'ja-JP',ui:{eyebrow:'台湾全域の上映情報',title:'映画を探して、<br>字幕と音声を選ぶ。',intro:'作品、字幕、音声、都市から台湾の上映を検索。',language:'言語',city:'都市',allTaiwan:'台湾全域',locate:'現在地を使う',previous:'前の上映日',next:'次の上映日',subtitles:'字幕',audio:'音声',anySubtitles:'すべての字幕',anyAudio:'すべての音声',allDates:'記録された全日程',search:'作品・映画館を検索',placeholder:'作品名、国際タイトル、映画館を検索…',reset:'リセット',loading:'映画館を読み込み中…',dataNote:'字幕は情報源に明記された場合のみ表示します。不明な情報は未確認のままです。',noResults:'条件に一致する上映はありません。',noSchedules:'この日の上映情報はありません。',sessions:'上映',cinemas:'映画館',titleSource:'掲載タイトル',international:'国際タイトル',subtitleUnknown:'字幕未確認',audioUnknown:'音声未確認',addressUnavailable:'住所情報なし',source:'上映情報の出典',locating:'最寄りの都市を検索中…',locationDenied:'位置情報を取得できませんでした。',near:'地図上で最寄りの都市中心',km:'km',today:'今日',localTime:'台湾時間',dataUpdated:'データ更新',allScreenings:'全記録日の上映',sourceLink:'上映情報 ↗',unknownCity:'その他 / 未分類'}},
    ko:{html:'ko',date:'ko-KR',ui:{eyebrow:'대만 전역 상영 정보',title:'영화를 찾고<br>자막과 음성을 고르세요.',intro:'영화, 자막, 음성, 도시별 대만 상영작을 검색하세요.',language:'언어',city:'도시',allTaiwan:'대만 전체',locate:'내 위치 사용',previous:'이전 상영일',next:'다음 상영일',subtitles:'자막',audio:'음성',anySubtitles:'모든 자막',anyAudio:'모든 음성',allDates:'기록된 모든 날짜',search:'영화 또는 극장 검색',placeholder:'영화, 국제 제목 또는 극장 검색…',reset:'초기화',loading:'극장 불러오는 중…',dataNote:'자막은 출처에 명시된 경우에만 표시합니다. 정보가 없으면 미확인으로 남깁니다.',noResults:'조건에 맞는 상영이 없습니다.',noSchedules:'이 날짜에는 등록된 상영이 없습니다.',sessions:'회차',cinemas:'극장',titleSource:'출처 제목',international:'국제 제목',subtitleUnknown:'자막 미확인',audioUnknown:'음성 미확인',addressUnavailable:'주소 정보 없음',source:'상영 정보 출처',locating:'가까운 도시를 찾는 중…',locationDenied:'위치 정보를 가져올 수 없습니다.',near:'지도상 가장 가까운 도시 중심',km:'km',today:'오늘',localTime:'대만 현지 시간',dataUpdated:'데이터 업데이트',allScreenings:'기록된 전체 날짜의 상영',sourceLink:'상영 정보 ↗',unknownCity:'기타 / 미분류'}},
    vi:{html:'vi',date:'vi-VN',ui:{eyebrow:'LỊCH CHIẾU TOÀN ĐÀI LOAN',title:'Tìm phim.<br>Chọn phiên bản.',intro:'Tìm lịch chiếu theo phim, phụ đề, âm thanh và thành phố.',language:'Ngôn ngữ',city:'Thành phố',allTaiwan:'Toàn Đài Loan',locate:'Dùng vị trí của tôi',previous:'Ngày chiếu trước',next:'Ngày chiếu tiếp',subtitles:'Phụ đề',audio:'Âm thanh',anySubtitles:'Mọi phụ đề',anyAudio:'Mọi âm thanh',allDates:'Tất cả ngày đã ghi nhận',search:'Tìm phim hoặc rạp',placeholder:'Tìm phim, tên quốc tế hoặc rạp…',reset:'Đặt lại',loading:'Đang tải rạp…',dataNote:'Chỉ hiển thị phụ đề được nguồn ghi rõ. Thông tin còn thiếu vẫn là chưa xác minh.',noResults:'Không có suất chiếu phù hợp.',noSchedules:'Chưa có lịch chiếu được ghi nhận vào ngày này.',sessions:'suất',cinemas:'rạp',titleSource:'Tên theo nguồn',international:'Tên quốc tế',subtitleUnknown:'Chưa xác minh phụ đề',audioUnknown:'Chưa xác minh âm thanh',addressUnavailable:'Không có địa chỉ',source:'Nguồn lịch chiếu',locating:'Đang tìm thành phố gần nhất…',locationDenied:'Không truy cập được vị trí.',near:'Trung tâm thành phố gần nhất trên bản đồ',km:'km',today:'Hôm nay',localTime:'Giờ Đài Loan',dataUpdated:'Dữ liệu cập nhật',allScreenings:'suất trong tất cả ngày đã ghi nhận',sourceLink:'Nguồn lịch chiếu ↗',unknownCity:'Khác / chưa phân loại'}},
    th:{html:'th',date:'th-TH',ui:{eyebrow:'รอบฉายทั่วไต้หวัน',title:'ค้นหาหนัง<br>เลือกเสียงและคำบรรยาย',intro:'ค้นหารอบฉายตามภาพยนตร์ คำบรรยาย เสียง และเมือง',language:'ภาษา',city:'เมือง',allTaiwan:'ทั่วไต้หวัน',locate:'ใช้ตำแหน่งของฉัน',previous:'วันที่มีรอบก่อนหน้า',next:'วันที่มีรอบถัดไป',subtitles:'คำบรรยาย',audio:'เสียง',anySubtitles:'ทุกคำบรรยาย',anyAudio:'ทุกเสียง',allDates:'ทุกวันที่มีข้อมูล',search:'ค้นหาหนังหรือโรงภาพยนตร์',placeholder:'ค้นหาหนัง ชื่อสากล หรือโรงภาพยนตร์…',reset:'รีเซ็ต',loading:'กำลังโหลดโรงภาพยนตร์…',dataNote:'แสดงคำบรรยายเมื่อแหล่งข้อมูลระบุไว้อย่างชัดเจนเท่านั้น ข้อมูลที่ไม่มีจะคงสถานะไม่ยืนยัน',noResults:'ไม่พบรอบฉายที่ตรงกับตัวกรอง',noSchedules:'ไม่มีข้อมูลรอบฉายในวันนี้',sessions:'รอบ',cinemas:'โรงภาพยนตร์',titleSource:'ชื่อจากแหล่งข้อมูล',international:'ชื่อสากล',subtitleUnknown:'ยังไม่ยืนยันคำบรรยาย',audioUnknown:'ยังไม่ยืนยันเสียง',addressUnavailable:'ไม่มีที่อยู่',source:'แหล่งข้อมูลรอบฉาย',locating:'กำลังค้นหาเมืองที่ใกล้ที่สุด…',locationDenied:'ไม่สามารถเข้าถึงตำแหน่งได้',near:'ศูนย์กลางเมืองที่ใกล้ที่สุดบนแผนที่',km:'กม.',today:'วันนี้',localTime:'เวลาไต้หวัน',dataUpdated:'อัปเดตข้อมูล',allScreenings:'รอบฉายในทุกวันที่บันทึก',sourceLink:'แหล่งข้อมูล ↗',unknownCity:'อื่น ๆ / ไม่ระบุ'}}
  };
  const languageNames = {en:'English',zh:'中文',ja:'日本語',ko:'한국어',fr:'Français',de:'Deutsch',es:'Español',it:'Italiano',th:'ไทย',vi:'Tiếng Việt',id:'Bahasa Indonesia',ms:'Bahasa Melayu',fil:'Filipino',my:'မြန်မာ',hi:'हिन्दी'};
  const filterLanguages = ['en','zh','ja','ko','fr','vi','th','id'];
  const languageAliases = {en:['en','英文','英語','English'],zh:['zh','國語','中文','華語','Chinese'],ja:['ja','日語','日文','Japanese'],ko:['ko','韓語','韓文','한국어','Korean'],fr:['fr','法語','法文','French'],vi:['vi','越南語'],th:['th','泰語'],id:['id','印尼語']};
  const localeCodes = Object.keys(localeInfo);
  let language = 'en';
  let cityDefs = [];
  let cinemaByCity = {};
  let showsByCity = {};
  let markers = [];
  let userMarker = null;
  let selectedCity = 'all';
  let selectedCinemaId = '';
  let availableDates = [];
  let explicitSubtitleRows = 0;
  let knownShowtimeRows = 0;
  let dataGeneratedDate = '';
  let map;

  const ui = (key) => localeInfo[language].ui[key] || localeInfo.en.ui[key] || key;
  const countWords = {
    en:['cities','cinemas','sessions'], 'zh-TW':['縣市','影城','場次'], id:['kota','bioskop','jadwal'],
    ja:['都市','映画館','上映'], ko:['도시','극장','회차'], vi:['thành phố','rạp','suất'], th:['เมือง','โรงภาพยนตร์','รอบ']
  };
  const themeLabels = {
    en:['Switch to light mode','Switch to dark mode'], 'zh-TW':['切換至淺色模式','切換至深色模式'],
    id:['Ganti ke mode terang','Ganti ke mode gelap'], ja:['ライトモードに切り替え','ダークモードに切り替え'],
    ko:['라이트 모드로 전환','다크 모드로 전환'], vi:['Chuyển sang giao diện sáng','Chuyển sang giao diện tối'], th:['เปลี่ยนเป็นโหมดสว่าง','เปลี่ยนเป็นโหมดมืด']
  };
  const subtitleCoverageLabels = {
    en:(n,total)=>`${n} of ${total} screenings have explicit subtitle details.`,
    'zh-TW':(n,total)=>`${total} 場次中有 ${n} 場由來源明確提供字幕資訊。`,
    id:(n,total)=>`${n} dari ${total} jadwal mencantumkan info subtitle secara eksplisit.`,
    ja:(n,total)=>`${total} 件中 ${n} 件は字幕情報が出典に明記されています。`,
    ko:(n,total)=>`${total}개 상영 중 ${n}개에 자막 정보가 출처에 명시되어 있습니다.`,
    vi:(n,total)=>`${n}/${total} suất có thông tin phụ đề được nguồn ghi rõ.`,
    th:(n,total)=>`${n} จาก ${total} รอบมีข้อมูลคำบรรยายที่แหล่งข่าวระบุชัดเจน`
  };
  const currentLocationLabels = {en:'Your location','zh-TW':'您的位置',id:'Lokasi Anda',ja:'現在地',ko:'내 위치',vi:'Vị trí của bạn',th:'ตำแหน่งของคุณ'};
  const countWord = (index) => (countWords[language] || countWords.en)[index];
  function todayTaiwan() {
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function decodeEntities(value) {
    return String(value ?? '').replace(/&(?:amp|quot|apos|#39|rsquo|lsquo|rdquo|ldquo|ndash|mdash|hellip);/g,(entity)=>({
      '&amp;':'&','&quot;':'"','&apos;':"'",'&#39;':"'",'&rsquo;':'’','&lsquo;':'‘','&rdquo;':'”','&ldquo;':'“','&ndash;':'–','&mdash;':'—','&hellip;':'…'
    }[entity]||entity));
  }
  function safeUrl(value) {
    try { const url=new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
  }
  function loadJson(url) {
    return fetch(url,{cache:'no-cache'}).then((r)=>{if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();});
  }
  function displayName(slug) {
    if (language === 'zh-TW') return zhNames[slug] || ui('unknownCity');
    return cityNames[slug] || ui('unknownCity');
  }
  function cinemaCount(slug) { return (cinemaByCity[slug]?.cinemas || []).length; }
  function cinemaPoint(cinema) {
    const lng = Number(cinema?.longitude ?? cinema?.lng ?? cinema?.coordinates?.[0]);
    const lat = Number(cinema?.latitude ?? cinema?.lat ?? cinema?.coordinates?.[1]);
    return Number.isFinite(lng) && Number.isFinite(lat) && lng >= 118 && lng <= 123 && lat >= 20 && lat <= 27 ? [lng, lat] : null;
  }
  async function loadOsmCinemaPoints() {
    const url='https://services-ap1.arcgis.com/iA7fZQOnjY9D67Zx/arcgis/rest/services/OSM_AS_Amenities/FeatureServer/0/query?where=amenity%3D%27cinema%27&geometry=117%2C20%2C123%2C27&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=2000&f=geojson';
    const response=await fetch(url,{cache:'force-cache',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`OSM cinema layer: ${response.status}`);
    const payload=await response.json(),features=payload.features||[];
    const norm=s=>String(s||'').toLocaleLowerCase().replace(/臺/g,'台').replace(/[\s　·・\-]/g,'').replace(/(電影院|電影館|電影城|影城|戲院|theatre|cinema)/gi,'');
    const entries=[];for(const slug of Object.keys(cinemaByCity))for(const cinema of cinemaByCity[slug]?.cinemas||[])entries.push({slug,cinema,key:norm(cinema.name_zh||cinema.name_en)});
    for(const feature of features){
      const point=feature.geometry?.coordinates,properties=feature.properties||{};
      const sourceNames=[properties.name,properties.name_zh,properties['name:zh'],properties.name_en].filter(Boolean).map(norm);
      if(!Array.isArray(point)||point.length<2||(!sourceNames.length&&!(properties.addr_street&&properties.addr_housenumber)))continue;
      let hits=entries.filter(({key})=>key&&sourceNames.some(name=>name===key||(name.length>=4&&key.includes(name))||(key.length>=4&&name.includes(key))));
      if(hits.length!==1&&properties.addr_street&&properties.addr_housenumber){
        const street=norm(properties.addr_street),number=norm(properties.addr_housenumber);
        hits=entries.filter(({cinema})=>{const address=norm(cinema.address);return street.length>=2&&address.includes(street)&&address.includes(number);});
      }
      if(hits.length!==1)continue;
      const [lng,lat]=point;if(lng<118||lng>123||lat<20||lat>27)continue;
      hits[0].cinema.longitude=lng;hits[0].cinema.latitude=lat;hits[0].cinema.coordinate_source='OpenStreetMap';
      const image=safeUrl(properties.image);if(image)hits[0].cinema.image_url=image;
    }
    return entries.filter(({cinema})=>cinemaPoint(cinema)).length;
  }
  function showtimeCount(slug) { return (showsByCity[slug]?.showtimes || []).length; }
  function getAllShowtimes() { return Object.values(showsByCity).flatMap((x)=>x.showtimes||[]); }
  function normalizeLang(value) {
    if (!value) return '';
    const input=String(value).toLowerCase().trim();
    for (const [code,aliases] of Object.entries(languageAliases)) if (aliases.some((x)=>input===x.toLowerCase())) return code;
    return input;
  }
  function fieldLangCount(field,code) {
    return getAllShowtimes().reduce((n,s)=>{
      if (field==='subtitles') return n+((Array.isArray(s.subtitles)&&s.subtitles.some(x=>normalizeLang(x)===code))?1:0);
      return n+(normalizeLang(s.audio_language)===code?1:0);
    },0);
  }
  function buildMap() {
    if (!window.maplibregl) { $('#map-error').hidden=false; $('#map-error').textContent='The map library did not load. Browse cinemas from the list.'; return; }
    map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:[121,23.8],zoom:6.4,attributionControl:false});
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),'bottom-right');
    map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-left');
    map.on('error',()=>{$('#map-error').hidden=false;});
    map.on('click',handleMapSelection);
    map.on('load',()=>{if(cityDefs.length)renderMarkers();});
  }
  function renderMarkers() {
    if (!map||!map.loaded()) return;
    markers.forEach((m)=>m.remove()); markers=[];
    selectedCities().forEach((slug)=>{
      for (const cinema of cinemaByCity[slug]?.cinemas || []) {
        const point=cinemaPoint(cinema); if(!point)continue;
        const el=document.createElement('button');el.type='button';el.className=`cinema-marker${selectedCinemaId===cinema.id?' selected':''}`;el.textContent='⌂';el.setAttribute('aria-label',cinema.name_zh||cinema.name_en||'Cinema');
        const shows=(showsByCity[slug]?.showtimes||[]).filter(s=>s.cinema_id===cinema.id && (s.start_time||'').slice(0,10)===dateSelect.value);
        const addr=cinema.address?`<span class="nearby-note">${esc(cinema.address)}</span>`:'';
        const image=safeUrl(cinema.image_url||cinema.photo_url||cinema.image);
        const photo=image?`<img class="popup-photo" src="${esc(image)}" alt="${esc(cinema.name_zh||'Cinema building')}" loading="lazy">`:'';
        const filmGroups=new Map();shows.forEach(show=>{const title=show.movie_title||'Untitled screening';if(!filmGroups.has(title))filmGroups.set(title,[]);filmGroups.get(title).push(show);});
        const filmRows=[...filmGroups.entries()].slice(0,8).map(([title,rows])=>`<li><b>${esc(title)}</b><span>${rows.map(show=>formatTime(show.start_time)).filter(Boolean).join(' · ')}</span><small>${rows[0].audio_language?`${esc(ui('audio'))}: ${esc(audioLabel(rows[0].audio_language))} · `:''}${esc(ui('subtitles'))}: ${esc(subtitleLabel(rows[0].subtitles))}</small></li>`).join('');
        const more=filmGroups.size>8?`<li class="popup-more">+ ${filmGroups.size-8} more films in the list</li>`:'';
        const popup=new maplibregl.Popup({offset:20,closeButton:true,maxWidth:'340px'}).setHTML(`${photo}<b>${esc(cinema.name_zh||cinema.name_en||'Cinema')}</b><br><span class="nearby-note">${esc(cinema.company_name||'')}${cinema.screens?` · ${esc(cinema.screens)} screens`:''}</span><br>${addr}<br><span class="nearby-note">${shows.length} ${esc(ui('sessions'))}</span><ul class="popup-movies">${filmRows}${more}</ul>`);
        const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(point).setPopup(popup).addTo(map);
        marker._cinemaId=cinema.id;marker._citySlug=slug;
        el.addEventListener('click',()=>selectCinema(cinema.id,slug,true));markers.push(marker);
      }
    });
    const mapped=selectedCities().flatMap(slug=>(cinemaByCity[slug]?.cinemas||[]).filter(c=>cinemaPoint(c)).map(cinemaPoint));
    if(selectedCity==='all'&&mapped.length){const bounds=mapped.reduce((b,p)=>b.extend(p),new maplibregl.LngLatBounds(mapped[0],mapped[0]));map.fitBounds(bounds,{padding:{top:70,right:65,bottom:90,left:65},maxZoom:10,duration:0});}
  }
  function setupCityOptions() {
    citySelect.innerHTML=`<option value="all">${esc(ui('allTaiwan'))}</option>`+cityDefs.filter(c=>cinemaCount(c.slug)>0).map(c=>`<option value="${esc(c.slug)}">${esc(displayName(c.slug))} · ${cinemaCount(c.slug)}</option>`).join('');
    if(cinemaCount('unknown'))citySelect.insertAdjacentHTML('beforeend',`<option value="unknown">${esc(ui('unknownCity'))} · ${cinemaCount('unknown')}</option>`);
  }
  function setupDateOptions() {
    const all=getAllShowtimes();
    const today=todayTaiwan();
    availableDates=[...new Set(all.map(s=>(s.start_time||'').slice(0,10)).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&x>=today))].sort();
    if(!availableDates.length)availableDates=[today];
    let initial=availableDates.includes(today)?today:(availableDates[0]||today);
    dateSelect.innerHTML=availableDates.map(d=>`<option value="${d}">${d===today?`${esc(ui('today'))} · `:''}${esc(formatDate(d))} · ${countDate(d)}</option>`).join('');
    dateSelect.value=initial;syncDateControls();
  }
  function countDate(date) { return getAllShowtimes().filter(s=>(s.start_time||'').slice(0,10)===date).length; }
  function formatDate(date,style='full') {
    if(date==='all-dates')return ui('allDates');
    const [y,m,d]=date.split('-').map(Number);const value=new Date(Date.UTC(y,m-1,d,12));
    return new Intl.DateTimeFormat(localeInfo[language].date,style==='short'?{timeZone:'UTC',day:'numeric',month:'short'}:{timeZone:'UTC',weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(value);
  }
  function syncDateControls() {
    const idx=availableDates.indexOf(dateSelect.value);
    $('#date-prev').disabled=true;$('#date-next').disabled=idx<0||idx>=availableDates.length-1;
    $('#date-count').textContent=`${countDate(dateSelect.value)} ${ui('sessions')}`;
  }
  function setupLanguageFilters() {
    const allLabel=ui('anySubtitles');
    subtitleSelect.innerHTML=`<option value="all">${esc(allLabel)}</option>`+filterLanguages.map(code=>`<option value="${code}">${esc(languageNames[code]||code)} · ${fieldLangCount('subtitles',code)}</option>`).join('');
    audioSelect.innerHTML=`<option value="all">${esc(ui('anyAudio'))}</option>`+filterLanguages.map(code=>`<option value="${code}">${esc(languageNames[code]||code)} · ${fieldLangCount('audio_language',code)}</option>`).join('');
  }
  function selectedShowtimes(slug) {
    const list=showsByCity[slug]?.showtimes||[];
    return list.filter(s=>(s.start_time||'').slice(0,10)===dateSelect.value);
  }
  function selectedCities() {
    if(selectedCity!=='all')return [selectedCity];
    return [...new Set([...Object.keys(cinemaByCity),...Object.keys(showsByCity)])].sort((a,b)=>displayName(a).localeCompare(displayName(b)));
  }
  function subtitleLabel(subs) {
    if(!Array.isArray(subs)||!subs.length)return ui('subtitleUnknown');
    return subs.map(s=>languageNames[normalizeLang(s)]||s).join(', ');
  }
  function audioLabel(code) { return code ? (languageNames[normalizeLang(code)]||code) : ui('audioUnknown'); }
  function formatTime(value) {
    const d=new Date(value);if(Number.isNaN(d.getTime()))return '';
    return new Intl.DateTimeFormat(localeInfo[language].date,{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);
  }
  function movieCard(showtimes) {
    const first=showtimes[0],filmTitle=decodeEntities(first.movie_title||'Untitled screening'),titleEn=decodeEntities(first.movie_title_en||'');
    const sessions=showtimes.map(s=>{
      const day=dateSelect.value==='all-dates'?`<span class="tag">${esc(formatDate((s.start_time||'').slice(0,10),'short'))}</span>`:'';
      const time=formatTime(s.start_time),meta=[s.format,s.hall].filter(Boolean),audio=audioLabel(s.audio_language);
      if(s.audio_language)meta.push(`${ui('audio')}: ${audio}`);
      meta.push(`${ui('subtitles')}: ${subtitleLabel(s.subtitles)}`);
      const url=safeUrl(s.source_url),link=url?`<a class="detail-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(ui('sourceLink'))}</a>`:'';
      return `<div class="showtime-row">${day}${time?`<span class="time-chip">${esc(time)}</span>`:''}${meta.map(x=>`<span class="tag ${x.startsWith(`${ui('subtitles')}:`)?'sub':x.startsWith(`${ui('audio')}:`)?'audio':''}">${esc(x)}</span>`).join('')}</div>${link}`;
    }).join('');
    return `<div class="movie"><div class="movie-title"><span class="movie-title-label">${esc(ui('titleSource'))}</span>${esc(filmTitle)}</div>${titleEn?`<div class="movie-en"><span class="movie-title-label">${esc(ui('international'))}</span>${esc(titleEn)}</div>`:''}${sessions}</div>`;
  }
  function renderResults() {
    if(!Object.keys(cinemaByCity).length)return;
    const query=searchInput.value.trim().toLocaleLowerCase(),subtitle=subtitleSelect.value,audio=audioSelect.value,groups=[];
    let cinemaTotal=0,sessionTotal=0;
    for(const slug of selectedCities()) {
      const cinemas=cinemaByCity[slug]?.cinemas||[],byId=new Map(cinemas.map(c=>[c.id,c])),todays=selectedShowtimes(slug),perCinema=new Map();
      for(const s of todays){if(subtitle!=='all'&&!(Array.isArray(s.subtitles)&&s.subtitles.some(x=>normalizeLang(x)===subtitle)))continue;if(audio!=='all'&&normalizeLang(s.audio_language)!==audio)continue;const key=s.cinema_id||`name:${s.cinema_name||''}`;if(!perCinema.has(key))perCinema.set(key,[]);perCinema.get(key).push(s);}
      const records=cinemas.map(c=>({cinema:c,shows:perCinema.get(c.id)||[]}));
      for(const [key,shows] of perCinema)if(!byId.has(key))records.push({cinema:{id:key,name_zh:shows[0].cinema_name,city:slug,address:''},shows});
      const filtered=records.filter(({cinema,shows})=>{
        if((subtitle!=='all'||audio!=='all')&&!shows.length)return false;
        if(!query||selectedCinemaId===cinema.id)return true;
        return [cinema.name_zh,cinema.name_en,cinema.address,...shows.flatMap(s=>[s.movie_title,s.movie_title_en])].some(v=>decodeEntities(v).toLocaleLowerCase().includes(query));
      }).sort((a,b)=>(b.shows.length-a.shows.length)||String(a.cinema.name_zh).localeCompare(String(b.cinema.name_zh)));
      if(filtered.length)groups.push({slug,records:filtered});cinemaTotal+=filtered.length;sessionTotal+=filtered.reduce((n,x)=>n+x.shows.length,0);
    }
    const dateLabel=formatDate(dateSelect.value);
    summaryEl.textContent=`${cinemaTotal} ${ui('cinemas')} · ${sessionTotal} ${ui('sessions')} · ${dateLabel}`;
    const cityCount=Object.values(cinemaByCity).reduce((n,x)=>n+(x.cinemas?.length||0),0);
    mapCaption.textContent=selectedCity==='all'?`${cityDefs.length} ${countWord(0)} · ${cityCount} ${countWord(1)}`:`${displayName(selectedCity)} · ${cinemaCount(selectedCity)} ${countWord(1)}`;
    if(!groups.length){resultsEl.innerHTML=`<div class="no-results">${esc(ui('noResults'))}<br>${esc(ui('dataNote'))}</div>`;return;}
    resultsEl.innerHTML=groups.map(({slug,records})=>{
      const showCount=records.reduce((n,x)=>n+x.shows.length,0),heading=selectedCity==='all'?`<div class="city-heading"><h2>${esc(displayName(slug))}</h2><span>${records.length} ${esc(ui('cinemas'))} · ${showCount} ${esc(ui('sessions'))}</span></div>`:'';
      return `${heading}${records.map(({cinema,shows})=>{
        const address=cinema.address?`<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cinema.address)}" target="_blank" rel="noopener">${esc(cinema.address)} ↗</a>`:esc(ui('addressUnavailable'));
        const movies=new Map();shows.sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time))).forEach(s=>{const key=`${s.movie_title||''}|${s.movie_title_en||''}`;if(!movies.has(key))movies.set(key,[]);movies.get(key).push(s);});
        const moviesHtml=shows.length?[...movies.values()].map(movieCard).join(''):`<div class="empty-show">${esc(ui('noSchedules'))}</div>`;
        const co=cinema.company_name?`<div class="company-name">${esc(cinema.company_name)}</div>`:'';
        const image=safeUrl(cinema.image_url||cinema.photo_url||cinema.image);
        const photo=image?`<img class="cinema-photo" src="${esc(image)}" alt="${esc(cinema.name_zh||'Cinema building')}" loading="lazy">`:'';
        const location=cinemaPoint(cinema)?`<button class="show-on-map" type="button" data-cinema-id="${esc(cinema.id)}" data-city="${esc(slug)}">Show on map</button>`:'';
        return `<article class="cinema${selectedCinemaId===cinema.id?' selected':''}" id="cinema-${esc(cinema.id)}">${photo}<div class="cinema-top"><div class="cinema-name">${esc((cinema.name_zh||cinema.name_en||'Cinema').replace(/([\u3400-\u9fff])([A-Za-z0-9])/g,'$1 $2').replace(/([A-Za-z0-9])([\u3400-\u9fff])/g,'$1 $2'))}</div><span class="status-pill ${shows.length?'':'unknown'}">${shows.length?`${shows.length} ${esc(ui('sessions'))}`:esc(ui('noSchedules'))}</span></div>${co}<div class="address">${address}</div><div class="cinema-meta">${cinema.screens?`${esc(cinema.screens)} screens`:''}${cinema.phone?` · ${esc(cinema.phone)}`:''} ${location}</div>${moviesHtml}</article>`;
      }).join('')}`;
    }).join('');
  }
  function selectCity(slug,fly) {
    selectedCity=slug;selectedCinemaId='';citySelect.value=slug;renderResults();renderMarkers();
    if(fly&&map){const city=cityDefs.find(c=>c.slug===slug);if(city?.center)map.flyTo({center:city.center,zoom:10.3,duration:850});else if(slug==='all')map.fitBounds([[119.3,21.7],[122.1,25.5]],{padding:{top:70,right:65,bottom:90,left:65},duration:850});}
  }
  function selectCinema(id,slug,fly) {
    selectedCity=slug;selectedCinemaId=id;citySelect.value=slug;renderResults();renderMarkers();
    const card=document.getElementById(`cinema-${id}`);if(card)card.scrollIntoView({behavior:'smooth',block:'start'});
    if(fly&&map){const cinema=(cinemaByCity[slug]?.cinemas||[]).find(c=>c.id===id),point=cinemaPoint(cinema);if(point){map.flyTo({center:point,zoom:16,duration:700});markers.find(m=>m._cinemaId===id)?.togglePopup();}}
  }
  function handleMapSelection(event) {
    if(!map)return;
    const normalize=s=>String(s).toLocaleLowerCase().replace(/[\s　·・\-]/g,'').replace(/臺/g,'台');
    const names=map.queryRenderedFeatures(event.point).map(f=>f.properties?.name||f.properties?.['name:zh']||f.properties?.name_zh||'').filter(Boolean).map(normalize);
    if(!names.length)return;
    for(const slug of selectedCities())for(const cinema of cinemaByCity[slug]?.cinemas||[]){
      const name=normalize(cinema.name_zh||cinema.name_en||'');
      if(name&&names.some(n=>n===name||n.includes(name)||name.includes(n))){selectCinema(cinema.id,slug,false);return;}
    }
  }
  function setLanguage(code) {
    const priorDate=dateSelect.value;
    language=localeInfo[code]?code:'en';languageSelect.value=language;document.documentElement.lang=localeInfo[language].html;
    document.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(localeInfo[language].ui[key])el.innerHTML=localeInfo[language].ui[key];});
    searchInput.placeholder=ui('placeholder');citySelect.setAttribute('aria-label',ui('city'));dateSelect.setAttribute('aria-label',ui('date'));
    languageSelect.setAttribute('aria-label',ui('language'));subtitleSelect.setAttribute('aria-label',ui('subtitles'));audioSelect.setAttribute('aria-label',ui('audio'));
    $('#date-prev').setAttribute('aria-label',ui('previous'));$('#date-next').setAttribute('aria-label',ui('next'));
    setupCityOptions();citySelect.value=selectedCity;setupDateOptions();if(availableDates.includes(priorDate))dateSelect.value=priorDate;setupLanguageFilters();syncDateControls();
    $('#data-note').textContent=`${ui('dataNote')} ${(subtitleCoverageLabels[language]||subtitleCoverageLabels.en)(explicitSubtitleRows,knownShowtimeRows)}`;
    $('#updated').textContent=`${ui('dataUpdated')} · ${formatDate(dataGeneratedDate||todayTaiwan(),'short')} · ${ui('localTime')}`;
    setTheme(document.querySelector('.app').dataset.theme||'dark');
    renderMarkers();renderResults();
    try{localStorage.setItem('cinema-language',language);}catch{}
  }
  function setTheme(theme) {
    const app=document.querySelector('.app');app.dataset.theme=theme;
    const dark=theme==='dark',label=(themeLabels[language]||themeLabels.en)[dark?0:1];$('#theme').textContent=dark?'☼':'☾';$('#theme').setAttribute('aria-label',label);$('#theme').title=label;
    try{localStorage.setItem('cinema-theme',theme);}catch{}
  }
  function distanceKm(a,b) {
    const rad=x=>x*Math.PI/180,dLat=rad(b[1]-a.lat),dLon=rad(b[0]-a.lng),lat1=rad(a.lat),lat2=rad(b[1]);
    const x=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  }
  function locateMe() {
    const button=$('#locate');
    if(!navigator.geolocation){mapCaption.textContent=ui('locationDenied');return;}
    button.disabled=true;button.querySelector('[data-i18n]').textContent=ui('locating');
    navigator.geolocation.getCurrentPosition(pos=>{
      const user={lat:pos.coords.latitude,lng:pos.coords.longitude};
      if(userMarker)userMarker.remove();
      const element=document.createElement('div');element.className='user-location-marker';
      if(map&&window.maplibregl)userMarker=new maplibregl.Marker({element}).setLngLat([user.lng,user.lat]).setPopup(new maplibregl.Popup({offset:15}).setText(currentLocationLabels[language]||currentLocationLabels.en)).addTo(map);
      const nearest=cityDefs.filter(c=>c.center&&cinemaCount(c.slug)>0).map(c=>({...c,distance:distanceKm(user,c.center)})).sort((a,b)=>a.distance-b.distance)[0];
      if(nearest)selectCity(nearest.slug,false);
      if(map)map.flyTo({center:[user.lng,user.lat],zoom:15.6,duration:900});
      mapCaption.textContent=currentLocationLabels[language]||currentLocationLabels.en;mapCaption.classList.add('location-active');
      button.querySelector('[data-i18n]').textContent=ui('locate');button.disabled=false;
    },()=>{mapCaption.textContent=ui('locationDenied');button.querySelector('[data-i18n]').textContent=ui('locate');button.disabled=false;},{enableHighAccuracy:true,timeout:12000,maximumAge:300000});
  }
  function changeDate(delta) {
    if(delta<0)return;const index=availableDates.indexOf(dateSelect.value);if(index<0)return;const next=index+delta;if(next<0||next>=availableDates.length)return;dateSelect.value=availableDates[next];syncDateControls();renderMarkers();renderResults();
  }
  async function init() {
    let savedLanguage='en',savedTheme='dark';try{savedLanguage=localStorage.getItem('cinema-language')||'en';savedTheme=localStorage.getItem('cinema-theme')||'dark';}catch{}
    language=localeInfo[savedLanguage]?savedLanguage:'en';languageSelect.value=language;setTheme(savedTheme==='light'?'light':'dark');
    buildMap();
    try {
      const [cityData,manifest]=await Promise.all([loadJson('../garbage-truck/v2/data/cities.json'),loadJson('data/manifest.json').catch(()=>null)]);
      cityDefs=cityData.cities.map(c=>({slug:c.slug,center:c.center}));dataGeneratedDate=(manifest?.generated_at||'').slice(0,10);
      const slugs=[...cityDefs.map(c=>c.slug),'unknown'];
      await Promise.all(slugs.map(async slug=>{
        const [cinemas,shows]=await Promise.all([loadJson(`data/cinemas/${slug}.json`).catch(()=>({cinemas:[]})),loadJson(`data/showtimes/${slug}.json`).catch(()=>({showtimes:[]}))]);
        cinemaByCity[slug]=cinemas;showsByCity[slug]=shows;
      }));
      for(const data of Object.values(showsByCity))for(const show of data.showtimes||[]){knownShowtimeRows++;if(Array.isArray(show.subtitles)&&show.subtitles.length)explicitSubtitleRows++;}
      setupCityOptions();setupDateOptions();setupLanguageFilters();
      if(map?.loaded())renderMarkers();
      loadOsmCinemaPoints().then(count=>{if(count){renderMarkers();renderResults();mapCaption.textContent=`${count} mapped cinemas · OpenStreetMap`;}}).catch(error=>console.warn('Cinema coordinates unavailable',error));
      $('#updated').textContent=`${ui('dataUpdated')} · ${formatDate(dataGeneratedDate||todayTaiwan(),'short')} · ${ui('localTime')}`;
      $('#data-note').textContent=`${ui('dataNote')} ${(subtitleCoverageLabels[language]||subtitleCoverageLabels.en)(explicitSubtitleRows,knownShowtimeRows)}`;
      setLanguage(language);renderResults();
    } catch(error) {
      console.error('Cinema data could not be loaded',error);resultsEl.innerHTML='<div class="no-results">Cinema data could not be loaded.<br>Please refresh and try again.</div>';summaryEl.textContent='Data unavailable';
    }
  }
  citySelect.addEventListener('change',e=>{mapCaption.classList.remove('location-active');selectCity(e.target.value,true);});
  dateSelect.addEventListener('change',()=>{syncDateControls();renderMarkers();renderResults();});
  $('#date-prev').addEventListener('click',()=>changeDate(-1));$('#date-next').addEventListener('click',()=>changeDate(1));
  searchInput.addEventListener('input',renderResults);subtitleSelect.addEventListener('change',renderResults);audioSelect.addEventListener('change',renderResults);
  languageSelect.addEventListener('change',e=>setLanguage(e.target.value));$('#theme').addEventListener('click',()=>setTheme(document.querySelector('.app').dataset.theme==='dark'?'light':'dark'));
  $('#locate').addEventListener('click',locateMe);
  resultsEl.addEventListener('click',e=>{const button=e.target.closest('.show-on-map');if(button)selectCinema(button.dataset.cinemaId,button.dataset.city,true);});
    $('#reset').addEventListener('click',()=>{searchInput.value='';subtitleSelect.value='all';audioSelect.value='all';dateSelect.value=availableDates.includes(todayTaiwan())?todayTaiwan():(availableDates.find(d=>d>=todayTaiwan())||availableDates.at(-1));syncDateControls();mapCaption.classList.remove('location-active');if(userMarker){userMarker.remove();userMarker=null;}selectCity('all',true);});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();searchInput.focus();}if(e.key==='Escape'&&document.activeElement===searchInput){searchInput.value='';renderResults();searchInput.blur();}});
  init();
})();
