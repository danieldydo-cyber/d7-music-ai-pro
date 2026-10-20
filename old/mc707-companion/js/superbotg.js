/* Super Bot G v52 — original devil-alien avatar + MilkDrop (butterchurn) visualizer + bot chat */
(function(){
var $=function(i){return document.getElementById(i)};
var log=$('log'),mouth=$('mouth'),st=$('st'),cv=$('viz');
var muted=false,talking=0,ac=null,an=null,viz=null,srcNode=null,audioEl=null,presets={},pkeys=[],pi=0,level=0;
function add(cls,who,t){var d=document.createElement('div');d.className=cls;d.textContent=who+': '+t;log.appendChild(d);log.scrollTop=1e9;}
/* ---- speech (TTS) with mouth animation ---- */
function speak(t){
  t=String(t).replace(/^\[[A-Z]+\]\s*/,'').replace(/[*_#`]/g,'');
  if(muted)return;
  var N=window.D7Native;
  if(N&&N.speak){try{N.speak(t,'pl-PL');talking=Date.now()+Math.min(15000,t.length*65);return;}catch(e){}}
  if(!window.speechSynthesis){talking=Date.now()+t.length*60;return;}
  speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(t);u.lang='pl-PL';u.pitch=0.6;u.rate=1.02;
  var v=speechSynthesis.getVoices().filter(function(x){return /^pl/i.test(x.lang)})[0];if(v)u.voice=v;
  u.onstart=function(){talking=Date.now()+60000};u.onend=u.onerror=function(){talking=0};
  u.onboundary=function(){level=Math.max(level,.9)};
  speechSynthesis.speak(u);talking=Date.now()+Math.min(20000,t.length*70);
}
/* ---- avatar animation ---- */
(function anim(){requestAnimationFrame(anim);var now=Date.now();
  var m=0;
  if(talking>now){m=.35+.65*Math.abs(Math.sin(now/70))*(.6+.4*Math.sin(now/230));}
  else if(an){var d=new Uint8Array(an.frequencyBinCount);an.getByteFrequencyData(d);var s=0;for(var i=0;i<16;i++)s+=d[i];m=Math.min(1,s/16/255)*.35;}
  mouth.setAttribute('ry',(6+m*30).toFixed(1));
  var bob=Math.sin(now/400)*3+(an?m*8:0);$('head').setAttribute('transform','translate(0 '+bob.toFixed(1)+') rotate('+(Math.sin(now/900)*2).toFixed(2)+' 200 165)');
  $('ember').setAttribute('r',(4+2*Math.abs(Math.sin(now/300))).toFixed(1));
  var b=$('bubbles').children;for(var j=0;j<b.length;j++)b[j].setAttribute('transform','translate(0 '+(Math.sin(now/500+j)*4).toFixed(1)+')');
})();
/* ---- local offline replies ---- */
function local(q){q=q.toLowerCase();
  if(/cze|hej|siema|elo/.test(q))return 'Siema! Tu Super Bot G z wanny 2077. Odpalamy bit?';
  if(/techno|graj|muzyk|radio/.test(q)){setSrc('radio');return 'Wrzucam techno z radia i odpalam wizualizacje. Głośniej!';}
  if(/preset|wizual|milk/.test(q)){nextPreset();return 'Nowy preset MilkDrop, czuj klimat 2077.';}
  if(/kim|kto/.test(q))return 'Jestem G — diabelski kosmita-DJ, kumpel bota D i całej ekipy D7.';
  return 'Jestem offline, ale słyszę cię: „'+q+'”. Gdy wróci sieć, zapytam bota D.';}
/* ---- chat routed to main bot (all bots) ---- */
function ask(q){if(!q)return;add('u','Ty',q);$('q').value='';
  var ctl=new AbortController();setTimeout(function(){ctl.abort()},20000);
  fetch('/api/bots/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,text:q,bot:'G',persona:'Super Bot G — wesoły diabeł-kosmita DJ, mów krótko po polsku',source:'superbotg'}),signal:ctl.signal})
  .then(function(r){return r.json()}).then(function(j){var a=j&&(j.reply||j.answer);if(!a||j.offline)throw 0;st.textContent='online · bot '+(j.bot||'D');a=String(a).replace(/^\[[A-Z]+\]\s*/,'');add('g','G',a);speak(a);local_actions(q);})
  .catch(function(){st.textContent='offline · lokalny mózg';var a=local(q);add('g','G',a);speak(a);});
}
function local_actions(q){q=q.toLowerCase();if(/techno|radio/.test(q)&&!audioEl)setSrc('radio');if(/preset/.test(q))nextPreset();}
$('send').onclick=function(){ask($('q').value.trim())};
$('q').onkeydown=function(e){if(e.key==='Enter')ask($('q').value.trim())};
$('mute').onclick=function(){muted=!muted;this.textContent=muted?'🔇':'🔊';if(muted&&window.speechSynthesis)speechSynthesis.cancel();};
/* ---- voice input ---- */
$('mic').onclick=function(){var N=window.D7Native;
  if(N&&N.startListening){window.__d7VoiceG=window.__d7Voice;window.__d7Voice=function(ev){if(ev&&ev.type==='result'){ask(ev.text||ev.transcript||'');window.__d7Voice=window.__d7VoiceG;}};try{N.startListening('pl-PL');}catch(e){}return;}
  var R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){add('g','G','Rozpoznawanie mowy niedostępne tutaj — pisz.');return;}
  var r=new R();r.lang='pl-PL';r.onresult=function(e){ask(e.results[0][0].transcript)};r.start();};
/* ---- MilkDrop visualizer ---- */
function bc(){var m=window.butterchurn;if(!m)return null;if(m.createVisualizer)return m;if(m.default&&m.default.createVisualizer)return m.default;return null;}
function size(){var w=innerWidth,h=innerHeight,d=Math.min(devicePixelRatio||1,1.5);cv.width=w*d;cv.height=h*d;if(viz)viz.setRendererSize(cv.width,cv.height);}
addEventListener('resize',size);
function ensure(){if(ac)return true;ac=new (window.AudioContext||window.webkitAudioContext)();an=ac.createAnalyser();an.fftSize=512;
  var B=bc();if(B){try{size();viz=B.createVisualizer(ac,cv,{width:cv.width,height:cv.height,pixelRatio:1});viz.connectAudio(an);
    try{presets=window.butterchurnPresets.getPresets();}catch(e){presets={};}pkeys=Object.keys(presets);
    var fav=pkeys.filter(function(k){return /flexi|geiss|martin|shifter|rovastar|cope/i.test(k)});pkeys=fav.concat(pkeys.filter(function(k){return fav.indexOf(k)<0}));
    nextPreset(0);(function r(){requestAnimationFrame(r);try{viz.render()}catch(e){}})();
    setInterval(function(){if(audioEl||srcNode)nextPreset(2.5)},25000);}catch(e){viz=null;st.textContent='WebGL niedostępny';}}
  return true;}
function nextPreset(bl){if(!viz||!pkeys.length)return;pi=(pi+1)%pkeys.length;viz.loadPreset(presets[pkeys[pi]],bl===undefined?2:bl);}
$('next').onclick=function(){ensure();nextPreset()};
function stopSrc(){if(audioEl){audioEl.pause();audioEl.src='';audioEl=null;}if(srcNode){try{srcNode.disconnect();srcNode.stop&&srcNode.stop()}catch(e){}srcNode=null;}}
function setSrc(k){$('src').value=k;ensure();ac.resume();stopSrc();
  if(k==='radio'){audioEl=new Audio();audioEl.crossOrigin='anonymous';audioEl.src='https://ice1.somafm.com/defcon-128-mp3';
    srcNode=ac.createMediaElementSource(audioEl);srcNode.connect(an);srcNode.connect(ac.destination);audioEl.play().catch(function(){add('g','G','Dotknij ▶ jeszcze raz, żeby ruszyć radio.')});}
  else if(k==='mic'){navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){srcNode=ac.createMediaStreamSource(s);srcNode.connect(an);}).catch(function(){add('g','G','Brak dostępu do mikrofonu.')});}
  else{var o=ac.createOscillator(),g=ac.createGain();o.type='sawtooth';o.frequency.value=55;o.connect(g);g.connect(an);g.connect(ac.destination);g.gain.value=0;o.start();
    var t=ac.currentTime;for(var i=0;i<480;i++){var b=t+i*0.46875;g.gain.setValueAtTime(.5,b);g.gain.exponentialRampToValueAtTime(.01,b+.3);o.frequency.setValueAtTime(i%8<4?55:41,b);}srcNode=o;}
  $('go').textContent='■ Stop';}
$('go').onclick=function(){if(audioEl||srcNode){stopSrc();this.textContent='▶ Wizualizacja';}else setSrc($('src').value)};
$('src').onchange=function(){if(audioEl||srcNode)setSrc(this.value)};
add('g','G','Siema, tu Super Bot G — diabeł-kosmita z wanny 2077. Pisz albo mów, a ▶ odpali wizualizacje.');
window.SuperBotG={ask:ask,speak:speak,setSrc:setSrc};
})();
