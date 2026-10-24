(()=>{
  const originalInstall=window.installNationwideV2;
  if(typeof originalInstall!=='function')return;

  const SCHEDULE_TEXT={"en":{"routes":"routes","stops":"stops","records":"records","summary":(r,s)=>`Schedule data is available: ${r} routes and ${s} stops. The source does not include official coordinates, so V2 does not place markers at guessed locations.`,"recordsSummary":(n,a)=>`Schedule data is available: ${n} records across ${a} districts. The source does not include official coordinates, so V2 does not place markers at guessed locations.`},"id":{"routes":"rute","stops":"titik","records":"catatan","summary":(r,s)=>`Data jadwal tersedia: ${r} rute dan ${s} titik. Sumber ini tidak menyediakan koordinat resmi, jadi V2 tidak menampilkan marker berdasarkan perkiraan.`,"recordsSummary":(n,a)=>`Data jadwal tersedia: ${n} catatan di ${a} distrik. Sumber ini tidak menyediakan koordinat resmi, jadi V2 tidak menampilkan marker berdasarkan perkiraan.`},"zh-TW":{"routes":"條路線","stops":"個清運點","records":"筆資料","summary":(r,s)=>`已有收運時刻資料：${r} 條路線、${s} 個收運點。來源未提供官方座標，因此 V2 不會依推測新增地圖標記。`,"recordsSummary":(n,a)=>`已有收運時刻資料：${n} 筆、分布於 ${a} 個行政區。來源未提供官方座標，因此 V2 不會依推測新增地圖標記。`},"zh-CN":{"routes":"条路线","stops":"个清运点","records":"条记录","summary":(r,s)=>`已有收运时刻数据：${r} 条路线、${s} 个收运点。来源未提供官方坐标，因此 V2 不会根据猜测添加地图标记。`,"recordsSummary":(n,a)=>`已有收运时刻数据：${n} 条记录，分布在 ${a} 个行政区。来源未提供官方坐标，因此 V2 不会根据猜测添加地图标记。`},"vi":{"routes":"tuyến","stops":"điểm","records":"bản ghi","summary":(r,s)=>`Đã có lịch thu gom cho ${r} tuyến và ${s} điểm. Nguồn không cung cấp tọa độ chính thức nên V2 không tự đặt điểm trên bản đồ.`,"recordsSummary":(n,a)=>`Đã có ${n} bản ghi tại ${a} quận/huyện. Nguồn không cung cấp tọa độ chính thức nên V2 không tự đặt điểm trên bản đồ.`},"ms":{"routes":"laluan","stops":"hentian","records":"rekod","summary":(r,s)=>`Jadual tersedia untuk ${r} laluan dan ${s} hentian. Sumber ini tidak menyediakan koordinat rasmi, jadi V2 tidak meletakkan penanda berdasarkan anggaran.`,"recordsSummary":(n,a)=>`Jadual tersedia untuk ${n} rekod di ${a} daerah. Sumber ini tidak menyediakan koordinat rasmi, jadi V2 tidak meletakkan penanda berdasarkan anggaran.`},"ja":{"routes":"ルート","stops":"地点","records":"件","summary":(r,s)=>`収集スケジュール（${r}ルート・${s}地点）を利用できます。公式座標がないため、V2では推測による地図マーカーを表示しません。`,"recordsSummary":(n,a)=>`${a}行政区の${n}件の記録を利用できます。公式座標がないため、V2では推測による地図マーカーを表示しません。`},"ko":{"routes":"노선","stops":"지점","records":"기록","summary":(r,s)=>`수거 일정 ${r}개 노선, ${s}개 지점을 확인할 수 있습니다. 공식 좌표가 없어 V2는 추정 위치에 지도 표시를 추가하지 않습니다.`,"recordsSummary":(n,a)=>`${a}개 행정구의 기록 ${n}건을 확인할 수 있습니다. 공식 좌표가 없어 V2는 추정 위치에 지도 표시를 추가하지 않습니다.`},"th":{"routes":"เส้นทาง","stops":"จุด","records":"รายการ","summary":(r,s)=>`มีตารางเก็บขยะ ${r} เส้นทาง รวม ${s} จุด แต่แหล่งข้อมูลไม่มีพิกัดทางการ V2 จึงไม่ปักหมุดตามตำแหน่งที่คาดเดา`,"recordsSummary":(n,a)=>`มีข้อมูล ${n} รายการใน ${a} เขต แต่แหล่งข้อมูลไม่มีพิกัดทางการ V2 จึงไม่ปักหมุดตามตำแหน่งที่คาดเดา`},"fil":{"routes":"ruta","stops":"hintuan","records":"records","summary":(r,s)=>`May iskedyul para sa ${r} ruta at ${s} hintuan. Walang opisyal na coordinate ang source kaya hindi naglalagay ang V2 ng marker batay sa hula.`,"recordsSummary":(n,a)=>`May ${n} tala sa ${a} distrito. Walang opisyal na coordinate ang source kaya hindi naglalagay ang V2 ng marker batay sa hula.`},"my":{"routes":"လမ်းကြောင်း","stops":"ရပ်နားနေရာ","records":"မှတ်တမ်း","summary":(r,s)=>`လမ်းကြောင်း ${r} ခုနှင့် ရပ်နားနေရာ ${s} ခုအတွက် အချိန်ဇယား ရှိပါသည်။ တရားဝင်ကိုဩဒိနိတ် မပါသောကြောင့် V2 သည် ခန့်မှန်းနေရာတွင် မြေပုံမှတ်သားချက် မပြပါ။`,"recordsSummary":(n,a)=>`အုပ်ချုပ်ရေးဒေသ ${a} ခုမှ မှတ်တမ်း ${n} ခု ရှိပါသည်။ တရားဝင်ကိုဩဒိနိတ် မပါသောကြောင့် V2 သည် ခန့်မှန်းနေရာတွင် မြေပုံမှတ်သားချက် မပြပါ။`},"hi":{"routes":"रूट","stops":"स्टॉप","records":"रिकॉर्ड","summary":(r,s)=>`${r} रूट और ${s} स्टॉप का संग्रह शेड्यूल उपलब्ध है। आधिकारिक निर्देशांक नहीं हैं, इसलिए V2 अनुमानित जगहों पर नक्शे के मार्कर नहीं दिखाता।`,"recordsSummary":(n,a)=>`${a} जिलों में ${n} रिकॉर्ड उपलब्ध हैं। आधिकारिक निर्देशांक नहीं हैं, इसलिए V2 अनुमानित जगहों पर नक्शे के मार्कर नहीं दिखाता।`},"fr":{"routes":"itinéraires","stops":"arrêts","records":"enregistrements","summary":(r,s)=>`Les horaires de ${r} itinéraires et ${s} arrêts sont disponibles. La source ne fournit pas de coordonnées officielles ; V2 n’affiche donc pas de points à des emplacements supposés.`,"recordsSummary":(n,a)=>`${n} enregistrements répartis dans ${a} districts sont disponibles. La source ne fournit pas de coordonnées officielles ; V2 n’affiche donc pas de points à des emplacements supposés.`},"de":{"routes":"Routen","stops":"Haltepunkte","records":"Datensätze","summary":(r,s)=>`Fahrplandaten für ${r} Routen und ${s} Haltepunkte sind verfügbar. Da die Quelle keine offiziellen Koordinaten enthält, setzt V2 keine Marker an vermuteten Orten.`,"recordsSummary":(n,a)=>`${n} Datensätze aus ${a} Bezirken sind verfügbar. Da die Quelle keine offiziellen Koordinaten enthält, setzt V2 keine Marker an vermuteten Orten.`},"es":{"routes":"rutas","stops":"paradas","records":"registros","summary":(r,s)=>`Hay horarios disponibles para ${r} rutas y ${s} paradas. La fuente no incluye coordenadas oficiales, así que V2 no coloca marcadores en ubicaciones supuestas.`,"recordsSummary":(n,a)=>`Hay ${n} registros de ${a} distritos. La fuente no incluye coordenadas oficiales, así que V2 no coloca marcadores en ubicaciones supuestas.`},"nl":{"routes":"routes","stops":"haltes","records":"records","summary":(r,s)=>`Er zijn ophaalgegevens voor ${r} routes en ${s} haltes. De bron bevat geen officiële coördinaten, dus V2 plaatst geen markeringen op geschatte locaties.`,"recordsSummary":(n,a)=>`Er zijn ${n} gegevens uit ${a} districten. De bron bevat geen officiële coördinaten, dus V2 plaatst geen markeringen op geschatte locaties.`}};

  function textFor(lang){return SCHEDULE_TEXT[lang]||SCHEDULE_TEXT.en}
  function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  async function forceBaseCity(frame,slug){
    if(slug!=='taipei'&&slug!=='new-taipei')return null;
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return null;
    const cfg=slug==='taipei'
      ? {city:'taipei',manifest:'data/manifest.json',base:'data/',operation:'data/operations/taipei.json'}
      : {city:'new-taipei',manifest:'data/new-taipei/manifest.json',base:'data/new-taipei/',operation:'data/operations/new-taipei.json'};
    const js=`(async()=>{
      cache.clear();clearTrucks();clearFacilities();
      const manifest=await readJson(${JSON.stringify(cfg.manifest)},null);
      if(!manifest)throw Error('base-city manifest unavailable');
      sources=[{city:${JSON.stringify(cfg.city)},url:${JSON.stringify(cfg.manifest)},base:${JSON.stringify(cfg.base)},manifest}];
      const op=await readJson(${JSON.stringify(cfg.operation)},{dates:{}});
      operations={${JSON.stringify(cfg.city)}:op||{dates:{}}};
      await loadFacilityTilesForViewport();
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
