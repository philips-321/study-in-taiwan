const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let lesson=null,voices=[],quizAnswers=[];
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

let repeatTimer=null;
function repeatPrompt(){
 const st=$('#repeatStatus');if(!st)return;
 clearTimeout(repeatTimer);
 st.textContent='Ulangi, baca dengan keras.';
 st.classList.add('show');
 repeatTimer=setTimeout(()=>{st.textContent='';st.classList.remove('show')},2000);
}
function speak(txt,promptAfter=true){
 if(!('speechSynthesis'in window))return;
 speechSynthesis.cancel();
 clearTimeout(repeatTimer);
 const st=$('#repeatStatus');if(st){st.textContent='';st.classList.remove('show')};
 const u=new SpeechSynthesisUtterance(txt);u.lang='ko-KR';u.rate=getRate();const v=selectedVoice();if(v)u.voice=v;
 u.onend=()=>{if(promptAfter)repeatPrompt();else if(st)st.textContent='';};
 speechSynthesis.speak(u);
}
function audioPanel(){
 return '<div class="audio-panel"><label>Suara <select id="voiceSelect"><option>Memuat…</option></select></label><label>Kecepatan <select id="speechRate"><option value=".75">0.75x</option><option value=".9">0.9x</option><option value="1" selected>1.0x</option></select></label><button id="testVoice">▶ Tes suara</button><button id="stopVoice">■ Stop</button><span class="status" id="voiceStatus"></span><span class="repeat-status" id="repeatStatus"></span></div>';
}
function getWhy(){return localStorage.getItem('levelingWhy')||''}
function getChallenge(){return Number(localStorage.getItem('levelingChallengeTarget')||80)}
function reviewQueue(){try{return JSON.parse(localStorage.getItem('levelingReviewQueue')||'[]')}catch{return []}}
function saveReviewQueue(q){localStorage.setItem('levelingReviewQueue',JSON.stringify(q))}
function addWrongToReview(qi){const q=lesson.quiz[qi],queue=reviewQueue(),id=lesson.id+':'+qi;if(!queue.some(x=>x.id===id))queue.push({id,lessonId:lesson.id,lessonTitle:lesson.title,question:q.question,addedAt:Date.now(),path:lessonPath()});saveReviewQueue(queue)}
function clearCorrectFromReview(qi){const id=lesson.id+':'+qi;saveReviewQueue(reviewQueue().filter(x=>x.id!==id))}
function renderDetail(){
 if(!lesson.detailSections?.length)return '';
 return '<section class="block"><h2>Penjelasan lengkap</h2>'+lesson.detailSections.map(s=>'<div class="detail-section"><h3>'+esc(s.title)+'</h3>'+(s.paragraphs||[]).map(p=>'<p>'+esc(p)+'</p>').join('')+'</div>').join('')+'</section>';
}
function renderTransforms(){
 if(!lesson.transformations?.length)return '';
 return '<section class="block"><h2>Tulisan → proses → bunyi</h2><p class="orthography-note"><b>Penting:</b> tulisan baku tidak diganti. Bentuk dalam tanda [ ] di bawah hanya menunjukkan cara pengucapan.</p><div class="transform-list">'+lesson.transformations.map(t=>'<article class="transform-card"><div class="transform-main"><span class="label">Tulisan</span><b>'+esc(t.written)+'</b><span class="arrow">→</span><span class="label">Bunyi</span><b class="pron">'+esc(t.pronounced)+'</b></div><div class="process">'+(t.steps||[]).map((x,i)=>'<div><span>'+(i+1)+'</span>'+esc(x)+'</div>').join('')+'</div>'+(t.note?'<p class="transform-note">'+esc(t.note)+'</p>':'')+'<button class="say" data-say="'+esc(t.speak||t.written)+'">▶ Dengarkan</button></article>').join('')+'</div></section>';
}
function renderSentences(){
 if(!lesson.sentences?.length)return '';
 return '<section class="block"><h2>Contoh kalimat</h2><p>Putar kalimatnya, dengarkan sampai selesai, lalu ulangi dengan suara keras.</p><div class="sentence-list">'+lesson.sentences.map(s=>'<article class="sentence-example"><div class="sentence-ko">'+esc(s.ko)+'</div>'+(s.pronunciation?'<div class="sentence-pron">Bunyi: '+esc(s.pronunciation)+'</div>':'')+(s.roman?'<div class="sentence-roman">'+esc(s.roman)+'</div>':'')+'<div class="sentence-id">'+esc(s.id)+'</div>'+(s.note?'<div class="sentence-note">'+esc(s.note)+'</div>':'')+'<button class="say sentence-play" data-say="'+esc(s.speak||s.ko)+'">▶ Putar kalimat</button></article>').join('')+'</div></section>';
}
function render(){
 document.title=lesson.title+' | Leveling';
 const done=localStorage.getItem('levelingDone:'+lesson.id)==='1';
 const units=(lesson.units||[]).map(u=>'<article class="unit"><div class="char">'+esc(u.char)+'</div><div class="roman">'+esc(u.roman)+'</div><p class="hint">'+esc(u.hint)+'</p><button class="say" data-say="'+esc(u.speak||u.char)+'">▶ Dengarkan kata</button>'+(u.example?'<div class="example"><b>'+esc(u.example.ko)+'</b><small>'+esc(u.example.roman)+' · '+esc(u.example.id)+'</small><button class="say mini-play" data-say="'+esc(u.example.ko)+'">▶ Putar contoh</button></div>':'')+'</article>').join('');
 const quizzes=(lesson.quiz||[]).map((q,i)=>'<div class="quiz-card" data-q="'+i+'"><div class="quiz-q">'+(i+1)+'. '+esc(q.question)+'</div><div class="options">'+q.options.map((o,j)=>'<button class="option" data-i="'+j+'">'+esc(o)+'</button>').join('')+'</div><div class="feedback"></div></div>').join('');
 const why=getWhy(),challenge=getChallenge();
 $('#app').innerHTML='<section class="lesson-head"><div class="kicker">'+esc(lesson.level)+' · Pelajaran '+esc(lesson.order)+'</div><h1>'+esc(lesson.title)+'</h1><p>'+esc(lesson.subtitle)+'</p>'+audioPanel()+'<div class="objective">'+(lesson.objectives||[]).map(x=>'<span class="chip">'+esc(x)+'</span>').join('')+'</div></section>'+
 '<section class="block study-reminder">'+(why?'<div><b>Kenapa kamu belajar:</b> '+esc(why)+'</div>':'')+'<div><b>Target skor pribadi:</b> '+challenge+'%</div><div><a href="progress.html">Lihat progress & review →</a></div></section>'+
 '<section class="block"><h2>Konsep inti</h2><p>'+esc(lesson.intro)+'</p><div class="tip">'+esc(lesson.tip)+'</div>'+(units?'<div class="units">'+units+'</div>':'')+'</section>'+
 renderDetail()+renderTransforms()+renderSentences()+
 '<section class="block"><div class="quiz-head"><div><h2>Latihan skor</h2><p>Jawab semua soal. Jawaban pertama dihitung sebagai nilai.</p></div><div class="scorebox"><b id="scoreText">0 / '+lesson.quiz.length+'</b><span id="scorePct">0%</span></div></div><div class="quiz-meter"><span id="quizMeter"></span></div>'+quizzes+'<div id="quizResult" class="quiz-result">Belum semua soal dijawab.</div><button id="retryQuiz" class="retry-quiz" type="button">↻ Ulangi kuis</button></section>'+
 '<section class="block finish"><div><h2>Selesai pelajaran ini?</h2><div id="doneLabel" class="'+(done?'done':'')+'">'+(done?'✓ Sudah ditandai selesai':'Tandai selesai agar progress tersimpan di browser ini.')+'</div></div><button id="finishBtn">'+(done?'Batalkan selesai':'✓ Tandai selesai')+'</button></section>'+
 '<section class="block lesson-nav"><div>'+(lesson.prev?'<a class="navlesson prev" href="lesson.html?lesson='+esc(lesson.prev.path)+'">← '+esc(lesson.prev.title)+'</a>':'<span></span>')+'</div><div>'+(lesson.next?'<a class="navlesson next" href="lesson.html?lesson='+esc(lesson.next.path)+'">'+esc(lesson.next.title)+' →</a>':'<a class="navlesson next" href="/belajar-korea/">Kembali ke kurikulum →</a>')+'</div></section>';
 bind();populateVoices();updateProgress(done?100:lesson.progressStart||10);
}
function bind(){
 $('#testVoice').onclick=()=>speak('안녕하세요. 같이 한국어를 공부해요.',false);
 $('#stopVoice').onclick=()=>{speechSynthesis.cancel();clearTimeout(repeatTimer);const st=$('#repeatStatus');if(st){st.textContent='';st.classList.remove('show')}};
 $('#voiceSelect').onchange=e=>localStorage.setItem('levelingKoVoice',e.target.value);
 const savedRate=localStorage.getItem('levelingKoRate');if(savedRate)$('#speechRate').value=savedRate;
 $('#speechRate').onchange=e=>localStorage.setItem('levelingKoRate',e.target.value);
 document.querySelectorAll('[data-say]').forEach(b=>b.onclick=e=>{e.stopPropagation();speak(b.dataset.say,true)});
 quizAnswers=Array(lesson.quiz.length).fill(null);
 document.querySelectorAll('.quiz-card').forEach(card=>card.querySelectorAll('.option').forEach(btn=>btn.onclick=()=>answer(card,Number(btn.dataset.i))));
 $('#retryQuiz').onclick=resetQuiz;$('#finishBtn').onclick=toggleDone;updateScore();
}
function answer(card,i){
 const qi=Number(card.dataset.q);if(quizAnswers[qi]!==null)return;
 const q=lesson.quiz[qi],opts=[...card.querySelectorAll('.option')],fb=card.querySelector('.feedback');quizAnswers[qi]=i;opts.forEach(x=>x.disabled=true);
 opts[i].classList.add(i===q.answer?'correct':'wrong');if(i!==q.answer){opts[q.answer].classList.add('correct');addWrongToReview(qi)}else clearCorrectFromReview(qi);
 fb.textContent=i===q.answer?'✓ Benar. '+(q.explain||''):'✗ Belum tepat. '+(q.explain||'Perhatikan lagi materinya.');updateScore();
}
function updateScore(){
 if(!lesson?.quiz)return;const answered=quizAnswers.filter(x=>x!==null).length,correct=quizAnswers.reduce((n,a,i)=>n+(a===lesson.quiz[i].answer?1:0),0),total=lesson.quiz.length,pct=total?Math.round(correct/total*100):0;
 if($('#scoreText'))$('#scoreText').textContent=correct+' / '+total;if($('#scorePct'))$('#scorePct').textContent=pct+'%';if($('#quizMeter'))$('#quizMeter').style.width=(answered/total*100)+'%';
 const res=$('#quizResult');if(res){if(answered<total)res.textContent='Sudah dijawab '+answered+' dari '+total+' soal.';else{const pass=Math.max(lesson.passScore||80,getChallenge()),key='levelingBest:'+lesson.id,best=Math.max(Number(localStorage.getItem(key)||0),pct);localStorage.setItem(key,String(best));res.className='quiz-result '+(pct>=pass?'pass':'fail');res.textContent=(pct>=pass?'✓ Lulus':'Belum lulus')+' — nilai '+pct+'%. Nilai terbaik: '+best+'%. Target lulus: '+pass+'%.';updateProgress(pct>=pass?95:75);}}
}
function resetQuiz(){quizAnswers=Array(lesson.quiz.length).fill(null);document.querySelectorAll('.quiz-card').forEach(card=>{card.querySelectorAll('.option').forEach(x=>{x.disabled=false;x.classList.remove('correct','wrong')});card.querySelector('.feedback').textContent='';});updateScore()}
function toggleDone(){const key='levelingDone:'+lesson.id,now=localStorage.getItem(key)==='1';localStorage.setItem(key,now?'0':'1');$('#doneLabel').textContent=now?'Tandai selesai agar progress tersimpan di browser ini.':'✓ Sudah ditandai selesai';$('#doneLabel').className=now?'':'done';$('#finishBtn').textContent=now?'✓ Tandai selesai':'Batalkan selesai';updateProgress(now?75:100)}
function updateProgress(n){$('#progressBar').style.width=n+'%'}
async function init(){try{const r=await fetch(lessonPath(),{cache:'no-cache'});if(!r.ok)throw new Error('HTTP '+r.status);lesson=await r.json();render();if('speechSynthesis'in window)speechSynthesis.onvoiceschanged=populateVoices}catch(e){$('#app').innerHTML='<div class="error"><b>Pelajaran tidak dapat dimuat.</b><br>'+esc(e.message)+'</div>'}}
init();