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
  const brandSelect = $('#brand-filter');
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
  const languageNames = {en:'English',zh:'中文',ja:'日本語',ko:'한국어',fr:'Français',de:'Deutsch',es:'Español',it:'Italiano',th:'ไทย',vi:'Tiếng Việt',id:'Bahasa Indonesia',ms:'Bahasa Melayu',fil:'Filipino',yue:'粵語 / Cantonese',my:'မြန်မာ',hi:'हिन्दी'};
  const filterLanguages = ['en','zh','ja','ko','yue','fr','vi','th','fil','id'];
  const languageAliases = {en:['en','英文','英語','English'],zh:['zh','國語','中文','華語','Chinese'],ja:['ja','日語','日文','Japanese'],ko:['ko','韓語','韓文','한국어','Korean'],yue:['yue','粵語','廣東話','Cantonese'],fr:['fr','法語','法文','French'],vi:['vi','越南語','越語'],th:['th','泰語'],fil:['fil','菲語','菲律賓語','Filipino'],id:['id','印尼語']};
  const localeCodes = Object.keys(localeInfo);
  let language = 'en';
  let cityDefs = [];
  let cinemaByCity = {};
  let showsByCity = {};
  let venueLocations = [];
  let cinemaEnglishNames = {};
  let cinemaLogoKeys = {};
  let logoMarks = {};
  let logoColors = {};
  let locationLogoKeys = {};
  let locationEnglishNames = {};
  let logoImages = {};
  let logoBackgrounds = {};
  let markers = [];
  let userMarker = null;
  let selectedCity = 'all';
  let selectedCinemaId = '';
  let availableDates = [];
  let showtimesDateIndex = {};
  let ticketPriceIndex = {cinemas:{}};
  const ticketPricesByCity = {};
  const ticketPriceRequests = {};
  let dateLoadSequence = 0;
  let showtimesPending = false;
  let liveShowtimesByCityDate = {};
  let explicitSubtitleRows = 0;
  let knownShowtimeRows = 0;
  let dataGeneratedDate = '';
  let map;
  let mapDataReady = false;
  let savedMapView = null;
  let activePopup = null;
  let userPosition = null;

  const ui = (key) => localeInfo[language].ui[key] || localeInfo.en.ui[key] || key;
  const themeLabels = {
    en:['Switch to light mode','Switch to dark mode'], 'zh-TW':['切換至淺色模式','切換至深色模式'],
    id:['Ganti ke mode terang','Ganti ke mode gelap'], ja:['ライトモードに切り替え','ダークモードに切り替え'],
    ko:['라이트 모드로 전환','다크 모드로 전환'], vi:['Chuyển sang giao diện sáng','Chuyển sang giao diện tối'], th:['เปลี่ยนเป็นโหมดสว่าง','เปลี่ยนเป็นโหมดมืด']
  };
  const mapActionLabels={en:['Hide map','Show map','Expand cinema list','Collapse cinema list'],id:['Sembunyikan peta','Tampilkan peta','Buka daftar bioskop','Kecilkan daftar bioskop'],'zh-TW':['隱藏地圖','顯示地圖','展開影城清單','收合影城清單'],ja:['地図を隠す','地図を表示','映画館リストを開く','リストを閉じる'],ko:['지도 숨기기','지도 보기','극장 목록 펼치기','극장 목록 접기'],vi:['Ẩn bản đồ','Hiện bản đồ','Mở danh sách rạp','Thu gọn danh sách'],th:['ซ่อนแผนที่','แสดงแผนที่','ขยายรายชื่อโรงภาพยนตร์','ย่อรายชื่อโรงภาพยนตร์']};
  const ticketPriceLabels={en:{title:'Ticket prices · TWD',open:'Tap to load prices',loading:'Loading prices…',unavailable:'Prices are unavailable.'},id:{title:'Harga tiket · TWD',open:'Ketuk untuk memuat harga',loading:'Memuat harga…',unavailable:'Harga tidak tersedia.'},'zh-TW':{title:'票價 · TWD',open:'點擊載入票價',loading:'正在載入票價…',unavailable:'目前沒有票價資料。'},ja:{title:'チケット料金 · TWD',open:'タップして料金を表示',loading:'料金を読み込み中…',unavailable:'料金を取得できません。'},ko:{title:'티켓 가격 · TWD',open:'눌러서 가격 보기',loading:'가격 불러오는 중…',unavailable:'가격 정보를 사용할 수 없습니다.'},vi:{title:'Giá vé · TWD',open:'Nhấn để tải giá vé',loading:'Đang tải giá vé…',unavailable:'Không có thông tin giá vé.'},th:{title:'ราคาตั๋ว · TWD',open:'แตะเพื่อโหลดราคา',loading:'กำลังโหลดราคา…',unavailable:'ไม่มีข้อมูลราคา'}};
  const ticketTypeLabels={'全票':{en:'Full ticket',id:'Tiket reguler','zh-TW':'全票',ja:'一般',ko:'일반',vi:'Vé thường',th:'ตั๋วทั่วไป'},'優待票':{en:'Concession',id:'Tiket diskon','zh-TW':'優待票',ja:'割引',ko:'할인',vi:'Vé ưu đãi',th:'ตั๋วส่วนลด'},'早場票':{en:'Matinee',id:'Tiket pertunjukan awal','zh-TW':'早場票',ja:'早朝割引',ko:'조조 할인',vi:'Vé suất sớm',th:'ตั๋วรอบเช้า'},'愛心票':{en:'Accessibility concession',id:'Tiket konsesi khusus','zh-TW':'愛心票',ja:'福祉割引',ko:'우대 할인',vi:'Vé ưu đãi đặc biệt',th:'ตั๋วส่วนลดพิเศษ'}};
  const brandUi={en:{label:'Cinema brand',all:'All brands',vieshow:'VieShow group',vieshowStandard:'VieShow Cinemas',muvie:'MUVIE CINEMAS',other:'Independent / local'},id:{label:'Brand bioskop',all:'Semua brand',vieshow:'Grup VieShow',vieshowStandard:'VieShow Cinemas',muvie:'MUVIE CINEMAS',other:'Lokal / independen'},'zh-TW':{label:'影城品牌',all:'所有品牌',vieshow:'VieShow 集團',vieshowStandard:'VieShow Cinemas',muvie:'MUVIE CINEMAS',other:'其他／在地影城'},ja:{label:'映画館ブランド',all:'すべてのブランド',vieshow:'VieShow グループ',vieshowStandard:'VieShow Cinemas',muvie:'MUVIE CINEMAS',other:'その他／地域館'},ko:{label:'극장 브랜드',all:'모든 브랜드',vieshow:'VieShow 그룹',vieshowStandard:'VieShow Cinemas',muvie:'MUVIE CINEMAS',other:'기타 / 지역 극장'},vi:{label:'Thương hiệu rạp',all:'Tất cả thương hiệu',vieshow:'Nhóm VieShow',vieshowStandard:'VieShow Cinemas',muvie:'MUVIE CINEMAS',other:'Rạp địa phương / độc lập'},th:{label:'แบรนด์โรงภาพยนตร์',all:'ทุกแบรนด์',vieshow:'กลุ่ม VieShow',vieshowStandard:'VieShow Cinemas',muvie:'MUVIE CINEMAS',other:'โรงภาพยนตร์ท้องถิ่น'}};
  const sheetControlLabels={en:{hide:'Hide list · show full map',half:'Open list'},id:{hide:'Tutup daftar · tampilkan peta',half:'buka daftar'},'zh-TW':{hide:'收合清單・顯示完整地圖',half:'開啟清單'},ja:{hide:'リストを閉じて地図を表示',half:'リストを開く'},ko:{hide:'목록 닫기 · 전체 지도 보기',half:'목록 열기'},vi:{hide:'Ẩn danh sách · hiện bản đồ',half:'mở danh sách'},th:{hide:'ซ่อนรายการ · แสดงแผนที่',half:'เปิดรายการ'}};
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
  function normalizeSearch(value) {
    return decodeEntities(value).normalize('NFKC').toLocaleLowerCase()
      .replace(/[’‘`´]/g,"'").replace(/[“”]/g,'"').replace(/[‐‑‒–—]/g,'-')
      .replace(/[\s\u00a0]+/g,' ').trim();
  }
  const genreNames={
    en:{action:'Action',adventure:'Adventure',animation:'Animation',comedy:'Comedy',concert:'Concert',documentary:'Documentary',domestic:'Local film',drama:'Drama',fantasy:'Fantasy',history:'History',horror:'Horror',livestream:'Live stream',music:'Music',mystery:'Mystery',romance:'Romance', 'science fiction':'Science fiction',thriller:'Thriller'},
    id:{action:'Aksi',adventure:'Petualangan',animation:'Animasi',comedy:'Komedi',concert:'Konser',documentary:'Dokumenter',domestic:'Film lokal',drama:'Drama',fantasy:'Fantasi',history:'Sejarah',horror:'Horor',livestream:'Siaran langsung',music:'Musik',mystery:'Misteri',romance:'Romantis','science fiction':'Fiksi ilmiah',thriller:'Thriller'},
    'zh-TW':{action:'動作',adventure:'冒險',animation:'動畫',comedy:'喜劇',concert:'演唱會',documentary:'紀錄片',domestic:'國片',drama:'劇情',fantasy:'奇幻',history:'歷史',horror:'恐怖',livestream:'直播',music:'音樂',mystery:'懸疑',romance:'愛情','science fiction':'科幻',thriller:'驚悚'}
  };
  const ratingNames={
    en:{g:'G · General',p:'P · Guidance',pg12:'PG 12',pg15:'PG 15',r:'R · 18+'},
    id:{g:'G · Umum',p:'P · Bimbingan',pg12:'PG 12',pg15:'PG 15',r:'R · 18+'},
    'zh-TW':{g:'普遍級 G',p:'保護級 P',pg12:'輔12級',pg15:'輔15級',r:'限制級 R · 18+'}
  };
  const ageRatingTitles={en:'Age rating',id:'Batas usia','zh-TW':'電影分級',ja:'年齢区分',ko:'관람 등급',vi:'Phân loại độ tuổi',th:'ระดับอายุ'};
  function displayGenre(value) {
    const code=String(value||'').trim().toLowerCase();
    return (genreNames[language]||genreNames.en)[code]||genreNames.en[code]||code.replace(/\b\w/g,c=>c.toUpperCase());
  }
  function displayRating(value) {
    const code=String(value||'').toLowerCase();
    return (ratingNames[language]||ratingNames.en)[code]||ratingNames.en[code]||'';
  }
  function safeUrl(value) {
    try { const url=new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
  }
  function getTicketPrices(slug) {
    if(ticketPricesByCity[slug])return Promise.resolve(ticketPricesByCity[slug]);
    if(ticketPriceRequests[slug])return ticketPriceRequests[slug];
    ticketPriceRequests[slug]=loadJson(`data/ticket-prices/${slug}.json`).then(data=>(ticketPricesByCity[slug]=data)).finally(()=>{delete ticketPriceRequests[slug];});
    return ticketPriceRequests[slug];
  }
  function ticketPriceMarkup(record,capturedOn) {
    const formats=(record?.ticket_types||[]).map(type=>`<section class="ticket-price-format"><b>${esc(type.format)}</b><div>${(type.prices||[]).map(price=>`<span>${esc(ticketTypeLabels[price.label]?.[language]||price.label)} <strong>NT$ ${Number(price.twd).toLocaleString('en-US')}</strong></span>`).join('')}</div></section>`).join('');
    return `${formats||`<span>${esc((ticketPriceLabels[language]||ticketPriceLabels.en).unavailable)}</span>`}<small>${esc((ticketPriceLabels[language]||ticketPriceLabels.en).source||'ShowTimes')}${capturedOn?` · ${esc(capturedOn)}`:''}</small>`;
  }
  function copyButton(value,what) {
    const labels={en:'Copy',id:'Salin','zh-TW':'複製',ja:'コピー',ko:'복사',vi:'Sao chép',th:'คัดลอก'};
    const target=what==='address'?({en:'address',id:'alamat','zh-TW':'地址',ja:'住所',ko:'주소',vi:'địa chỉ',th:'ที่อยู่'}[language]||'address'):what;
    const label=`${labels[language]||labels.en} ${target}`;
    return `<button class="copy-button" type="button" data-copy="${esc(value)}" aria-label="${esc(label)}" title="${esc(label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path></svg></button>`;
  }
  function splitAddress(address) {
    const value=String(address||'').trim(),match=value.match(/^(.*?號)(.*)$/);
    if(!match)return {street:value,floor:''};
    const street=match[1],tail=match[2].trim();
    if(!tail)return {street,floor:''};
    if(!tail.startsWith('之'))return {street,floor:tail};
    const floor=tail.match(/\s+(?:B\d+|\d+(?:[-、至]\d+)?(?:樓|層|F))/i);
    if(!floor)return {street:street+tail,floor:''};
    const index=floor.index+floor[0].indexOf(floor[0].trim());
    return {street:street+tail.slice(0,index).trimEnd(),floor:tail.slice(index).trim()};
  }
  async function writeClipboard(value) {
    if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(value);
    const input=document.createElement('textarea');input.value=value;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();
    const copied=document.execCommand('copy');input.remove();if(!copied)throw new Error('Clipboard copy failed');
  }
  function loadJson(url) {
    return fetch(url,{cache:'no-cache'}).then((r)=>{if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json();});
  }
  function displayName(slug) {
    if (language === 'zh-TW') return zhNames[slug] || ui('unknownCity');
    return cityNames[slug] || ui('unknownCity');
  }
  function cinemaCount(slug) { return (cinemaByCity[slug]?.cinemas || []).length; }
  function locationCount(slug='all') { return venueLocations.filter(location=>slug==='all'||location.city===slug).length; }
  function cinemaPoint(cinema) {
    const lng = Number(cinema?.longitude ?? cinema?.lng ?? cinema?.coordinates?.[0]);
    const lat = Number(cinema?.latitude ?? cinema?.lat ?? cinema?.coordinates?.[1]);
    return Number.isFinite(lng) && Number.isFinite(lat) && lng >= 118 && lng <= 123 && lat >= 20 && lat <= 27 ? [lng, lat] : null;
  }
  function cinemaLocation(cinema,slug=cinema?.city) {
    const normalize=value=>String(value||'').replace(/臺/g,'台').toLowerCase().replace(/(?:電影城|電影院|電影館|影城|戲院|劇院|威秀|秀泰)/g,'').replace(/[\s　・·()（）\-_/]/g,'');
    const name=normalize(cinema?.name_zh),samePlace=location=>{const other=normalize(location.name);return name&&other&&(name===other||name.includes(other)||other.includes(name));};
    const direct=venueLocations.find(location=>location.cinema_id===cinema?.id&&location.city===slug);if(direct&&samePlace(direct))return direct;
    const matches=venueLocations.filter(location=>location.city===slug&&samePlace(location));
    return matches.length===1?matches[0]:null;
  }
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
  function cinemaPopupContent(location,cinema,logoKey) {
    const shows=cinema?(showsByCity[location.city]?.showtimes||[]).filter(s=>s.cinema_id===cinema.id&&(s.start_time||'').slice(0,10)===dateSelect.value):[];
    const address=cinema?.address||[displayName(location.city),location.street,location.house_number].filter(Boolean).join(' ');
    const addr=address?`<span class="nearby-note">${esc(address)}</span>`:'';
    const image=safeUrl(cinema?.image_url||cinema?.photo_url||cinema?.image);
    const photo=image?`<img class="popup-photo" src="${esc(image)}" alt="${esc(cinema?.name_zh||location.name||'Cinema building')}" loading="lazy">`:'';
    const filmGroups=new Map();shows.forEach(show=>{const title=show.movie_title||'Untitled screening';if(!filmGroups.has(title))filmGroups.set(title,[]);filmGroups.get(title).push(show);});
    const filmRows=[...filmGroups.entries()].map(([title,rows])=>{
      const audios=[...new Set(rows.map(show=>normalizeLang(show.audio_language)).filter(Boolean))].map(code=>languageNames[code]||code);
      const subtitles=[...new Set(rows.flatMap(show=>Array.isArray(show.subtitles)?show.subtitles.map(code=>languageNames[normalizeLang(code)]||code):[]))];
      const times=rows.map(show=>formatTime(show.start_time)).filter(Boolean).join(' · ');
      const details=[audios.length?`${ui('audio')}: ${audios.join(', ')}`:`${ui('audio')}: ${ui('audioUnknown')}`,`${ui('subtitles')}: ${subtitles.length?subtitles.join(', '):ui('subtitleUnknown')}`].join(' · ');
      return `<li><b>${esc(title)}</b><span>${esc(times)}</span><small>${esc(details)}</small></li>`;
    }).join('');
    const venueName=cinema?.name_zh||location.name||'Cinema',locationEnglish=locationEnglishNames[String(location.source_feature_id)]||'';
    const englishName=cinema?.name_en||locationEnglish,logoImage=logoImages[logoKey]||'',logoBackground=logoBackgrounds[logoKey]||'#fff';
    const popupLogo=logoImage?`<div class="popup-brand-logo" style="background:${esc(logoBackground)}"><img src="${esc(logoImage)}" alt="${esc(englishName||venueName)} logo" loading="lazy"></div>`:'';
    return `${photo}${popupLogo}<b>${esc(venueName)}</b>${englishName?`<br><span class="popup-english-name">${esc(englishName)}</span>`:''}<br><span class="nearby-note">${esc(cinema?.company_name||'')}</span><br>${addr}<br><span class="nearby-note">${shows.length} ${esc(ui('sessions'))}</span>${filmRows?`<ul class="popup-movies">${filmRows}</ul>`:`<p class="nearby-note">No schedule is linked for this venue yet.</p>`}`;
  }
  function buildMap() {
    if(map||!mapDataReady)return;
    if (!window.maplibregl) { $('#map-error').hidden=false; $('#map-error').textContent='The map library did not load. Browse cinemas from the list.'; return; }
    const restore=savedMapView;
    map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:restore?.center||[121,23.8],zoom:restore?.zoom||6.4,attributionControl:false,maxTileCacheSize:32,maxTileCacheZoomLevels:2});
    map.on('error',()=>{$('#map-error').hidden=false;});
    map.on('click',handleMapSelection);
    map.on('load',()=>{if(cityDefs.length)renderMarkers(!restore);if(userPosition)showUserMarker();savedMapView=null;});
  }
  function destroyMap() {
    if(!map)return;
    const center=map.getCenter();savedMapView={center:[center.lng,center.lat],zoom:map.getZoom()};
    activePopup?.remove();activePopup=null;markers=[];userMarker=null;map.remove();map=null;
  }
  function renderMarkers(fitAll=true) {
    if (!map||!map.loaded()) return;
    activePopup?.remove();activePopup=null;markers.forEach((m)=>m.remove());markers=[];
    const visibleSlugs=new Set(selectedCities());
    const cinemaIndex=new Map(Object.values(cinemaByCity).flatMap(data=>data.cinemas||[]).map(cinema=>[cinema.id,cinema]));
    for (const location of venueLocations.filter(item=>visibleSlugs.has(item.city))) {
        const cinema=location.cinema_id?cinemaIndex.get(location.cinema_id):null;
        const point=[location.longitude,location.latitude];
        const el=document.createElement('button');el.type='button';el.className=`cinema-marker${cinema&&selectedCinemaId===cinema.id?' selected':''}`;
        const logoKey=cinemaLogoKeys[cinema?.id]||locationLogoKeys[String(location.source_feature_id)]||`mapped-${location.source_feature_id||location.name||'cinema'}`;
        const locationEnglish=locationEnglishNames[String(location.source_feature_id)]||'';
        const localWordmark=String(cinema?.name_zh||location.name||'影城').replace(/[A-Za-z0-9 .,'’()&-]/g,'').replace(/(?:股份有限公司|有限公司|影城|戲院|大戲院|電影館|電影院|劇院|大劇院)+$/,'');
        const mark=[...localWordmark].slice(-2).join('')||'影城';
        const logoColor=logoColors[logoKey]||'c87446';
        const logoImage=logoImages[logoKey]||'';
        const logoBackground=logoBackgrounds[logoKey]||'#fff';
        el.innerHTML=`<span class="pin-shape" style="--logo-color:#${logoColor}">${logoImage?`<span class="pin-logo-frame" style="--logo-bg:${logoBackground}"><img class="pin-logo" src="${esc(logoImage)}" alt="" decoding="async"></span>`:`<span class="pin-icon" aria-hidden="true">${esc(mark)}</span>`}</span>`;el.setAttribute('aria-label',`${cinema?.name_en||locationEnglish} ${cinema?.name_zh||location.name||'Cinema'}`.trim());el.title=`${cinema?.name_en||locationEnglish} · ${cinema?.name_zh||location.name||'Cinema'}`.trim();
        const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(point).addTo(map);
        marker._cinemaId=cinema?.id||'';marker._citySlug=location.city;
        marker._openCinemaPopup=()=>{if(!map)return;activePopup?.remove();activePopup=new maplibregl.Popup({offset:20,closeButton:true,maxWidth:'340px'}).setLngLat(point).setHTML(cinemaPopupContent(location,cinema,logoKey)).addTo(map);};
        el.addEventListener('click',event=>{event.stopPropagation();if(cinema){selectCinema(cinema.id,location.city,false);map?.flyTo({center:point,zoom:16,duration:700});}marker._openCinemaPopup();});markers.push(marker);
    }
    const mapped=venueLocations.filter(item=>visibleSlugs.has(item.city)).map(item=>[item.longitude,item.latitude]);
    if(fitAll&&selectedCity==='all'&&mapped.length){const bounds=mapped.reduce((b,p)=>b.extend(p),new maplibregl.LngLatBounds(mapped[0],mapped[0]));map.fitBounds(bounds,{padding:{top:70,right:65,bottom:90,left:65},maxZoom:10,duration:0});}
  }
  function setupCityOptions() {
    citySelect.innerHTML=`<option value="all">${esc(ui('allTaiwan'))}</option>`+cityDefs.filter(c=>cinemaCount(c.slug)>0).map(c=>`<option value="${esc(c.slug)}">${esc(displayName(c.slug))} · ${cinemaCount(c.slug)}</option>`).join('');
    if(cinemaCount('unknown'))citySelect.insertAdjacentHTML('beforeend',`<option value="unknown">${esc(ui('unknownCity'))} · ${cinemaCount('unknown')}</option>`);
  }
  function setupDateOptions() {
    const today=todayTaiwan();
    availableDates=Object.keys(showtimesDateIndex).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&x>=today).sort();
    if(!availableDates.length)availableDates=[today];
    let initial=availableDates.includes(today)?today:(availableDates[0]||today);
    dateSelect.innerHTML=availableDates.map(d=>`<option value="${d}">${d===today?`${esc(ui('today'))} · `:''}${esc(formatDate(d))} · ${countDate(d)}</option>`).join('');
    dateSelect.value=initial;syncDateControls();
  }
  function countDate(date) { return Number(showtimesDateIndex[date]?.total||0); }
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
    const priorSubtitle=subtitleSelect.value||'all',priorAudio=audioSelect.value||'all';
    const allLabel=ui('anySubtitles');
    subtitleSelect.innerHTML=`<option value="all">${esc(allLabel)}</option>`+filterLanguages.map(code=>`<option value="${code}">${esc(languageNames[code]||code)} · ${fieldLangCount('subtitles',code)}</option>`).join('');
    audioSelect.innerHTML=`<option value="all">${esc(ui('anyAudio'))}</option>`+filterLanguages.map(code=>`<option value="${code}">${esc(languageNames[code]||code)} · ${fieldLangCount('audio_language',code)}</option>`).join('');
    if([...subtitleSelect.options].some(option=>option.value===priorSubtitle))subtitleSelect.value=priorSubtitle;
    if([...audioSelect.options].some(option=>option.value===priorAudio))audioSelect.value=priorAudio;
  }
  const cinemaBrandRules=[
    ['vieshow','VieShow Cinemas',['威秀','vieshow']],['showtime','Showtime Cinemas',['秀泰','showtime']],
    ['ambassador','Ambassador Theatres',['國賓','ambassador']],['in89','in89 Cinemas',['in89']],
    ['century-asia','Century Asia Cinemas',['喜樂時代','century asia']],['shin-kong','Shin Kong Cinemas',['新光','shin kong']],
    ['mld','MLD Cinemas',['美麗新','mld']],['broadway','Broadway Cinemas',['百老匯','broadway']],
    ['spot','SPOT Cinemas',['光點','spot','大好天光']],['hala','Hala Cinemas',['哈拉','hala']],
    ['miramar','Miramar Cinemas',['美麗華','miramar']],['wonderful','Wonderful Cinemas',['真善美','wonderful']]
  ];
  function cinemaBrand(cinema) {
    const text=[cinema?.name_zh,cinema?.name_en,cinema?.company_name].filter(Boolean).join(' ').toLowerCase();
    const rule=cinemaBrandRules.find(([, ,tokens])=>tokens.some(token=>text.includes(token.toLowerCase())));
    if(!rule)return 'other';
    if(rule[0]==='vieshow'&&text.includes('muvie'))return 'muvie';
    return rule[0];
  }
  function brandMatches(cinema,filter=brandSelect.value) {
    const brand=cinemaBrand(cinema);
    if(filter==='all')return true;
    if(filter==='vieshow-group')return brand==='vieshow'||brand==='muvie';
    if(filter==='vieshow-standard')return brand==='vieshow';
    return brand===filter;
  }
  function setupBrandOptions() {
    const prior=brandSelect.value||'all',labels=brandUi[language]||brandUi.en,counters={};
    for(const data of Object.values(cinemaByCity))for(const cinema of data.cinemas||[]){const brand=cinemaBrand(cinema);counters[brand]=(counters[brand]||0)+1;}
    const total=Object.values(counters).reduce((sum,count)=>sum+count,0),options=[`<option value="all">${esc(labels.all)} · ${total}</option>`];
    const vieshowCount=(counters.vieshow||0)+(counters.muvie||0);
    if(vieshowCount)options.push(`<option value="vieshow-group">${esc(labels.vieshow)} · ${vieshowCount}</option>`,`<option value="vieshow-standard">　${esc(labels.vieshowStandard)} · ${counters.vieshow||0}</option>`,`<option value="muvie">　${esc(labels.muvie)} · ${counters.muvie||0}</option>`);
    const sorted=cinemaBrandRules.filter(([id])=>id!=='vieshow').map(([id,name])=>({id,name,count:counters[id]||0})).filter(item=>item.count).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
    for(const item of sorted)options.push(`<option value="${esc(item.id)}">${esc(item.name)} · ${item.count}</option>`);
    if(counters.other)options.push(`<option value="other">${esc(labels.other)} · ${counters.other}</option>`);
    brandSelect.innerHTML=options.join('');brandSelect.value=[...brandSelect.options].some(option=>option.value===prior)?prior:'all';
    $('#brand-label').textContent=labels.label;brandSelect.setAttribute('aria-label',labels.label);
  }
  function selectedShowtimes(slug) {
    const list=showsByCity[slug]?.showtimes||[];
    return list;
  }
  function cityFromAddress(address) {
    const aliases=[['taipei',['臺北市','台北市']],['new-taipei',['新北市']],['keelung',['基隆市']],['taoyuan',['桃園市']],['hsinchu-city',['新竹市']],['hsinchu-county',['新竹縣']],['miaoli',['苗栗縣']],['taichung',['臺中市','台中市']],['changhua',['彰化縣']],['nantou',['南投縣']],['yunlin',['雲林縣']],['chiayi-city',['嘉義市']],['chiayi-county',['嘉義縣']],['tainan',['臺南市','台南市']],['kaohsiung',['高雄市']],['pingtung',['屏東縣']],['yilan',['宜蘭縣']],['hualien',['花蓮縣','花蓮市']],['taitung',['臺東縣','台東縣','台東市']],['penghu',['澎湖縣']],['kinmen',['金門縣']],['lienchiang',['連江縣']]];
    const text=String(address||'');return aliases.find(([,names])=>names.some(name=>text.includes(name)))?.[0]||'unknown';
  }
  function localDateTime(iso) {
    const value=new Date(iso);if(!Number.isFinite(value.getTime()))return null;
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(value).map(part=>[part.type,part.value]));
    return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`};
  }
  async function loadLiveShowtimes() {
    try {
      const response=await fetch('https://capi.showtimes.com.tw/4/app/bootstrap',{headers:{accept:'application/json'},mode:'cors',credentials:'omit'});
      if(!response.ok)throw new Error(`ShowTimes API ${response.status}`);
      const payload=(await response.json())?.payload;
      if(!payload||!Array.isArray(payload.corporations)||!Array.isArray(payload.programs)||!payload.eventsForCorporations)throw new Error('ShowTimes API response format changed');
      const corporations=new Map(payload.corporations.map(c=>[Number(c.id),c])),programs=new Map(payload.programs.map(p=>[Number(p.id),p]));
      const aliases=[['英語','en'],['日語','ja'],['韓語','ko'],['國語','zh'],['粵語','yue'],['越語','vi'],['泰語','th'],['菲語','fil'],['法語','fr'],['德語','de'],['西語','es'],['印尼語','id']];
      const today=todayTaiwan(),byDate={};
      for(const [corporationId,group] of Object.entries(payload.eventsForCorporations)){
        const corporation=corporations.get(Number(corporationId));if(!corporation)continue;
        const city=cityFromAddress(corporation.address),rooms=new Map((group.venues||[]).map(v=>[Number(v.id),v.room]));
        const cinemas=cinemaByCity[city]?.cinemas||[];
        const normalize=value=>String(value||'').replace(/臺/g,'台').toLowerCase().replace(/(?:電影城|電影院|電影館|影城|戲院|劇院|威秀|秀泰)/g,'').replace(/[\s　・·()（）\-_/]/g,'');
        const venueKey=normalize(corporation.name);
        const cinema=cinemas.find(c=>{const name=normalize(c.name_zh);return name&&(name.includes(venueKey)||venueKey.includes(name));});
        if(!cinema)continue;
        for(const event of group.events||[]){
          if(event.status!=='active')continue;
          const program=programs.get(Number(event.programId)),session=localDateTime(event.startedAt);
          if(!program||!session||session.date<today||!program.name)continue;
          const format=event.meta?.format||null,audio=aliases.find(([label])=>format?.endsWith(label))?.[1]||null,duration=Number(program.duration);
          const date=byDate[session.date]||={};const shows=date[city]||=[];
          shows.push({id:`showtimes-${event.id}`,cinema_id:cinema.id,cinema_name:corporation.name,movie_title:program.name,movie_title_en:program.nameAlternative||null,poster_url:program.coverImagePortrait?.url||null,genres:Array.isArray(program.genres)?program.genres:[],rating:program.rating||null,start_time:`${session.date}T${session.time}:00+08:00`,end_time:null,hall:rooms.get(Number(event.venueId))||null,format,audio_language:audio,subtitles:null,duration_minutes:Number.isFinite(duration)&&duration>0?Math.round(duration/60):null,source_event_id:String(event.id),source_url:`https://www.showtimes.com.tw/cinemas/${corporation.id}/`,source:'showtimes-official-api'});
        }
      }
      liveShowtimesByCityDate=byDate;
      for(const [date,cities] of Object.entries(byDate)){
        const entry=showtimesDateIndex[date]||={total:0,cities:{}};
        for(const [city,rows] of Object.entries(cities)){entry.total+=rows.length;entry.cities[city]=(entry.cities[city]||0)+rows.length;}
      }
      knownShowtimeRows+=Object.values(byDate).reduce((sum,cities)=>sum+Object.values(cities).reduce((n,rows)=>n+rows.length,0),0);
    } catch(error) { console.warn('ShowTimes live feed unavailable; using saved schedules',error); }
  }
  async function loadDateShowtimes(date) {
    showtimesPending=true;
    const sequence=++dateLoadSequence;
    const cities=[...new Set([...Object.keys(showtimesDateIndex[date]?.cities||{}),...Object.keys(liveShowtimesByCityDate[date]||{})])];
    const loaded=await Promise.all(cities.map(async slug=>{
      try{return [slug,await loadJson(`data/showtimes/by-date/${date}/${slug}.json`)];}
      catch(error){console.warn(`Showtimes unavailable for ${slug} on ${date}`,error);return [slug,{showtimes:[]}];}
    }));
    if(sequence!==dateLoadSequence||date!==dateSelect.value)return;
    showsByCity=Object.fromEntries(loaded);
    for(const [slug,live] of Object.entries(liveShowtimesByCityDate[date]||{})){
      const data=showsByCity[slug]||{showtimes:[]},keys=new Set(data.showtimes.map(show=>[show.cinema_id,show.movie_title,show.start_time,show.hall||'',show.format||''].join('|')));
      for(const show of live){const key=[show.cinema_id,show.movie_title,show.start_time,show.hall||'',show.format||''].join('|');if(!keys.has(key)){data.showtimes.push(show);keys.add(key);}}
      showsByCity[slug]=data;
    }
    showtimesPending=false;
    setupLanguageFilters();syncDateControls();renderMarkers();renderResults();
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
  function shortLanguageCode(value) {
    const code=normalizeLang(value),aliases={zh:'ZH',yue:'YUE',fil:'FIL'};
    return aliases[code]||code.toUpperCase().slice(0,3);
  }
  function subtitleBadge(subs) {
    const known=Array.isArray(subs)&&subs.length>0,codes=known?[...new Set(subs.map(shortLanguageCode))]:[];
    const visible=known?`${codes.slice(0,2).join(' ')}${codes.length>2?` +${codes.length-2}`:''}`:'?';
    const label=`${ui('subtitles')}: ${subtitleLabel(subs)}`;
    return `<span class="tag icon-tag subtitle-tag" title="${esc(label)}"><span class="cc-mark" aria-hidden="true">CC</span><span aria-hidden="true">${esc(visible)}</span><span class="sr-only">${esc(label)}</span></span>`;
  }
  function audioBadge(code) {
    if(!code)return '';
    const label=`${ui('audio')}: ${audioLabel(code)}`;
    return `<span class="tag icon-tag audio-tag" title="${esc(label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3Z"></path><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a9 9 0 0 1 0 11"></path></svg><span aria-hidden="true">${esc(shortLanguageCode(code))}</span><span class="sr-only">${esc(label)}</span></span>`;
  }
  function formatTime(value) {
    const d=new Date(value);if(Number.isNaN(d.getTime()))return '';
    return new Intl.DateTimeFormat(localeInfo[language].date,{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d);
  }
  function movieCard(showtimes) {
    const first=showtimes[0],filmTitle=decodeEntities(first.movie_title||'Untitled screening'),titleEn=decodeEntities(first.movie_title_en||'');
    const posterUrl=safeUrl(first.poster_url),poster=posterUrl?`<img class="movie-poster" src="${esc(posterUrl)}" alt="" loading="lazy" decoding="async">`:'';
    const genres=[...new Set(Array.isArray(first.genres)?first.genres:[])].map(displayGenre);
    const rating=displayRating(first.rating);
    const movieMeta=genres.length||rating?`<div class="movie-taxonomy">${genres.map(genre=>`<span class="tag genre-tag">${esc(genre)}</span>`).join('')}${rating?`<span class="tag rating-tag" title="${esc(ageRatingTitles[language]||ageRatingTitles.en)}">${esc(rating)}</span>`:''}</div>`:'';
    const sessions=showtimes.map(s=>{
      const day=dateSelect.value==='all-dates'?`<span class="tag">${esc(formatDate((s.start_time||'').slice(0,10),'short'))}</span>`:'';
      const time=formatTime(s.start_time),meta=[s.format,s.hall].filter(Boolean);
      const url=safeUrl(s.source_url),link=url?`<a class="detail-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(ui('sourceLink'))}</a>`:'';
      return `<div class="showtime-row">${day}${time?`<span class="time-chip">${esc(time)}</span>`:''}${meta.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}${audioBadge(s.audio_language)}${subtitleBadge(s.subtitles)}</div>${link}`;
    }).join('');
    return `<div class="movie"><div class="movie-title-row">${poster}<div class="movie-title"><span class="movie-title-label">${esc(ui('titleSource'))}</span>${esc(filmTitle)}</div>${copyButton(filmTitle,ui('titleSource'))}</div>${titleEn?`<div class="movie-title-row movie-title-row-en"><div class="movie-en"><span class="movie-title-label">${esc(ui('international'))}</span>${esc(titleEn)}</div>${copyButton(titleEn,ui('international'))}</div>`:''}${movieMeta}${sessions}</div>`;
  }
  function renderResults() {
    if(!Object.keys(cinemaByCity).length)return;
    const query=normalizeSearch(searchInput.value),subtitle=subtitleSelect.value,audio=audioSelect.value,brand=brandSelect.value||'all',groups=[];
    let cinemaTotal=0,sessionTotal=0;
    for(const slug of selectedCities()) {
      const cinemas=cinemaByCity[slug]?.cinemas||[],byId=new Map(cinemas.map(c=>[c.id,c])),todays=selectedShowtimes(slug),perCinema=new Map();
      for(const s of todays){if(subtitle!=='all'&&!(Array.isArray(s.subtitles)&&s.subtitles.some(x=>normalizeLang(x)===subtitle)))continue;if(audio!=='all'&&normalizeLang(s.audio_language)!==audio)continue;const key=s.cinema_id||`name:${s.cinema_name||''}`;if(!perCinema.has(key))perCinema.set(key,[]);perCinema.get(key).push(s);}
      const records=cinemas.map(c=>({cinema:c,shows:perCinema.get(c.id)||[]}));
      for(const [key,shows] of perCinema)if(!byId.has(key))records.push({cinema:{id:key,name_zh:shows[0].cinema_name,city:slug,address:''},shows});
      const filtered=records.filter(({cinema,shows})=>{
        if(!brandMatches(cinema,brand))return false;
        if((subtitle!=='all'||audio!=='all')&&!shows.length)return false;
        if(!query||selectedCinemaId===cinema.id)return true;
        return [cinema.name_zh,cinema.name_en,cinema.address,...shows.flatMap(s=>[s.movie_title,s.movie_title_en])].some(v=>normalizeSearch(v).includes(query));
      }).sort((a,b)=>(b.shows.length-a.shows.length)||String(a.cinema.name_zh).localeCompare(String(b.cinema.name_zh)));
      if(filtered.length)groups.push({slug,records:filtered});cinemaTotal+=filtered.length;sessionTotal+=filtered.reduce((n,x)=>n+x.shows.length,0);
    }
    const dateLabel=formatDate(dateSelect.value);
    summaryEl.textContent=`${cinemaTotal} ${ui('cinemas')} · ${sessionTotal} ${ui('sessions')} · ${dateLabel}`;
    mapCaption.textContent=selectedCity==='all'?`${locationCount()} cinema locations · OpenStreetMap`:`${displayName(selectedCity)} · ${locationCount(selectedCity)} mapped locations`;
    if(!groups.length){resultsEl.innerHTML=`<div class="no-results">${esc(ui('noResults'))}<br>${esc(ui('dataNote'))}</div>`;return;}
    resultsEl.innerHTML=groups.map(({slug,records})=>{
      const showCount=records.reduce((n,x)=>n+x.shows.length,0),heading=selectedCity==='all'?`<div class="city-heading"><h2>${esc(displayName(slug))}</h2><span>${records.length} ${esc(ui('cinemas'))} · ${showCount} ${esc(ui('sessions'))}</span></div>`:'';
      return `${heading}${records.map(({cinema,shows})=>{
        const addressParts=splitAddress(cinema.address),floorLabel=language==='id'?'Lantai':language==='zh-TW'?'樓層':language==='ja'?'フロア':language==='ko'?'층':language==='vi'?'Tầng':language==='th'?'ชั้น':'Floor';
        const address=cinema.address?`<div class="address-row"><div class="address-text"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cinema.address)}" target="_blank" rel="noopener">${esc(addressParts.street)} ↗</a>${addressParts.floor?`<span class="address-floor">${esc(floorLabel)}: ${esc(addressParts.floor)}</span>`:''}</div>${copyButton(addressParts.street,'address')}</div>`:esc(ui('addressUnavailable'));
        const movies=new Map();shows.sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time))).forEach(s=>{const key=`${s.movie_title||''}|${s.movie_title_en||''}`;if(!movies.has(key))movies.set(key,[]);movies.get(key).push(s);});
        const moviesHtml=shows.length?[...movies.values()].map(movieCard).join(''):`<div class="empty-show">${esc(showtimesPending?'Loading showtimes…':ui('noSchedules'))}</div>`;
        const co=cinema.company_name?`<div class="company-name">${esc(cinema.company_name)}</div>`:'';
        const image=safeUrl(cinema.image_url||cinema.photo_url||cinema.image);
        const photo=image?`<img class="cinema-photo" src="${esc(image)}" alt="${esc(cinema.name_zh||'Cinema building')}" loading="lazy">`:'';
        const cardLogoKey=cinemaLogoKeys[cinema.id];
        const cardLogo=logoImages[cardLogoKey]?`<img class="cinema-logo" style="background:${esc(logoBackgrounds[cardLogoKey]||'#fff')}" src="${esc(logoImages[cardLogoKey])}" alt="" loading="lazy" decoding="async">`:'';
        const location=cinemaPoint(cinema)||cinemaLocation(cinema,slug)?`<button class="show-on-map" type="button" data-cinema-id="${esc(cinema.id)}" data-city="${esc(slug)}">Show on map</button>`:'';
        const distance=distanceFromUser(cinema,slug),distanceUnavailable=({en:'Distance unavailable',id:'Jarak tidak tersedia','zh-TW':'距離資訊不可用',ja:'距離を表示できません',ko:'거리 정보 없음',vi:'Chưa có khoảng cách',th:'ไม่มีข้อมูลระยะทาง'}[language]||'Distance unavailable');
        const distanceHtml=userPosition?(distance?`<span class="distance-badge" title="Distance from your location">⌖ ${esc(distance)}</span>`:`<span class="distance-badge unavailable">⌖ ${esc(distanceUnavailable)}</span>`):'';
        const priceCity=ticketPriceIndex.cinemas?.[cinema.id],priceRecord=priceCity?ticketPricesByCity[priceCity]?.cinemas?.[cinema.id]:null,priceLabels=ticketPriceLabels[language]||ticketPriceLabels.en;
        const pricesHtml=priceCity?`<details class="ticket-prices" data-price-city="${esc(priceCity)}" data-cinema-id="${esc(cinema.id)}"><summary>${esc(priceLabels.title)}</summary><div class="ticket-price-body">${priceRecord?ticketPriceMarkup(priceRecord,ticketPricesByCity[priceCity]?.captured_on):esc(priceLabels.open)}</div></details>`:'';
        return `<article class="cinema${selectedCinemaId===cinema.id?' selected':''}" id="cinema-${esc(cinema.id)}">${photo}<div class="cinema-top"><div class="cinema-name-wrap">${cardLogo}<div class="cinema-name-text"><div class="cinema-name">${esc((cinema.name_zh||cinema.name_en||'Cinema').replace(/([\u3400-\u9fff])([A-Za-z0-9])/g,'$1 $2').replace(/([A-Za-z0-9])([\u3400-\u9fff])/g,'$1 $2'))}</div>${cinema.name_en?`<div class="cinema-name-en">${esc(cinema.name_en)}</div>`:''}</div></div><span class="status-pill ${shows.length?'':'unknown'}">${shows.length?`${shows.length} ${esc(ui('sessions'))}`:esc(ui('noSchedules'))}</span></div>${co}<div class="address">${address}</div><div class="cinema-meta">${cinema.screens?`${esc(cinema.screens)} screens`:''}${cinema.phone?` · ${esc(cinema.phone)}`:''} ${distanceHtml} ${location}</div>${pricesHtml}${moviesHtml}</article>`;
      }).join('')}`;
    }).join('');
  }
  function selectCity(slug,fly) {
    selectedCity=slug;selectedCinemaId='';citySelect.value=slug;renderResults();renderMarkers();
    if(fly&&map){const city=cityDefs.find(c=>c.slug===slug);if(city?.center)map.flyTo({center:city.center,zoom:10.3,duration:850});else if(slug==='all')map.fitBounds([[119.3,21.7],[122.1,25.5]],{padding:{top:70,right:65,bottom:90,left:65},duration:850});}
  }
  function selectCinema(id,slug,fly) {
    selectedCity=slug;selectedCinemaId=id;citySelect.value=slug;
    const cinema=(cinemaByCity[slug]?.cinemas||[]).find(c=>c.id===id);if(cinema&&!brandMatches(cinema))brandSelect.value='all';
    renderResults();renderMarkers();
    const card=document.getElementById(`cinema-${id}`);if(card){const resultTop=resultsEl.getBoundingClientRect().top,cardTop=card.getBoundingClientRect().top;resultsEl.scrollTo({top:Math.max(0,resultsEl.scrollTop+cardTop-resultTop-8),behavior:'smooth'});}
    if(fly&&map){const cinema=(cinemaByCity[slug]?.cinemas||[]).find(c=>c.id===id),location=cinemaPoint(cinema)||((loc)=>loc?[loc.longitude,loc.latitude]:null)(cinemaLocation(cinema,slug));if(location){map.flyTo({center:location,zoom:16,duration:700});markers.find(m=>m._cinemaId===id)?._openCinemaPopup?.();}}
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
    setupCityOptions();citySelect.value=selectedCity;setupDateOptions();if(availableDates.includes(priorDate))dateSelect.value=priorDate;setupLanguageFilters();setupBrandOptions();syncDateControls();
    updateMobileActionLabels();
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
  function updateMobileActionLabels() {
    const labels=mapActionLabels[language]||mapActionLabels.en,visible=app.dataset.mapVisible!=='false';
    const mapButton=$('#map-view-toggle');mapButton.setAttribute('aria-label',visible?labels[0]:labels[1]);mapButton.title=visible?labels[0]:labels[1];mapButton.textContent=visible?'▣':'▢';
    sheetGrab.setAttribute('aria-label',app.dataset.sheet==='expanded'?labels[3]:labels[2]);
    const sheetLabels=sheetControlLabels[language]||sheetControlLabels.en,hidden=app.dataset.sheet==='hidden';
    const collapse=$('#sheet-collapse'),expand=$('#sheet-expand');collapse.hidden=!visible||hidden;expand.hidden=!visible||!hidden;
    collapse.setAttribute('aria-label',sheetLabels.hide);collapse.title=sheetLabels.hide;expand.setAttribute('aria-label',sheetLabels.half);expand.title=sheetLabels.half;expand.querySelector('span').textContent=sheetLabels.half;
  }
  function distanceKm(a,b) {
    const rad=x=>x*Math.PI/180,dLat=rad(b[1]-a.lat),dLon=rad(b[0]-a.lng),lat1=rad(a.lat),lat2=rad(b[1]);
    const x=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  }
  function distanceFromUser(cinema,slug) {
    if(!userPosition)return null;
    const point=cinemaPoint(cinema),location=point||((item)=>item?[Number(item.longitude),Number(item.latitude)]:null)(cinemaLocation(cinema,slug));
    if(!location||!location.every(Number.isFinite))return null;
    const distance=distanceKm(userPosition,location);
    return distance<1?`${Math.round(distance*1000)} m`:`${distance<10?distance.toFixed(1):Math.round(distance)} km`;
  }
  function showUserMarker() {
    if(!map||!window.maplibregl||!userPosition)return;
    if(userMarker)userMarker.remove();
    const element=document.createElement('div');element.className='user-location-marker';
    userMarker=new maplibregl.Marker({element}).setLngLat([userPosition.lng,userPosition.lat]).setPopup(new maplibregl.Popup({offset:15}).setText(currentLocationLabels[language]||currentLocationLabels.en)).addTo(map);
  }
  function locateMe() {
    const button=$('#locate');
    if(!navigator.geolocation){mapCaption.textContent=ui('locationDenied');return;}
    button.disabled=true;button.querySelector('[data-i18n]').textContent=ui('locating');
    navigator.geolocation.getCurrentPosition(pos=>{
      const user={lat:pos.coords.latitude,lng:pos.coords.longitude};
      userPosition=user;
      showUserMarker();
      const nearest=cityDefs.filter(c=>c.center&&cinemaCount(c.slug)>0).map(c=>({...c,distance:distanceKm(user,c.center)})).sort((a,b)=>a.distance-b.distance)[0];
      if(nearest)selectCity(nearest.slug,false);
      if(map)map.flyTo({center:[user.lng,user.lat],zoom:15.6,duration:900});
      mapCaption.textContent=currentLocationLabels[language]||currentLocationLabels.en;mapCaption.classList.add('location-active');
      button.querySelector('[data-i18n]').textContent=ui('locate');button.disabled=false;
    },()=>{mapCaption.textContent=ui('locationDenied');button.querySelector('[data-i18n]').textContent=ui('locate');button.disabled=false;},{enableHighAccuracy:true,timeout:12000,maximumAge:300000});
  }
  function changeDate(delta) {
    if(delta<0)return;const index=availableDates.indexOf(dateSelect.value);if(index<0)return;const next=index+delta;if(next<0||next>=availableDates.length)return;dateSelect.value=availableDates[next];syncDateControls();loadDateShowtimes(dateSelect.value);
  }
  async function init() {
    let savedLanguage='en',savedTheme='dark';try{savedLanguage=localStorage.getItem('cinema-language')||'en';savedTheme=localStorage.getItem('cinema-theme')||'dark';}catch{}
    language=localeInfo[savedLanguage]?savedLanguage:'en';languageSelect.value=language;setTheme(savedTheme==='light'?'light':'dark');
    try {
      const [cityData,manifest,locationData,nameData,ticketIndex]=await Promise.all([loadJson('../garbage-truck/v2/data/cities.json'),loadJson('data/manifest.json').catch(()=>null),loadJson('data/locations.json').catch(()=>({locations:[]})),loadJson('data/cinema-names-en.json').catch(()=>({names:{},logo_keys:{},marks:{},colors:{}})),loadJson('data/ticket-prices/index.json').catch(()=>({cinemas:{}}))]);
      cinemaEnglishNames=nameData.names||{};cinemaLogoKeys=nameData.logo_keys||{};locationLogoKeys=nameData.location_logo_keys||{};locationEnglishNames=nameData.location_names_en||{};logoMarks=nameData.marks||{};logoColors=nameData.colors||{};logoImages=nameData.logo_images||{};logoBackgrounds=nameData.logo_backgrounds||{};
      ticketPriceIndex=ticketIndex;
      cityDefs=cityData.cities.map(c=>({slug:c.slug,center:c.center}));dataGeneratedDate=(manifest?.generated_at||'').slice(0,10);showtimesDateIndex=manifest?.showtimes_index||{};
      venueLocations=locationData.locations||[];
      const slugs=[...cityDefs.map(c=>c.slug),'unknown'];
      await Promise.all(slugs.map(async slug=>{
        const cinemas=await loadJson(`data/cinemas/${slug}.json`).catch(()=>({cinemas:[]}));
        cinemas.cinemas=(cinemas.cinemas||[]).map(cinema=>({...cinema,name_en:cinema.name_en||cinemaEnglishNames[cinema.id]}));
        cinemaByCity[slug]=cinemas;
      }));
      knownShowtimeRows=Number(manifest?.coverage?.showtime_rows||Object.values(showtimesDateIndex).reduce((sum,entry)=>sum+Number(entry.total||0),0));
      explicitSubtitleRows=Number(manifest?.coverage?.explicit_subtitle_rows||0);
      setupCityOptions();setupDateOptions();setupLanguageFilters();
      mapCaption.textContent=`${locationCount()} cinema locations · OpenStreetMap`;
      $('#updated').textContent=`${ui('dataUpdated')} · ${formatDate(dataGeneratedDate||todayTaiwan(),'short')} · ${ui('localTime')}`;
      $('#data-note').textContent=`${ui('dataNote')} ${(subtitleCoverageLabels[language]||subtitleCoverageLabels.en)(explicitSubtitleRows,knownShowtimeRows)}`;
      setLanguage(language);
      showtimesPending=true;renderResults();
      mapDataReady=true;
      buildMap();
      const needsLive=manifest?.sources?.showtimes?.['showtimes-official-api']?.health!=='healthy';
      if(needsLive)loadLiveShowtimes().then(()=>{
        const priorDate=dateSelect.value;setupDateOptions();if(availableDates.includes(priorDate))dateSelect.value=priorDate;syncDateControls();
        return loadDateShowtimes(dateSelect.value);
      });
      if(dateSelect.value)await loadDateShowtimes(dateSelect.value);
      else if(map?.loaded())renderMarkers();
    } catch(error) {
      console.error('Cinema data could not be loaded',error);resultsEl.innerHTML='<div class="no-results">Cinema data could not be loaded.<br>Please refresh and try again.</div>';summaryEl.textContent='Data unavailable';
    }
  }
  citySelect.addEventListener('change',e=>{mapCaption.classList.remove('location-active');selectCity(e.target.value,true);});
  dateSelect.addEventListener('change',()=>{syncDateControls();loadDateShowtimes(dateSelect.value);});
  $('#date-prev').addEventListener('click',()=>changeDate(-1));$('#date-next').addEventListener('click',()=>changeDate(1));
  searchInput.addEventListener('input',renderResults);subtitleSelect.addEventListener('change',renderResults);audioSelect.addEventListener('change',renderResults);brandSelect.addEventListener('change',renderResults);
  languageSelect.addEventListener('change',e=>setLanguage(e.target.value));$('#theme').addEventListener('click',()=>setTheme(document.querySelector('.app').dataset.theme==='dark'?'light':'dark'));
  $('#locate').addEventListener('click',locateMe);
  $('#map-locate').addEventListener('click',()=>{$('#map-tools-menu').hidden=true;$('#map-tools-toggle').setAttribute('aria-expanded','false');locateMe();});
  $('#map-zoom-in').addEventListener('click',()=>map?.zoomIn({duration:250}));$('#map-zoom-out').addEventListener('click',()=>map?.zoomOut({duration:250}));
  $('#map-tools-toggle').addEventListener('click',()=>{const menu=$('#map-tools-menu'),open=menu.hidden;menu.hidden=!open;$('#map-tools-toggle').setAttribute('aria-expanded',String(open));});
  document.addEventListener('click',e=>{if(!$('#map-tools').contains(e.target)){ $('#map-tools-menu').hidden=true;$('#map-tools-toggle').setAttribute('aria-expanded','false');}});
  resultsEl.addEventListener('click',e=>{const button=e.target.closest('.show-on-map');if(button){if(app.dataset.mapVisible==='false')$('#map-view-toggle').click();selectCinema(button.dataset.cinemaId,button.dataset.city,true);}});
  resultsEl.addEventListener('click',async e=>{
    const button=e.target.closest('[data-copy]');if(!button)return;e.preventDefault();e.stopPropagation();
    const originalLabel=button.getAttribute('aria-label'),originalTitle=button.title;
    try{await writeClipboard(button.dataset.copy);button.classList.add('copied');button.setAttribute('aria-label',language==='id'?'Tersalin':'Copied');button.title=language==='id'?'Tersalin':'Copied';button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>';}
    catch(error){console.warn('Could not copy text',error);button.setAttribute('aria-label',language==='id'?'Gagal menyalin':'Copy failed');}
    setTimeout(()=>{if(!button.isConnected)return;button.classList.remove('copied');button.setAttribute('aria-label',originalLabel);button.title=originalTitle;button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path></svg>';},1400);
  });
  resultsEl.addEventListener('toggle',async e=>{
    const details=e.target;if(!(details instanceof HTMLDetailsElement)||!details.matches('.ticket-prices')||!details.open||details.dataset.loaded==='true'||details.dataset.loading==='true')return;
    const body=details.querySelector('.ticket-price-body'),labels=ticketPriceLabels[language]||ticketPriceLabels.en;details.dataset.loading='true';body.textContent=labels.loading;
    try{const data=await getTicketPrices(details.dataset.priceCity),record=data.cinemas?.[details.dataset.cinemaId];body.innerHTML=record?ticketPriceMarkup(record,data.captured_on):labels.unavailable;}
    catch(error){body.textContent=labels.unavailable;console.warn('Ticket price data could not be loaded',error);}
    details.dataset.loaded='true';details.dataset.loading='false';
  },true);
  const app=document.querySelector('.app'),sheetGrab=$('#sheet-grab');
  const sheetLabel=updateMobileActionLabels;
  const toggleSheet=()=>{app.dataset.sheet=app.dataset.sheet==='expanded'?'half':app.dataset.sheet==='collapsed'?'half':'expanded';sheetLabel();};
  let sheetStartY=null,suppressSheetClick=false;
  sheetGrab.addEventListener('pointerdown',e=>{sheetStartY=e.clientY;sheetGrab.setPointerCapture(e.pointerId);});
  sheetGrab.addEventListener('pointerup',e=>{if(sheetStartY===null)return;const delta=e.clientY-sheetStartY;if(Math.abs(delta)>45){app.dataset.sheet=delta<0?'expanded':'collapsed';sheetLabel();suppressSheetClick=true;setTimeout(()=>{suppressSheetClick=false;},0);}sheetStartY=null;});
  sheetGrab.addEventListener('click',()=>{if(suppressSheetClick)return;toggleSheet();});
  $('#sheet-collapse').addEventListener('click',()=>{app.dataset.sheet='hidden';updateMobileActionLabels();setTimeout(()=>map?.resize(),240);});
  $('#sheet-expand').addEventListener('click',()=>{app.dataset.sheet='half';updateMobileActionLabels();requestAnimationFrame(()=>map?.resize());});
  $('#map-view-toggle').addEventListener('click',()=>{
    const visible=app.dataset.mapVisible!=='false';
    if(visible){destroyMap();app.dataset.mapVisible='false';}
    else{app.dataset.mapVisible='true';if(app.dataset.sheet==='expanded'||app.dataset.sheet==='hidden')app.dataset.sheet='half';}
    updateMobileActionLabels();if(!visible)requestAnimationFrame(buildMap);
  });
    $('#reset').addEventListener('click',()=>{searchInput.value='';subtitleSelect.value='all';audioSelect.value='all';dateSelect.value=availableDates.includes(todayTaiwan())?todayTaiwan():(availableDates.find(d=>d>=todayTaiwan())||availableDates.at(-1));syncDateControls();loadDateShowtimes(dateSelect.value);mapCaption.classList.remove('location-active');if(userMarker){userMarker.remove();userMarker=null;}userPosition=null;selectCity('all',true);});
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();searchInput.focus();}if(e.key==='Escape'&&document.activeElement===searchInput){searchInput.value='';renderResults();searchInput.blur();}});
  init();
})();
