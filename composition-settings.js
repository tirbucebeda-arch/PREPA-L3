(() => {
  'use strict';
  const DEFAULTS = Object.freeze({
    cameraEnabled:false,
    autoSubmitOnExit:true,
    defaultDisplayMode:'',
    questionLimit:'all',
    shuffleQuestions:true,
    shuffleOptions:false,
    timerEnabled:true,
    secondsPerQuestion:30,
    showExplanations:true,
    darkMode:false,
    fontSize:'normal'
  });
  const STORE='revision-composition-settings-v2';
  const SITE=document.documentElement.dataset.compositionSite || (location.pathname.includes('pediatrie')?'pediatrie':'sante-publique');
  let stream=null;
  let pendingStart=null;
  let exitLocked=false;

  function safeParse(value,fallback){try{return JSON.parse(value)}catch(_){return fallback}}
  function session(){
    const hub=safeParse(localStorage.getItem('revision-hub-session-v1')||'null',null);
    return hub&&hub.code?hub:null;
  }
  function userCode(){
    const hub=session();
    if(hub&&hub.code)return String(hub.code).trim().toUpperCase();
    if(window.currentSiteAccount&&window.currentSiteAccount.code)return String(window.currentSiteAccount.code).trim().toUpperCase();
    return 'APPAREIL';
  }
  function key(){return `${SITE}:${userCode()}`}
  function normalize(saved={}){
    const seconds=Number(saved.secondsPerQuestion);
    return {
      ...DEFAULTS,
      cameraEnabled:saved.cameraEnabled===true,
      autoSubmitOnExit:saved.autoSubmitOnExit!==false,
      defaultDisplayMode:['','all','one'].includes(saved.defaultDisplayMode)?saved.defaultDisplayMode:'',
      questionLimit:['all','10','20','30','50'].includes(String(saved.questionLimit))?String(saved.questionLimit):'all',
      shuffleQuestions:saved.shuffleQuestions!==false,
      shuffleOptions:saved.shuffleOptions===true,
      timerEnabled:saved.timerEnabled!==false,
      secondsPerQuestion:[15,30,45,60].includes(seconds)?seconds:30,
      showExplanations:saved.showExplanations!==false,
      darkMode:saved.darkMode===true,
      fontSize:['small','normal','large','xlarge'].includes(saved.fontSize)?saved.fontSize:'normal'
    };
  }
  function all(){return safeParse(localStorage.getItem(STORE)||'{}',{})||{}}
  function get(){return normalize(all()[key()]||{})}
  function save(settings){const rows=all();rows[key()]=normalize(settings);localStorage.setItem(STORE,JSON.stringify(rows));apply(rows[key()]);syncSetup(rows[key()]);return rows[key()]}
  function apply(settings=get()){
    document.body.classList.toggle('composition-dark',settings.darkMode);
    ['small','normal','large','xlarge'].forEach(x=>document.body.classList.remove(`composition-font-${x}`));
    document.body.classList.add(`composition-font-${settings.fontSize}`);
  }
  function syncSetup(settings=get()){
    const display=document.getElementById(SITE==='pediatrie'?'display':'displayMode');
    if(display&&settings.defaultDisplayMode){display.value=settings.defaultDisplayMode==='one'?(SITE==='pediatrie'?'one':'single'):'all';display.dispatchEvent(new Event('change',{bubbles:true}));}
    const count=document.getElementById(SITE==='pediatrie'?'count':'questionCount');
    if(count){const wanted=settings.questionLimit==='all'?(SITE==='pediatrie'?'ALL':'all'):settings.questionLimit;if([...count.options].some(o=>o.value===wanted||o.textContent.trim()===wanted)){count.value=wanted;count.dispatchEvent(new Event('change',{bubbles:true}));}}
    const time=document.getElementById(SITE==='pediatrie'?'time':'questionTime');
    if(time){const wanted=settings.timerEnabled?String(settings.secondsPerQuestion):'0';if([...time.options].some(o=>o.value===wanted)){time.value=wanted;time.dispatchEvent(new Event('change',{bubbles:true}));}}
  }
  function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}const video=document.getElementById('compositionCameraVideo');if(video)video.srcObject=null}
  function closeCamera(){stopCamera();document.getElementById('compositionCameraModal')?.classList.add('hidden');pendingStart=null}
  function setCameraMessage(text,type=''){const el=document.getElementById('compositionCameraMessage');if(!el)return;el.textContent=text;el.className=`composition-camera-message ${type}`}
  async function enableCamera(){
    if(!window.isSecureContext){setCameraMessage('La caméra fonctionne uniquement sur un site HTTPS ou en localhost.','error');return}
    if(!navigator.mediaDevices?.getUserMedia){setCameraMessage('La caméra n’est pas prise en charge par ce navigateur.','error');return}
    try{
      setCameraMessage('Ouverture de la caméra…');stopCamera();
      try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false})}catch(_){stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false})}
      const video=document.getElementById('compositionCameraVideo');video.srcObject=stream;video.classList.remove('hidden');await video.play().catch(()=>{});setCameraMessage('Caméra activée. Prenez la photo pour commencer.','success');
    }catch(error){let msg='Impossible d’accéder à la caméra. Autorisez-la dans les paramètres du navigateur.';if(error?.name==='NotFoundError')msg='Aucune caméra détectée sur cet appareil.';if(error?.name==='NotAllowedError')msg='Accès à la caméra refusé. Autorisez la caméra puis réessayez.';setCameraMessage(msg,'error')}
  }
  function takePhoto(){
    const video=document.getElementById('compositionCameraVideo');if(!stream||!video?.videoWidth){setCameraMessage('Activez d’abord la caméra et attendez l’affichage de l’image.','error');return}
    const canvas=document.getElementById('compositionCameraCanvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    const img=document.getElementById('compositionPhotoPreview');img.src=canvas.toDataURL('image/jpeg',.82);img.classList.remove('hidden');video.classList.add('hidden');stopCamera();setCameraMessage('Photo prise. La composition démarre.','success');
    const callback=pendingStart;pendingStart=null;setTimeout(()=>{document.getElementById('compositionCameraModal')?.classList.add('hidden');if(typeof callback==='function')callback()},350);
  }
  function requestStart(callback){const settings=get();if(!settings.cameraEnabled){callback();return}pendingStart=callback;const modal=document.getElementById('compositionCameraModal');modal.classList.remove('hidden');document.getElementById('compositionCameraVideo').classList.add('hidden');document.getElementById('compositionPhotoPreview').classList.add('hidden');setCameraMessage('Photo obligatoire : activez la caméra puis prenez une photo.');}
  function shuffleArray(array){const copy=[...array];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}return copy}
  function shuffleSpQuestion(question){const clone={...question,options:(question.options||[]).map(o=>({...o}))};clone.options=shuffleArray(clone.options).map((o,i)=>({...o,label:String.fromCharCode(65+i)}));return clone}
  function shufflePedQuestion(question){const original=(question.options||[]).map((text,i)=>({text,correct:String.fromCharCode(65+i)===question.answer}));const mixed=shuffleArray(original);return {...question,options:mixed.map(x=>x.text),answer:String.fromCharCode(65+mixed.findIndex(x=>x.correct))}}
  function settingsMarkup(){return `
    <div class="composition-modal hidden" id="compositionSettingsModal" role="dialog" aria-modal="true" aria-labelledby="compositionSettingsTitle"><div class="composition-dialog">
      <div class="composition-dialog-head"><div><h2 id="compositionSettingsTitle">Paramètres de révision</h2><p class="composition-muted">Ces choix sont enregistrés pour votre code d’accès sur cet appareil.</p></div><button class="composition-close" id="compositionSettingsClose" type="button">✕</button></div>
      <h3 class="composition-section-title">Caméra et sécurité</h3>
      ${toggle('csCamera','Activer la photo avant la révision','Une photo sera demandée avant chaque composition.')}
      ${toggle('csExit','Validation automatique en quittant la page','Le devoir est validé en cas d’appel, de changement d’application, d’onglet ou de fermeture.')}
      <h3 class="composition-section-title">Organisation du quiz</h3>
      ${field('csDisplay','Mode d’affichage préféré', [['','Toujours me demander'],['all','Toutes les questions'],['one','Question par question']])}
      ${field('csCount','Nombre de questions par révision', [['all','Toutes les questions du sujet'],['10','10 questions'],['20','20 questions'],['30','30 questions'],['50','50 questions']])}
      ${toggle('csShuffleQ','Mélanger l’ordre des questions','Un nouvel ordre est utilisé à chaque composition.')}
      ${toggle('csShuffleO','Mélanger les propositions de réponses','Les propositions changent d’ordre sans modifier la bonne réponse.')}
      <h3 class="composition-section-title">Chronomètre et correction</h3>
      ${toggle('csTimer','Activer le chronomètre','Révisez avec ou sans limite de temps.')}
      ${field('csSeconds','Temps accordé par question', [['15','15 secondes'],['30','30 secondes'],['45','45 secondes'],['60','60 secondes']])}
      ${toggle('csExplain','Afficher les explications dans la correction','La bonne réponse reste visible ; les détails complémentaires peuvent être masqués.')}
      <h3 class="composition-section-title">Affichage</h3>
      ${toggle('csDark','Mode sombre','Réduit l’éblouissement pendant les révisions de nuit.')}
      ${field('csFont','Taille du texte', [['small','Petite'],['normal','Normale'],['large','Grande'],['xlarge','Très grande']])}
      <p class="composition-save-status" id="compositionSaveStatus"></p><div class="composition-actions"><button class="composition-secondary" id="compositionReset" type="button">Réinitialiser</button><button class="composition-primary" id="compositionDone" type="button">Enregistrer et retourner</button></div>
    </div></div>
    <div class="composition-modal hidden" id="compositionCameraModal" role="dialog" aria-modal="true"><div class="composition-dialog composition-camera-dialog"><div class="composition-dialog-head"><div><h2>Photo avant composition</h2><p class="composition-muted">La composition commence automatiquement après la photo.</p></div><button class="composition-close" id="compositionCameraClose" type="button">✕</button></div><p class="composition-camera-warning">Photo obligatoire avant le lancement de cette composition.</p><div class="composition-camera-actions"><button class="composition-primary" id="compositionEnableCamera" type="button">Activer la caméra</button><button class="composition-secondary" id="compositionTakePhoto" type="button">Prendre une photo</button></div><video id="compositionCameraVideo" class="composition-camera-video hidden" autoplay playsinline muted></video><canvas id="compositionCameraCanvas" class="hidden"></canvas><img id="compositionPhotoPreview" class="composition-photo-preview hidden" alt="Photo de l’étudiant"><p id="compositionCameraMessage" class="composition-camera-message"></p></div></div>`}
  function toggle(id,title,desc){return `<div class="composition-setting-item"><div class="composition-setting-copy"><strong>${title}</strong><span>${desc}</span></div><label class="composition-switch" for="${id}"><input id="${id}" type="checkbox"><span class="composition-slider"></span></label></div>`}
  function field(id,label,options){return `<div class="composition-field"><label for="${id}">${label}</label><select id="${id}">${options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div>`}
  function controlsToSettings(){return normalize({cameraEnabled:cs('csCamera'),autoSubmitOnExit:cs('csExit'),defaultDisplayMode:val('csDisplay'),questionLimit:val('csCount'),shuffleQuestions:cs('csShuffleQ'),shuffleOptions:cs('csShuffleO'),timerEnabled:cs('csTimer'),secondsPerQuestion:Number(val('csSeconds')),showExplanations:cs('csExplain'),darkMode:cs('csDark'),fontSize:val('csFont')})}
  function cs(id){return !!document.getElementById(id)?.checked}function val(id){return document.getElementById(id)?.value||''}
  function fill(settings=get()){const map={csCamera:settings.cameraEnabled,csExit:settings.autoSubmitOnExit,csShuffleQ:settings.shuffleQuestions,csShuffleO:settings.shuffleOptions,csTimer:settings.timerEnabled,csExplain:settings.showExplanations,csDark:settings.darkMode};Object.entries(map).forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.checked=v});[['csDisplay',settings.defaultDisplayMode],['csCount',settings.questionLimit],['csSeconds',String(settings.secondsPerQuestion)],['csFont',settings.fontSize]].forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.value=v});const sec=document.getElementById('csSeconds');if(sec)sec.disabled=!settings.timerEnabled}
  function init(){
    document.body.insertAdjacentHTML('beforeend',settingsMarkup());
    const nav=document.querySelector(SITE==='pediatrie'?'.topnav':'.nav-actions');
    if(nav){const btn=document.createElement('button');btn.type='button';btn.id='compositionSettingsOpen';btn.className='composition-settings-btn';btn.textContent='⚙ Paramètres';nav.prepend(btn)}
    const open=()=>{fill();document.getElementById('compositionSettingsModal').classList.remove('hidden')};const close=()=>document.getElementById('compositionSettingsModal').classList.add('hidden');
    document.getElementById('compositionSettingsOpen')?.addEventListener('click',open);document.getElementById('compositionSettingsClose').addEventListener('click',close);document.getElementById('compositionDone').addEventListener('click',()=>{save(controlsToSettings());document.getElementById('compositionSaveStatus').textContent='Paramètres enregistrés.';setTimeout(close,250)});
    document.querySelectorAll('#compositionSettingsModal input,#compositionSettingsModal select').forEach(el=>el.addEventListener('change',()=>{const saved=save(controlsToSettings());fill(saved);document.getElementById('compositionSaveStatus').textContent='Paramètres enregistrés automatiquement.'}));
    document.getElementById('compositionReset').addEventListener('click',()=>{if(confirm('Réinitialiser tous les paramètres pour ce code d’accès ?')){const s=save({...DEFAULTS});fill(s);document.getElementById('compositionSaveStatus').textContent='Paramètres réinitialisés.'}});
    document.getElementById('compositionCameraClose').addEventListener('click',closeCamera);document.getElementById('compositionEnableCamera').addEventListener('click',enableCamera);document.getElementById('compositionTakePhoto').addEventListener('click',takePhoto);
    apply();syncSetup();
  }
  function exitSubmit(reason){if(exitLocked||!get().autoSubmitOnExit)return;const fn=SITE==='pediatrie'?window.PedQuizAutoSubmit:window.SPQuizAutoSubmit;if(typeof fn==='function'){exitLocked=true;try{fn(reason)}finally{setTimeout(()=>{exitLocked=false},1200)}}}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)exitSubmit('sortie de la page')});window.addEventListener('blur',()=>exitSubmit('appel, notification ou changement de fenêtre'));window.addEventListener('pagehide',()=>exitSubmit('fermeture ou changement de page'));window.addEventListener('beforeunload',()=>exitSubmit('fermeture ou actualisation'));
  window.CompositionSettings=Object.freeze({get,save,apply,syncSetup,requestStart,shuffleArray,shuffleSpQuestion,shufflePedQuestion,shouldShowExplanations:()=>get().showExplanations});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
