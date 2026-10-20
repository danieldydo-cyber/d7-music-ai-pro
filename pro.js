'use strict';
/* ===== D7 MUSIC AI PRO — moduły: core, decks, automix, viz, old, selfcheck ===== */
let _out=null,_an=null;
function AC(){if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();if(ac.state!='running')ac.resume();return ac}
function OUT(){AC();if(!_out){_out=ac.createGain();_an=ac.createAnalyser();_an.fftSize=2048;_an.smoothingTimeConstant=.8;_out.connect(_an);_an.connect(ac.destination)}return _out}
function ANALYSER(){OUT();return _an}

/* ---------- Self-check / guard ---------- */
const MODS={core:{ok:true,err:0},gen:{ok:true,err:0},decks:{ok:true,err:0},automix:{ok:true,err:0},viz:{ok:true,err:0},chat:{ok:true,err:0}};
const RESET={};const errLog=[];
function report(mod,e){const m=MODS[mod]||MODS.core;m.ok=false;m.err++;const msg=`[${new Date().toLocaleTimeString('pl-PL')}] ${mod}: ${e&&e.message||e}`;errLog.unshift(msg);if(errLog.length>30)errLog.pop();
 console.warn('D7 self-check',msg);try{if(RESET[mod]){RESET[mod]();m.ok=true;errLog.unshift(`  ↳ moduł ${mod} zresetowany`)}}catch(x){errLog.unshift('  ↳ reset nieudany: '+x.message)}renderSys()}
function guard(mod,fn){return function(...a){try{const r=fn.apply(this,a);if(r&&r.catch)r.catch(e=>report(mod,e));return r}catch(e){report(mod,e)}}}
function modOf(stack){stack=String(stack||'');if(/Deck|deck/.test(stack))return'decks';if(/autoMix|automix/i.test(stack))return'automix';if(/viz|Viz|milk/.test(stack))return'viz';return'core'}
window.addEventListener('error',e=>{report(modOf(e.error&&e.error.stack),e.error||e.message);e.preventDefault()});
window.addEventListener('unhandledrejection',e=>{report(modOf(e.reason&&e.reason.stack),e.reason);e.preventDefault()});
function renderSys(){const s=$('modStat');if(!s)return;s.innerHTML=Object.entries(MODS).map(([k,v])=>`<div class="card ${v.ok?'ok':'bad'}"><b>${k}</b><br><span class="mono">${v.ok?'✔ OK':'✖ błąd'} · błędów: ${v.err}</span></div>`).join('');$('errLog').textContent=errLog.join('\n')}
RESET.gen=()=>{stop();gen()};RESET.chat=()=>{mouth(false)};

/* ---------- Decks ---------- */
const RADIO=[['SomaFM Beat Blender','https://ice2.somafm.com/beatblender-128-mp3'],['SomaFM DEF CON','https://ice2.somafm.com/defcon-128-mp3'],['SomaFM Fluid','https://ice2.somafm.com/fluid-128-mp3'],['SomaFM Groove Salad','https://ice2.somafm.com/groovesalad-128-mp3'],['Radio Paradise','https://stream.radioparadise.com/mp3-128']];
function detectBPM(buf){// energy onsets + autocorrelation (60-190 BPM)
 const d=buf.getChannelData(0),sr=buf.sampleRate,hop=Math.floor(sr/200),n=Math.min(Math.floor(d.length/hop),200*60);const e=new Float32Array(n);let prev=0;
 for(let i=0;i<n;i++){let s=0;for(let j=i*hop;j<i*hop+hop;j++)s+=d[j]*d[j];const v=Math.sqrt(s/hop);e[i]=Math.max(0,v-prev);prev=v}
 let best=0,bl=0;for(let bpm=60;bpm<=190;bpm+=.5){const lag=200*60/bpm;let c=0;for(let i=0;i+lag+1<n;i++){const l=Math.floor(i+lag),f=i+lag-l;c+=e[i]*(e[l]*(1-f)+e[l+1]*f)}if(c>best){best=c;bl=bpm}}
 while(bl<90)bl*=2;while(bl>180)bl/=2;return Math.round(bl*10)/10}
