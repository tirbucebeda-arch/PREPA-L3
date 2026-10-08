(() => {
'use strict';
const DATA=window.QUIZ_DATA.questions;
const $=id=>document.getElementById(id);
const CS=window.CompositionSettings;
let session=[],idx=0,responses=[],selected=null,locked=false,timerId=null,timeLeft=0,totalTimerId=null,totalLeft=0,lastConfig=null,allSubmitted=false,exitSubmitted=false;

const themes=[...new Set(DATA.map(q=>q.theme))].sort((a,b)=>a.localeCompare(b,'fr'));
themes.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;$('theme').appendChild(o)});
function pool(){return DATA.filter(q=>($('format').value==='ALL'||q.format===$('format').value)&&($('theme').value==='ALL'||q.theme===$('theme').value)&&($('origin').value==='all'||q.answerOrigin==='pdf'))}
function updatePool(){$('poolInfo').textContent=`${pool().length} question(s) disponible(s).`;}
['format','theme','origin'].forEach(id=>$(id).addEventListener('change',updatePool));updatePool();
function clearTimers(){clearInterval(timerId);clearInterval(totalTimerId);timerId=null;totalTimerId=null}
function visible(id){return !$(id).classList.contains('hidden')}
function getConfig(){return {format:$('format').value,theme:$('theme').value,count:$('count').value,mode:$('mode').value,time:+$('time').value,origin:$('origin').value,display:$('display').value}}
function prepareQuestion(q,shuffleOptions){return shuffleOptions&&CS?CS.shufflePedQuestion(q):({...q,options:[...q.options]})}
function start(config){if(CS)CS.requestStart(()=>beginStart(config));else beginStart(config)}
function beginStart(config){
  const settings=CS?CS.get():{shuffleQuestions:true,shuffleOptions:false};
  lastConfig=config||getConfig();
  let p=DATA.filter(q=>(lastConfig.format==='ALL'||q.format===lastConfig.format)&&(lastConfig.theme==='ALL'||q.theme===lastConfig.theme)&&(lastConfig.origin==='all'||q.answerOrigin==='pdf'));
  p=settings.shuffleQuestions?CS.shuffleArray(p):[...p];
  const n=lastConfig.count==='ALL'?p.length:Math.min(+lastConfig.count,p.length);
  session=p.slice(0,n).map(q=>prepareQuestion(q,settings.shuffleOptions));
  responses=Array(session.length).fill(null);idx=0;selected=null;locked=false;allSubmitted=false;exitSubmitted=false;clearTimers();
  $('setup').classList.add('hidden');$('result').classList.add('hidden');$('quiz').classList.add('hidden');$('allQuiz').classList.add('hidden');
  if(lastConfig.display==='all'){ $('allQuiz').classList.remove('hidden');renderAll();startTotalTimer(); }
  else { $('quiz').classList.remove('hidden');render(); }
}
$('start').onclick=()=>start();
function render(){
  clearInterval(timerId);const q=session[idx];selected=responses[idx]?.selected||null;locked=!!responses[idx]?.validated;
  $('quizTitle').textContent=lastConfig.mode==='training'?'Mode entraînement':'Mode examen';$('progressText').textContent=`Question ${idx+1} sur ${session.length}`;$('progressBar').style.width=`${(idx+1)/session.length*100}%`;
  $('formatBadge').textContent=q.format==='QCD'?'Vrai / Faux':'QCM';$('numberBadge').textContent=`N° ${q.number}`;$('themeBadge').textContent=q.theme;$('originBadge').classList.toggle('hidden',q.answerOrigin==='pdf');$('questionText').textContent=q.prompt;
  const visual=$('questionVisual'),img=$('questionVisualImg');if(q.image){img.src=q.image;visual.classList.remove('hidden')}else{img.removeAttribute('src');visual.classList.add('hidden')}
  renderAnswers(q);$('feedback').className='feedback hidden';$('feedback').textContent='';$('validate').classList.toggle('hidden',locked);$('next').classList.toggle('hidden',!locked);$('previous').disabled=idx===0||lastConfig.mode==='exam';
  if(locked&&lastConfig.mode==='training')showCorrection(q,responses[idx]);startTimer();
}
function renderAnswers(q){$('answers').innerHTML='';q.options.forEach((t,i)=>{const l=String.fromCharCode(65+i),b=document.createElement('button');b.type='button';b.className='answer-btn'+(selected===l?' selected':'');b.dataset.l=l;b.innerHTML=`<span class="option-letter">${l}</span><span>${PedApp.esc(t)}</span>`;b.onclick=()=>choose(l);$('answers').appendChild(b)})}
function choose(l){if(locked)return;selected=l;document.querySelectorAll('#answers .answer-btn').forEach(b=>b.classList.toggle('selected',b.dataset.l===l));responses[idx]={selected:l,validated:false};}
function validate(timed=false){const q=session[idx];if(!selected&&!timed){PedApp.toast('Choisis une réponse.');return}clearInterval(timerId);responses[idx]={selected:selected||null,validated:true,timed};locked=true;if(lastConfig.mode==='training'){showCorrection(q,responses[idx]);$('validate').classList.add('hidden');$('next').classList.remove('hidden')}else goNext()}
$('validate').onclick=()=>validate(false);$('next').onclick=goNext;$('previous').onclick=()=>{if(idx>0){idx--;render()}};
function answerText(q,letter){if(!letter)return 'aucune';const i=letter.charCodeAt(0)-65;return q.options[i]??letter}
function showCorrection(q,r){document.querySelectorAll('#answers .answer-btn').forEach(b=>{b.disabled=true;if(b.dataset.l===q.answer)b.classList.add('correct');if(r.selected===b.dataset.l&&r.selected!==q.answer)b.classList.add('wrong')});const ok=r.selected===q.answer,txt=answerText(q,q.answer);$('feedback').className='feedback '+(ok?'ok':'bad');$('feedback').innerHTML=ok?`Bonne réponse : <strong>${q.answer} — ${PedApp.esc(txt)}</strong>.`:`Réponse correcte : <strong>${q.answer} — ${PedApp.esc(txt)}</strong>${r.timed?' — temps écoulé':''}.`;}
function goNext(){if(idx<session.length-1){idx++;render()}else finish()}
function startTimer(){const limit=lastConfig.time;if(!limit){$('timer').textContent='∞';return}timeLeft=limit;drawTime();timerId=setInterval(()=>{timeLeft--;drawTime();if(timeLeft<=0){clearInterval(timerId);if(lastConfig.mode==='training')validate(true);else{responses[idx]={selected:selected||null,validated:true,timed:true};goNext()}}},1000)}
function drawTime(){$('timer').textContent=`00:${String(Math.max(0,timeLeft)).padStart(2,'0')}`;$('timer').style.color=timeLeft<=5?'var(--red)':'var(--blue)'}

