(() => {
function apply(frame){
  const d=frame.contentDocument;if(!d||d.getElementById('v2MobileParity'))return;
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
}
function hook(){
  const frame=document.getElementById('appFrame');
  if(!frame){requestAnimationFrame(hook);return}
  frame.addEventListener('load',()=>apply(frame));
  try{if(frame.contentDocument?.readyState==='complete')apply(frame)}catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
})();