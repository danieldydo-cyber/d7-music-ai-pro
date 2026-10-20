/* D7 DJ ONE v54 PRO layer: hot cues, FX (filter/echo/reverb/flanger), key+BPM, set recorder (WAV/WebM),
 * library with drag-load, keyboard shortcuts, bot quick actions + group chat, AutoFix/SuperCharger as known peers. */
(function () {
  var O = window.ONE; if (!O) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var AC = O.ctx(), decks = O.decks;
  var PRO = window.ONEPRO = { cues: { A: [null, null, null, null], B: [null, null, null, null] }, fx: {}, lib: [], rec: null };

  // ---------------- key detection (chroma + Krumhansl profiles)
  var NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  var CAM = { 'C': '8B', 'G': '9B', 'D': '10B', 'A': '11B', 'E': '12B', 'B': '1B', 'F#': '2B', 'C#': '3B', 'G#': '4B', 'D#': '5B', 'A#': '6B', 'F': '7B', 'Am': '8A', 'Em': '9A', 'Bm': '10A', 'F#m': '11A', 'C#m': '12A', 'G#m': '1A', 'D#m': '2A', 'A#m': '3A', 'Fm': '4A', 'Cm': '5A', 'Gm': '6A', 'Dm': '7A' };
  function detectKey(buf) {
    var sr = buf.sampleRate, ch = buf.getChannelData(0), chroma = new Array(12).fill(0), N = 4096;
    var start = Math.floor(Math.min(buf.duration * 0.2, 20) * sr), segs = 24, hopS = Math.floor(Math.min(ch.length - start - N, sr * 60) / segs);
    if (hopS <= 0) { start = 0; hopS = Math.max(1, Math.floor((ch.length - N) / segs)); }
    for (var sg = 0; sg < segs; sg++) {
      var off = start + sg * hopS; if (off + N > ch.length) break;
      for (var pc = 0; pc < 12; pc++) for (var oct = 3; oct <= 5; oct++) {
        var f = 440 * Math.pow(2, (pc - 9) / 12 + (oct - 4)), w = 2 * Math.PI * f / sr, cw = 2 * Math.cos(w), s1 = 0, s2 = 0;
        for (var i = 0; i < N; i += 2) { var s0 = ch[off + i] + cw * s1 - s2; s2 = s1; s1 = s0; }
        chroma[pc] += s1 * s1 + s2 * s2 - cw * s1 * s2;
      }
    }
    function corr(p, r) { var a = 0, b = 0, c = 0, mx = chroma.reduce(function (x, y) { return x + y; }, 0) / 12, mp = p.reduce(function (x, y) { return x + y; }, 0) / 12; for (var i = 0; i < 12; i++) { var x = chroma[(i + r) % 12] - mx, y = p[i] - mp; a += x * y; b += x * x; c += y * y; } return a / Math.sqrt(b * c || 1); }
    var best = { s: -2, k: 'C' };
    for (var r = 0; r < 12; r++) { var m = corr(MAJ, r), n = corr(MIN, r); if (m > best.s) best = { s: m, k: NOTES[r] }; if (n > best.s) best = { s: n, k: NOTES[r] + 'm' }; }
    return { key: best.k, camelot: CAM[best.k] || '', conf: +best.s.toFixed(2) };
  }
  PRO.detectKey = detectKey;

  // ---------------- per-deck FX chain: hi -> filter -> [dry + echo + reverb + flanger] -> gain
  function impulse(sec, decay) { var len = AC.sampleRate * sec, b = AC.createBuffer(2, len, AC.sampleRate); for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); } return b; }
  function buildFx(d) {
    var f = {};
    f.filter = AC.createBiquadFilter(); f.filter.type = 'allpass'; f.out = AC.createGain();
    f.dry = AC.createGain();
    f.echo = AC.createDelay(2); f.echoFb = AC.createGain(); f.echoWet = AC.createGain(); f.echoWet.gain.value = 0; f.echoFb.gain.value = 0.45;
    f.rev = AC.createConvolver(); f.rev.buffer = impulse(2.4, 2.5); f.revWet = AC.createGain(); f.revWet.gain.value = 0;
    f.fl = AC.createDelay(0.05); f.fl.delayTime.value = 0.004; f.flLfo = AC.createOscillator(); f.flLfo.frequency.value = 0.25; f.flDepth = AC.createGain(); f.flDepth.gain.value = 0.003; f.flFb = AC.createGain(); f.flFb.gain.value = 0.5; f.flWet = AC.createGain(); f.flWet.gain.value = 0;
    f.flLfo.connect(f.flDepth); f.flDepth.connect(f.fl.delayTime); f.flLfo.start();
    try { d.hi.disconnect(); } catch (_) {}
    d.hi.connect(f.filter);
    f.filter.connect(f.dry); f.dry.connect(f.out);
    f.filter.connect(f.echo); f.echo.connect(f.echoFb); f.echoFb.connect(f.echo); f.echo.connect(f.echoWet); f.echoWet.connect(f.out);
    f.filter.connect(f.rev); f.rev.connect(f.revWet); f.revWet.connect(f.out);
    f.filter.connect(f.fl); f.fl.connect(f.flFb); f.flFb.connect(f.fl); f.fl.connect(f.flWet); f.flWet.connect(f.out);
    f.out.connect(d.gain);
    f.set = function (k, v) {
      v = +v;
      if (k === 'filter') { if (Math.abs(v) < 0.03) { f.filter.type = 'allpass'; } else if (v < 0) { f.filter.type = 'lowpass'; f.filter.frequency.value = 20000 * Math.pow(0.005, -v); f.filter.Q.value = 6; } else { f.filter.type = 'highpass'; f.filter.frequency.value = 20 * Math.pow(400, v); f.filter.Q.value = 6; } }
      if (k === 'echo') { f.echoWet.gain.value = v; f.echo.delayTime.value = Math.min(2, 60 / ((d.bpm || 120) * d.rate) * 0.75); }
      if (k === 'reverb') f.revWet.gain.value = v * 1.4;
      if (k === 'flanger') { f.flWet.gain.value = v; }
      f.state[k] = v;
    };
    f.state = { filter: 0, echo: 0, reverb: 0, flanger: 0 };
    return f;
  }

  // ---------------- UI per deck: cues, fx knobs, key/bpm
  ['A', 'B'].forEach(function (id) {
    var d = decks[id]; if (!d) return;
    var fx = PRO.fx[id] = buildFx(d);
    var box = document.createElement('div'); box.className = 'pro';
    box.innerHTML = '<div class="row" style="margin-top:6px"><b class="kb" title="Tonacja / Camelot · BPM">🎼 — · — BPM</b></div>' +
      '<div class="row" style="margin-top:6px">' + [0, 1, 2, 3].map(function (i) { return '<button class="btn hc" data-i="' + i + '" title="klik = ustaw/skocz · Shift/długi = usuń">CUE ' + (i + 1) + '</button>'; }).join('') + '</div>' +
      '<div class="row" style="margin-top:6px">' + [['filter', '🎚 Filter', -1, 1], ['echo', '🔁 Echo', 0, 0.9], ['reverb', '🌊 Reverb', 0, 1], ['flanger', '🌀 Flanger', 0, 1]].map(function (k) { return '<label style="font-size:12px">' + k[1] + '<input class="fx" data-k="' + k[0] + '" type="range" min="' + k[2] + '" max="' + k[3] + '" step="0.01" value="0" style="width:90px"></label>'; }).join('') + '<button class="btn fxoff">FX off</button></div>';
    d.el.appendChild(box);
    var kb = $('.kb', box);
    function paintKB() { var k = d.key; kb.textContent = '🎼 ' + (k ? k.key + ' (' + k.camelot + ')' : '—') + ' · ' + (d.buf ? (d.bpm * d.rate).toFixed(1) : '—') + ' BPM'; }
    PRO['paint' + id] = paintKB;
    var dec = d.decode; d.decode = function (ab, name) { return dec.call(d, ab, name).then(function (b) { try { d.key = detectKey(b); } catch (e) { d.key = null; } PRO.cues[id] = [null, null, null, null]; paintCues(); paintKB(); return b; }); };
    var sr = d.setRate; d.setRate = function (r) { sr.call(d, r); paintKB(); if (fx.state.echo) fx.set('echo', fx.state.echo); };
    function paintCues() { box.querySelectorAll('.hc').forEach(function (b) { var c = PRO.cues[id][+b.dataset.i]; b.classList.toggle('pri', c != null); b.textContent = 'CUE ' + (+b.dataset.i + 1) + (c != null ? ' · ' + c.toFixed(1) + 's' : ''); }); }
    PRO['cue' + id] = function (i, clear) {
      if (!d.buf) return null;
      if (clear) { PRO.cues[id][i] = null; paintCues(); return null; }
      var c = PRO.cues[id][i];
      if (c == null) { PRO.cues[id][i] = d.pos(); paintCues(); return PRO.cues[id][i]; }
      var was = d.playing; if (was) d.stop(); d.offset = c; d.start(); d.draw(); return c;
    };
    box.querySelectorAll('.hc').forEach(function (b) { b.onclick = function (e) { PRO['cue' + id](+b.dataset.i, e.shiftKey); }; b.oncontextmenu = function (e) { e.preventDefault(); PRO['cue' + id](+b.dataset.i, true); }; });
    box.querySelectorAll('.fx').forEach(function (s) { s.oninput = function () { fx.set(s.dataset.k, s.value); }; });
    $('.fxoff', box).onclick = function () { box.querySelectorAll('.fx').forEach(function (s) { s.value = 0; fx.set(s.dataset.k, 0); }); };
    // drag-load onto the deck
    d.el.addEventListener('dragover', function (e) { e.preventDefault(); d.el.style.outline = '2px dashed #00e5ff'; });
    d.el.addEventListener('dragleave', function () { d.el.style.outline = ''; });
    d.el.addEventListener('drop', function (e) {
      e.preventDefault(); d.el.style.outline = '';
      var u = e.dataTransfer.getData('text/d7-track'), f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (u) { var t = PRO.lib.filter(function (x) { return x.url === u; })[0]; d.loadUrl(u).then(function () { if (t) d.el.querySelector('.nm').textContent = t.name; }); }
      else if (f) { addFiles([f]); f.arrayBuffer().then(function (ab) { d.decode(ab, f.name); }); }
    });
  });

  // ---------------- library + recorder + shortcuts panel
  var P = $('#proDj');
  P.innerHTML = '<div class="row"><b>📚 Biblioteka</b><label class="btn">➕ Dodaj pliki<input type="file" id="libAdd" accept="audio/*" multiple hidden></label><input id="libQ" placeholder="filtr…" style="width:140px"><span style="font-size:12px;opacity:.7">przeciągnij utwór na Deck A/B · dwuklik = A</span></div>' +
    '<div id="lib" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px;margin-top:6px;max-height:200px;overflow:auto"></div>' +
    '<div class="row" style="margin-top:10px"><b>⏺ Nagrywanie seta</b><button class="btn pri" id="recBtn">⏺ Start</button><select id="recFmt"><option value="wav">WAV</option><option value="webm">WebM</option></select><span id="recSt" style="font-size:13px"></span><span id="recDl"></span></div>' +
    '<p style="font-size:12px;opacity:.7;margin:8px 0 0">⌨ Skróty: Q/P = play A/B · 1-4 / 7-0 = hot cue A/B (Shift = usuń) · S = SYNC B→A · ←/→ = crossfader · Z/X/C = filtr A w dół / zero / w górę · Spacja = beat · R = nagrywanie · F = pełny ekran viz</p>';
  function libName(u) { return decodeURIComponent(u.split('/').pop()).replace(/\.(mp3|wav|ogg|m4a|flac)$/i, ''); }
  O.tracks.forEach(function (u) { PRO.lib.push({ name: libName(u), url: u, src: 'builtin' }); });
  function addFiles(files) { [].forEach.call(files, function (f) { if (PRO.lib.some(function (x) { return x.name === f.name; })) return; PRO.lib.push({ name: f.name, url: URL.createObjectURL(f), src: 'local' }); }); paintLib(); }
  function paintLib() {
    var q = ($('#libQ').value || '').toLowerCase();
    $('#lib').innerHTML = PRO.lib.filter(function (t) { return !q || t.name.toLowerCase().indexOf(q) !== -1; }).map(function (t) { return '<div class="st libt" draggable="true" data-u="' + esc(t.url) + '">🎵 ' + esc(t.name) + '<small>' + t.src + ' · <a href="#" data-to="A">→A</a> <a href="#" data-to="B">→B</a></small></div>'; }).join('');
    $('#lib').querySelectorAll('.libt').forEach(function (el) {
      el.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/d7-track', el.dataset.u); });
      el.ondblclick = function () { loadTo('A', el.dataset.u); };
      el.querySelectorAll('[data-to]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); loadTo(a.dataset.to, el.dataset.u); }; });
    });
  }
  function loadTo(id, u) { var t = PRO.lib.filter(function (x) { return x.url === u; })[0]; return decks[id].loadUrl(u).then(function () { if (t) decks[id].el.querySelector('.nm').textContent = t.name; }); }
  PRO.loadTo = loadTo; PRO.addFiles = addFiles;
  $('#libAdd').onchange = function () { addFiles(this.files); }; $('#libQ').oninput = paintLib; paintLib();

  // recorder: taps master
  function encodeWav(chs, sr) {
    var n = chs[0].length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf), o = 0;
    function s(t) { for (var i = 0; i < t.length; i++) v.setUint8(o++, t.charCodeAt(i)); } function u32(x) { v.setUint32(o, x, true); o += 4; } function u16(x) { v.setUint16(o, x, true); o += 2; }
    s('RIFF'); u32(36 + n * 4); s('WAVE'); s('fmt '); u32(16); u16(1); u16(2); u32(sr); u32(sr * 4); u16(4); u16(16); s('data'); u32(n * 4);
    for (var i = 0; i < n; i++) for (var c = 0; c < 2; c++) { var x = Math.max(-1, Math.min(1, chs[c][i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; }
    return new Blob([buf], { type: 'audio/wav' });
  }
  PRO.startRec = function (fmt) {
    if (PRO.rec) return; fmt = fmt || $('#recFmt').value; var M = O.master(), r = { fmt: fmt, t0: Date.now() };
    if (fmt === 'webm' && window.MediaRecorder) {
      r.dest = AC.createMediaStreamDestination(); M.connect(r.dest); r.chunks = [];
      r.mr = new MediaRecorder(r.dest.stream); r.mr.ondataavailable = function (e) { if (e.data.size) r.chunks.push(e.data); }; r.mr.start(500);
    } else {
      r.fmt = 'wav'; r.L = []; r.R = []; r.sp = AC.createScriptProcessor(4096, 2, 2);
      r.sp.onaudioprocess = function (e) { r.L.push(new Float32Array(e.inputBuffer.getChannelData(0))); r.R.push(new Float32Array(e.inputBuffer.getChannelData(1))); };
      r.mute = AC.createGain(); r.mute.gain.value = 0; M.connect(r.sp); r.sp.connect(r.mute); r.mute.connect(AC.destination);
    }
    PRO.rec = r; $('#recBtn').textContent = '⏹ Stop'; $('#recDl').innerHTML = '';
    r.tick = setInterval(function () { $('#recSt').textContent = '● REC ' + ((Date.now() - r.t0) / 1000).toFixed(0) + ' s (' + r.fmt.toUpperCase() + ')'; }, 500);
  };
  PRO.stopRec = function () {
    var r = PRO.rec; if (!r) return Promise.resolve(null); PRO.rec = null; clearInterval(r.tick); $('#recBtn').textContent = '⏺ Start';
    var name = 'D7-set-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    var done = function (blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.' + r.fmt; a.className = 'btn'; a.textContent = '⬇ ' + a.download + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)'; $('#recDl').innerHTML = ''; $('#recDl').appendChild(a); $('#recSt').textContent = '✓ gotowe'; PRO.lastRec = blob; return blob; };
    if (r.mr) return new Promise(function (res) { r.mr.onstop = function () { try { O.master().disconnect(r.dest); } catch (_) {} res(done(new Blob(r.chunks, { type: 'audio/webm' }))); }; r.mr.stop(); });
    try { O.master().disconnect(r.sp); r.sp.disconnect(); } catch (_) {}
    function cat(a) { var n = a.reduce(function (s, x) { return s + x.length; }, 0), o = new Float32Array(n), k = 0; a.forEach(function (x) { o.set(x, k); k += x.length; }); return o; }
    return Promise.resolve(done(encodeWav([cat(r.L), cat(r.R)], AC.sampleRate)));
  };
  $('#recBtn').onclick = function () { AC.resume(); if (PRO.rec) PRO.stopRec(); else PRO.startRec(); };

  // keyboard shortcuts (DJ tab, not while typing)
  document.addEventListener('keydown', function (e) {
    var t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (!$('#s-dj').classList.contains('on') && !/^[fF]$/.test(e.key)) return;
    var k = e.key, xf = $('#xf'), A = decks.A, B = decks.B; AC.resume();
    var cueA = { '1': 0, '2': 1, '3': 2, '4': 3, '!': 0, '@': 1, '#': 2, '$': 3 }, cueB = { '7': 0, '8': 1, '9': 2, '0': 3, '&': 0, '*': 1, '(': 2, ')': 3 };
    if (k === 'q' || k === 'Q') A.toggle(); else if (k === 'p' || k === 'P') B.toggle();
    else if (k in cueA) PRO.cueA(cueA[k], e.shiftKey); else if (k in cueB) PRO.cueB(cueB[k], e.shiftKey);
    else if (k === 's' || k === 'S') { if (A.buf) B.syncTo(A.bpm * A.rate); }
    else if (k === 'ArrowLeft') { xf.value = Math.max(0, +xf.value - 0.05); xf.oninput(); } else if (k === 'ArrowRight') { xf.value = Math.min(1, +xf.value + 0.05); xf.oninput(); }
    else if (k === 'z' || k === 'x' || k === 'c') { var v = k === 'x' ? 0 : Math.max(-1, Math.min(1, PRO.fx.A.state.filter + (k === 'z' ? -0.1 : 0.1))); PRO.fx.A.set('filter', v); var sl = decks.A.el.querySelector('.fx[data-k="filter"]'); if (sl) sl.value = v; }
    else if (k === ' ') $('#seqPlay').click(); else if (k === 'r' || k === 'R') $('#recBtn').click();
    else if (k === 'f' || k === 'F') { var b = document.querySelector('#tabs button[data-t="viz"]'); b.click(); $('#vFs').click(); }
    else return;
    e.preventDefault(); PRO.lastKey = k;
  });

  // ---------------- bots: known peers (AutoFix + SuperCharger always visible), quick actions, group chat
  var KNOWN = [{ id: 'autofix', name: 'AutoFix', icon: '🩺', role: 'diagnoza i naprawa' }, { id: 'supercharger', name: 'SuperCharger', icon: '⚡', role: 'przyspieszanie / boost' }];
  PRO.known = KNOWN;
  function ensureBots() {
    var sel = $('#cBot'); if (!sel) return;
    KNOWN.forEach(function (k) { if (!sel.querySelector('option[value="' + k.id + '"]')) { var o = document.createElement('option'); o.value = k.id; o.textContent = k.icon + ' ' + k.name; sel.appendChild(o); } });
  }
  setInterval(ensureBots, 1500); ensureBots();
  var rs = O.refreshSync;
  function meshPeers() {
    var tb = $('#syMesh'); if (!tb) return;
    KNOWN.forEach(function (k) {
      if ([].some.call(tb.querySelectorAll('tr'), function (tr) { return tr.textContent.indexOf(k.name) !== -1; })) return;
      var tr = document.createElement('tr'); tr.dataset.known = k.id;
      tr.innerHTML = '<td>' + k.icon + ' ' + k.name + '<br><small style="opacity:.6">known peer · ' + esc(k.role) + '</small></td><td class="kst"><span class="dot"></span>sprawdzam…</td><td>' + new Date().toTimeString().slice(0, 5) + '</td>';
      tb.appendChild(tr);
      O.j0('/api/bots').then(function (r) { var on = (r.bots || []).some(function (b) { return b.id === k.id; }); tr.querySelector('.kst').innerHTML = '<span class="dot' + (on ? ' ok' : '') + '"></span>' + (on ? 'online (/api/bots)' : 'offline'); }).catch(function () { tr.querySelector('.kst').innerHTML = '<span class="dot"></span>offline'; });
    });
  }
  PRO.meshPeers = meshPeers;
  new MutationObserver(function () { meshPeers(); }).observe($('#syMesh'), { childList: true });

  function askBot(botId, q, lang) {
    var ctl = new AbortController(); setTimeout(function () { ctl.abort(); }, 40000);
    return fetch('/api/brain', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: q, bot: botId, lang: lang || $('#cLang').value || 'auto' }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { var a = j.answer || j.reply; if (!a) throw new Error('empty'); return { text: a, src: j.source || 'server' }; })
      .catch(function () { return O.pollClient({ name: botId, persona: '' }, q, lang || 'auto').then(function (a) { return { text: '[' + botId + '] ' + a, src: 'pollinations-client' }; }, function () { return { text: '[' + botId + '] ' + window.D7Answers.answer(q), src: 'local' }; }); });
  }
  PRO.askBot = askBot;
  function deckCtx() { var parts = []; ['A', 'B'].forEach(function (id) { var d = decks[id]; if (d.buf) parts.push('Deck ' + id + ': „' + d.el.querySelector('.nm').textContent + '” ' + (d.bpm * d.rate).toFixed(1) + ' BPM' + (d.key ? ', key ' + d.key.key + ' (' + d.key.camelot + ')' : '')); }); return parts.length ? ' Kontekst: ' + parts.join('; ') + '.' : ''; }
  var QUICK = [
    ['🎶 Tracklista', 'Ułóż tracklistę na 60-minutowy set techno/trance 120–128 BPM (10 pozycji: wykonawca – tytuł, BPM, tonacja Camelot), z budowaniem energii.'],
    ['🥁 Rada BPM', 'Daj jedną konkretną radę jak dopasować BPM i fazę między dwoma utworami na deckach.'],
    ['🎧 Pomoc w miksie', 'Jak zrobić płynne przejście między moimi deckami? Podaj kroki: EQ, filtr, echo, kiedy przesunąć crossfader.'],
    ['🎹 MC-707', 'Jak zsynchronizować Roland MC-707 z tą aplikacją przez MIDI clock i co ustawić w MC-707?'],
    ['🩺 AutoFix', 'Sprawdź stan aplikacji i powiedz, co poprawić.', 'autofix'],
    ['⚡ Boost', 'Jak podkręcić energię seta w następnych 5 minutach?', 'supercharger']
  ];
  $('#quick').innerHTML = '<b style="font-size:13px">⚡ Szybkie akcje:</b>' + QUICK.map(function (q, i) { return '<button class="btn qa" data-i="' + i + '">' + q[0] + '</button>'; }).join('');
  $('#quick').querySelectorAll('.qa').forEach(function (b) { b.onclick = function () { var q = QUICK[+b.dataset.i], bot = q[2] || 'd'; O.addChat('me', q[0] + ' → ' + bot); var m = O.addChat('bot', '…'); askBot(bot, q[1] + deckCtx(), 'pl').then(function (r) { m.textContent = r.text; $('#cSrc').textContent = 'źródło: ' + r.src; }); }; });
  var GROUP = ['d', 'supergrok', 'dragon', 'autofix', 'supercharger', 'superbotd'];
  $('#group').innerHTML = '<b style="font-size:13px">👥 Czat grupowy:</b>' + GROUP.map(function (g) { return '<label style="font-size:12px"><input type="checkbox" class="gb" value="' + g + '"' + (/^(d|dragon|autofix|supercharger)$/.test(g) ? ' checked' : '') + '>' + g + '</label>'; }).join(' ') + '<input id="gIn" placeholder="pytanie do wielu botów…" style="flex:1;min-width:160px"><button class="btn pri" id="gGo">👥 Zapytaj</button>';
  PRO.group = function (q) {
    var ids = [].map.call(document.querySelectorAll('.gb:checked'), function (c) { return c.value; }); if (!q || !ids.length) return Promise.resolve([]);
    O.addChat('me', '👥 [' + ids.join(', ') + '] ' + q);
    return Promise.all(ids.map(function (id) { var m = O.addChat('bot', '[' + id + '] …'); return askBot(id, q).then(function (r) { m.textContent = r.text; return { bot: id, text: r.text, src: r.src }; }); }));
  };
  $('#gGo').onclick = function () { var q = $('#gIn').value.trim(); $('#gIn').value = ''; PRO.group(q); };
  $('#gIn').onkeydown = function (e) { if (e.key === 'Enter') $('#gGo').click(); };
})();