function renderAll(){
  $('allQuizTitle').textContent=lastConfig.mode==='training'?'Mode entraînement — toutes les questions':'Mode examen — toutes les questions';$('allProgressText').textContent=`${session.length} questions affichées`;$('allProgressBar').style.width='0%';$('allList').innerHTML='';$('allValidate').textContent='Valider toutes les réponses';
  session.forEach((q,i)=>{const card=document.createElement('article');card.className='ped-all-card';card.id=`ped-all-${i}`;card.innerHTML=`<div class="question-meta"><span class="badge">${q.format==='QCD'?'Vrai / Faux':'QCM'}</span><span class="badge">N° ${q.number}</span><span class="badge">${PedApp.esc(q.theme)}</span>${q.answerOrigin==='pdf'?'':'<span class="badge amber">Correction reconstituée</span>'}</div><div class="ped-all-question-title"><span class="ped-all-number">${i+1}</span><div class="question-text">${PedApp.esc(q.prompt)}</div></div><div class="answers"></div><div class="feedback hidden"></div>`;
    const answers=card.querySelector('.answers');q.options.forEach((text,oi)=>{const l=String.fromCharCode(65+oi),b=document.createElement('button');b.type='button';b.className='answer-btn';b.dataset.l=l;b.innerHTML=`<span class="option-letter">${l}</span><span>${PedApp.esc(text)}</span>`;b.onclick=()=>{answers.querySelectorAll('.answer-btn').forEach(x=>x.classList.toggle('selected',x===b));responses[i]={selected:l,validated:false};updateAllAnswered()};answers.appendChild(b)});$('allList').appendChild(card)});updateAllAnswered();
}
function updateAllAnswered(){const answered=responses.filter(r=>r&&r.selected).length;$('allAnswered').textContent=`${answered} question${answered>1?'s':''} répondue${answered>1?'s':''} sur ${session.length}`;$('allProgressBar').style.width=session.length?`${answered/session.length*100}%`:'0%';document.querySelectorAll('.ped-all-card').forEach((c,i)=>{c.classList.toggle('answered',!!responses[i]?.selected);c.classList.remove('unanswered')})}
function collectAll(timed=false){responses=session.map((q,i)=>{const r=responses[i]||{};return {selected:r.selected||null,validated:true,timed}})}
function paintAllCorrections(){session.forEach((q,i)=>{const card=$(`ped-all-${i}`),r=responses[i];card.querySelectorAll('.answer-btn').forEach(b=>{b.disabled=true;if(b.dataset.l===q.answer)b.classList.add('correct');if(r.selected===b.dataset.l&&r.selected!==q.answer)b.classList.add('wrong')});const fb=card.querySelector('.feedback'),ok=r.selected===q.answer;fb.className='feedback '+(ok?'ok':'bad');fb.innerHTML=ok?`Bonne réponse : <strong>${q.answer} — ${PedApp.esc(answerText(q,q.answer))}</strong>.`:`Réponse correcte : <strong>${q.answer} — ${PedApp.esc(answerText(q,q.answer))}</strong>${r.timed?' — temps écoulé':''}.`;card.classList.toggle('unanswered',!r.selected)})}
function submitAll(timed=false){if(allSubmitted){finish();return}const unanswered=session.length-responses.filter(r=>r&&r.selected).length;if(!timed&&unanswered&&!confirm(`${unanswered} question${unanswered>1?'s sont':' est'} sans réponse. Valider quand même ?`))return;clearInterval(totalTimerId);collectAll(timed);allSubmitted=true;if(lastConfig.mode==='training'){paintAllCorrections();$('allValidate').textContent='Voir le résultat';$('allProgressBar').style.width='100%';$('allTimer').textContent='Terminé';window.scrollTo({top:0,behavior:'smooth'})}else finish()}
function startTotalTimer(){const limit=lastConfig.time;if(!limit){$('allTimer').textContent='∞';return}totalLeft=limit*session.length;drawTotal();totalTimerId=setInterval(()=>{totalLeft--;drawTotal();if(totalLeft<=0){clearInterval(totalTimerId);submitAll(true)}},1000)}
function drawTotal(){const m=Math.floor(Math.max(0,totalLeft)/60),s=Math.max(0,totalLeft)%60;$('allTimer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;$('allTimer').style.color=totalLeft<=10?'var(--red)':'var(--blue)'}
$('allValidate').onclick=()=>submitAll(false);$('allTop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});

function finish(){
  clearTimers();responses=responses.map(r=>r||{selected:null,validated:true});const score=responses.reduce((s,r,i)=>s+(r.selected===session[i].answer),0),pct=session.length?Math.round(score/session.length*100):0;
  $('quiz').classList.add('hidden');$('allQuiz').classList.add('hidden');$('result').classList.remove('hidden');$('resultPercent').textContent=pct+'%';$('resultTitle').textContent=pct>=80?'Très bon résultat':pct>=60?'Bon travail':'Révision à poursuivre';$('resultText').textContent=`${score} bonne(s) réponse(s) sur ${session.length}.`;
  const wrong=session.map((q,i)=>({q,r:responses[i]})).filter(x=>x.r.selected!==x.q.answer);$('review').innerHTML=wrong.length?'':'<p class="muted">Aucune erreur. Bravo !</p>';wrong.slice(0,50).forEach(({q,r})=>{const d=document.createElement('div');d.className='review-item';d.innerHTML=`<strong>${q.format==='QCD'?'Vrai/Faux':'QCM'} n°${q.number}</strong><div style="margin:6px 0">${PedApp.esc(q.prompt)}</div><span class="muted">Votre réponse : ${PedApp.esc(answerText(q,r.selected))} · Réponse correcte : <strong>${q.answer} — ${PedApp.esc(answerText(q,q.answer))}</strong></span>`;$('review').appendChild(d)});saveHistory(pct,score);
}
function saveHistory(pct,score){const h=historyData();h.unshift({date:new Date().toISOString(),pct,score,total:session.length,format:lastConfig.format,theme:lastConfig.theme,display:lastConfig.display});localStorage.setItem('pedQuizHistory',JSON.stringify(h.slice(0,50)));renderHistory()}
function historyData(){try{return JSON.parse(localStorage.getItem('pedQuizHistory')||'[]')}catch{return[]}}
function renderHistory(){const h=historyData();$('attempts').textContent=h.length;$('average').textContent=(h.length?Math.round(h.reduce((s,x)=>s+x.pct,0)/h.length):0)+'%';$('best').textContent=(h.length?Math.max(...h.map(x=>x.pct)):0)+'%';$('historyBody').innerHTML='';h.slice(0,10).forEach(x=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${PedApp.fmtDate(x.date)}</td><td>${x.format}</td><td>${x.theme==='ALL'?'Tous':PedApp.esc(x.theme)}</td><td><strong>${x.pct}%</strong></td>`;$('historyBody').appendChild(tr)})}renderHistory();
function autoSubmit(reason='sortie de la page'){if(exitSubmitted||!session.length||(!visible('quiz')&&!visible('allQuiz')))return;exitSubmitted=true;if(visible('allQuiz'))collectAll(true);else{if(selected)responses[idx]={selected,validated:true,timed:false};responses=responses.map(r=>r||{selected:null,validated:true,timed:true})}PedApp.toast(`Composition validée automatiquement : ${reason}.`);finish()}
window.PedQuizAutoSubmit=autoSubmit;
$('clearHistory').onclick=()=>{if(confirm('Effacer tout l’historique ?')){localStorage.removeItem('pedQuizHistory');renderHistory()}};
$('quit').onclick=$('allQuit').onclick=()=>{if(confirm('Quitter ce quiz ?')){clearTimers();$('quiz').classList.add('hidden');$('allQuiz').classList.add('hidden');$('setup').classList.remove('hidden');session=[]}};
$('home').onclick=()=>{$('result').classList.add('hidden');$('setup').classList.remove('hidden');session=[]};$('retry').onclick=()=>start(lastConfig);
})();
