(() => {
  const STARTS=window.V2_CITY_START_POINTS?.points||{};
  const originalInstall=window.installNationwideV2;
  if(typeof originalInstall!=='function')return;

  function centerArray(value){
    if(Array.isArray(value)&&value.length>=2)return [Number(value[0]),Number(value[1])];
    if(value&&Number.isFinite(Number(value.lng))&&Number.isFinite(Number(value.lat)))return [Number(value.lng),Number(value.lat)];
    return null;
  }

  function matchCityTarget(center){
    const c=centerArray(center);if(!c)return null;
    for(const [slug,p] of Object.entries(STARTS)){
      const cc=centerArray(p.city_center);if(!cc)continue;
      if(Math.abs(c[0]-cc[0])<0.0005&&Math.abs(c[1]-cc[1])<0.0005)return {slug,p};
    }
    return null;
  }

  function frameMap(frame){
    const w=frame?.contentWindow;if(!w)return null;
    if(w.__v2MapBridge)return w.__v2MapBridge;
    try{
      const map=w.eval('map');
      if(map){
        w.__v2MapBridge=map;
        return map;
      }
    }catch(err){console.error('V2 city navigation could not access map',err)}
    return null;
  }

  function installMapNavigation(frame){
    const map=frameMap(frame);if(!map||map.__v2CityNavigationInstalled)return !!map;
    const originalFlyTo=map.flyTo.bind(map);
    map.flyTo=function(options={},eventData){
      const match=matchCityTarget(options?.center);
      if(!match)return originalFlyTo(options,eventData);
      const zoom=Number(match.p.zoom)||14.3;
      try{
        map.stop();
        return map.jumpTo({...options,center:match.p.center,zoom,bearing:0,pitch:0},eventData);
      }catch(err){
        console.error('V2 city jump failed',match.slug,err);
        return originalFlyTo(options,eventData);
      }
    };
    map.__v2CityNavigationInstalled=true;
    return true;
  }

  window.installNationwideV2=async function(frame){
    installMapNavigation(frame);
    return originalInstall(frame);
  };
})();