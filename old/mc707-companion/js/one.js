/* D7 DJ ONE v52 (unified app; based on v51 modules) — MilkDrop viz, internet radio, multi-language D chat, bot builder, memory/Google + multi-bot sync panels. */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('d7v51.' + k) || 'null'); localStorage.setItem('d7v51.' + k, JSON.stringify(v)); } catch (_) { return null; } }
  function j0(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  // ---------- tabs
  document.querySelectorAll('#tabs button').forEach(function (b) { b.onclick = function () { document.querySelectorAll('#tabs button').forEach(function (x) { x.classList.toggle('on', x === b); }); document.querySelectorAll('section').forEach(function (s) { s.classList.toggle('on', s.id === 's-' + b.dataset.t); }); if (b.dataset.t === 'sync') refreshSync(); if (b.dataset.t === 'viz') { resize(); initViz(); } if (b.dataset.t === 'super') { var f = $('#superFrame'); if (!f.src) f.src = f.dataset.src; } location.hash = b.dataset.t; }; });
  setTimeout(function () { var h = location.hash.slice(1); var b = document.querySelector('#tabs button[data-t="' + h + '"]'); if (b) b.click(); }, 0);

  // ---------- audio graph shared by radio + mic + viz
  var AC = null, master = null, viz = null, presets = {}, names = [], idx = 0, audioEl = null, srcNode = null, micNode = null, autoT = 0;
  function ctx() { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.connect(AC.destination); } if (AC.state === 'suspended') AC.resume(); return AC; }
  var canvas = $('#viz');
  function resize() { var w = canvas.clientWidth || 800, h = canvas.clientHeight || 450, d = Math.min(window.devicePixelRatio || 1, 2); canvas.width = w * d; canvas.height = h * d; if (viz) viz.setRendererSize(canvas.width, canvas.height); }
  window.addEventListener('resize', resize);
  function initViz() {
    if (viz) return true;
    var bc = window.butterchurn && (window.butterchurn.default || window.butterchurn);
    if (!bc || !bc.createVisualizer) { $('#vInfo').textContent = 'butterchurn niedostępny — fallback: widmo 2D.'; fallback2d(); return false; }
    try {
      [window.butterchurnPresets, window.butterchurnPresetsExtra].forEach(function (P) { try { P = P && (P.default || P); if (P && P.getPresets) Object.assign(presets, P.getPresets()); } catch (_) {} });
      names = Object.keys(presets).sort();
      resize(); ctx();
      viz = bc.createVisualizer(AC, canvas, { width: canvas.width, height: canvas.height, pixelRatio: 1, textureRatio: 1 });
      viz.connectAudio(master);
      $('#vList').innerHTML = names.map(function (n, i) { return '<option value="' + i + '">' + esc(n.slice(0, 70)) + '</option>'; }).join('');
      idx = Math.floor(Math.random() * names.length); load(idx, 0);
      (function loop() { try { viz.render(); } catch (_) {} requestAnimationFrame(loop); })();
      schedule();
      return true;
    } catch (e) { $('#vInfo').textContent = 'WebGL2/butterchurn błąd: ' + e.message + ' — fallback 2D.'; viz = null; fallback2d(); return false; }
  }
  function load(i, blend) { if (!viz || !names.length) return; idx = (i + names.length) % names.length; viz.loadPreset(presets[names[idx]], blend == null ? 2.5 : blend); $('#vList').value = idx; $('#vInfo').textContent = '✨ ' + (idx + 1) + '/' + names.length + ' · ' + names[idx]; ls('preset', names[idx]); }
  function schedule() { clearInterval(autoT); if ($('#vAuto').checked) autoT = setInterval(function () { load(Math.floor(Math.random() * names.length)); }, Math.max(5, +$('#vSec').value || 20) * 1000); }
  function fallback2d() {
    ctx(); var an = AC.createAnalyser(); an.fftSize = 512; master.connect(an); var data = new Uint8Array(an.frequencyBinCount), g2 = canvas.getContext('2d'), t = 0;
    (function draw() { an.getByteFrequencyData(data); t += 0.01; g2.fillStyle = 'rgba(5,6,12,.25)'; g2.fillRect(0, 0, canvas.width, canvas.height); var w = canvas.width / data.length; for (var i = 0; i < data.length; i++) { var v = data[i] / 255; g2.fillStyle = 'hsl(' + ((i * 2 + t * 60) % 360) + ',90%,' + (30 + v * 40) + '%)'; g2.fillRect(i * w, canvas.height * (1 - v), w + 1, canvas.height * v); } requestAnimationFrame(draw); })();
  }
  $('#vNext').onclick = function () { initViz(); load(idx + 1); };
  $('#vRand').onclick = function () { initViz(); load(Math.floor(Math.random() * names.length)); };
  $('#vList').onchange = function () { load(+this.value); };
  $('#vAuto').onchange = $('#vSec').onchange = schedule;
  $('#vFs').onclick = function () { initViz(); (canvas.requestFullscreen || canvas.webkitRequestFullscreen || function () {}).call(canvas); };
  canvas.onclick = function () { initViz(); };
  $('#vMic').onclick = function () {
    ctx(); if (micNode) { micNode.disconnect(); micNode = null; this.textContent = '🎤 Mikrofon'; return; }
    var btn = this; navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) { initViz(); micNode = AC.createMediaStreamSource(s); if (viz) viz.connectAudio(micNode); btn.textContent = '🎤 Mikrofon ON'; }).catch(function (e) { $('#vInfo').textContent = 'Mikrofon: ' + e.message; });
  };
  

  // ---------- radio (radio-browser.info + curated Polish list)
  var MIRRORS = ['https://de1.api.radio-browser.info', 'https://de2.api.radio-browser.info', 'https://fi1.api.radio-browser.info', 'https://nl1.api.radio-browser.info'];
  var CURATED = ['RMF FM', 'Radio ZET', 'Polskie Radio Trójka', 'Polskie Radio Jedynka', 'Polskie Radio Dwójka', 'Radio 357', 'Radio Nowy Świat', 'Chillizet', 'TOK FM', 'Antyradio', 'Eska', 'Open FM', 'Radio Kraków', 'Meloradio', 'Radio Maryja', 'Polskie Radio 24', 'RMF Classic', 'Radio Złote Przeboje', 'VOX FM', 'Radio Plus', 'BBC Radio 1', 'FIP', 'Radio Paradise', 'SomaFM Groove Salad', 'Ibiza Global Radio', 'Sunshine Live', 'Fritz', 'KEXP', 'NTS', 'Deep House Lounge'];
  function api(path) {
    var i = 0;
    function next() { if (i >= MIRRORS.length) return Promise.reject(new Error('radio-browser offline')); var u = MIRRORS[i++] + path; return fetch(u, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(next); }
    return next();
  }
  function clean(list) { var seen = {}; return (list || []).filter(function (s) { var u = s.url_resolved || s.url; if (!u || !/^https:/.test(u) || seen[s.name + u]) return false; seen[s.name + u] = 1; return true; }); }
  function show(list, label) {
    list = clean(list); $('#rInfo').textContent = label + ' · ' + list.length + ' stacji (tylko HTTPS — działa też w APK/tunelu)'; ls('lastStations', list.slice(0, 120));
    $('#stations').innerHTML = list.slice(0, 300).map(function (s, i) { return '<div class="st" data-i="' + i + '"><b>' + esc(s.name.trim().slice(0, 48)) + '</b><small>' + esc([s.countrycode, (s.tags || '').split(',').slice(0, 3).join(', '), s.bitrate ? s.bitrate + ' kbps' : ''].filter(Boolean).join(' · ')) + '</small></div>'; }).join('');
    $('#stations').querySelectorAll('.st').forEach(function (el) { el.onclick = function () { play(list[+el.dataset.i]); }; });
  }
  function query(q) {
    $('#rInfo').textContent = '⏳ Ładuję…';
    var p;
    if (q === 'pl') p = api('/json/stations/bycountrycodeexact/PL?hidebroken=true&order=clickcount&reverse=true&limit=300');
    else if (q === 'top') p = api('/json/stations/topclick/200?hidebroken=true');
    else if (q === 'curated') p = Promise.all(CURATED.map(function (n) { return api('/json/stations/byname/' + encodeURIComponent(n) + '?hidebroken=true&order=clickcount&reverse=true&limit=2').catch(function () { return []; }); })).then(function (a) { return [].concat.apply([], a); });
    else if (q.indexOf('tag:') === 0) p = api('/json/stations/bytag/' + encodeURIComponent(q.slice(4)) + '?hidebroken=true&order=clickcount&reverse=true&limit=200');
    else p = api('/json/stations/search?name=' + encodeURIComponent(q) + '&hidebroken=true&order=clickcount&reverse=true&limit=200').then(function (a) { return a.length ? a : api('/json/stations/search?country=' + encodeURIComponent(q) + '&hidebroken=true&order=clickcount&reverse=true&limit=200'); });
    p.then(function (l) { show(l, q); }, function (e) { var c = ls('lastStations'); if (c) show(c, 'offline cache'); else $('#rInfo').textContent = '⚠ ' + e.message; });
  }
  function play(s) {
    ctx(); var url = s.url_resolved || s.url;
    if (audioEl) { audioEl.pause(); audioEl.src = ''; }
    audioEl = new Audio(); audioEl.crossOrigin = 'anonymous'; audioEl.volume = +$('#rVol').value; audioEl.src = url;
    var routed = false;
    function route() { try { srcNode = AC.createMediaElementSource(audioEl); srcNode.connect(master); routed = true; } catch (_) {} }
    route();
    audioEl.play().then(function () { $('#np').textContent = '▶ ' + s.name.trim(); initViz(); }).catch(function () {
      // stream without CORS → play un-analysed (viz keeps animating on its own)
      audioEl = new Audio(url); audioEl.volume = +$('#rVol').value; audioEl.play().then(function () { $('#np').textContent = '▶ ' + s.name.trim() + ' (bez analizy viz – brak CORS)'; }, function (e) { $('#np').textContent = '⚠ ' + s.name.trim() + ': ' + e.message; });
    });
    ls('lastStation', s);
    try { if (s.stationuuid) api('/json/url/' + s.stationuuid); } catch (_) {}
  }
  document.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { query(b.dataset.q); }; });
  $('#rGo').onclick = function () { var v = $('#rQ').value.trim(); if (v) query(v); };
  $('#rQ').onkeydown = function (e) { if (e.key === 'Enter') $('#rGo').onclick(); };
  $('#rStop').onclick = function () { if (audioEl) audioEl.pause(); $('#np').textContent = '— stop —'; };
  $('#rVol').oninput = function () { if (audioEl) audioEl.volume = +this.value; };
  var radioLoaded = false; document.querySelector('#tabs button[data-t="radio"]').addEventListener('click', function () { if (!radioLoaded) { radioLoaded = true; query('pl'); } });

  // ---------- bots + chat
  var BUILTIN = [{ id: 'd', name: 'D', icon: '👽', lang: 'auto', persona: '', rules: [] }, { id: 'superbotd', name: 'SuperBot D', icon: '🦸', lang: 'auto', persona: '', rules: [] }, { id: 'dragon', name: 'Dragon', icon: '🐉', lang: 'auto', persona: '🐉', rules: [] }, { id: 'autofix', name: 'AutoFix', icon: '🩺', lang: 'auto', persona: '🩺', rules: [{ q: 'napraw', a: '🩺 AutoFix: przeładuj stronę (Ctrl+Shift+R), sprawdź status w zakładce Sync; serwer i tunel monitoruje auto-heal.' }, { q: 'fix', a: '🩺 AutoFix: hard-reload the page and check the Sync tab; server and tunnel are watched by auto-heal.' }] }];
  function bots() { return BUILTIN.concat(ls('bots') || []); }
  function paintBots() { var cur = $('#cBot').value; $('#cBot').innerHTML = bots().map(function (b) { return '<option value="' + esc(b.id) + '">' + esc(b.icon + ' ' + b.name) + '</option>'; }).join(''); if (cur) $('#cBot').value = cur; paintTable(); }
  function add(who, t) { var d = document.createElement('div'); d.className = 'm ' + who; d.textContent = t; $('#log').appendChild(d); $('#log').scrollTop = 1e9; var h = ls('chat') || []; h.push([who, t]); ls('chat', h.slice(-60)); return d; }
  (ls('chat') || []).slice(-20).forEach(function (m) { var d = document.createElement('div'); d.className = 'm ' + m[0]; d.textContent = m[1]; $('#log').appendChild(d); });
  function brain() { try { return JSON.parse(localStorage.getItem('d.web.brain') || 'null'); } catch (_) { return null; } }
  function askBrain(B, bot, text, lang) {
    var sys = 'You are ' + bot.name + ', a helper bot in the D7 DJ app by Daniel Dydo (Kraków). ' + (bot.persona || '') + ' Reply in ' + (lang === 'auto' ? 'the user\'s language' : lang) + '. Max 4 short sentences.';
    var h = { 'Content-Type': 'application/json' }; if (B.key) h.Authorization = 'Bearer ' + B.key;
    return fetch(B.base.replace(/\/$/, '') + '/chat/completions', { method: 'POST', headers: h, body: JSON.stringify({ model: B.model, messages: [{ role: 'system', content: sys }, { role: 'user', content: text }] }) }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) { var c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content; if (!c) throw new Error('pusta odpowiedź'); return c; });
  }
  $('#cForm').onsubmit = function (e) {
    e.preventDefault(); var text = $('#cIn').value.trim(); if (!text) return; $('#cIn').value = '';
    var bot = bots().filter(function (b) { return b.id === $('#cBot').value; })[0] || BUILTIN[0];
    var lang = $('#cLang').value !== 'auto' ? $('#cLang').value : (bot.lang || 'auto');
    add('me', text);
    var local = window.D7Answers.answer(text, { lang: lang, rules: bot.rules });
    var pre = bot.persona ? bot.persona + ' ' : bot.icon + ' ';
    var B = brain(), isFallback = !window.D7Answers.answer(text, { lang: lang, rules: bot.rules, noFallback: true });
    var ACK = /^\W*(\[[^\]]*\]\s*)?(odbieram|ok|okej|przyjeto|przyjąłem|received|roger)\W*$/i;
    if (!isFallback) { add('bot', pre + local); $('#cSrc').textContent = 'źródło: lokalne D7Answers (pewna odpowiedź)'; return; }
    if (!bot.id.startsWith('u-')) {
      var d0 = add('bot', pre + '…'); $('#cSrc').textContent = '';
      fetch('/api/brain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: text, bot: bot.id, lang: lang || 'auto' }) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) { var a = j && (j.answer || j.reply); if (!a || ACK.test(a) || j.source === 'local-rules') throw new Error('ack'); $('#cSrc').textContent = 'źródło: /api/brain (' + (j.source || j.backend || 'server') + ')'; d0.textContent = a; })
        .catch(function () { pollClient(bot, text, lang).then(function (a) { d0.textContent = pre + a; $('#cSrc').textContent = 'źródło: Pollinations (z przeglądarki)'; }, function () { d0.textContent = pre + local; $('#cSrc').textContent = 'źródło: lokalne D7Answers (offline)'; }); });
      return;
    }
    if (B && isFallback) { var d = add('bot', pre + '…'); askBrain(B, bot, text, lang).then(function (r) { d.textContent = pre + r; }, function (er) { d.textContent = pre + local + '\n(mózg AI niedostępny: ' + er.message + ')'; }); }
    else { var d2 = add('bot', pre + '…'); pollClient(bot, text, lang).then(function (a) { d2.textContent = pre + a; $('#cSrc').textContent = 'źródło: Pollinations'; }, function () { d2.textContent = pre + local; }); }
    try { fetch('/api/chat-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text, role: 'user', tags: ['learn'], via: 'v51-' + bot.id }) }).catch(function () {}); } catch (_) {}
  };

  var LN = { pl: 'Polish', en: 'English', de: 'German', uk: 'Ukrainian', ru: 'Russian', es: 'Spanish', fr: 'French' };
  function pollClient(bot, text, lang) {
    var l = lang === 'auto' ? window.D7Answers.detect(text) : lang;
    var sys = 'You are ' + bot.name + ', a helper bot in the D7 DJ app by Daniel Dydo (Kraków). ' + (bot.persona || '') + ' Always answer in ' + (LN[l] || 'the user\'s language') + ', concretely, max 5 short sentences. Never reply with only an acknowledgement.';
    var ctl = new AbortController(); setTimeout(function () { ctl.abort(); }, 25000);
    return fetch('https://text.pollinations.ai/openai', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'openai', private: true, referrer: 'd7-dj', messages: [{ role: 'system', content: sys }, { role: 'user', content: text }] }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) { var c = j.choices && j.choices[0].message.content; if (!c || /^\W*(odbieram|ok)\W*$/i.test(c)) throw new Error('empty'); return c.trim(); });
  }
  // ---------- builder
  function paintTable() { $('#bTable').innerHTML = (ls('bots') || []).map(function (b, i) { return '<tr><td>' + esc(b.icon + ' ' + b.name) + '</td><td>' + esc(b.lang) + '</td><td>' + b.rules.length + '</td><td><button class="btn" data-del="' + i + '">🗑</button></td></tr>'; }).join('') || '<tr><td colspan="4" style="opacity:.6">Brak własnych botów — stwórz pierwszego.</td></tr>'; $('#bTable').querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () { var l = ls('bots') || []; l.splice(+b.dataset.del, 1); ls('bots', l); paintBots(); }; }); }
  $('#bSave').onclick = function () {
    var name = $('#bName').value.trim(); if (!name) return alert('Podaj nazwę');
    var rules = $('#bRules').value.split('\n').map(function (l) { var p = l.split('=>'); return p.length > 1 ? { q: p[0].trim(), a: p.slice(1).join('=>').trim() } : null; }).filter(Boolean);
    var l = ls('bots') || []; var id = 'u-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    l = l.filter(function (b) { return b.id !== id; }); l.push({ id: id, name: name, icon: $('#bIcon').value.trim() || '🤖', lang: $('#bLang').value, persona: $('#bPersona').value.trim(), rules: rules, at: new Date().toISOString() });
    ls('bots', l); paintBots(); $('#cBot').value = id; alert('✓ Zapisano bota ' + name + ' — wybierz go w zakładce Czat D.');
  };
  $('#bExport').onclick = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(ls('bots') || [], null, 1)], { type: 'application/json' })); a.download = 'd7-bots.json'; a.click(); };
  $('#bImport').onchange = function () { var f = this.files[0]; if (!f) return; f.text().then(function (t) { var a = JSON.parse(t); if (Array.isArray(a)) { ls('bots', (ls('bots') || []).concat(a)); paintBots(); } }).catch(function (e) { alert(e.message); }); };
  paintBots();
  j0('/api/bots').then(function (r) { (r.bots || []).forEach(function (b) { if (!BUILTIN.some(function (x) { return x.id === b.id; })) BUILTIN.push({ id: b.id, name: b.name, icon: '🤖', lang: 'auto', persona: '', rules: [] }); (b.subBots || []).forEach(function (sb) { BUILTIN.push({ id: sb.id, name: sb.name, icon: '·', lang: 'auto', persona: '', rules: [] }); }); }); paintBots(); }).catch(function () {});

  // ---------- sync panels
  function dot(ok) { return '<span class="dot' + (ok ? ' ok' : '') + '"></span>'; }
  function j(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function refreshSync() {
    $('#syAt').textContent = 'sprawdzam…';
    j('/api/account-status').then(function (a) {
      $('#syAcc').innerHTML = [['Konto', a.accountName + ' · ' + a.accountEmail, true], ['Google Drive', a.googleDrive + (a.driveFolder ? ' · ' + a.driveFolder : '') + ' · ' + (a.trackCount || 0) + ' utworów', a.googleDrive === 'connected'], ['Gmail', a.gmail, a.gmail === 'connected'], ['X', a.x, a.x === 'connected'], ['Grok bridge', a.grok, a.grok === 'linked'], ['Pamięć zsynchronizowana', (a.synced ? 'tak' : 'nie') + ' · ' + (a.syncedAtLabel || a.syncedAt || ''), a.synced]].map(function (r) { return '<div>' + dot(r[2]) + '<b>' + r[0] + ':</b> ' + esc(r[1]) + '</div>'; }).join('');
    }).catch(function (e) { $('#syAcc').textContent = '⚠ /api/account-status: ' + e.message + ' (offline?)'; });
    j('samples/memory-public.json').then(function (m) { $('#syAcc').insertAdjacentHTML('beforeend', '<div>' + dot(true) + '<b>Bot Pamięć:</b> ' + ((m.notes || m.items || []).length || '?') + ' notatek · ' + esc(String(m.updated_at || m.updatedAt || '').slice(0, 16)) + '</div>'); }).catch(function () {});
    j('/api/bot-mesh').then(function (m) {
      var peers = m.peers || m.bots || [];
      $('#syMesh').innerHTML = peers.map(function (p) { var ok = /ok|online|registered|linked|live|active/i.test(p.status || ''); return '<tr><td>' + esc((p.icon || '') + ' ' + (p.name || p.id)) + '<br><small style="opacity:.6">' + esc((p.caps || []).slice(0, 4).join(', ')) + '</small></td><td>' + dot(ok) + esc(p.status || '?') + '</td><td>' + esc(String(p.lastSeen || p.at || p.updatedAt || '').slice(0, 16).replace('T', ' ')) + '</td></tr>'; }).join('');
      $('#syAt').textContent = peers.length + ' botów · mesh ' + String(m.updatedAt || '').slice(0, 16).replace('T', ' ');
    }).catch(function (e) { $('#syAt').textContent = '⚠ bot-mesh: ' + e.message; });
    j('sync-manifest.json').then(function (m) { $('#syMan').innerHTML = '<div>' + dot(m.tunnel && m.tunnel.ok) + '<b>Live:</b> <a href="' + esc(m.liveUrl) + '">' + esc(m.liveUrl) + '</a></div><div>' + dot(true) + '<b>APK:</b> ' + esc(m.apk || m.latestApk || '') + ' · ' + esc(m.apkUpdatedAt || '') + '</div><div>' + dot(true) + '<b>Wersja web:</b> ' + esc(m.webVersion || '51') + '</div>'; }).catch(function () {});
  }
  $('#syRefresh').onclick = refreshSync;
  setInterval(function () { if ($('#s-sync').classList.contains('on')) refreshSync(); }, 30000);
  // ================= DJ decks + 16-step loop + MC-707 MIDI clock =================
  var tracks = ['samples/from-drive/Double-D.mp3', 'samples/from-drive/DD-DJ-FLY-Remix.mp3', 'samples/from-drive/DD-DJ-FLY-Remix-2.mp3', 'samples/from-drive/Aba-GS-Mashup.mp3', 'samples/kali-hiphop-120.wav', 'samples/berlin-techno-128.wav', 'samples/trance-120.wav', 'samples/test-120bpm.wav'];
  function detectBPM(buf) { var sr = buf.sampleRate, ch = buf.getChannelData(0), len = Math.min(ch.length, sr * 60), hop = Math.floor(sr / 100), e = []; for (var i = 0; i + hop < len; i += hop) { var s = 0; for (var k = 0; k < hop; k += 4) s += Math.abs(ch[i + k]); e.push(s); } var best = 40, bc = -1; for (var lag = 33; lag <= 86; lag++) { var c = 0; for (var q = 0; q < e.length - lag; q++) c += e[q] * e[q + lag]; if (c > bc) { bc = c; best = lag; } } var b = 6000 / best; while (b < 80) b *= 2; while (b > 160) b /= 2; return Math.round(b * 10) / 10; }
  function Deck(id) {
    var el = $('#deck' + id), self = this; this.id = id; this.bpm = 120; this.rate = 1; this.buf = null; this.src = null; this.startAt = 0; this.offset = 0; this.playing = false; this.loop = 0; this.cue = 0;
    el.innerHTML = '<h3>Deck ' + id + ' <small class="nm" style="opacity:.7;font-weight:400">—</small></h3><canvas class="wave" width="600" height="70"></canvas><div class="row" style="margin-top:6px"><select class="trk"><option value="">— utwór —</option>' + tracks.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select><label class="btn">📂<input type="file" accept="audio/*" class="file" hidden></label></div>' +
      '<div class="row" style="margin-top:6px"><button class="btn pri play">▶</button><button class="btn cueb">CUE</button><button class="btn sync">SYNC</button><button class="btn" data-l="4">L4</button><button class="btn" data-l="8">L8</button><button class="btn" data-l="0">L off</button><span class="bp">— BPM</span></div>' +
      '<div class="row" style="margin-top:6px">pitch<input class="pitch" type="range" min="-16" max="16" step="0.1" value="0"><span class="pv">0%</span> vol<input class="vol" type="range" min="0" max="1" step="0.01" value="0.9"></div>' +
      '<div class="row">HI<input class="eq" data-b="hi" type="range" min="-24" max="6" value="0">MID<input class="eq" data-b="mid" type="range" min="-24" max="6" value="0">LOW<input class="eq" data-b="low" type="range" min="-24" max="6" value="0"></div>';
    this.el = el;
    var A = ctx();
    this.low = A.createBiquadFilter(); this.low.type = 'lowshelf'; this.low.frequency.value = 250;
    this.mid = A.createBiquadFilter(); this.mid.type = 'peaking'; this.mid.frequency.value = 1000; this.mid.Q.value = 0.8;
    this.hi = A.createBiquadFilter(); this.hi.type = 'highshelf'; this.hi.frequency.value = 4000;
    this.gain = A.createGain(); this.xg = A.createGain();
    this.low.connect(this.mid); this.mid.connect(this.hi); this.hi.connect(this.gain); this.gain.connect(this.xg); this.xg.connect(djBus);
    var q = function (s) { return el.querySelector(s); };
    q('.trk').onchange = function () { if (this.value) self.loadUrl(this.value); };
    q('.file').onchange = function () { var f = this.files[0]; if (f) f.arrayBuffer().then(function (ab) { self.decode(ab, f.name); }); };
    q('.play').onclick = function () { self.toggle(); };
    q('.cueb').onclick = function () { if (self.playing) { self.stop(); } self.offset = self.cue; self.draw(); };
    q('.sync').onclick = function () { self.syncTo(+$('#mBpm').value); };
    el.querySelectorAll('[data-l]').forEach(function (b) { b.onclick = function () { self.setLoop(+b.dataset.l); }; });
    q('.pitch').oninput = function () { self.setRate(1 + this.value / 100); };
    q('.vol').oninput = function () { self.gain.gain.value = +this.value; };
    el.querySelectorAll('.eq').forEach(function (s) { s.oninput = function () { self[s.dataset.b].gain.value = +s.value; }; });
  }
  Deck.prototype.loadUrl = function (u) { var self = this; this.el.querySelector('.nm').textContent = '⏳ ' + u.split('/').pop(); return fetch(u).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(function (ab) { return self.decode(ab, u.split('/').pop()); }).catch(function (e) { self.el.querySelector('.nm').textContent = '⚠ ' + e.message; throw e; }); };
  Deck.prototype.decode = function (ab, name) { var self = this; return ctx().decodeAudioData(ab).then(function (b) { self.stop(); self.buf = b; self.offset = 0; self.cue = 0; self.bpm = detectBPM(b); self.el.querySelector('.nm').textContent = name; self.el.querySelector('.bp').textContent = self.bpm + ' BPM'; self.draw(); return b; }); };
  Deck.prototype.pos = function () { return this.playing ? (this.offset + (AC.currentTime - this.startAt) * this.rate) % (this.buf ? this.buf.duration : 1) : this.offset; };
  Deck.prototype.start = function () { if (!this.buf) return; var A = ctx(); this.src = A.createBufferSource(); this.src.buffer = this.buf; this.src.playbackRate.value = this.rate; this.src.loop = true; if (this.loop) { var bl = 60 / this.bpm * this.loop; this.src.loopStart = this.offset; this.src.loopEnd = Math.min(this.buf.duration, this.offset + bl); } this.src.connect(this.low); this.src.start(0, this.offset); this.startAt = A.currentTime; this.playing = true; this.el.querySelector('.play').textContent = '⏸'; };
  Deck.prototype.stop = function () { if (this.src) { this.offset = this.pos(); try { this.src.stop(); } catch (_) {} this.src.disconnect(); this.src = null; } this.playing = false; this.el.querySelector('.play').textContent = '▶'; };
  Deck.prototype.toggle = function () { if (this.playing) this.stop(); else this.start(); };
  Deck.prototype.setRate = function (r) { if (this.playing) { this.offset = this.pos(); this.startAt = AC.currentTime; } this.rate = r; if (this.src) this.src.playbackRate.value = r; var p = ((r - 1) * 100).toFixed(1); this.el.querySelector('.pv').textContent = p + '% · ' + (this.bpm * r).toFixed(1); this.el.querySelector('.pitch').value = p; };
  Deck.prototype.syncTo = function (bpm) { if (!this.bpm) return; this.setRate(Math.max(0.84, Math.min(1.16, bpm / this.bpm))); };
  Deck.prototype.setLoop = function (n) { var was = this.playing; if (was) this.stop(); this.loop = n; if (was) this.start(); };
  Deck.prototype.draw = function () { var c = this.el.querySelector('.wave'), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); if (!this.buf) return; var d = this.buf.getChannelData(0), step = Math.floor(d.length / c.width); g.fillStyle = this.id === 'A' ? '#00e5ff' : '#b84dff'; for (var x = 0; x < c.width; x++) { var m = 0; for (var k = 0; k < step; k += 64) m = Math.max(m, Math.abs(d[x * step + k] || 0)); g.fillRect(x, 35 - m * 33, 1, m * 66); } g.fillStyle = '#fff'; g.fillRect(this.pos() / this.buf.duration * c.width, 0, 2, 70); };
  var djBus = null, decks = {};
  function initDj() {
    ctx(); djBus = AC.createGain(); djBus.gain.value = +$('#mVol').value; djBus.connect(master);
    decks.A = new Deck('A'); decks.B = new Deck('B');
    function xf() { var v = +$('#xf').value; decks.A.xg.gain.value = Math.cos(v * Math.PI / 2); decks.B.xg.gain.value = Math.cos((1 - v) * Math.PI / 2); } xf();
    $('#xf').oninput = xf; $('#mVol').oninput = function () { djBus.gain.value = +this.value; };
    setInterval(function () { ['A', 'B'].forEach(function (k) { if (decks[k].playing) decks[k].draw(); }); }, 120);
  }
  var taps = []; $('#tap').onclick = function () { var t = performance.now(); taps = taps.filter(function (x) { return t - x < 3000; }); taps.push(t); if (taps.length > 2) $('#mBpm').value = (60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1))).toFixed(1); bpmChanged(); };
  $('#mBpm').onchange = bpmChanged;
  function bpmChanged() { schedClock(); }
  // --- 16-step sequencer (synth drums, no samples needed)
  var KITS = { techno: { kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14] }, house: { kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14, 15] }, hiphop: { kick: [0, 7, 10], clap: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] }, trance: { kick: [0, 4, 8, 12], clap: [4, 12], hat: [2, 6, 10, 14], bass: [1, 3, 5, 7, 9, 11, 13, 15] } };
  var ROWS = ['kick', 'clap', 'hat', 'bass'], grid = {}, step = 0, seqOn = false, seqT = 0, nextT = 0, seqBus = null;
  function loadKit(k) { ROWS.forEach(function (r) { grid[r] = new Array(16).fill(false); (KITS[k][r] || []).forEach(function (i) { grid[r][i] = true; }); }); paintSeq(); }
  function paintSeq() { $('#seq').innerHTML = ROWS.map(function (r) { return '<div class="row" style="flex-wrap:nowrap"><span style="width:44px;font-size:12px">' + r + '</span><div class="pads" style="flex:1">' + grid[r].map(function (on, i) { return '<div class="pad' + (on ? ' on' : '') + '" data-r="' + r + '" data-i="' + i + '"></div>'; }).join('') + '</div></div>'; }).join(''); $('#seq').querySelectorAll('.pad').forEach(function (p) { p.onclick = function () { grid[p.dataset.r][+p.dataset.i] = !grid[p.dataset.r][+p.dataset.i]; p.classList.toggle('on'); }; }); }
  function voice(r, t) {
    var A = AC, g = A.createGain(); g.connect(seqBus);
    if (r === 'kick') { var o = A.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); o.start(t); o.stop(t + 0.32); }
    else if (r === 'bass') { var b = A.createOscillator(); b.type = 'sawtooth'; b.frequency.value = 55; var f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); b.connect(f); f.connect(g); b.start(t); b.stop(t + 0.2); }
    else { var len = r === 'hat' ? 0.05 : 0.18, nb = A.createBuffer(1, A.sampleRate * len, A.sampleRate), d = nb.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; var n = A.createBufferSource(); n.buffer = nb; var hp = A.createBiquadFilter(); hp.type = r === 'hat' ? 'highpass' : 'bandpass'; hp.frequency.value = r === 'hat' ? 7000 : 1500; g.gain.setValueAtTime(r === 'hat' ? 0.3 : 0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); n.connect(hp); hp.connect(g); n.start(t); }
  }
  function seqTick() { var spb = 60 / (+$('#mBpm').value || 120) / 4; while (nextT < AC.currentTime + 0.12) { ROWS.forEach(function (r) { if (grid[r][step]) voice(r, nextT); }); var s = step; setTimeout(function () { $('#seq').querySelectorAll('.pad').forEach(function (p) { p.classList.toggle('cur', +p.dataset.i === s); }); }, Math.max(0, (nextT - AC.currentTime) * 1000)); nextT += spb; step = (step + 1) % 16; } }
  $('#seqPlay').onclick = function () { ctx(); if (!seqBus) { seqBus = AC.createGain(); seqBus.connect(master); } seqBus.gain.value = +$('#seqVol').value; seqOn = !seqOn; this.textContent = seqOn ? '⏹ Beat' : '▶ Beat'; clearInterval(seqT); if (seqOn) { step = 0; nextT = AC.currentTime + 0.05; seqT = setInterval(seqTick, 25); midiSend([0xFA]); } else midiSend([0xFC]); };
  $('#seqVol').oninput = function () { if (seqBus) seqBus.gain.value = +this.value; };
  $('#seqKit').onchange = function () { loadKit(this.value); }; $('#seqClr').onclick = function () { ROWS.forEach(function (r) { grid[r].fill(false); }); paintSeq(); };
  loadKit('techno');
  // --- Web MIDI: MC-707 clock in/out
  var midi = null, clkT = 0, inTicks = [];
  function midiSend(msg) { if (!midi || !$('#clkOut').checked) return; var o = midi.outputs.get($('#midiOut').value); if (o) try { o.send(msg); } catch (_) {} }
  function schedClock() { clearInterval(clkT); if (!midi || !$('#clkOut').checked) return; var iv = 60000 / (+$('#mBpm').value || 120) / 24; clkT = setInterval(function () { midiSend([0xF8]); }, iv); }
  $('#clkOut').onchange = schedClock;
  $('#midiOn').onclick = function () {
    if (!navigator.requestMIDIAccess) { $('#midiSt').textContent = 'Web MIDI niedostępne (użyj Chrome na komputerze / Android z USB-OTG)'; return; }
    navigator.requestMIDIAccess({ sysex: false }).then(function (m) {
      midi = m; function paint() { var outs = []; m.outputs.forEach(function (o) { outs.push(o); }); $('#midiOut').innerHTML = outs.map(function (o) { return '<option value="' + esc(o.id) + '"' + (/707|roland/i.test(o.name) ? ' selected' : '') + '>' + esc(o.name) + '</option>'; }).join(''); var ins = 0; m.inputs.forEach(function (i) { ins++; i.onmidimessage = onMidi; }); $('#midiSt').textContent = 'in:' + ins + ' out:' + outs.length + (ins + outs.length ? '' : ' — podłącz MC-707 USB'); }
      paint(); m.onstatechange = paint; schedClock();
    }, function (e) { $('#midiSt').textContent = 'MIDI: ' + e.message; });
  };
  function onMidi(e) { var d = e.data; if (d[0] === 0xF8 && $('#clkIn').checked) { var t = performance.now(); inTicks.push(t); if (inTicks.length > 48) inTicks.shift(); if (inTicks.length >= 48) { var bpm = 60000 / ((t - inTicks[0]) / 47 * 24); if (Math.abs(bpm - +$('#mBpm').value) > 0.3) { $('#mBpm').value = bpm.toFixed(1); ['A', 'B'].forEach(function (k) { if (decks[k] && decks[k].buf) decks[k].syncTo(bpm); }); } } } else if (d[0] === 0xFA) { if (!seqOn) $('#seqPlay').click(); } else if (d[0] === 0xFC) { if (seqOn) $('#seqPlay').click(); } }
  try { initDj(); } catch (e) { console.warn('dj', e); }
  // mini status + test hooks
  function net() { j0('/api/status').then(function (s) { $('#miniNet').innerHTML = '<span class="dot ok"></span>' + (s.online || []).length + ' botów · ' + s.backend; }).catch(function () { $('#miniNet').innerHTML = '<span class="dot"></span>offline'; }); }
  net(); setInterval(net, 30000);
  window.ONE = { version: '54', master: function () { return master; }, ac: function () { return AC; }, djBus: function () { return djBus; }, tracks: tracks, Deck: Deck, addChat: add, j0: j0, pollClient: pollClient, decks: decks, grid: grid, initViz: initViz, viz: function () { return viz; }, presets: function () { return names.length; }, query: query, bots: bots, refreshSync: refreshSync, ctx: ctx, detectBPM: detectBPM };
})();