class Deck{
 constructor(id,name){this.id=id;this.name=name;this.el=$(id);this.buf=null;this.src=null;this.media=null;this.playing=false;this.offset=0;this.start0=0;this.cue=0;this.bpm=0;this.rate=1;this.build()}
 build(){const n=this.name;this.el.innerHTML=`<h3>DECK ${n}</h3><div class="mono" data-r="title">— pusty —</div><canvas data-r="wf" width="600" height="60"></canvas>
 <div class="row"><span class="big" data-r="bpm">--.-</span><span class="mono">BPM</span><span class="mono" data-r="time">0:00</span></div>
 <div class="row"><label class="btn g" style="flex-direction:row">📂 Plik<input type="file" accept="audio/*" data-r="file" hidden></label><button class="btn g" data-r="loop">🎲 Pętla</button>
 <select data-r="radio"><option value="">📻 Radio…</option>${RADIO.map((r,i)=>`<option value="${i}">${r[0]}</option>`).join('')}</select></div>
 <div class="row" style="margin-top:8px"><button class="btn" data-r="play">▶/❚❚</button><button class="btn s" data-r="cue">CUE</button><button class="btn g" data-r="sync">SYNC</button></div>
 <label>Pitch <span data-r="pv">0.0%</span><input type="range" data-r="pitch" min="-8" max="8" step=".1" value="0"></label>
 <div class="knobs"><label>HI<input type="range" data-r="hi" min="-24" max="6" value="0"></label><label>MID<input type="range" data-r="mid" min="-24" max="6" value="0"></label><label>LOW<input type="range" data-r="low" min="-24" max="6" value="0"></label><label>FILTR<input type="range" data-r="flt" min="-1" max="1" step=".01" value="0"></label></div>
 <label>Głośność<input type="range" data-r="vol" min="0" max="1" step=".01" value=".9"></label>`;
 this.r=k=>this.el.querySelector(`[data-r="${k}"]`);const G=f=>guard('decks',f);
 this.r('file').onchange=G(e=>e.target.files[0]&&this.loadFile(e.target.files[0]));this.r('loop').onclick=G(()=>this.loadLoop());this.r('radio').onchange=G(e=>e.target.value!==''&&this.loadRadio(+e.target.value));
 this.r('play').onclick=G(()=>this.toggle());this.r('cue').onclick=G(()=>this.doCue());this.r('sync').onclick=G(()=>this.sync());
 this.r('pitch').oninput=G(()=>this.setRate());['hi','mid','low','flt','vol'].forEach(k=>this.r(k).oninput=G(()=>this.applyEQ()));
 this.r('wf').onclick=G(e=>{if(!this.buf)return;const x=e.offsetX/e.target.clientWidth;this.seek(x*this.buf.duration)})}
 chain(){if(this.in)return;const c=AC();this.in=c.createGain();this.lo=c.createBiquadFilter();this.lo.type='lowshelf';this.lo.frequency.value=250;this.mi=c.createBiquadFilter();this.mi.type='peaking';this.mi.frequency.value=1000;this.mi.Q.value=.8;
  this.hi=c.createBiquadFilter();this.hi.type='highshelf';this.hi.frequency.value=4000;this.fl=c.createBiquadFilter();this.vol=c.createGain();this.xg=c.createGain();
  this.in.connect(this.lo);this.lo.connect(this.mi);this.mi.connect(this.hi);this.hi.connect(this.fl);this.fl.connect(this.vol);this.vol.connect(this.xg);this.xg.connect(OUT());this.applyEQ();applyXF()}
 applyEQ(){if(!this.in)return;const v=k=>+this.r(k).value;this.hi.gain.value=v('hi');this.mi.gain.value=v('mid');this.lo.gain.value=v('low');this.vol.gain.value=v('vol');
  const f=v('flt');if(f<-.02){this.fl.type='lowpass';this.fl.frequency.value=200*Math.pow(100,1+f);this.fl.Q.value=4}else if(f>.02){this.fl.type='highpass';this.fl.frequency.value=20*Math.pow(200,f);this.fl.Q.value=4}else{this.fl.type='allpass';this.fl.frequency.value=1000}}
 unload(){this.stopSrc();if(this.media){this.media.pause();this.media.src='';this.media=null;if(this.msrc){this.msrc.disconnect();this.msrc=null}}this.buf=null;this.offset=0;this.cue=0}
 setBuf(buf,title,bpm){this.chain();this.unload();this.buf=buf;this.bpm=bpm||detectBPM(buf);this.r('title').textContent=title;this.drawWF();this.ui()}
 async loadFile(f){this.r('title').textContent='Dekodowanie…';const ab=await f.arrayBuffer();const b=await AC().decodeAudioData(ab);this.setBuf(b,f.name)}
 async loadLoop(){gen();this.r('title').textContent='Renderowanie pętli…';const b=await renderLoop(4,0);this.setBuf(b,`Pętla ${$('genre').value} ${$('key').selectedOptions[0].text} ${$('scale').value}`,+$('bpm').value);this.loop=true}
 loadRadio(i){this.chain();this.unload();const a=new Audio();a.crossOrigin='anonymous';a.src=RADIO[i][1];this.media=a;try{this.msrc=AC().createMediaElementSource(a);this.msrc.connect(this.in)}catch(e){}
  this.bpm=0;this.r('title').textContent='📻 '+RADIO[i][0]+' (live, bez BPM)';this.drawWF();a.play().then(()=>{this.playing=true;this.ui()}).catch(e=>{this.r('title').textContent='📻 radio niedostępne: '+e.message})}
 pos(){if(!this.buf)return 0;let p=this.playing?this.offset+(AC().currentTime-this.start0)*this.rate:this.offset;return this.loop!==false?p%this.buf.duration:Math.min(p,this.buf.duration)}
 stopSrc(){if(this.src){try{this.src.onended=null;this.src.stop()}catch(e){}this.src.disconnect();this.src=null}}
 play(at){if(this.media){this.media.play();this.playing=true;return this.ui()}if(!this.buf)return;this.chain();const c=AC();this.stopSrc();const s=c.createBufferSource();s.buffer=this.buf;s.loop=true;s.playbackRate.value=this.rate;s.connect(this.in);
  const t=at||c.currentTime;s.start(t,this.offset%this.buf.duration);this.src=s;this.start0=t;this.playing=true;this.ui()}
 pause(){if(this.media){this.media.pause();this.playing=false;return this.ui()}this.offset=this.pos();this.stopSrc();this.playing=false;this.ui()}
 toggle(){this.playing?this.pause():this.play()}
 doCue(){if(this.playing){this.pause();this.offset=this.cue}else{this.cue=this.pos()}this.ui()}
 seek(t){const p=this.playing;if(p)this.pause();this.offset=t;if(p)this.play();this.ui()}
 setRate(){const pct=+this.r('pitch').value;this.rate=1+pct/100;if(this.src){this.offset=this.pos();this.start0=AC().currentTime;this.src.playbackRate.value=this.rate}if(this.media)this.media.playbackRate=this.rate;this.r('pv').textContent=pct.toFixed(1)+'%';this.ui()}
 cur(){return this.bpm*this.rate}
 sync(){const o=this===dA?dB:dA;if(!this.bpm||!o.bpm)return;let target=o.cur();let ratio=target/this.bpm;if(ratio>1.5)ratio/=2;if(ratio<.67)ratio*=2;
  const pct=Math.max(-8,Math.min(8,(ratio-1)*100));this.r('pitch').value=pct;this.setRate();
  if(o.playing&&this.playing&&o.buf&&this.buf){const bo=60/o.bpm,bt=60/this.bpm;const ph=(o.pos()%bo)/bo;this.offset=Math.floor(this.pos()/bt)*bt+ph*bt;this.start0=AC().currentTime;this.play()}}
 drawWF(){const cv=this.r('wf'),g=cv.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,cv.width,cv.height);if(!this.buf)return;const d=this.buf.getChannelData(0),st=Math.floor(d.length/cv.width);g.fillStyle=this.name=='A'?'#00ffa3':'#ff2e88';
  for(let x=0;x<cv.width;x++){let m=0;for(let j=0;j<st;j+=8)m=Math.max(m,Math.abs(d[x*st+j]));g.fillRect(x,30-m*28,1,m*56)}this.wf=g.getImageData(0,0,cv.width,cv.height)}
 tick(){const cv=this.r('wf');if(this.buf&&this.wf){const g=cv.getContext('2d');g.putImageData(this.wf,0,0);const x=this.pos()/this.buf.duration*cv.width;g.fillStyle='#fff';g.fillRect(x,0,2,60);g.fillStyle='#ff0';g.fillRect(this.cue/this.buf.duration*cv.width,0,2,8)}
  const p=this.pos();this.r('time').textContent=`${Math.floor(p/60)}:${String(Math.floor(p%60)).padStart(2,'0')}`}
 ui(){this.r('bpm').textContent=this.bpm?this.cur().toFixed(1):'--.-';this.r('play').style.background=this.playing?'var(--a2)':''}
 reset(){try{this.unload()}catch(e){}this.in=null;this.playing=false;this.build();this.r('title').textContent='— zresetowano —'}
}
let dA,dB;
function applyXF(){const x=+$('xf').value;if(dA&&dA.xg)dA.xg.gain.value=Math.cos(x*Math.PI/2);if(dB&&dB.xg)dB.xg.gain.value=Math.cos((1-x)*Math.PI/2)}
function glideXF(to,sec){const x0=+$('xf').value,t0=performance.now();return new Promise(res=>{(function f(){const k=Math.min(1,(performance.now()-t0)/(sec*1000));$('xf').value=x0+(to-x0)*k;applyXF();k<1?setTimeout(f,30):res()})()})}
RESET.decks=()=>{[dA,dB].forEach(d=>d&&d.reset())};

