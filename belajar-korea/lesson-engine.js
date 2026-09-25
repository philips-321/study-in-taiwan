const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let lesson=null, voices=[];
function lessonPath(){const q=new URLSearchParams(location.search).get('lesson');return q&&/^[a-z0-9/_-]+\.json$/i.test(q)?q:'level-0/001-vokal-dasar.json'}
function getRate(){return parseFloat($('#speechRate')?.value||'1')}
function selectedVoice(){const val=$('#voiceSelect')?.value;return voices.find(v=>v.voiceURI===val)||null}
function populateVoices(){
 if(!('speechSynthesis'in window))return;
 voices=speechSynthesis.getVoices().filter(v=>/^ko/i.test(v.lang));
 const sel=$('#voiceSelect');if(!sel)return;
 const saved=localStorage.getItem('levelingKoVoice')||'';
 sel.innerHTML='<option value="">Auto (browser/device)</option>';
 voices.sort((a,b)=>(/^ko-KR/i.test(a.lang)?0:1)-(/^ko-KR/i.test(b.lang)?0:1)||a.name.localeCompare(b.name)).forEach(v=>{
  const o=document.createElement('option');o.value=v.voiceURI;o.textContent=v.name+' — '+v.lang+(v.localService?' (device)':'');sel.appendChild(o);
 });
 if(saved&&[...sel.options].some(o=>o.value===saved))sel.value=saved;
 const st=$('#voiceStatus');if(st)st.textContent=voices.length?voices.length+' voice Korea tersedia di browser/device ini.':'Voice Korea tidak terdaftar; Auto akan memakai fallback browser/device.';
}
function speak(txt){
 if(!('speechSynthesis'in window))return;
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(txt);u.lang='ko-KR';u.rate=getRate();const v=selectedVoice();if(v)u.voice=v;speechSynthesis.speak(u);
}
function audioPanel(){
 return '<div class="audio-panel"><label>Suara <select id="voiceSelect"><option>Memuat…</option></select></label><label>Kecepatan <select id="speechRate"><option value=".75">0.75x</option><option value=".9">0.9x</option><option value="1" selected>1.0x</option></select></label><button id="testVoice">▶ Tes suara</button><button id="stopVoice">■ Stop</button><span class="status" id="voiceStatus"></span></div>';
}
function render(){
 document.title=lesson.title+' | Leveling';
 const done=localStorage.getItem('levelingDone:'+lesson.id)==='1';
 const units=lesson.units.map(u=>'<article class="unit"><div class="char">'+esc(u.char)+'</div><div class="roman">'+esc(u.roman)+'</div><p class="hint">'+esc(u.hint)+'</p><button class="say" data-say="'+esc(u.speak||u.example?.ko||u.char)+'">▶ Dengarkan</button>'+(u.example?'<div class="example"><b>'+esc(u.example.ko)+'</b><small>'+esc(u.example.roman)+' · '+esc(u.example.id)+'</small></div>':'')+'</article>').join('');
 const quizzes=lesson.quiz.map((q,i)=>'<div class="quiz-card" data-q="'+i+'"><div class="quiz-q">'+(i+1)+'. '+esc(q.question)+'</div><div class="options">'+q.options.map((o,j)=>'<button class="option" data-i="'+j+'">'+esc(o)+'</button>').join('')+'</div><div class="feedback"></div></div>').join('');
 $('#app').innerHTML='<section class="lesson-head"><div class="kicker">'+esc(lesson.level)+' · Pelajaran '+esc(lesson.order)+'</div><h1>'+esc(lesson.title)+'</h1><p>'+esc(lesson.subtitle)+'</p>'+audioPanel()+'<div class="objective">'+lesson.objectives.map(x=>'<span class="chip">'+esc(x)+'</span>').join('')+'</div></section>'+
 '<section class="block"><h2>Kenali bentuk dan bunyinya</h2><p>'+esc(lesson.intro)+'</p><div class="tip">'+esc(lesson.tip)+'</div><div class="units">'+units+'</div></section>'+
 '<section class="block"><h2>Cek pemahaman</h2><p>Pilih jawaban. Kamu bisa mencoba lagi kalau salah.</p>'+quizzes+'</section>'+
 '<section class="block finish"><div><h2>Selesai pelajaran ini?</h2><div id="doneLabel" class="'+(done?'done':'')+'">'+(done?'✓ Sudah ditandai selesai':'Tandai selesai agar progress tersimpan di browser ini.')+'</div></div><button id="finishBtn">'+(done?'Batalkan selesai':'✓ Tandai selesai')+'</button></section>'+
 '<section class="block lesson-nav"><div>'+(lesson.prev?'<a class="navlesson prev" href="lesson.html?lesson='+esc(lesson.prev.path)+'">← '+esc(lesson.prev.title)+'</a>':'<span></span>')+'</div><div>'+(lesson.next?'<a class="navlesson next" href="lesson.html?lesson='+esc(lesson.next.path)+'">'+esc(lesson.next.title)+' →</a>':'<a class="navlesson next" href="/belajar-korea/">Kembali ke kurikulum →</a>')+'</div></section>';
 bind();populateVoices();updateProgress(done?100:lesson.progressStart||10);
}
function bind(){
 $('#testVoice').onclick=()=>speak('안녕하세요. 같이 한국어를 공부해요.');
 $('#stopVoice').onclick=()=>speechSynthesis.cancel();
 $('#voiceSelect').onchange=e=>localStorage.setItem('levelingKoVoice',e.target.value);
 const savedRate=localStorage.getItem('levelingKoRate');if(savedRate)$('#speechRate').value=savedRate;
 $('#speechRate').onchange=e=>localStorage.setItem('levelingKoRate',e.target.value);
 document.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(b.dataset.say));
 document.querySelectorAll('.quiz-card').forEach(card=>card.querySelectorAll('.option').forEach(btn=>btn.onclick=()=>answer(card,Number(btn.dataset.i))));
 $('#finishBtn').onclick=toggleDone;
}
function answer(card,i){
 const q=lesson.quiz[Number(card.dataset.q)],opts=[...card.querySelectorAll('.option')],fb=card.querySelector('.feedback');
 opts.forEach(x=>x.classList.remove('correct','wrong'));opts[i].classList.add(i===q.answer?'correct':'wrong');if(i!==q.answer)opts[q.answer].classList.add('correct');
 fb.textContent=i===q.answer?'Benar. '+(q.explain||''):'Belum tepat. '+(q.explain||'Coba perhatikan lagi bentuk hurufnya.');
 const answered=document.querySelectorAll('.quiz-card .correct').length;updateProgress(Math.min(90,(lesson.progressStart||10)+answered*20));
}
function toggleDone(){
 const key='levelingDone:'+lesson.id,now=localStorage.getItem(key)==='1';localStorage.setItem(key,now?'0':'1');
 $('#doneLabel').textContent=now?'Tandai selesai agar progress tersimpan di browser ini.':'✓ Sudah ditandai selesai';$('#doneLabel').className=now?'':'done';$('#finishBtn').textContent=now?'✓ Tandai selesai':'Batalkan selesai';updateProgress(now?75:100);
}
function updateProgress(n){$('#progressBar').style.width=n+'%'}
async function init(){
 try{const r=await fetch(lessonPath(),{cache:'no-cache'});if(!r.ok)throw new Error('HTTP '+r.status);lesson=await r.json();render();if('speechSynthesis'in window)speechSynthesis.onvoiceschanged=populateVoices}
 catch(e){$('#app').innerHTML='<div class="error"><b>Pelajaran tidak dapat dimuat.</b><br>'+esc(e.message)+'</div>'}
}
init();