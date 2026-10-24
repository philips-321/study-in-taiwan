(() => {
const STARTS=window.V2_CITY_START_POINTS?.points||{};
function centerArray(value){
  if(Array.isArray(value)&&value.length>=2)return [Number(value[0]),Number(value[1])];
  if(value&&Number.isFinite(Number(value.lng))&&Number.isFinite(Number(value.lat)))return [Number(value.lng),Number(value.lat)];
  return null;
}
function matchStart(center){
  const c=centerArray(center);if(!c)return null;
  for(const [slug,p] of Object.entries(STARTS)){
    const cc=p.city_center;if(!Array.isArray(cc))continue;
    if(Math.abs(c[0]-cc[0])<0.0002&&Math.abs(c[1]-cc[1])<0.0002)return {slug,p};
  }
  return null;
}
function getMap(w){
  if(w?.map)return w.map;
  try{
    const map=w?.eval?.('map');
    if(map)w.map=map;
    return map||null;
  }catch(err){
    console.warn('V2 map bridge unavailable',err);
    return null;
  }
}
function apply(frame){
  const d=frame.contentDocument,w=frame.contentWindow;if(!d||!w||d.getElementById('v2MobileParity'))return;
  const s=d.createElement('style');s.id='v2MobileParity';s.textContent=`
  @media(max-width:800px){
    html[data-v2] #content{grid-template-rows:minmax(0,1fr) auto!important}
    html[data-v2] .sheet-toggle{display:flex!important}
    html[data-v2] #panel.collapsed{height:44px!important;min-height:44px!important;max-height:44px!important;padding:0!important;overflow:hidden!important}
    html[data-v2] #panel.collapsed>:not(.sheet-toggle){display:none!important}
    html[data-v2] #panel.collapsed .sheet-toggle{position:relative!important;top:auto!important;margin:0!important;width:100%!important;height:44px!important;min-height:44px!important;border-radius:0!important;flex:none!important}
  }
  @media(max-width:560px){
    html[data-v2] header{padding:10px 12px!important}
    html[data-v2] .brand{width:100%;margin:0!important;gap:8px!important;line-height:1.15!important}
    html[data-v2] .brand::before{width:68px!important;height:34px!important}
    html[data-v2] .controls{width:100%;gap:6px!important;display:flex!important;flex-wrap:wrap!important}
    html[data-v2] #locate{flex:1 1 auto;min-width:150px;justify-content:center;padding-inline:8px!important}
    html[data-v2] #theme{flex:none}
    html[data-v2] #lang{flex:1 1 120px;max-width:none!important;min-width:0;padding-inline:10px!important}
    html[data-v2] #cityV2{display:block!important;order:20;flex:1 1 100%;width:100%;max-width:none!important;min-width:0}
    html[data-v2] #status{margin-top:0!important}
  }`;
  d.head.appendChild(s);

  let pendingSlug=null;
  const map=getMap(w);
  if(map&&!map.__v2CampusNavigationPatched){
    const originalFlyTo=map.flyTo.bind(map);
    map.flyTo=function(options={},eventData){
      const matched=(pendingSlug&&STARTS[pendingSlug])?{slug:pendingSlug,p:STARTS[pendingSlug]}:matchStart(options?.center);
      if(!matched)return originalFlyTo(options,eventData);
      pendingSlug=null;
      try{
        map.stop();
        return map.jumpTo({...options,center:matched.p.center,zoom:Number(matched.p.zoom)||14.3,bearing:0,pitch:0},eventData);
      }catch(err){
        console.warn('V2 campus jump failed; falling back to flyTo',matched.slug,err);
        return originalFlyTo(options,eventData);
      }
    };
    map.__v2CampusNavigationPatched=true;
  }

  function wireCitySelector(){
    const select=d.getElementById('cityV2');
    if(!select||select.dataset.campusNavWired==='1')return false;
    select.dataset.campusNavWired='1';
    select.addEventListener('change',()=>{
      const slug=select.value;
      pendingSlug=slug;
      const p=STARTS[slug];
      if(!p)return;
      setTimeout(()=>{
        if(select.value!==slug)return;
        const currentMap=getMap(w);if(!currentMap)return;
        try{currentMap.stop();currentMap.jumpTo({center:p.center,zoom:Number(p.zoom)||14.3,bearing:0,pitch:0})}catch(err){console.warn('V2 campus anchor reassert failed',slug,err)}
      },900);
    },true);
    return true;
  }
  if(!wireCitySelector()){
    const observer=new MutationObserver(()=>{if(wireCitySelector())observer.disconnect()});
    observer.observe(d.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),10000);
  }
}
function hook(){
  const frame=document.getElementById('appFrame');
  if(!frame){requestAnimationFrame(hook);return}
  frame.addEventListener('load',()=>apply(frame));
  try{if(frame.contentDocument?.readyState==='complete')apply(frame)}catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
})();