/* ---------- Auto-mix ---------- */
let amBusy=false,amNext=0;
async function autoMixTick(){if(!$('autoMix').checked){$('amStat').textContent='';return}
 const x=+$('xf').value,live=x<.5?dA:dB,next=live===dA?dB:dA;
 if(!live.playing){if(!live.buf)await live.loadLoop();live.play();amNext=0}
 const bpm=live.cur()||+$('bpm').value,bar=240/bpm,bars=+$('amBars').value;const t=live.pos();
 if(!amNext)amNext=AC().currentTime+bars*bar-(t%bar);const left=amNext-AC().currentTime;
 $('amStat').textContent=`Na żywo: ${live.name} · przejście do ${next.name} za ${Math.max(0,left).toFixed(1)} s`;
 if(left<=0&&!amBusy){amBusy=true;try{$('autoGen').checked&&mutate();if(!next.buf||next.loop)await next.loadLoop();next.sync();
   const c=AC(),bt=60/(next.cur()||bpm),pos=live.pos(),wait=(bar-(pos%bar))/live.rate;next.offset=0;next.play(c.currentTime+wait);
   await new Promise(r=>setTimeout(r,wait*1000));await glideXF(live===dA?1:0,+$('amLen').value*bar);live.pause();live.offset=0}finally{amBusy=false;amNext=0}}}
