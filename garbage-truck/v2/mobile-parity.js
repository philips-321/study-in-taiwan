(() => {
function apply(frame){
  const d=frame.contentDocument;if(!d||d.getElementById('v2MobileParity'))return;
  const s=d.createElement('style');s.id='v2MobileParity';s.textContent=`
  @media(max-width:800px){
    #app{height:100dvh}
    header{position:relative}
    #content{grid-template-columns:1fr;grid-template-rows:minmax(48dvh,1fr) minmax(0,42dvh)}
    #map{min-height:0}
    #panel{position:relative;max-height:none!important;border-left:0;border-top:1px solid var(--border);border-radius:0!important;box-shadow:none!important;padding:14px 16px!important;overflow:auto}
    .sheet-toggle{display:none!important}
    #panel.collapsed{max-height:none!important;overflow:auto!important;padding-bottom:14px!important;cursor:default!important}
    #panel.collapsed>:not(.sheet-toggle){display:block!important}
    #panel.collapsed h2{font-size:18px!important;margin:0 0 4px!important}
    #panel.collapsed h2::after{display:none!important}
  }
  @media(max-width:560px){
    header{padding:10px 12px!important}
    .brand{width:100%;margin:0!important;gap:8px!important;line-height:1.15!important}
    .brand::before{width:68px!important;height:34px!important}
    .controls{width:100%;gap:6px!important}
    #locate{flex:1;min-width:0;justify-content:center;padding-inline:8px!important}
    #theme{flex:none}
    #lang{max-width:120px;min-width:0;padding-inline:10px!important}
    #status{margin-top:0!important}
    #content{grid-template-rows:minmax(50dvh,1fr) minmax(0,40dvh)}
    #panel{padding:12px!important}
  }`;
  d.head.appendChild(s);
  const panel=d.getElementById('panel');if(panel)panel.classList.remove('collapsed');
}
function hook(){
  const frame=document.getElementById('appFrame');
  if(!frame){requestAnimationFrame(hook);return}
  frame.addEventListener('load',()=>apply(frame));
  try{if(frame.contentDocument?.readyState==='complete')apply(frame)}catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
})();
