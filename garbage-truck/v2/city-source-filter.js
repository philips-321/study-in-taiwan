(()=>{
  const originalInstall=window.installNationwideV2;
  if(typeof originalInstall!=='function')return;

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

  window.installNationwideV2=async function(frame){
    await originalInstall(frame);
    const d=frame.contentDocument;
    const select=d?.getElementById('cityV2');
    if(!select)return;

    await forceBaseCity(frame,select.value);

    select.addEventListener('change',()=>{
      const slug=select.value;
      if(slug!=='taipei'&&slug!=='new-taipei')return;
      // The original nationwide handler runs first. Re-apply one-source isolation
      // after its compatibility reload has finished.
      setTimeout(()=>forceBaseCity(frame,slug),450);
    });
  };
})();