RESET.automix=()=>{amBusy=false;amNext=0;$('autoMix').checked=false};
function autoGenTick(b){if($('autoGen').checked&&b%8==0)guard('gen',()=>{b%16==0?gen():mutate()})()}

/* ---------- Visualizer ---------- */
const V={mode:'bars',parts:[],stars:[],milk:null,hue:0,lastBeat:0,avg:0};
function vizFrame(){const cv=$('vc');if(!cv.offsetParent){return}const W=cv.width=cv.clientWidth*devicePixelRatio,H=cv.height=cv.clientHeight*devicePixelRatio;
 const an=ac&&_an,fq=new Uint8Array(1024),tm=new Uint8Array(2048);const t=performance.now()/1000;
 if(an){an.getByteFrequencyData(fq);an.getByteTimeDomainData(tm)}let sum=0;for(let i=0;i<1024;i++)sum+=fq[i];
 if(sum<500){for(let i=0;i<1024;i++)fq[i]=Math.max(0,(Math.sin(i/30+t*3)*.5+.5)*(200-i/6)*(t*2.17%1<.15?1.2:.6));for(let i=0;i<2048;i++)tm[i]=128+60*Math.sin(i/40+t*5)*Math.sin(t)}
 let bass=0;for(let i=1;i<12;i++)bass+=fq[i];bass/=11*255;V.avg=V.avg*.95+bass*.05;const beat=bass>V.avg*1.25&&bass>.3&&t-V.lastBeat>.25;if(beat){V.lastBeat=t;V.hue+=40;if($('vauto').checked&&Math.random()<.15)nextMode()}
 if(V.mode=='milk')return milkFrame(W,H);
 const g=cv.getContext('2d');g.fillStyle=`rgba(0,0,0,${V.mode=='tunnel'||V.mode=='particles'?.18:.35})`;g.fillRect(0,0,W,H);const hue=V.hue%360;
 if(V.mode=='bars'){const n=96,bw=W/n;for(let i=0;i<n;i++){const v=fq[Math.floor(Math.pow(i/n,1.7)*700)]/255,h=v*H*.9;g.fillStyle=`hsl(${hue+i*2},100%,${40+v*30}%)`;g.fillRect(i*bw,H-h,bw-2,h);g.fillRect(i*bw,0,bw-2,h*.15)}}
 if(V.mode=='scope'){g.lineWidth=3*devicePixelRatio;g.strokeStyle=`hsl(${hue},100%,60%)`;g.shadowBlur=20;g.shadowColor=g.strokeStyle;g.beginPath();for(let i=0;i<2048;i+=2){const x=i/2048*W,y=H/2+(tm[i]-128)/128*H*.45;i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();g.shadowBlur=0}
 if(V.mode=='radial'){const cx=W/2,cy=H/2,R0=Math.min(W,H)*(.18+bass*.12);g.save();g.translate(cx,cy);g.rotate(t*.3);for(let i=0;i<180;i++){const v=fq[i*3]/255,a=i/180*Math.PI*2;g.strokeStyle=`hsl(${hue+i*2},100%,60%)`;g.lineWidth=3;g.beginPath();g.moveTo(Math.cos(a)*R0,Math.sin(a)*R0);g.lineTo(Math.cos(a)*(R0+v*R0*1.5),Math.sin(a)*(R0+v*R0*1.5));g.stroke()}
  g.fillStyle=`hsla(${hue+180},100%,50%,${.3+bass*.5})`;g.beginPath();g.arc(0,0,R0*.8,0,7);g.fill();g.restore()}
 if(V.mode=='tunnel'){const cx=W/2,cy=H/2;for(let k=0;k<14;k++){const z=((t*(.6+bass)+k/14)%1),r=Math.pow(z,2.2)*Math.max(W,H);g.strokeStyle=`hsla(${hue+k*25},100%,60%,${z})`;g.lineWidth=2+z*8;g.beginPath();
  for(let s=0;s<=6;s++){const a=s/6*Math.PI*2+t*.4+k*.1;s?g.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):g.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}g.stroke()}}
 if(V.mode=='particles'){if(beat)for(let i=0;i<80;i++){const a=Math.random()*7,s=(2+Math.random()*8)*devicePixelRatio;V.parts.push({x:W/2,y:H/2,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:1,h:hue+Math.random()*60})}
  if(V.parts.length<40)V.parts.push({x:Math.random()*W,y:H,vx:0,vy:-2-Math.random()*3,l:1,h:hue});V.parts=V.parts.filter(p=>(p.x+=p.vx,p.y+=p.vy,p.l-=.008,p.l>0));
  V.parts.forEach(p=>{g.fillStyle=`hsla(${p.h},100%,60%,${p.l})`;g.beginPath();g.arc(p.x,p.y,(2+bass*6)*devicePixelRatio,0,7);g.fill()})}}
