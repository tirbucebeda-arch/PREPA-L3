(() => {
'use strict';
const $=id=>document.getElementById(id), CS=window.CompositionSettings, esc=window.PedApp.esc;
const DATA=(window.CHIRURGIE_QUIZ_DATA||[]).flatMap(series=>series.questions.map((q,i)=>({...q,theme:series.title,number:i+1,format:q.options.length===2&&q.options.every(o=>/^(vrai|faux)$/i.test(o.trim()))?'QCD':'QCM'})));
let session=[],responses=[],idx=0,config=null,timer=null,left=0,submitted=false,active=false;
const historyKey='chirQuizHistory:'+String(window.PEDIATRIE_HUB_SESSION?.code||'APPAREIL');
[...new Set(DATA.map(q=>q.theme))].forEach(theme=>{const option=document.createElement('option');option.value=theme;option.textContent=theme;$('theme').appendChild(option)});
function pool(){return DATA.filter(q=>($('theme').value==='ALL'||q.theme===$('theme').value)&&($('format').value==='ALL'||q.format===$('format').value))}
function updatePool(){$('poolInfo').textContent=pool().length+' question(s) disponible(s).';$('start').disabled=!pool().length}
['theme','format'].forEach(id=>$(id).addEventListener('change',updatePool));updatePool();
function clearTimer(){clearInterval(timer);timer=null}
function prepare(q,settings){
 const pairs=q.options.map((text,i)=>({text,correct:q.answer.includes(i)}));
 const options=settings.shuffleOptions?CS.shuffleArray(pairs):pairs;
 return {...q,options:options.map(o=>o.text),answer:options.flatMap((o,i)=>o.correct?[i]:[])};
}
function start(previous){CS.requestStart(()=>{
 const settings=CS.get();config=previous||{theme:$('theme').value,format:$('format').value,count:$('count').value,mode:$('mode').value,display:$('display').value,time:Number($('time').value)};
 let questions=DATA.filter(q=>(config.theme==='ALL'||q.theme===config.theme)&&(config.format==='ALL'||q.format===config.format));
 if(settings.shuffleQuestions)questions=CS.shuffleArray(questions);
 if(config.count!=='ALL')questions=questions.slice(0,Number(config.count));
 if(!questions.length){PedApp.toast('Aucune question dans cette sélection.');return}
 session=questions.map(q=>prepare(q,settings));responses=session.map(()=>null);idx=0;submitted=false;active=true;clearTimer();
 ['setup','result','quiz','allQuiz'].forEach(id=>$(id).classList.add('hidden'));
 if(config.display==='all'){$('allQuiz').classList.remove('hidden');renderAll();startTimer(config.time*session.length,'allTimer',()=>submitAll(true))}
 else{$('quiz').classList.remove('hidden');renderOne()}
})}
$('start').onclick=()=>start();
function selected(i){return responses[i]?.selected||[]}
function correct(q,answer){return answer.length===q.answer.length&&q.answer.every(i=>answer.includes(i))}
function choose(i,oi,container){
 if(responses[i]?.validated)return;
 let answer=[...selected(i)];
 answer=session[i].answer.length>1?(answer.includes(oi)?answer.filter(x=>x!==oi):[...answer,oi]):[oi];
 responses[i]={selected:answer,validated:false};
 container.querySelectorAll('button').forEach(b=>{const on=answer.includes(Number(b.dataset.index));b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
 if(config.display==='all')updateAnswered();
}
function drawAnswers(q,i,box){
 box.innerHTML='';q.options.forEach((text,oi)=>{const b=document.createElement('button');b.type='button';b.className='answer-btn';b.dataset.index=oi;b.setAttribute('aria-pressed',String(selected(i).includes(oi)));b.classList.toggle('selected',selected(i).includes(oi));b.innerHTML=`<span class="option-letter">${String.fromCharCode(65+oi)}</span><span>${esc(text)}</span>`;b.onclick=()=>choose(i,oi,box);box.appendChild(b)});
}
function correction(q,r,box,feedback){
 const ok=correct(q,r.selected);
 box.querySelectorAll('button').forEach(b=>{const i=Number(b.dataset.index);b.disabled=true;b.classList.toggle('correct',q.answer.includes(i));b.classList.toggle('wrong',r.selected.includes(i)&&!q.answer.includes(i))});
 feedback.className='feedback '+(ok?'ok':'bad');
 feedback.textContent=(ok?'Bonne réponse. ':'Réponse incorrecte. ')+(r.selected.length?'':'Non répondu. ')+'Réponse attendue : '+q.answer.map(i=>String.fromCharCode(65+i)+' — '+q.options[i]).join(' / ');
 if(CS.shouldShowExplanations()&&q.explanation){const p=document.createElement('p');p.textContent=q.explanation;feedback.appendChild(p)}
}
function renderOne(){
 clearTimer();const q=session[idx],locked=!!responses[idx]?.validated;
 $('quizTitle').textContent=config.mode==='training'?'Mode entraînement':'Mode examen';$('progressText').textContent=`Question ${idx+1} sur ${session.length}`;$('progressBar').style.width=(idx+1)*100/session.length+'%';
 $('formatBadge').textContent=q.format;$('numberBadge').textContent='N° '+q.number;$('themeBadge').textContent=q.theme;$('originBadge').classList.add('hidden');$('questionVisual').classList.add('hidden');
 $('questionText').textContent=q.question+'\n'+(q.answer.length>1?'Plusieurs réponses possibles.':'Une réponse à sélectionner.');drawAnswers(q,idx,$('answers'));
 $('feedback').className='feedback hidden';$('validate').classList.toggle('hidden',locked);$('next').classList.toggle('hidden',!locked);$('previous').disabled=idx===0||config.mode==='exam';
 if(locked)correction(q,responses[idx],$('answers'),$('feedback'));else startTimer(config.time,'timer',()=>validate(true));
}
function startTimer(seconds,id,expiry){
 clearTimer();left=seconds;if(!seconds){$(id).textContent='∞';return}drawTime(id);
 timer=setInterval(()=>{left--;drawTime(id);if(left<=0){clearTimer();expiry()}},1000);
}
function drawTime(id){$(id).textContent=String(Math.floor(Math.max(0,left)/60)).padStart(2,'0')+':'+String(Math.max(0,left)%60).padStart(2,'0')}
function validate(timed=false){
 if(responses[idx]?.validated)return;
 if(!selected(idx).length&&!timed){PedApp.toast('Choisis une réponse.');return}
 clearTimer();responses[idx]={selected:[...selected(idx)],validated:true,timed};
 if(config.mode==='exam')next();else{correction(session[idx],responses[idx],$('answers'),$('feedback'));$('validate').classList.add('hidden');$('next').classList.remove('hidden')}
}
function next(){if(idx<session.length-1){idx++;renderOne()}else finish()}
$('validate').onclick=()=>validate();$('next').onclick=next;$('previous').onclick=()=>{if(idx>0&&config.mode==='training'){idx--;renderOne()}};
function renderAll(){
 $('allQuizTitle').textContent=config.mode==='training'?'Entraînement — toutes les questions':'Examen — toutes les questions';$('allProgressText').textContent=session.length+' questions affichées';$('allValidate').textContent='Valider toutes les réponses';$('allList').innerHTML='';
 session.forEach((q,i)=>{const card=document.createElement('article');card.className='ped-all-card';card.id='chir-q-'+i;
 const meta=document.createElement('div');meta.className='question-meta';meta.textContent=q.format+' · '+q.theme+' · N° '+q.number;card.appendChild(meta);
 const title=document.createElement('div');title.className='question-text';title.style.whiteSpace='pre-wrap';title.textContent=(i+1)+'. '+q.question+'\n'+(q.answer.length>1?'Plusieurs réponses possibles.':'Une réponse à sélectionner.');card.appendChild(title);
 const box=document.createElement('div');box.className='answers';card.appendChild(box);drawAnswers(q,i,box);
 const fb=document.createElement('div');fb.className='feedback hidden';card.appendChild(fb);$('allList').appendChild(card)});updateAnswered();
}
function updateAnswered(){const n=responses.filter(r=>r?.selected.length).length;$('allAnswered').textContent=`${n} question(s) répondue(s) sur ${session.length}`;$('allProgressBar').style.width=n*100/session.length+'%'}
function collect(timed=false){responses=session.map((q,i)=>({selected:[...selected(i)],validated:true,timed}))}
function submitAll(timed=false){
 if(submitted){finish();return}
 const empty=session.length-responses.filter(r=>r?.selected.length).length;
 if(empty&&!timed&&!confirm(`${empty} question(s) sans réponse. Valider quand même ?`))return;
 clearTimer();collect(timed);submitted=true;
 if(config.mode==='exam')finish();else{session.forEach((q,i)=>{const card=$('chir-q-'+i);correction(q,responses[i],card.querySelector('.answers'),card.querySelector('.feedback'))});$('allValidate').textContent='Voir le résultat';$('allTimer').textContent='Terminé'}
}
$('allValidate').onclick=()=>submitAll();$('allTop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
function finish(){
 if(!active)return;clearTimer();active=false;responses=session.map((q,i)=>responses[i]||{selected:[],validated:true});
 const good=responses.filter((r,i)=>correct(session[i],r.selected)).length,pct=Math.round(good*100/session.length);
 $('quiz').classList.add('hidden');$('allQuiz').classList.add('hidden');$('result').classList.remove('hidden');$('resultPercent').textContent=pct+'%';$('resultTitle').textContent=pct>=80?'Très bon résultat':pct>=60?'Bon travail':'Révision à poursuivre';$('resultText').textContent=`${good} bonne(s) réponse(s) sur ${session.length}.`;
 $('review').innerHTML='';session.forEach((q,i)=>{const card=document.createElement('div');card.className='review-item';const title=document.createElement('strong');title.textContent=q.theme+' — N° '+q.number;card.appendChild(title);const text=document.createElement('p');text.textContent=q.question;card.appendChild(text);const chosen=document.createElement('p');chosen.textContent='Votre réponse : '+(selected(i).map(n=>q.options[n]).join(' / ')||'Non répondu');card.appendChild(chosen);const box=document.createElement('div'),fb=document.createElement('div');correction(q,responses[i],box,fb);card.appendChild(fb);$('review').appendChild(card)});
 const history=historyData();history.unshift({date:new Date().toISOString(),pct,score:good,total:session.length,format:config.format,theme:config.theme,display:config.display});localStorage.setItem(historyKey,JSON.stringify(history.slice(0,50)));renderHistory();
}
function historyData(){try{return JSON.parse(localStorage.getItem(historyKey)||'[]')}catch{return[]}}
function renderHistory(){const history=historyData();$('attempts').textContent=history.length;$('average').textContent=(history.length?Math.round(history.reduce((s,h)=>s+h.pct,0)/history.length):0)+'%';$('best').textContent=(history.length?Math.max(...history.map(h=>h.pct)):0)+'%';$('historyBody').innerHTML='';history.slice(0,10).forEach(h=>{const row=document.createElement('tr');[PedApp.fmtDate(h.date),h.format,h.theme==='ALL'?'Toutes les séries':h.theme,h.pct+'%'].forEach(text=>{const cell=document.createElement('td');cell.textContent=text;row.appendChild(cell)});$('historyBody').appendChild(row)})}
renderHistory();$('clearHistory').onclick=()=>{if(confirm('Effacer tout l’historique de chirurgie ?')){localStorage.removeItem(historyKey);renderHistory()}};
$('quit').onclick=$('allQuit').onclick=()=>{if(confirm('Quitter ce quiz ?')){clearTimer();active=false;session=[];$('quiz').classList.add('hidden');$('allQuiz').classList.add('hidden');$('setup').classList.remove('hidden')}};
$('home').onclick=()=>{$('result').classList.add('hidden');$('setup').classList.remove('hidden');session=[]};$('retry').onclick=()=>start(config);
window.ChirQuizAutoSubmit=reason=>{if(!active)return;collect(true);PedApp.toast('Composition validée automatiquement : '+reason+'.');finish()};
})();
