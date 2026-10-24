(()=>{
  const originalInstall=window.installNationwideV2;
  if(typeof originalInstall!=='function')return;

  const SCHEDULE_TEXT={
    'en':{summary:(r,s)=>`Schedule data is available: ${r} routes / ${s} stops. This source does not include official coordinates, so V2 does not invent map markers.`,routes:'routes',stops:'stops'},
    'id':{summary:(r,s)=>`Data jadwal sudah tersedia: ${r} rute / ${s} titik. Sumber ini belum menyediakan koordinat resmi, jadi V2 tidak mengarang marker di peta.`,routes:'rute',stops:'titik'},
    'zh-TW':{summary:(r,s)=>`清運時刻資料已匯入：${r} 條路線 / ${s} 個清運點。此來源未提供官方座標，因此 V2 不會自行臆造地圖標記。`,routes:'條路線',stops:'個清運點'},
    'zh-CN':{summary:(r,s)=>`清运时刻数据已导入：${r} 条路线 / ${s} 个清运点。此来源未提供官方坐标，因此 V2 不会自行臆造地图标记。`,routes:'条路线',stops:'个清运点'},
    'vi':{summary:(r,s)=>`Đã có dữ liệu lịch thu gom: ${r} tuyến / ${s} điểm. Nguồn này chưa cung cấp tọa độ chính thức nên V2 không tự tạo điểm đánh dấu trên bản đồ.`,routes:'tuyến',stops:'điểm'},
    'ms':{summary:(r,s)=>`Data jadual sudah tersedia: ${r} laluan / ${s} hentian. Sumber ini belum menyediakan koordinat rasmi, jadi V2 tidak mereka penanda peta.`,routes:'laluan',stops:'hentian'},
    'ja':{summary:(r,s)=>`収集スケジュールは取り込み済みです：${r} ルート / ${s} 地点。このデータ元には公式座標がないため、V2 は地図マーカーを推測して作成しません。`,routes:'ルート',stops:'地点'},
    'ko':{summary:(r,s)=>`수거 일정 데이터가 있습니다: ${r}개 노선 / ${s}개 지점. 이 출처에는 공식 좌표가 없어 V2가 지도 마커를 임의로 만들지 않습니다.`,routes:'노선',stops:'지점'},
    'th':{summary:(r,s)=>`มีข้อมูลตารางเก็บขยะแล้ว: ${r} เส้นทาง / ${s} จุด แหล่งข้อมูลนี้ยังไม่มีพิกัดทางการ ดังนั้น V2 จะไม่สร้างหมุดแผนที่ขึ้นเอง`,routes:'เส้นทาง',stops:'จุด'},
    'fil':{summary:(r,s)=>`Available na ang schedule data: ${r} ruta / ${s} hintuan. Walang opisyal na coordinates ang source na ito kaya hindi gumagawa ang V2 ng imbentong map markers.`,routes:'ruta',stops:'hintuan'},
    'my':{summary:(r,s)=>`သိမ်းဆည်းချိန်ဇယားဒေတာ ရရှိပြီးဖြစ်သည်: လမ်းကြောင်း ${r} / ရပ်နားနေရာ ${s}။ ဤအရင်းအမြစ်တွင် တရားဝင်ကိုဩဒိနိတ် မပါသောကြောင့် V2 က မြေပုံ marker များကို ခန့်မှန်းဖန်တီးမည်မဟုတ်ပါ။`,routes:'လမ်းကြောင်း',stops:'ရပ်နားနေရာ'},
    'hi':{summary:(r,s)=>`संग्रह समय-सारणी उपलब्ध है: ${r} रूट / ${s} स्टॉप। इस स्रोत में आधिकारिक निर्देशांक नहीं हैं, इसलिए V2 नक्शे पर अनुमानित मार्कर नहीं बनाता।`,routes:'रूट',stops:'स्टॉप'},
    'fr':{summary:(r,s)=>`Les horaires sont disponibles : ${r} itinéraires / ${s} arrêts. Cette source ne fournit pas de coordonnées officielles ; V2 n’invente donc pas de marqueurs sur la carte.`,routes:'itinéraires',stops:'arrêts'},
    'de':{summary:(r,s)=>`Fahrplandaten sind vorhanden: ${r} Routen / ${s} Haltepunkte. Diese Quelle enthält keine offiziellen Koordinaten; V2 erfindet daher keine Kartenmarker.`,routes:'Routen',stops:'Haltepunkte'},
    'es':{summary:(r,s)=>`Los horarios ya están disponibles: ${r} rutas / ${s} paradas. Esta fuente no incluye coordenadas oficiales, así que V2 no inventa marcadores en el mapa.`,routes:'rutas',stops:'paradas'},
    'nl':{summary:(r,s)=>`De ophaalplanning is beschikbaar: ${r} routes / ${s} haltes. Deze bron bevat geen officiële coördinaten, dus V2 verzint geen kaartmarkeringen.`,routes:'routes',stops:'haltes'}
  };

  function textFor(lang){return SCHEDULE_TEXT[lang]||SCHEDULE_TEXT.en}
  function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  async function forceBaseCity(frame,slug){
    if(slug!=='taipei'&&slug!=='new-taipei')return;
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;
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
    try{return await w.eval(js)}catch(err){console.error('V2 base-city source isolation failed',slug,err)}
  }

  async function showScheduleOnly(frame,slug){
    if(!slug||slug==='taipei'||slug==='new-taipei')return;
    const d=frame.contentDocument;
    if(!d)return;
    try{
      const mr=await fetch(`data/cities/${slug}/manifest.json`,{cache:'force-cache'});
      if(!mr.ok)return;
      const manifest=await mr.json();
      if(manifest?.status!=='schedule-only')return;
      let routes=[];
      try{
        const rr=await fetch(`data/cities/${slug}/routes/index.json`,{cache:'force-cache'});
        if(rr.ok)routes=(await rr.json()).routes||[];
      }catch(e){console.warn('V2 schedule index unavailable',slug,e)}

      const lang=d.getElementById('lang')?.value||'en';
      const t=textFor(lang);
      const routeCount=Number(manifest.route_count||routes.length||0);
      const stopCount=Number(manifest.stop_count||routes.reduce((n,r)=>n+Number(r.stop_count||0),0));
      const status=d.getElementById('status');
      const list=d.getElementById('list');
      if(status)status.textContent=t.summary(routeCount.toLocaleString(),stopCount.toLocaleString());
      if(!list)return;

      const districts=new Map();
      for(const route of routes){
        const name=route.district||'—';
        const item=districts.get(name)||{routes:0,stops:0};
        item.routes+=1;item.stops+=Number(route.stop_count||0);districts.set(name,item);
      }
      const rows=[...districts.entries()].sort((a,b)=>b[1].stops-a[1].stops||a[0].localeCompare(b[0],'zh-Hant'));
      const updated=manifest.source_updated?`<div class="meta">Source update: ${esc(manifest.source_updated)}</div>`:'';
      list.innerHTML=`<div class="zoom-note">${esc(t.summary(routeCount.toLocaleString(),stopCount.toLocaleString()))}${updated}</div>`+
        rows.map(([name,x])=>`<div class="row"><div><b>${esc(name)}</b><div class="meta">${x.routes.toLocaleString()} ${esc(t.routes)} · ${x.stops.toLocaleString()} ${esc(t.stops)}</div></div></div>`).join('');
    }catch(e){console.warn('V2 schedule-only presentation failed',slug,e)}
  }

  window.installNationwideV2=async function(frame){
    await originalInstall(frame);
    const d=frame.contentDocument;
    const select=d?.getElementById('cityV2');
    const lang=d?.getElementById('lang');
    if(!select)return;

    await forceBaseCity(frame,select.value);
    await showScheduleOnly(frame,select.value);

    select.addEventListener('change',()=>{
      const slug=select.value;
      if(slug==='taipei'||slug==='new-taipei'){
        // The original nationwide handler runs first. Re-apply one-source isolation
        // after its compatibility reload has finished.
        setTimeout(()=>forceBaseCity(frame,slug),450);
      }else{
        // The original handler first clears the inherited map/list. Then present
        // schedule coverage accurately when coordinates are intentionally absent.
        setTimeout(()=>showScheduleOnly(frame,slug),550);
      }
    });
    lang?.addEventListener('change',()=>setTimeout(()=>showScheduleOnly(frame,select.value),80));
  };
})();
