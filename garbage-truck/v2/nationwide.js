(() => {
const TEXT={"en":{"city":"City / county","pending":"Map data for this city or county has not been added to V2 yet.","route":"Collection days vary by route and stop. There is no single weekday schedule for all of Taiwan.","static":"The site uses saved static JSON files and does not query government sources from your browser."},"id":{"city":"Kota / kabupaten","pending":"Data peta untuk wilayah ini belum ditambahkan ke V2.","route":"Hari pengangkutan berbeda menurut rute dan titik. Tidak ada jadwal mingguan yang berlaku untuk seluruh Taiwan.","static":"Situs ini hanya membaca file JSON statis yang tersimpan dan tidak mengakses sumber pemerintah dari browser Anda."},"zh-TW":{"city":"縣市","pending":"此縣市的地圖資料尚未加入 V2。","route":"收運日依路線與收運點而異，臺灣各地並沒有統一的星期規則。","static":"網站只讀取已儲存的靜態 JSON 檔案，不會透過你的瀏覽器查詢政府資料。"},"zh-CN":{"city":"县市","pending":"该县市的地图数据尚未加入 V2。","route":"收运日因路线和收运点而异，台湾各地没有统一的星期安排。","static":"网站只读取已保存的静态 JSON 文件，不会通过你的浏览器查询政府数据。"},"vi":{"city":"Thành phố / huyện","pending":"Dữ liệu bản đồ của khu vực này chưa được thêm vào V2.","route":"Ngày thu gom tùy theo tuyến và điểm. Không có lịch cố định áp dụng cho toàn Đài Loan.","static":"Trang web chỉ đọc các tệp JSON tĩnh đã lưu, không truy vấn nguồn dữ liệu của chính phủ từ trình duyệt của bạn."},"ms":{"city":"Bandar / daerah","pending":"Data peta untuk kawasan ini belum ditambahkan ke V2.","route":"Hari kutipan berbeza mengikut laluan dan hentian. Tiada jadual mingguan yang sama untuk seluruh Taiwan.","static":"Laman ini hanya membaca fail JSON statik yang disimpan dan tidak mendapatkan data kerajaan terus daripada pelayar anda."},"ja":{"city":"市・県","pending":"この市・県の地図データはまだV2に追加されていません。","route":"収集日はルートや収集地点によって異なります。台湾全域で共通の曜日設定はありません。","static":"このサイトは保存済みの静的JSONファイルのみを読み込み、ブラウザから政府のデータ元へ直接問い合わせることはありません。"},"ko":{"city":"시 / 현","pending":"이 지역의 지도 데이터는 아직 V2에 추가되지 않았습니다.","route":"수거 요일은 노선과 지점마다 다릅니다. 대만 전역에 공통으로 적용되는 요일은 없습니다.","static":"웹사이트는 저장된 정적 JSON 파일만 읽으며, 브라우저에서 정부 데이터에 직접 접속하지 않습니다."},"th":{"city":"เมือง / เขตการปกครอง","pending":"ยังไม่ได้เพิ่มข้อมูลแผนที่ของพื้นที่นี้ใน V2","route":"วันเก็บขยะแตกต่างกันไปตามเส้นทางและจุดเก็บ แต่ละพื้นที่ในไต้หวันจึงไม่มีตารางวันเดียวกัน","static":"เว็บไซต์อ่านเฉพาะไฟล์ JSON แบบคงที่ที่บันทึกไว้ และไม่ได้ดึงข้อมูลจากหน่วยงานรัฐบาลผ่านเบราว์เซอร์ของคุณ"},"fil":{"city":"Lungsod / county","pending":"Hindi pa naidaragdag sa V2 ang map data para sa lugar na ito.","route":"Nag-iiba ang araw ng koleksiyon ayon sa ruta at hintuan. Walang iisang iskedyul ng araw para sa buong Taiwan.","static":"Mga naka-save na static JSON file lang ang binabasa ng site; hindi ito kumukuha ng datos ng gobyerno mula sa browser mo."},"my":{"city":"မြို့ / ခရိုင်","pending":"ဤဒေသ၏ မြေပုံဒေတာကို V2 တွင် မထည့်ရသေးပါ။","route":"အမှိုက်သိမ်းရက်များသည် လမ်းကြောင်းနှင့် နေရာအလိုက် ကွာခြားသည်။ ထိုင်ဝမ်တစ်နိုင်ငံလုံးအတွက် တူညီသော အပတ်စဉ်ရက် မရှိပါ။","static":"ဝဘ်ဆိုက်သည် သိမ်းထားသော static JSON ဖိုင်များကိုသာ ဖတ်ပြီး သင့် browser မှ အစိုးရဒေတာကို တိုက်ရိုက်မရယူပါ။"},"hi":{"city":"शहर / काउंटी","pending":"इस क्षेत्र का नक्शा डेटा अभी V2 में नहीं जोड़ा गया है।","route":"संग्रह के दिन रूट और स्थान के अनुसार बदलते हैं। पूरे ताइवान के लिए एक ही साप्ताहिक दिन-नियम नहीं है।","static":"वेबसाइट केवल सहेजी हुई static JSON फ़ाइलें पढ़ती है; यह आपके ब्राउज़र से सरकारी डेटा सीधे नहीं मँगाती।"},"fr":{"city":"Ville / comté","pending":"Les données cartographiques de cette ville ou de ce comté n’ont pas encore été ajoutées à V2.","route":"Les jours de collecte varient selon l’itinéraire et l’arrêt. Il n’existe pas de calendrier hebdomadaire unique pour tout Taïwan.","static":"Le site lit uniquement les fichiers JSON statiques enregistrés et ne consulte pas directement les sources gouvernementales depuis votre navigateur."},"de":{"city":"Stadt / Landkreis","pending":"Die Kartendaten für diese Stadt oder diesen Landkreis wurden noch nicht zu V2 hinzugefügt.","route":"Die Abholtage unterscheiden sich je nach Route und Haltepunkt. Für ganz Taiwan gilt kein einheitlicher Wochenplan.","static":"Die Website liest nur gespeicherte statische JSON-Dateien und ruft keine Regierungsdaten direkt über Ihren Browser ab."},"es":{"city":"Ciudad / condado","pending":"Los datos del mapa de esta ciudad o condado aún no se han añadido a V2.","route":"Los días de recogida varían según la ruta y el punto. No hay un calendario semanal único para todo Taiwán.","static":"El sitio solo lee archivos JSON estáticos guardados y no consulta directamente fuentes gubernamentales desde tu navegador."},"nl":{"city":"Stad / county","pending":"De kaartgegevens voor deze stad of county zijn nog niet aan V2 toegevoegd.","route":"Ophaaldagen verschillen per route en halte. Er is geen vast weekschema voor heel Taiwan.","static":"De website leest alleen opgeslagen statische JSON-bestanden en haalt geen overheidsgegevens rechtstreeks via uw browser op."}};
const txt=l=>TEXT[l]||TEXT.en;
const TEST_CITY_SELECTOR=true;
function pointInRing(point,ring){const[x,y]=point;let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];const hit=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi);if(hit)inside=!inside}return inside}
function pointInGeometry(point,geom){if(!geom)return false;if(geom.type==='Polygon'){if(!geom.coordinates.length||!pointInRing(point,geom.coordinates[0]))return false;for(let i=1;i<geom.coordinates.length;i++)if(pointInRing(point,geom.coordinates[i]))return false;return true}if(geom.type==='MultiPolygon')return geom.coordinates.some(p=>pointInGeometry(point,{type:'Polygon',coordinates:p}));return false}
function d2(a,b){const dx=a[0]-b[0],dy=a[1]-b[1];return dx*dx+dy*dy}
window.installNationwideV2=async function(frame){
 const d=frame.contentDocument,w=frame.contentWindow;if(!d||!w||d.getElementById('cityV2'))return;const map=w.__v2MapBridge||w.eval('map');if(!map||typeof map.flyTo!=='function'){console.error('V2 city navigation could not resolve MapLibre map');return}let registry,boundaries=null;
 try{const r=await fetch('data/cities.json',{cache:'force-cache'});if(!r.ok)throw Error(r.status);registry=await r.json();try{const br=await fetch('data/city-boundaries.geojson',{cache:'force-cache'});if(br.ok)boundaries=await br.json()}catch(e){console.warn('V2 boundaries unavailable; using nearest-center fallback',e)}}catch(e){console.error('V2 city registry failed',e);return}
 const controls=d.querySelector('.controls'),langSelect=d.getElementById('lang');if(!controls||!langSelect)return;
 const style=d.createElement('style');style.textContent=`#cityV2{max-width:190px}@media(max-width:800px){header{padding:10px 12px;gap:8px 10px}.brand{font-size:16px;line-height:1.2;min-width:0}.brand::before{width:86px;height:42px}.controls{gap:6px}#content{grid-template-rows:minmax(46vh,1fr) minmax(0,44vh)}#panel{max-height:44vh;max-height:44dvh;padding:12px}}@media(max-width:560px){#cityV2{display:none!important}.brand{font-size:15px;flex-basis:100%;margin-right:0}.brand::before{width:74px;height:36px}.controls{width:100%;display:flex;flex-wrap:nowrap}#locate{flex:1;min-width:0}header select{max-width:128px}}`;d.head.appendChild(style);
 const select=d.createElement('select');select.id='cityV2';select.dataset.testOnly='true';for(const c of registry.cities){const o=d.createElement('option');o.value=c.slug;o.textContent=cityLabel(c,langSelect.value||'en');select.appendChild(o)}if(TEST_CITY_SELECTOR)controls.insertBefore(select,langSelect);
 const bySlug=Object.fromEntries(registry.cities.map(x=>[x.slug,x])),zhToSlug=Object.fromEntries(registry.cities.map(x=>[x.name_zh,x.slug]));
 let selected=localStorage.getItem('garbageV2City');if(!bySlug[selected])selected='taipei';select.value=selected;
 let loadingCity=false,transitionToken=0;
 function localizedCity(city,language){return city?.names?.[language]||city?.names?.en||city?.name_en?.replace(/\s+(City|County)$/,'')||''}
 function cityLabel(city,language){return language.startsWith('zh')?city.name_zh:`${localizedCity(city,language)} · ${city.name_zh}`}
 function updateCityOptionLabels(){const language=langSelect.value||'en';for(const city of registry.cities){const option=select.querySelector(`option[value="${city.slug}"]`);if(option)option.textContent=cityLabel(city,language)}}
 function updateBrand(){const city=bySlug[selected]||bySlug.taipei;try{const tr=w.eval('T[lang]'),language=langSelect.value||'en';d.getElementById('brand').textContent=`${tr.brand} · ${cityLabel(city,language)}`}catch(e){console.warn('V2 brand city label failed',e)}}
 function detectCity(lng,lat){if(boundaries?.features?.length){const p=[lng,lat];for(const f of boundaries.features){if(pointInGeometry(p,f.geometry)){const zh=f.properties?.name_zh||f.properties?.COUNTYNAME||f.properties?.county;if(zhToSlug[zh])return zhToSlug[zh]}}}let best='taipei',score=Infinity;for(const c of registry.cities){const s=d2([lng,lat],c.center);if(s<score){score=s;best=c.slug}}return best}
 try{w.eval(`if(!globalThis.__v2OriginalTodayGuide)globalThis.__v2OriginalTodayGuide=todayGuide;todayGuide=function(){const c=globalThis.__v2SelectedCity||'taipei';if(c==='taipei')return globalThis.__v2OriginalTodayGuide();const tr=T[lang];return '<b>'+tr.today+'</b><br>• '+tr.general+'<br>• '+tr.food+'<br>• '+tr.recycling+'<br><span class="meta">'+esc(globalThis.__v2RouteSpecific||'')+'</span>'}`)}catch(e){console.warn(e)}
 let activeCityName=null;const relabel=root=>{if(!activeCityName||activeCityName==='New Taipei City')return;const walker=d.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode()))if(n.nodeValue&&n.nodeValue.includes('New Taipei'))n.nodeValue=n.nodeValue.replaceAll('New Taipei',activeCityName)};new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)relabel(n)}).observe(d.body,{childList:true,subtree:true});

 function flyToCity(city,token){
   return new Promise(resolve=>{
     let settled=false;
     const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);try{map.off('moveend',finish)}catch{}resolve(token===transitionToken)};
     const timer=setTimeout(finish,3500);
     try{
       map.once('moveend',finish);
       map.flyTo({center:city.center,zoom:city.kind==='city'?13.5:11.8,essential:true});
     }catch(e){console.warn('V2 city flyTo failed',e);finish()}
   });
 }

 async function loadCityData(city,token=transitionToken){
   const t=txt(langSelect.value);
   if(city.slug==='taipei'||city.slug==='new-taipei'){
     try{
       if(typeof window.__v2ForceBaseCity==='function')await window.__v2ForceBaseCity(frame,city.slug);
       else{w.eval('cache.clear();init();');setTimeout(()=>{try{w.eval('ensure();render();')}catch{}},350)}
       updateBrand();
     }catch(e){console.warn(e)}
     return;
   }
   let manifest=null,tilesManifest=null;
   try{
     const mr=await fetch(`data/cities/${city.slug}/manifest.json`,{cache:'force-cache'});
     if(mr.ok)manifest=await mr.json();
     if(manifest?.status==='ready'){
       const tr=await fetch(`data/cities/${city.slug}/tiles/manifest.json`,{cache:'force-cache'});
       if(tr.ok)tilesManifest=await tr.json();
     }
   }catch(e){console.warn(e)}
   if(token!==transitionToken)return;
   try{
     if(manifest?.status==='ready'&&tilesManifest?.tiles?.length){
       w.eval('cache.clear();clearTrucks();clearFacilities();');
       const src=[{city:city.slug,base:`v2/data/cities/${city.slug}/tiles/`,manifest:tilesManifest}];
       w.eval(`sources=${JSON.stringify(src)};operations={};facilities=[];`);
       setTimeout(()=>{try{w.eval('ensure();render();');relabel(d.body);updateBrand()}catch{}},250);
       return;
     }
     if(manifest?.status==='schedule-only'){
       w.eval('cache.clear();clearTrucks();clearFacilities();sources=[];operations={};facilities=[];');
       if(typeof window.__v2ShowScheduleOnly==='function'){
         const rendered=await window.__v2ShowScheduleOnly(frame,city.slug);
         if(rendered){updateBrand();return}
       }
       const detail=`${t.route} ${t.static}`;
       w.eval(`statusEl.textContent=${JSON.stringify(localizedCity(city,langSelect.value))};listEl.innerHTML='<div class="zoom-note">'+${JSON.stringify(detail)}+'</div>';document.getElementById('todayGuide').innerHTML=todayGuide();`);
       updateBrand();
       return;
     }
     w.eval('cache.clear();clearTrucks();clearFacilities();sources=[];operations={};facilities=[];');
     const message=`${localizedCity(city,langSelect.value)}: ${t.pending}`,detail=`${t.route} ${t.static}`;
     w.eval(`statusEl.textContent=${JSON.stringify(message)};listEl.innerHTML='<div class="zoom-note">'+${JSON.stringify(detail)}+'</div>';document.getElementById('todayGuide').innerHTML=todayGuide();`);
     updateBrand();
   }catch(e){console.error(e)}
 }

 async function commitCity(city,{persist=true,token=transitionToken}={}){
   if(token!==transitionToken)return false;
   selected=city.slug;activeCityName=localizedCity(city,langSelect.value);select.value=selected;
   if(persist)localStorage.setItem('garbageV2City',selected);
   const t=txt(langSelect.value);select.setAttribute('aria-label',t.city);
   try{w.eval(`globalThis.__v2SelectedCity=${JSON.stringify(selected)};globalThis.__v2RouteSpecific=${JSON.stringify(t.route)};`)}catch{}
   updateBrand();
   await loadCityData(city,token);
   return token===transitionToken;
 }

 async function setCity(slug,{moveMap=false,persist=true}={}){
   const city=bySlug[slug]||bySlug.taipei;
   const token=++transitionToken;
   if(moveMap){
     loadingCity=true;
     select.value=city.slug;
     if(persist)localStorage.setItem('garbageV2City',city.slug);
     const arrived=await flyToCity(city,token);
     if(!arrived){if(token===transitionToken)loadingCity=false;return}
     await commitCity(city,{persist:false,token});
     if(token===transitionToken)loadingCity=false;
     return;
   }
   loadingCity=true;
   await commitCity(city,{persist,token});
   if(token===transitionToken)loadingCity=false;
 }

 async function syncCityFromMap(){
   if(loadingCity)return;
   try{
     const c=map.getCenter(),slug=detectCity(c.lng,c.lat);
     if(slug&&slug!==selected)await setCity(slug,{moveMap:false,persist:true});
     else updateBrand();
   }catch(e){console.warn('V2 map city detection failed',e)}
 }

 select.addEventListener('change',()=>setCity(select.value,{moveMap:true,persist:true}));
 langSelect.addEventListener('change',()=>{const t=txt(langSelect.value);select.setAttribute('aria-label',t.city);updateCityOptionLabels();activeCityName=localizedCity(bySlug[selected]||bySlug.taipei,langSelect.value);try{w.eval(`globalThis.__v2RouteSpecific=${JSON.stringify(t.route)};`);setTimeout(async()=>{w.eval("document.getElementById('todayGuide').innerHTML=todayGuide();");updateBrand();if(typeof window.__v2ShowScheduleOnly==='function')await window.__v2ShowScheduleOnly(frame,selected)},0)}catch{}});
 map.on('moveend',syncCityFromMap);
 await setCity(selected,{moveMap:true,persist:false});
};
})();
