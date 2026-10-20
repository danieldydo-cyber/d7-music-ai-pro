/* D7 DJ · X7S v51 — MilkDrop viz, internet radio, multi-language D chat, bot builder, memory/Google + multi-bot sync panels. */
(function () {
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('d7v51.' + k) || 'null'); localStorage.setItem('d7v51.' + k, JSON.stringify(v)); } catch (_) { return null; } }
  function j0(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  // ---------- tabs
  document.querySelectorAll('#tabs button').forEach(function (b) { b.onclick = function () { document.querySelectorAll('#tabs button').forEach(function (x) { x.classList.toggle('on', x === b); }); document.querySelectorAll('section').forEach(function (s) { s.classList.toggle('on', s.id === 's-' + b.dataset.t); }); if (b.dataset.t === 'sync') refreshSync(); if (b.dataset.t === 'viz') resize(); }; });

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
  setTimeout(function () { try { initViz(); } catch (_) {} }, 300);

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
  query('pl');

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
    if (!bot.id.startsWith('u-')) {
      var d0 = add('bot', pre + '…');
      fetch('/api/brain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: text, bot: bot.id, lang: lang }) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) { var a = j && (j.answer || j.reply); if (!a || ACK.test(a)) throw new Error('ack'); var ul = window.D7Answers.detect(text); d0.textContent = (!isFallback && (lang !== 'auto' ? lang : ul) !== 'pl') ? pre + local : a; })
        .catch(function () { d0.textContent = pre + local; });
      return;
    }
    if (B && isFallback) { var d = add('bot', pre + '…'); askBrain(B, bot, text, lang).then(function (r) { d.textContent = pre + r; }, function (er) { d.textContent = pre + local + '\n(mózg AI niedostępny: ' + er.message + ')'; }); }
    else add('bot', pre + local);
    try { fetch('/api/chat-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text, role: 'user', tags: ['learn'], via: 'v51-' + bot.id }) }).catch(function () {}); } catch (_) {}
  };

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
})();
