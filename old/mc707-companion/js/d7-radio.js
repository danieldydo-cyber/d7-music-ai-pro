/* D7 Radio v51: internet radio + live visualizer (floating, non-intrusive) */
(function(){
  if (window.__d7radio) return; window.__d7radio = 1;
  var ST = [
    ['SomaFM Groove Salad','https://ice1.somafm.com/groovesalad-128-mp3'],
    ['SomaFM DEF CON (techno)','https://ice1.somafm.com/defcon-128-mp3'],
    ['SomaFM Beat Blender','https://ice1.somafm.com/beatblender-128-mp3'],
    ['SomaFM Space Station','https://ice1.somafm.com/spacestation-128-mp3'],
    ['SomaFM Fluid (hip-hop)','https://ice1.somafm.com/fluid-128-mp3'],
    ['Radio 357 (PL)','https://stream.radio357.pl/'],
    ['RMF MAXX (PL)','https://rs101-krk.rmfstream.pl/RMFMAXXX48']
  ];
  function el(t,c,h){var e=document.createElement(t);if(c)e.style.cssText=c;if(h)e.innerHTML=h;return e;}
  function init(){
    var btn=el('button','position:fixed;left:10px;bottom:10px;z-index:99998;border:0;border-radius:22px;padding:9px 13px;background:#7b2ff7;color:#fff;font:600 14px sans-serif;box-shadow:0 2px 10px #0008','📻 Radio');
    var p=el('div','position:fixed;left:10px;bottom:56px;z-index:99999;width:min(320px,92vw);background:#111a;backdrop-filter:blur(8px);color:#fff;border:1px solid #7b2ff7;border-radius:12px;padding:10px;font:13px sans-serif;display:none');
    var sel=el('select','width:100%;margin-bottom:6px;padding:6px;background:#222;color:#fff;border:1px solid #555;border-radius:6px');
    ST.forEach(function(s,i){var o=el('option');o.value=i;o.textContent=s[0];sel.appendChild(o);});
    var row=el('div','display:flex;gap:6px;align-items:center');
    var play=el('button','flex:1;padding:6px;border:0;border-radius:6px;background:#2fd47b;font-weight:700','▶ Graj');
    var vol=el('input','flex:1');vol.type='range';vol.min=0;vol.max=1;vol.step=0.01;vol.value=0.8;
    var st=el('div','margin-top:6px;opacity:.8;min-height:16px','');
    var cv=el('canvas','width:100%;height:70px;margin-top:6px;background:#000;border-radius:6px');cv.width=300;cv.height=70;
    row.appendChild(play);row.appendChild(vol);p.appendChild(sel);p.appendChild(row);p.appendChild(cv);p.appendChild(st);
    document.body.appendChild(p);document.body.appendChild(btn);
    btn.onclick=function(){p.style.display=p.style.display==='none'?'block':'none';};
    var a=null,ctx=null,an=null,real=false,raf=0;
    try{sel.value=localStorage.getItem('d7-radio-st')||0;}catch(e){}
    function stop(){if(a){a.pause();a.src='';a=null;}play.textContent='▶ Graj';cancelAnimationFrame(raf);}
    function draw(){
      var g=cv.getContext('2d'),w=cv.width,h=cv.height,n=48,d=new Uint8Array(n);
      (function f(){raf=requestAnimationFrame(f);
        if(real&&an){var full=new Uint8Array(an.frequencyBinCount);an.getByteFrequencyData(full);for(var i=0;i<n;i++)d[i]=full[Math.floor(i*full.length/n/1.5)];}
        else{var t=Date.now()/180;for(var i=0;i<n;i++)d[i]=a&&!a.paused?(120+90*Math.sin(t+i*.5)*Math.sin(t*.37+i))|0:0;}
        g.fillStyle='#0006';g.fillRect(0,0,w,h);
        for(var i=0;i<n;i++){var v=d[i]/255*h;g.fillStyle='hsl('+(260+i*3)+',90%,'+(45+v/h*25)+'%)';g.fillRect(i*w/n+1,h-v,w/n-2,v);}
      })();
    }
    function start(cors){
      stop();var s=ST[sel.value];a=new Audio();if(cors)a.crossOrigin='anonymous';
      a.src=s[1];a.volume=+vol.value;st.textContent='Łączenie: '+s[0]+'…';real=false;
      a.onplaying=function(){st.textContent='▶ '+s[0]+(real?'':' (wizualizacja symulowana)');};
      a.onerror=function(){if(cors){start(false);}else{st.textContent='❌ Stacja niedostępna — wybierz inną';}};
      if(cors){try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();ctx.resume();var src=ctx.createMediaElementSource(a);an=ctx.createAnalyser();an.fftSize=256;src.connect(an);an.connect(ctx.destination);real=true;}catch(e){real=false;}}
      a.play().catch(function(e){st.textContent='Dotknij ▶ ponownie ('+e.name+')';});
      play.textContent='■ Stop';draw();
    }
    play.onclick=function(){a?stop():start(true);};
    sel.onchange=function(){try{localStorage.setItem('d7-radio-st',sel.value);}catch(e){} if(a)start(true);};
    vol.oninput=function(){if(a)a.volume=+vol.value;};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