function milkFrame(W,H){if(!V.milk){if(!window.butterchurn)throw new Error('viz: Butterchurn niedostępny');const bc=butterchurn.default||butterchurn;AC();const cv=$('vc');
  V.milk=bc.createVisualizer(ac,cv,{width:W,height:H});V.milk.connectAudio(ANALYSER());const ps=(window.butterchurnPresets&&(butterchurnPresets.default||butterchurnPresets).getPresets())||{};V.presets=Object.values(ps);if(V.presets.length)V.milk.loadPreset(V.presets[Math.floor(Math.random()*V.presets.length)],0)}
 V.milk.setRendererSize(W,H);V.milk.render()}
function nextMode(){const o=[...$('vmode').options].map(o=>o.value);setMode(o[(o.indexOf(V.mode)+1)%o.length])}
function setMode(m){if(V.mode=='milk'||m=='milk'){const old=$('vc'),n=old.cloneNode();n.onclick=old.onclick;old.replaceWith(n);V.milk=null}V.mode=m;$('vmode').value=m}
RESET.viz=()=>{V.milk=null;V.parts=[];const old=$('vc'),n=old.cloneNode();old.replaceWith(n);n.onclick=()=>nextMode();V.mode='bars';$('vmode').value='bars'};

/* ---------- Old versions ---------- */
const OLD=[['old/mc707-companion/index.html','D7 DJ · PRO8 Fluid','Główna wersja PRO8 (MC-707 Companion)'],['old/mc707-companion/pro-dj.html','PRO DJ · PRO8 Fluid','Wirtualne decki PRO DJ'],['old/mc707-companion/pro-dj-classic.html','PRO DJ Classic · MilkDrop 1080p','Decki + MilkDrop'],
 ['old/mc707-companion/classic.html','D7 DJ Classic','Klasyczny interfejs'],['old/mc707-companion/v51.html','D7 DJ · X7S v51','Wersja X7S v51'],['old/mc707-companion/app.html','D7 DJ ONE','Aplikacja ONE'],
 ['old/mc707-companion/kali.html','KALI RADIO · Butterchurn','Radio + wizualizacje'],['old/mc707-companion/kali-live.html','KALI LIVE · PRO8','Kali na żywo'],['old/mc707-companion/kali-live-classic.html','KALI LIVE · MilkDrop','Kali Classic'],
 ['old/mc707-companion/radio-gen.html','D7 Radio + Techno Generator','Radio i generator techno'],['old/mc707-companion/superapp.html','Super G 🐲 · D7 DJ','Super G'],['old/mc707-companion/superbotg.html','Super Bot G · D7 DJ 2077','Bot G'],
 ['old/mc707-companion/g.html','😈 Super Bot G','Bot G (czat)'],['old/mc707-companion/super.html','D7 SUPER','D7 Super'],['old/dd-dj/program.html','DD DJ 7777777 · PSY PRO FINAL','Trance radio + psychodeliczny visualizer'],
 ['old/dd-dj/kali-radio-psy-pro.html','DD DJ 7777777 · Kali Radio PSY PRO','Wariant z Kali Radio'],['old/kali-radio/index.html','KALI RADIO · Butterchurn (stand-alone)','Pierwsza wersja Kali Radio'],['old/superapp/superapp.html','D7 SUPER APP FULL','Super App z APK']];

