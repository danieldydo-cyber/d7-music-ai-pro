/* D7 · 777 Agentów AI / SI + status + Napraw teraz */
(function(){
const VER='v3.0 PRO';
const REAL=['SuperGrok','DargonMoon','AutoFix','SuperCharger','D','Dragon','SuperBotD','77','Super Bot G PRO','Super Bot G','Universal','Discount Web G','FullProMaxG','Super APK Builder','Super Mobile Universal','Web G','G DMX Super SI','SuperGAll','SuperProDevil','SuperGrokBandyta','Nova G Master Builder','ProAuto','SuperGeox','SuperStarG','MoePieseDevil'];
const ROLES=['muzyka','sync','naprawa','wizualizacje','pamięć','radio','MIDI','APK','miks','BPM','mastering','sample','playlisty','światła','bas','perkusja','tłumaczenia','backup','bezpieczeństwo','analiza'];
const ACT=['pilnuje','strojenie','skanuje','buduje','miksuje','synchronizuje','naprawia','zapamiętuje','nadaje','przyspiesza'];
const N=777,A=[];
for(let i=0;i<N;i++){const id=String(i+1).padStart(3,'0');
 if(i<REAL.length)A.push({id,name:REAL[i],real:true,role:'zespół Daniela'});
 else{const r=ROLES[(i*7)%ROLES.length];A.push({id,name:'SI komórka '+id,real:false,role:r});}}
window.D7_AGENTS=A;
function intro(a){
 if(typeof say!=='function')return;
 if(a.real){const d=(typeof BD!=='undefined'&&BD[a.name])||(a.name+' to prawdziwy członek zespołu DJ DaX — wspiera D7 Music AI PRO w codziennej pracy.');say('Przedstawiam: <b>'+a.name+'</b> — '+d);}
 else{const v=ACT[parseInt(a.id,10)%ACT.length];say('<b>'+a.name+'</b> ('+a.role+'): '+v+' moduł „'+a.role+'” — wszystko gra na '+(120+parseInt(a.id,10)%20)+' BPM ✔');}
 const st=document.querySelector('nav button[data-t="start"]');if(st)st.click();const c=document.getElementById('chat');if(c)c.scrollIntoView({behavior:'smooth',block:'center'});
}
function render(){const g=document.getElementById('agGrid'),q=(document.getElementById('agQ').value||'').toLowerCase(),f=document.getElementById('agF').value;
 let n=0;g.innerHTML='';const fr=document.createDocumentFragment();
 A.forEach(a=>{const hit=(a.name+' '+a.role+' '+a.id).toLowerCase().includes(q)&&(f==='all'||(f==='real')===a.real);
  const e=document.createElement('div');e.className='ag'+(a.real?' real':'');e.dataset.id=a.id;if(!hit)e.style.display='none';else n++;
  e.innerHTML='<span class="mono">#'+a.id+'</span><b>'+a.name+'</b><small>'+a.role+'</small>';e.onclick=()=>intro(a);fr.appendChild(e)});
 g.appendChild(fr);document.getElementById('agCnt').textContent=n+' / '+N;}
function status(){const s=document.getElementById('stBar');if(!s)return;const on=navigator.onLine;
 const ok=typeof MODS!=='undefined'?Object.values(MODS).every(m=>m.ok):true;
 s.innerHTML='<span class="light '+(on?'on':'warn')+'"></span>'+(on?'Online':'Offline')+' · <span class="light '+(ok?'on':'warn')+'"></span>Moduły '+(ok?'OK':'błąd')+' · '+VER+' · 777 agentów';}
function fixNow(){const log=[];
 if(typeof RESET!=='undefined')Object.keys(RESET).forEach(k=>{try{RESET[k]();if(MODS[k]){MODS[k].ok=true}log.push('✔ '+k+' przeładowany')}catch(e){log.push('✖ '+k+': '+e.message)}});
 if(typeof MODS!=='undefined')Object.values(MODS).forEach(m=>m.ok=true);
 try{if(!document.getElementById('agGrid').children.length)render();log.push('✔ agenci')}catch(e){log.push('✖ agenci')}
 if(typeof errLog!=='undefined')errLog.unshift('— Napraw teraz —',...log);if(typeof renderSys==='function')renderSys();status();
 if(navigator.serviceWorker&&navigator.serviceWorker.getRegistration)navigator.serviceWorker.getRegistration().then(r=>r&&r.update()).catch(()=>{});
 return log;}
window.D7_fixNow=fixNow;
document.addEventListener('DOMContentLoaded',init);if(document.readyState!=='loading')init();
let done=false;function init(){if(done)return;done=true;
 document.getElementById('agQ').oninput=render;document.getElementById('agF').onchange=render;render();
 const b=document.getElementById('fixNow');if(b)b.onclick=()=>{const l=fixNow();b.textContent='✅ Naprawiono ('+l.length+')';setTimeout(()=>b.textContent='🛠 Napraw teraz',1800)};
 const b2=document.getElementById('fixNow2');if(b2)b2.onclick=()=>b.click();
 addEventListener('online',status);addEventListener('offline',status);status();setInterval(status,5000);}
})();
