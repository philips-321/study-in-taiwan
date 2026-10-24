(()=>{
  const originalInstall=window.installNationwideV2;
  if(typeof originalInstall!=='function')return;

  const SCHEDULE_TEXT={
    'en':{summary:(r,s)=>`Schedule data is available: ${r} routes / ${s} stops. This source does not include official coordinates, so V2 does not invent map markers.`,recordsSummary:(n,a)=>`Schedule data is available: ${n} records across ${a} districts. This source does not include official coordinates, so V2 does not invent map markers.`,routes:'routes',stops:'stops',records:'records'},
    'id':{summary:(r,s)=>`Data jadwal sudah tersedia: ${r} rute / ${s} titik. Sumber ini belum menyediakan koordinat resmi, jadi V2 tidak mengarang marker di peta.`,recordsSummary:(n,a)=>`Data jadwal sudah tersedia: ${n} catatan di ${a} distrik. Sumber ini belum menyediakan koordinat resmi, jadi V2 tidak mengarang marker di peta.`,routes:'rute',stops:'titik',records:'catatan'},
    'zh-TW':{summary:(r,s)=>`清運時刻資料已匯入：${r} 條路線 / ${s} 個清運點。此來源未提供官方座標，因此 V2 不會自行臆造地圖標記。`,recordsSummary:(n,a)=>`清運時刻資料已匯入：${n} 筆資料 / ${a} 個行政區。此來源未提供官方座標，因此 V2 不會自行臆造地圖標記。`,routes:'條路線',stops:'個清運點',records:'筆資料'},
    'zh-CN':{summary:(r,s)=>`清运时刻数据已导入：${r} 条路线 / ${s} 个清运点。此来源未提供官方坐标，因此 V2 不会自行臆造地图标记。`,recordsSummary:(n,a)=>`清运时刻数据已导入：${n} 条记录 / ${a} 个行政区。此来源未提供官方坐标，因此 V2 不会自行臆造地图标记。`,routes:'条路线',stops:'个清运点',records:'条记录'},
    'vi':{summary:(r,s)=>`Đã có dữ liệu lịch thu gom: ${r} tuyến / ${s} điểm. Nguồn này chưa cung cấp tọa độ chính thức nên V2 không tự tạo điểm đánh dấu trên bản đồ.`,recordsSummary:(n,a)=>`Đã có dữ liệu lịch thu gom: ${n} bản ghi tại ${a} quận/huyện. Nguồn này chưa cung cấp tọa độ chính thức nên V2 không tự tạo điểm đánh dấu trên bản đồ.`,routes:'tuyến',stops:'điểm',records:'bản ghi'},
    'ms':{summary:(r,s)=>`Data jadual sudah tersedia: ${r} laluan / ${s} hentian. Sumber ini belum menyediakan koordinat rasmi, jadi V2 tidak mereka penanda peta.`,recordsSummary:(n,a)=>`Data jadual sudah tersedia: ${n} rekod merentasi ${a} daerah. Sumber ini belum menyediakan koordinat rasmi, jadi V2 tidak mereka penanda peta.`,routes:'laluan',stops:'hentian',records:'rekod'},
    'ja':{summary:(r,s)=>`収集スケジュールは取り込み済みです：${r} ルート / ${s} 地点。このデータ元には公式座標がないため、V2 は地図マーカーを推測して作成しません。`,recordsSummary:(n,a)=>`収集スケジュールは取り込み済みです：${n} 件 / ${a} 行政区。このデータ元には公式座標がないため、V2 は地図マーカーを推測して作成しません。`,routes:'ルート',stops:'地点',records:'件'},
    'ko':{summary:(r,s)=>`수거 일정 데이터가 있습니다: ${r}개 노선 / ${s}개 지점. 이 출처에는 공식 좌표가 없어 V2가 지도 마커를 임의로 만들지 않습니다.`,recordsSummary:(n,a)=>`수거 일정 데이터가 있습니다: ${n}개 기록 / ${a}개 행정구. 이 출처에는 공식 좌표가 없어 V2가 지도 마커를 임의로 만들지 않습니다.`,routes:'노선',stops:'지점',records:'기록'},
    'th':{summary:(r,s)=>`มีข้อมูลตารางเก็บขยะแล้ว: ${r} เส้นทาง / ${s} จุด แหล่งข้อมูลนี้ยังไม่มีพิกัดทางการ ดังนั้น V2 จะไม่สร้างหมุดแผนที่ขึ้นเอง`,recordsSummary:(n,a)=>`มีข้อมูลตารางเก็บขยะแล้ว: ${n} รายการใน ${a} เขต แหล่งข้อมูลนี้ยังไม่มีพิกัดทางการ ดังนั้น V2 จะไม่สร้างหมุดแผนที่ขึ้นเอง`,routes:'เส้นทาง',stops:'จุด',records:'รายการ'},
    'fil':{summary:(r,s)=>`Available na ang schedule data: ${r} ruta / ${s} hintuan. Walang opisyal na coordinates ang source na ito kaya hindi gumagawa ang V2 ng imbentong map markers.`,recordsSummary:(n,a)=>`Available na ang schedule data: ${n} records sa ${a} distrito. Walang opisyal na coordinates ang source na ito kaya hindi gumagawa ang V2 ng imbentong map markers.`,routes:'ruta',stops:'hintuan',records:'records'},
    'my':{summary:(r,s)=>`သိမ်းဆည်းချိန်ဇယားဒေတာ ရရှိပြီးဖြစ်သည်: လမ်းကြောင်း ${r} / ရပ်နားနေရာ ${s}။ ဤအရင်းအမြစ်တွင် တရားဝင်ကိုဩဒိနိတ် မပါသောကြောင့် V2 က မြေပုံ marker များကို ခန့်မှန်းဖန်တီးမည်မဟုတ်ပါ။`,recordsSummary:(n,a)=>`သိမ်းဆည်းချိန်ဇယားဒေတာ ရရှိပြီးဖြစ်သည်: မှတ်တမ်း ${n} / အုပ်ချုပ်ရေးဧရိယာ ${a}။ တရားဝင်ကိုဩဒိနိတ် မပါသောကြောင့် V2 က မြေပုံ marker များကို ခန့်မှန်းဖန်တီးမည်မဟုတ်ပါ။`,routes:'လမ်းကြောင်း',stops:'ရပ်နားနေရာ',records:'မှတ်တမ်း'},
    'hi':{summary:(r,s)=>`संग्रह समय-सारणी उपलब्ध है: ${r} रूट / ${s} स्टॉप। इस स्रोत में आधिकारिक निर्देशांक नहीं हैं, इसलिए V2 नक्शे पर अनुमानित मार्कर नहीं बनाता।`,recordsSummary:(n,a)=>`संग्रह समय-सारणी उपलब्ध है: ${n} रिकॉर्ड / ${a} जिले। इस स्रोत में आधिकारिक निर्देशांक नहीं हैं, इसलिए V2 नक्शे पर अनुमानित मार्कर नहीं बनाता।`,routes:'रूट',stops:'स्टॉप',records:'रिकॉर्ड'},
    'fr':{summary:(r,s)=>`Les horaires sont disponibles : ${r} itinéraires / ${s} arrêts. Cette source ne fournit pas de coordonnées officielles ; V2 n’invente donc pas de marqueurs sur la carte.`,recordsSummary:(n,a)=>`Les horaires sont disponibles : ${n} enregistrements dans ${a} districts. Cette source ne fournit pas de coordonnées officielles ; V2 n’invente donc pas de marqueurs sur la carte.`,routes:'itinéraires',stops:'arrêts',records:'enregistrements'},
    'de':{summary:(r,s)=>`Fahrplandaten sind vorhanden: ${r} Routen / ${s} Haltepunkte. Diese Quelle enthält keine offiziellen Koordinaten; V2 erfindet daher keine Kartenmarker.`,recordsSummary:(n,a)=>`Fahrplandaten sind vorhanden: ${n} Datensätze in ${a} Bezirken. Diese Quelle enthält keine offiziellen Koordinaten; V2 erfindet daher keine Kartenmarker.`,routes:'Routen',stops:'Haltepunkte',records:'Datensätze'},
    'es':{summary:(r,s)=>`Los horarios ya están disponibles: ${r} rutas / ${s} paradas. Esta fuente no incluye coordenadas oficiales, así que V2 no inventa marcadores en el mapa.`,recordsSummary:(n,a)=>`Los horarios ya están disponibles: ${n} registros en ${a} distritos. Esta fuente no incluye coordenadas oficiales, así que V2 no inventa marcadores en el mapa.`,routes:'rutas',stops:'paradas',records:'registros'},
    'nl':{summary:(r,s)=>`De ophaalplanning is beschikbaar: ${r} routes / ${s} haltes. Deze bron bevat geen officiële coördinaten, dus V2 verzint geen kaartmarkeringen.`,recordsSummary:(n,a)=>`De ophaalplanning is beschikbaar: ${n} records in ${a} districten. Deze bron bevat geen officiële coördinaten, dus V2 verzint geen kaartmarkeringen.`,routes:'routes',stops:'haltes',records:'records'}
  };

  function textFor(lang){return SCHEDULE_TEXT[lang]||SCHEDULE_TEXT.en}
  function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  async function forceBaseCity(frame,slug){
    if(slug!=='taipei'&&slug!=='new-taipei')return null;
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return null;
    const cfg=slug==='taipei'
      ? {city:'taipei',manifest:'data/manifest.json',base:'data/',operation:'data/operations/taipei.json',facility:'data/facilities/taipei.json'}
      : {city:'new-taipei',manifest:'data/new-taipei/manifest.json',base:'data/new-taipei/',operation:'data/operations/new-taipei.json',facility:null};
    const js=`(async()=>{
      cache.clear();clearTrucks();clearFacilities();
      const manifest=await readJson(${JSON.stringify(cfg.manifest)},null);
      if(!manifest)throw Error('base-city manifest unavailable');
      sources=[{city:${JSON.stringify(cfg.city)},url:${JSON.stringify(cfg.manifest)},base:${JSON.stringify(cfg.base)},manifest}];
      const op=await readJson(${JSON.stringify(cfg.operation)},{dates:{}});
      operations={${JSON.stringify(cfg.city)}:op||{dates:{}}};
      ${cfg.facility?`const ff=await readJson(${JSON.stringify(cfg.facility)},{facilities:[]});facilities=ff?.facilities||[];`:'facilities=[];'}
      await ensure();render();
      return {city:sources[0].city,sourceCount:sources.length};
    })()`;
    try{return await w.eval(js)}catch(err){console.error('V2 base-city source isolation failed',slug,err);return null}
  }

  async function showScheduleOnly(frame,slug){
    if(!slug||slug==='taipei'||slug==='new-taipei')return null;
    const d=frame.contentDocument;
    if(!d)return null;
    try{
      const mr=await fetch(`data/cities/${slug}/manifest.json`,{cache:'force-cache'});
      if(!mr.ok)return null;
      const manifest=await mr.json();
      if(manifest?.status!=='schedule-only')return null;

      const lang=d.getElementById('lang')?.value||'en';
      const t=textFor(lang);
      const status=d.getElementById('status');
      const list=d.getElementById('list');
      if(!list)return null;
      const updated=manifest.source_updated?`<div class="meta">Source update: ${esc(manifest.source_updated)}</div>`:'';

      if(manifest.schedule_index){
        let schedule=null;
        try{
          const sr=await fetch(`data/cities/${slug}/${manifest.schedule_index}`,{cache:'force-cache'});
          if(sr.ok)schedule=await sr.json();
        }catch(e){console.warn('V2 district schedule index unavailable',slug,e)}
        if(!schedule)return null;
        const rowCount=Number(manifest.row_count??schedule.row_count??0);
        const areaCount=Number(manifest.area_count??schedule.area_count??0);
        const summary=t.recordsSummary(rowCount.toLocaleString(),areaCount.toLocaleString());
        if(status)status.textContent=summary;
        const areas=[...(schedule.areas||[])].sort((a,b)=>Number(b.count||0)-Number(a.count||0)||String(a.area||'').localeCompare(String(b.area||''),'zh-Hant'));
        list.innerHTML=`<div class="zoom-note">${esc(summary)}${updated}</div>`+
          areas.map(x=>`<div class="row"><div><b>${esc(x.area||'—')}</b><div class="meta">${Number(x.count||0).toLocaleString()} ${esc(t.records)}</div></div></div>`).join('');
        return summary;
      }

      let routes=[];
      try{
        const rr=await fetch(`data/cities/${slug}/${manifest.routes_index||'routes/index.json'}`,{cache:'force-cache'});
        if(rr.ok)routes=(await rr.json()).routes||[];
      }catch(e){console.warn('V2 route schedule index unavailable',slug,e)}
      const routeCount=Number(manifest.route_count||routes.length||0);
      const stopCount=Number(manifest.stop_count||routes.reduce((n,r)=>n+Number(r.stop_count||0),0));
      const summary=t.summary(routeCount.toLocaleString(),stopCount.toLocaleString());
      if(status)status.textContent=summary;
      const districts=new Map();
      for(const route of routes){
        const name=route.district||'—';
        const item=districts.get(name)||{routes:0,stops:0};
        item.routes+=1;item.stops+=Number(route.stop_count||0);districts.set(name,item);
      }
      const rows=[...districts.entries()].sort((a,b)=>b[1].stops-a[1].stops||a[0].localeCompare(b[0],'zh-Hant'));
      list.innerHTML=`<div class="zoom-note">${esc(summary)}${updated}</div>`+
        rows.map(([name,x])=>`<div class="row"><div><b>${esc(name)}</b><div class="meta">${x.routes.toLocaleString()} ${esc(t.routes)} · ${x.stops.toLocaleString()} ${esc(t.stops)}</div></div></div>`).join('');
      return summary;
    }catch(e){console.warn('V2 schedule-only presentation failed',slug,e);return null}
  }

  window.__v2ForceBaseCity=forceBaseCity;
  window.__v2ShowScheduleOnly=showScheduleOnly;

  window.installNationwideV2=async function(frame){
    await originalInstall(frame);
  };
})();