/* ---------- init ---------- */
guard('core',()=>{
 dA=new Deck('deckA','A');dB=new Deck('deckB','B');
 $('xf').oninput=applyXF;$('xfA').onclick=()=>glideXF(0,1);$('xfB').onclick=()=>glideXF(1,1);
 $('vmode').onchange=e=>setMode(e.target.value);$('vc').onclick=()=>nextMode();
 $('vfs').onclick=()=>{const b=$('vizBox');document.fullscreenElement?document.exitFullscreen():(b.requestFullscreen||b.webkitRequestFullscreen).call(b)};
 $('oldList').innerHTML=OLD.map(([u,t,d])=>`<div class="card bot"><h3>${t}</h3><p class="mono">${d}</p><a href="${u}" target="_blank">Otwórz ↗</a> · <a href="#" data-emb="${u}">Osadź</a></div>`).join('');
 $('oldList').onclick=e=>{const u=e.target.dataset.emb;if(u){e.preventDefault();const f=$('oldFrame');f.style.display='block';f.src=u;f.scrollIntoView()}};
 $('selfTest').onclick=guard('core',async()=>{errLog.unshift('— test —');
   const t=async(m,fn)=>{try{await fn();MODS[m].ok=true;errLog.unshift(`✔ ${m}`)}catch(e){report(m,e)}};
   await t('gen',async()=>{gen();mutate();const b=await renderLoop(1,0);if(!b.length)throw Error('pusty render')});
   await t('decks',()=>{if(!dA.r('play'))throw Error('brak UI decku');applyXF()});
   await t('viz',()=>{if(!$('vc').getContext&&V.mode!='milk')throw Error('canvas')});
   await t('chat',()=>{if(!answer('midi').includes('MC-707'))throw Error('odpowiedź')});renderSys()});
 $('crashTest').onclick=()=>{setTimeout(()=>{throw new Error('viz: symulowana awaria')})};
 BD['Zorg']='Jestem Zorg, przewodnik po D7 Music AI PRO!';
 renderSys();
})();
// Zorg knows PRO features
const _ans=answer;answer=function(q){const l=q.toLowerCase();
 if(/deck|crossfad|sync|cue|mikser|mixer/.test(l))return 'W zakładce Decki masz dwa decki jak w Pioneerze: wczytaj plik, pętlę albo radio, PLAY i CUE, pitch, automatyczne BPM, SYNC, crossfader, EQ i filtr.';
 if(/auto.?mix|automix/.test(l))return 'Auto-mix sam przechodzi między deckami na beat co ustaloną liczbę taktów i generuje nowe pętle.';
 if(/wizual|visual|viz|milkdrop/.test(l))return 'Wizualizer ma sześć trybów, w tym MilkDrop, reaguje na muzykę i działa na pełnym ekranie.';
 if(/stars|wersj|archiw/.test(l))return 'W zakładce Starsze wersje są twoje dawne aplikacje: PRO8, PRO DJ, Kali Radio, DD DJ 7777777 i inne.';
 if(/self|błęd|blad|napraw/.test(l))return 'Self-check łapie błędy i automatycznie resetuje zepsuty moduł.';return _ans(q)};
// loops
setInterval(guard('decks',()=>{dA.tick();dB.tick()}),60);
setInterval(guard('automix',autoMixTick),250);
(function loop(){try{vizFrame()}catch(e){report('viz',e)}requestAnimationFrame(loop)})();
/* ---------- Super Bot G PRO: AUTO DJ ---------- */
const _ans2=answer;answer=function(q){const l=q.toLowerCase();if(/super ?g|bot ?g\b|\bg\b|auto ?dj|autopilot/.test(l))return BD['Super Bot G PRO'];return _ans2(q)};
const GL=[['Auto-mix (16 taktów)',()=>$('autoMix').checked],['Auto nowa pętla',()=>$('autoGen').checked],['Wizualizacje na beat',()=>$('vauto').checked],['Deck A gra',()=>dA.playing],['Deck B gra',()=>dB.playing],['Self-check',()=>Object.values(MODS).every(m=>m.ok)]];
function gRender(){$('gLights').innerHTML=GL.map(([n,f])=>{let v=false;try{v=f()}catch(e){}return`<div class="card"><span class="light ${v?'on':(n=='Self-check'?'warn':'')}"></span>${n}</div>`}).join('');
 $('gInfo').textContent=$('amStat').textContent||'Super Bot G PRO czeka na start.'}
$('gGo').onclick=guard('automix',async()=>{AC();$('amBars').value='16';$('autoGen').checked=true;$('vauto').checked=true;$('xf').value=0;applyXF();if(!dA.buf)await dA.loadLoop();if(!dA.playing)dA.play();$('autoMix').checked=true;say('Super Bot G PRO przejmuje stery. Auto DJ włączony!')});
$('gStop').onclick=guard('automix',()=>{$('autoMix').checked=false;$('autoGen').checked=false;$('vauto').checked=false;dA.pause();dB.pause();say('Super Bot G PRO kończy set. Dzięki!')});
setInterval(guard('automix',gRender),500);
