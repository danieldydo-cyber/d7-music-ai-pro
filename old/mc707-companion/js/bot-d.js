/**
 * Daniel (Bot D) — the ONE main bot of D7 DJ · X7S (v41) · Daniel Dydo · Kraków
 * Sub-sources it syncs with: Grok bridge · chat log · Bot Pamięć · bot-mesh · remote queue.
 * Merges: Special X command layer · bot-chat.js (Mr D Fluid / D Beast) knowledge ·
 * classic app remote/WhatsApp commands · Grok bridge inbox · bot-mesh · Bot Pamięć ideas/memory ·
 * DD 7777777 program intent.
 * Offline-first: every command + answer is local rules (no network, no paid AI).
 * Online: chat/memory/state sync to the existing /api endpoints through a localStorage queue.
 * Classic script (no modules) — exposes window.BotD.
 */
(function (global) {
  'use strict';

  var LS = { chat: 'x7-chat', queue: 'x7-sync-queue', state: 'x7-state', mesh: 'd7-mesh-reg', remote: 'x7-remote-since', inbox: 'x7-grok-seen', cache: 'x7-cache:' };
  var WA = 'https://wa.me/48730377357';
  var MSGR = 'https://m.me/';
  var APP = 'D7 DJ', BOT = 'Daniel';
  var NO_FB = 'D7 DJ nie czyta czatów z Facebooka / Messengera ani WhatsAppa — nie ma darmowego API, a projekt świadomie nie ma integracji z Facebookiem. Przycisk tylko otwiera czat w nowej karcie.';

  function lsGet(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (_) { return fb; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } }
  function norm(s) {
    return String(s || '').toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function nowIso() { return new Date().toISOString(); }
  function timeoutFetch(url, opts, ms) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 6000);
    var o = opts || {};
    if (ctrl) o.signal = ctrl.signal;
    return fetch(url, o).finally(function () { clearTimeout(t); });
  }

  // ------------------------------------------------------------------ knowledge (merged)
  var KB = {
    identity: 'Jestem Daniel — główny bot (Bot D) aplikacji D7 DJ Daniela Dydo (Kraków). To ja jestem centrum: synchronizuję się z Grokiem (grok-bridge), chat logiem, Bot Pamięć i bot-mesh; Mr D Fluid (czat + pamięć), D Beast (DJ persona) i D Bot (YouTube + MilkDrop) to moje pod-źródła. Vibe: hip-hop/Kali + Berlin techno + trance ~120–128 BPM. Jestem programem-pomocnikiem, nie człowiekiem.',
    hub: 'Boga bota hub (my-dax.com) — marka programów-pomocników, które pomagają ludziom. Szacunek: to nie bóstwo, tylko narzędzia. Mesh: Mr D Fluid, D Bot, Bot Pamięć, Grok Bot, Kali Radio, MilkDrop LIVE D, Pro DJ decks.',
    vision: 'Intencja DD 7777777: łączenie z Bogiem, internetem, Indianami, duszami, ludźmi i zwierzętami — program jako narzędzie klimatu i wizji (muzyka + światło), nie dosłowne API do Boga.',
    rules: 'Zasady projektu: hot-patch bez restartu serwera/tunelu · darmowy stack · bez Postiz/Facebook · Gmail/X tylko na Twoją prośbę · LIVE viz bez web-streamów (YouTube curated + lokal/Drive) · auto-heal · Bot Pamięć limit 7 GB.',
    ideas: [
      'Ciągły sync Bot Pamięć → Drive + draft Gmail (ingest → compact → mirror)',
      'memory-public.json — publiczny snapshot pamięci bez sekretów',
      'LIVE viz / auto-heal bez restartów',
      'Bot D Android + web most Grok/Drive',
      'Przycinanie JSONL przy limicie pamięci',
      'DD 7777777: 3 tryby wizualizacji + Trance/Kali na dole ekranu',
      'LIVE GENERATOR: Kali → Berlin → Trance rotacja klimatu',
      'MIDI clock dla Roland MC-707 (klasyczna wersja / natywna app)'
    ]
  };

  var HELP = 'Daniel (Bot D) · komendy — działają offline, wołaj „daniel”, „bot d” albo „mr d”:\n' +
    '📻 kali radio · stop radio · yt trance / techno / berlin / dax · next yt · yt <link>\n' +
    '✨ next preset · poprzedni · losuj · auto on/off · live gen\n' +
    '⛶ fullscreen · wyjdź\n' +
    '🎧 deck a double d · deck b kali · play deck a · pause a · sync b · master a · crossfader a/b/środek\n' +
    '💿 PRO8: hot cue 1 a · usuń hot cue 2 b · loop 4 a · loop in / out · reloop · exit loop · beat jump 8 b · tempo +2 a · zakres 10 · master tempo on · reverse a · slip · quantize · cue a\n' +
    '🎚 eq low kill a · mid -30 b · color 40 a · beat fx echo 1/2 · beat fx reverb na b · beat fx off · krzywa cut · słuchawki (split L/R) · skróty (klawiatura)\n' +
    '🎤 głos: przycisk 🎤 w czacie — „play deck A”, „włącz radio”, „pełny ekran”, „sync b”, „następna wizualizacja” · „czytaj na głos” / „nie czytaj”\n' +
    '🎛 filter 30 / filter off · echo on/off · bpm 124 · głośność 70 · tap (przycisk TAP)\n' +
    '🧠 status · sync · offline (zapisz utwory) · pamięć · zapamiętaj <tekst> · pomysły · mesh · grok · kim jesteś\n' +
    '💬 whatsapp · messenger — otwierają czat w nowej karcie (aplikacja NIE czyta czatów Facebook/Messenger/WhatsApp) · link (udostępnij D7 DJ)\n' +
    '⚙ opcje (panel) · włącz / wyłącz <opcja> — np. „wyłącz kali na start”, „włącz live gen”\n' +
    '⏹ stop (wszystko)';

  // ------------------------------------------------------------------ sync engine
  // Test harness sets window.__D7_TEST__ before load → dry run: queue works, nothing is ever sent.
  var DRY = !!global.__D7_TEST__;
  var Sync = {
    enabled: true, dry: DRY, dryLog: [],
    online: navigator.onLine !== false,
    lastOkAt: 0,
    queue: lsGet(LS.queue, []),
    listeners: [],
    flushing: false,
    on: function (fn) { this.listeners.push(fn); },
    emit: function () { var s = this; this.listeners.forEach(function (fn) { try { fn(s); } catch (_) {} }); },
    setOnline: function (v) {
      var was = this.online;
      this.online = !!v;
      if (v) this.lastOkAt = Date.now();
      if (was !== this.online) { this.emit(); if (v) this.flush(); }
    },
    save: function () { lsSet(LS.queue, this.queue.slice(-300)); this.emit(); },
    enqueue: function (path, body, kind) {
      if (!this.enabled) return; // Opcje → „Sync z serwerem” wyłączony: wszystko zostaje lokalnie
      if (kind) this.queue = this.queue.filter(function (q) { return q.kind !== kind; }); // keep latest only (state)
      this.queue.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), path: path, body: body, kind: kind || '', at: nowIso() });
      if (this.queue.length > 300) this.queue = this.queue.slice(-300);
      this.save();
      var self = this;
      setTimeout(function () { self.flush(); }, 50);
    },
    flush: function () {
      var self = this;
      if (self.flushing || !self.queue.length || navigator.onLine === false) return Promise.resolve(false);
      self.flushing = true;
      if (self.dry) { // test mode: pretend success, never touch the network
        self.dryLog = self.dryLog.concat(self.queue.splice(0)).slice(-500);
        self.save(); self.flushing = false; self.setOnline(true);
        return Promise.resolve(true);
      }
      var step = function () {
        if (!self.queue.length) return Promise.resolve(true);
        var item = self.queue[0];
        return timeoutFetch(item.path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.body) }, 7000)
          .then(function (r) {
            if (r.ok || (r.status >= 400 && r.status < 500)) { // 4xx = drop (bad item), never block the queue
              self.queue.shift(); self.save(); self.setOnline(true);
              return step();
            }
            throw new Error('http ' + r.status);
          });
      };
      return step().catch(function () { self.setOnline(false); return false; }).finally(function () { self.flushing = false; });
    },
    ping: function () {
      var self = this;
      if (navigator.onLine === false) { self.setOnline(false); return Promise.resolve(null); }
      return timeoutFetch('/api/account-status?x7=' + Date.now(), { cache: 'no-store' }, 6000)
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) {
          if (j && j.offline) throw new Error('sw offline');
          self.setOnline(true); lsSet(LS.cache + '/api/account-status', j); return j;
        })
        .catch(function () { self.setOnline(false); return lsGet(LS.cache + '/api/account-status', null); });
    },
    /** GET JSON online, falls back to the last good copy (works offline even without SW). */
    getJSON: function (path) {
      var self = this;
      var fromSw = false;
      if (navigator.onLine === false && path.indexOf('/api/') === 0) { self.setOnline(false); return Promise.resolve(lsGet(LS.cache + path.split('?')[0], null)); }
      return timeoutFetch(path, { cache: 'no-cache' }, 7000)
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); fromSw = r.headers.get('X-DDJ-Offline') === '1'; return r.json(); })
        .then(function (j) {
          if (j && j.offline) throw new Error('sw offline');
          if (fromSw) { self.setOnline(false); return j; } // last good copy served by the service worker
          // static JSON may come from the SW cache, so only live /api answers flip the online flag
          if (path.indexOf('/api/') === 0 && navigator.onLine !== false) self.setOnline(true);
          lsSet(LS.cache + path.split('?')[0], j);
          return j;
        })
        .catch(function () { return lsGet(LS.cache + path.split('?')[0], null); });
    }
  };
  global.addEventListener('online', function () { Sync.ping(); });
  global.addEventListener('offline', function () { Sync.setOnline(false); });

  // ------------------------------------------------------------------ persistent memory
  var Memory = {
    chat: lsGet(LS.chat, []),
    addChat: function (role, text, opts) {
      this.chat.push({ role: role, text: String(text).slice(0, 2000), at: nowIso() });
      if (this.chat.length > 60) this.chat = this.chat.slice(-60);
      lsSet(LS.chat, this.chat);
      // one POST per line → /api/chat-log (it already feeds grok-bridge outbox + bot-learn + Bot Pamięć ingest)
      if (!(opts && opts.noSync)) Sync.enqueue('/api/chat-log', { text: String(text).slice(0, 2000), role: role === 'user' ? 'user' : 'bot', tags: ['learn', 'help'], via: 'x7' });
    },
    state: lsGet(LS.state, null),
    _stateT: 0, baseKey: null,
    coreKey: function (st) { var core = {}; for (var k in st) if (k !== 'preset' && k !== 'at') core[k] = st[k]; return JSON.stringify(core); },
    /** Boot snapshot: stored locally, becomes the baseline — untouched defaults are never pushed to the server. */
    saveBase: function (st) { this.state = st; lsSet(LS.state, st); this.baseKey = this.coreKey(st); },
    saveState: function (st) {
      this.state = st;
      lsSet(LS.state, st);
      var self = this;
      clearTimeout(this._stateT);
      this._stateT = setTimeout(function () { self.pushState(); }, 20000);
    },
    /** Push settings to the server bridge only when something meaningful changed (preset wander excluded). */
    pushState: function (force) {
      if (!this.state) return false;
      var key = this.coreKey(this.state), meta = lsGet(LS.state + ':pushed', { key: '', at: 0 });
      if (!force && (key === meta.key || key === this.baseKey)) return false;
      if (!force && Date.now() - meta.at < 5 * 60000 && meta.key) { var self = this; clearTimeout(this._stateT); this._stateT = setTimeout(function () { self.pushState(); }, 5 * 60000); return false; }
      lsSet(LS.state + ':pushed', { key: key, at: Date.now() });
      Sync.enqueue('/api/grok-bridge', { text: ('X7_STATE ' + JSON.stringify(this.state)).slice(0, 1990), role: 'state', direction: 'outbox', tags: ['sync'], via: 'x7' }, 'state');
      return true;
    },
    /** New device / cleared storage → restore settings + recent chat from the server bridge. */
    restoreFromServer: function () {
      var self = this;
      if (self.state && self.chat.length) return Promise.resolve(null);
      return Sync.getJSON('/api/grok-bridge').then(function (b) {
        if (!b || !Array.isArray(b.outbox)) return null;
        var out = { state: null, chat: [] };
        for (var i = b.outbox.length - 1; i >= 0; i--) {
          var e = b.outbox[i];
          if (!out.state && e.role === 'state' && /^X7_STATE /.test(e.text || '')) {
            try { out.state = JSON.parse(e.text.slice(9)); } catch (_) {}
          }
        }
        // chat lines from the shared server log are only pulled on explicit request (?restore=chat) — the tunnel is public
        if (!self.chat.length && /[?&]restore=chat\b/.test(location.search)) {
          b.outbox.filter(function (e) { return e.via === 'chat-log' && (e.role === 'user' || e.role === 'bot'); })
            .slice(-12).forEach(function (e) { self.chat.push({ role: e.role === 'user' ? 'user' : 'bot', text: e.text, at: e.at }); });
          lsSet(LS.chat, self.chat);
          out.chat = self.chat.slice();
        }
        if (!self.state && out.state) { self.state = out.state; lsSet(LS.state, out.state); }
        return out;
      });
    }
  };

  // ------------------------------------------------------------------ brain
  function createBot(api) {
    var memo = { memory: null, mesh: null, learn: null };

    function snapshot() { try { return api.snapshot(); } catch (_) { return {}; } }
    function netLine() {
      var n = Sync.queue.length;
      return (Sync.online ? 'online' : 'offline') + (n ? ' · kolejka ' + n : ' · sync ✓');
    }
    function statusText() {
      var s = snapshot(), parts = [];
      parts.push(s.kaliLocal ? 'Radio: lokalny Kali beat (offline fallback, deck A)' : s.radioPlaying ? 'Radio: ' + s.ytTitle : (s.radioWanted ? 'Radio: łączę…' : 'Radio: off'));
      (s.decks || []).forEach(function (d) {
        if (d.name) parts.push('Deck ' + d.id + ': ' + d.name + (d.playing ? ' ▶' : ' (pauza)') + (d.bpm ? ' · ' + d.bpm.toFixed(1) + ' BPM' : ''));
      });
      parts.push('Viz: ' + (s.vizOk ? 'MilkDrop · ' + String(s.preset || '').slice(0, 48) : 'tryb lekki') + ' · auto ' + (s.autoWander ? 'ON' : 'OFF') + (s.liveGen ? ' · LIVE GEN' : ''));
      parts.push('Beat: ' + (s.beatSource === 'audio' ? 'audio ' + (s.detBpm || '…') : 'puls ' + Math.round(s.bpm || 128)) + ' BPM');
      if (s.filter != null && s.filter !== 50) parts.push('Filter: ' + s.filter);
      if (s.echo) parts.push('Echo: ON');
      parts.push('Sieć: ' + netLine());
      if (s.account && s.account.statusLine) parts.push('Konto: ' + s.account.statusLine);
      return parts.join('\n');
    }
    function googleLine(acc) {
      // Honest: only "aktywny" when the server reports a live Google sync. Drive tracks already on the server play either way.
      var active = !!(acc && acc.synced === true);
      var n = acc && (acc.trackCount != null) ? acc.trackCount : null;
      var last = acc && acc.syncedAt ? String(acc.syncedAt).slice(0, 10) : '';
      return 'Google sync: ' + (active ? 'aktywny (Drive)' : 'czeka na połączenie') +
        (n != null ? ' · utwory z Drive na serwerze: ' + n + ' (grają' + (active ? '' : ' normalnie') + ')' : '') +
        (!active && last ? ' · ostatni sync ' + last : '');
    }
    /** Pull every sub-source (works offline from the last good copy) and describe the sync state. */
    function botsReport() {
      var cap = function (p) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, 5000); })]).catch(function () { return null; }); };
      return Promise.all([
        cap(Sync.ping()), cap(Sync.getJSON('/api/grok-bridge')), cap(Sync.getJSON('samples/memory-public.json')),
        cap(Sync.getJSON('/api/bot-mesh')), cap(Sync.getJSON('/api/bot-learn'))
      ]).then(function (r) {
        var acc = r[0], br = r[1], mem = r[2], mesh = r[3], learn = r[4], tag = Sync.online ? '' : ' (offline · ostatnia kopia)';
        if (acc) memo.account = acc;
        if (mem) memo.memory = mem;
        if (mesh) memo.mesh = mesh;
        var L = [];
        L.push('Główny bot: Daniel (Bot D) · ' + APP + ' · sieć ' + netLine());
        L.push(br ? 'Grok bridge: inbox ' + (br.inbox || []).length + ' · outbox ' + (br.outbox || []).length + (br.grok || br.label ? '' : '') + tag : 'Grok bridge: brak danych' + tag);
        L.push('Chat log: ' + (Sync.queue.length ? Sync.queue.length + ' w kolejce' : 'zsynchronizowany') + ' (/api/chat-log)');
        L.push('Bot Pamięć: ' + (mem ? (mem.summaries || []).length + ' notatek · ' + (mem.open_ideas || []).length + ' pomysłów' + (mem.updated_at ? ' · ' + String(mem.updated_at).slice(0, 10) : '') : 'brak danych') + (learn && learn.lessons ? ' · lekcje Mr D ' + learn.lessons.length : '') + tag);
        L.push('Bot mesh: ' + (mesh && mesh.peers ? mesh.peers.length + ' botów' + (mesh.peers.some(function (p) { return p.id === 'x7-bot-d'; }) ? ' · Daniel zarejestrowany' : ' · Daniel: rejestruję') : 'brak danych') + tag);
        L.push(googleLine(acc || memo.account));
        L.push('Facebook / Messenger: tylko przycisk-link — aplikacja nie czyta tych czatów.');
        return L.join('\n');
      });
    }

    function ytPool(g) {
      return api.ytList.filter(function (t) { return t.genre === g || (g === 'techno' && t.genre === 'berlin'); });
    }

    /** Main entry. Returns reply text, or a Promise for answers that read network/cache. */
    function handle(raw) {
      var n = norm(raw);
      if (!n) return null;
      // wake words / aliases: "daniel, kali radio" · "bot d next preset" · "mr d status"
      var wake = /^(?:hej |hey |ok |yo )?(?:bot d|botd|mr\.? ?d|d bot|daniel|danielu|danny)\b[\s,:!.-]*/;
      if (wake.test(n)) {
        var rest = n.replace(wake, '');
        if (!rest) return pick(['Jestem 💚 Daniel (Bot D) — ', 'Tu Daniel, słucham — ']) + 'sieć: ' + netLine() + '. Napisz „kali radio”, „status” albo „pomoc”.';
        if (!/^(kim jestes|who are you|jak sie nazywasz)/.test(rest)) { n = rest; raw = String(raw).replace(/^\s*(?:hej |hey |ok |yo )?(?:bot d|botd|mr\.? ?d|d bot|daniel|danielu|danny)\b[\s,:!.-]*/i, ''); }
      }
      var s = snapshot();
      var stopW = /\b(stop|pauza|pause|zatrzymaj|wylacz|cisza|off)\b/.test(n);
      var deckM = n.match(/\b(?:deck|dek)\s*([ab])\b/) || n.match(/\b(?:na|on)\s+([ab])\b/) || n.match(/^(?:play|graj|pause|pauza|stop|sync)\s+([ab])$/);
      var deckId = deckM ? deckM[1].toUpperCase() : null;
      var ytId = (String(raw).match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/) || [])[1]
        || ((n.match(/^(?:yt|youtube|play)\s+([a-z0-9_-]{11})$/i) && String(raw).trim().split(/\s+/).pop()) || '');

      // --- help / info
      if (/^(help|pomoc|komendy|\?|co potrafisz|co umiesz)/.test(n)) return HELP;
      if (/\b(status|stan|co gra|now playing|whats playing)\b/.test(n)) {
        return Sync.flush().catch(function () {}).then(function () { return botsReport(); }).then(function (b) { return statusText() + '\n— sync botów —\n' + b; }, function () { return statusText(); });
      }
      if (/^(grok|boty|bots|sync botow|synchronizacja botow)\b/.test(n)) { Sync.flush(); return botsReport(); }
      if (/^(siema|czesc|hej|hi|hello|yo|elo|witaj|dzien dobry)( (bot d|mr d|d bot|daniel|bot))?[!. ]*$/.test(n)) {
        return pick(['Siema 💚 tu Daniel (Bot D) — ', 'Yo! Daniel LIVE w D7 DJ — ', 'Cześć! Daniel tutaj — ']) + (s.radioPlaying ? 'radio gra, ' : '') + 'sieć: ' + netLine() + '. Napisz „kali radio”, „next preset” albo „pomoc”.';
      }
      if (/\b(boga|my-?dax|hub|federac)\b/.test(n)) return KB.hub;
      if (/\b(wizja|intencja|duchy|dusze|indian|bog|bogiem)\b/.test(n)) return KB.vision;
      if (/\b(zasady|reguly|rules)\b/.test(n)) return KB.rules;
      if (/\b(pomysl|pomysly|ideas|idea|roadmap|plan)\b/.test(n)) return 'Pomysły z projektu DD (Bot Pamięć + programy):\n' + KB.ideas.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n');
      if (/\b(messenger|facebook|fb|m\.me)\b/.test(n) && !/\b(play|graj)\b/.test(n)) {
        var okM = api.openLink ? api.openLink(MSGR) : false;
        return (okM ? '💬 Otwieram Messenger w nowej karcie: ' : '💬 Messenger: ') + MSGR + (okM ? '' : ' (dotknij link)') + '\n' + NO_FB;
      }
      if (/\b(whatsapp|whats app|wa|telefon)\b/.test(n) && !/\b(play|graj)\b/.test(n)) {
        var okW = api.openLink ? api.openLink(WA) : false;
        return (okW ? '💬 Otwieram WhatsApp w nowej karcie: ' : '💬 WhatsApp: ') + WA + (okW ? '' : ' (dotknij link)') + '\nPilot: komendy z telefonu (classic.html → Sterowanie, po zalogowaniu właściciela) trafiają do /api/remote-queue i wykonuję je na żywo, gdy jest online. Czatów WhatsApp aplikacja nie czyta.';
      }
      if (/\b(remote|pilot)\b/.test(n) && !/\b(play|graj)\b/.test(n)) {
        return 'Pilot: komendy z telefonu (classic.html → Sterowanie, po zalogowaniu właściciela) trafiają do kolejki /api/remote-queue, a ja (Daniel) wykonuję je na żywo, gdy jest online. WhatsApp: ' + WA;
      }
      if (/^(opcje|ustawienia|settings|options)$/.test(n)) {
        if (api.openOpts) api.openOpts(true);
        var ol = api.optsList ? api.optsList() : [];
        return '⚙ Opcje (panel otwarty, zapisują się na urządzeniu):\n' + ol.map(function (o) { return (o.on ? '✅ ' : '⬜ ') + o.label; }).join('\n') + '\nZmiana: kliknij w panelu albo napisz „włącz …” / „wyłącz …” (np. „wyłącz kali na start”).';
      }
      // v43: "włącz radio" / "wyłącz radio" are radio commands, not option toggles
      if (/^(wlacz|wl|odpal|uruchom|graj|zagraj|pusc|play|start|turn on)\s+(kali\s*)?(radio|kali)(\s+kali)?( live)?$/.test(n)) {
        api.kali();
        return Sync.online ? 'KALI LIVE RADIO 📻 ON — wizualizacja w rytm. Jeśli cisza: stuknij ▶ w mini-playerze.' : 'Offline — gram lokalny „Kali · Hip-Hop 120” na decku A.';
      }
      if (/^(wylacz|wyl|zatrzymaj|stop|turn off)\s+(kali\s*)?(radio|kali)(\s+kali)?$/.test(n)) { api.stopRadio(); return 'Radio zatrzymane.'; }
      var optM = n.match(/^(wlacz|wylacz|wl|wyl|enable|disable|turn on|turn off)\s+(.+)$/);
      if (optM && api.setOptByName) {
        var onO = /^(wlacz|wl|enable|turn on)$/.test(optM[1]);
        var hit = api.setOptByName(optM[2], onO);
        if (hit) return (onO ? '✅ Włączone: ' : '⬜ Wyłączone: ') + hit + ' (zapisane).';
      }
      if (/^(link|udostepnij|share|podziel sie)\b/.test(n)) {
        var url = location.origin + '/';
        if (api.share) api.share(url);
        return '🔗 D7 DJ: ' + url + (navigator.share ? ' (otwieram udostępnianie)' : ' (skopiowany do schowka, jeśli przeglądarka pozwala)');
      }

      // --- sync / offline / memory
      if ((/\b(sync|synchroniz\w*|odswiez)\b/.test(n) && !deckId && !/\b(deck|dek|tempo|bpm)\b/.test(n)) || /\bsync (bota|bot|wszystko|teraz|all)\b/.test(n)) {
        Memory.pushState(true);
        return Promise.all([Sync.ping(), Sync.flush()]).then(function (r) {
          var st = r[0];
          var head = 'Sync: ' + netLine() + (st && st.statusLine ? '\nKonto: ' + st.statusLine : '') + '\nCzat i ustawienia ' + (Sync.online ? 'wysłane (/api/chat-log, grok-bridge).' : 'czekają w kolejce — wyślę gdy wróci internet.');
          return botsReport().then(function (b) { return head + '\n' + b; }, function () { return head; });
        });
      }
      if (/\b(offline|zapisz offline|pobierz utwory|cache)\b/.test(n) && !/^\s*(zapamietaj|naucz|ucz sie|learn|remember)\b/.test(n)) {
        if (!api.cacheOffline) return 'Tryb offline: aplikacja, presety, wizualizacja, decki i bot działają bez sieci.';
        return api.cacheOffline().then(function (r) {
          return 'Offline: ' + r.ok + '/' + r.total + ' utworów zapisanych na urządzeniu' + (r.ok < r.total ? ' (reszta gdy będzie sieć)' : '') + '. Bez internetu działają: decki, wizualizacja, presety, ja (Daniel · Bot D), lokalny Kali beat. Kali radio YouTube wymaga sieci.';
        });
      }
      if (/\b(pamiec|memory|bot pami)\b/.test(n)) {
        return Sync.getJSON('samples/memory-public.json').then(function (m) {
          memo.memory = m || memo.memory;
          if (!m) return 'Bot Pamięć: brak snapshotu offline — spróbuję gdy będzie sieć. Lokalnie pamiętam ' + Memory.chat.length + ' ostatnich wiadomości.';
          var n2 = (m.summaries || []).length, ideas = (m.open_ideas || []).length;
          return 'Bot Pamięć · ' + n2 + ' notatek · ' + ideas + ' otwartych pomysłów · aktualizacja ' + String(m.updated_at || '').slice(0, 16).replace('T', ' ') + '.\nLokalnie: ' + Memory.chat.length + ' wiadomości czatu · ustawienia zapisane na urządzeniu' + (Sync.online ? ' i na serwerze.' : ' (serwer gdy wróci sieć).');
        });
      }
      var learnM = String(raw).match(/^\s*(?:zapamietaj|zapamiętaj|naucz sie|naucz się|ucz sie|ucz się|learn|remember)\s*[:,-]?\s*(.*)$/i);
      if (learnM) {
        var lesson = (learnM[1] || '').trim();
        if (!lesson) return 'Co mam zapamiętać? Napisz: „zapamiętaj <tekst>”.';
        Sync.enqueue('/api/bot-learn', { text: lesson.slice(0, 1500), role: 'user', tags: ['learn'], source: 'x7' });
        return '💾 Zapamiętane: „' + lesson.slice(0, 120) + '” → Bot Pamięć ' + (Sync.online ? '(wysłane).' : '(w kolejce offline, wyślę gdy wróci sieć).');
      }
      if (/\b(mesh|peers|boty|siec botow)\b/.test(n)) {
        return Sync.getJSON('/api/bot-mesh').then(function (m) {
          if (!m || !Array.isArray(m.peers)) return 'Mesh: brak danych offline.';
          var names = m.peers.filter(function (p) { return p.name && p.name !== 'peer'; }).map(function (p) { return p.name; });
          return 'Bot mesh (' + (m.hubBrand || 'hub') + ' · ' + (m.hub || '') + '): ' + names.join(' · ');
        });
      }

      // --- fullscreen
      if (/\b(wyjdz|exit|zamknij|esc|wyjscie)\b/.test(n) && /\b(full|fs|ekran|viz|pelny)\b|^(wyjdz|exit|esc)$/.test(n)) { api.exitFs(); return 'Wyszedłem z pełnego ekranu.'; }
      if (/\b(fullscreen|full screen|pelny ekran|caly ekran|fs|full|viz full)\b/.test(n)) {
        if (s.fs && /\b(toggle|przelacz|off|wylacz|stop)\b/.test(n)) { api.exitFs(); return 'Pełny ekran OFF.'; }
        if (s.fs) return 'Już jesteś w pełnym ekranie ⛶ — „wyjdź”, ✕ albo double-tap zamyka.';
        api.enterFs();
        return 'Pełny ekran ON ⛶ — double-tap lub ✕ żeby wyjść. Ja zostaję w rogu (zwinięty).';
      }

      // --- PRO8 decks / mixer (hot cues, loops, beat jump, tempo, master tempo, beat FX, EQ)
      if (api.pro8) {
        var p8 = null;
        try { p8 = api.pro8(n, deckId); } catch (e) { p8 = 'PRO8: komenda się nie udała (' + (e && e.message || e) + ').'; }
        if (p8) return p8;
      }

      // --- FX (classic echo/filter ideas)
      var fm = n.match(/\bfilt(?:er|r)?\s*(off|wylacz|reset|\d{1,3})?\b/);
      if (fm && /\bfilt/.test(n)) {
        var fv = (!fm[1] || /off|wylacz|reset/.test(fm[1])) ? 50 : Math.max(0, Math.min(100, Number(fm[1])));
        api.setFilter(fv);
        return fv === 50 ? 'Filter OFF (neutral).' : 'Filter ' + fv + ' — ' + (fv < 50 ? 'low-pass (ciemniej)' : 'high-pass (jaśniej)') + '.';
      }
      if (/\b(echo|delay)\b/.test(n)) { var eon = !/\b(off|wylacz|stop)\b/.test(n); api.setEcho(eon); return 'Echo ' + (eon ? 'ON (kropkowana ósemka, w tempo)' : 'OFF') + '.'; }

      // --- stop
      if (stopW) {
        if (/\b(wszystko|all|everything)\b/.test(n) || /^(stop|pauza|pause|cisza)$/.test(n)) { api.stopAll(); return 'Stop — radio i decki zatrzymane. Wizualizacja dalej żyje na pulsie.'; }
        if (deckId && /\b(deck|dek)\b|^(pause|pauza|stop) [ab]$/.test(n)) { api.deckPause(deckId); return 'Deck ' + deckId + ' pauza.'; }
        if (/\b(radio|kali|yt|youtube)\b/.test(n)) { api.stopRadio(); return 'Radio zatrzymane.'; }
        if (/\b(live gen|generator)\b/.test(n)) { api.liveGen(false); return 'LIVE GEN OFF.'; }
        if (/\b(auto|wander)\b/.test(n)) { api.setAuto(false); return 'Auto wander OFF — preset stoi. „auto on” żeby wrócić.'; }
      }

      // --- live generator / auto
      if (/\b(live ?gen|life ?gen|live generator|generator|generuj)\b/.test(n)) { var lg = !/\b(off|wylacz)\b/.test(n); api.liveGen(lg); return lg ? 'LIVE GENERATOR 💚 — szybszy wander (co 2 takty), płynne blendy, rotacja klimatu Kali → Berlin → Trance w pulsie.' : 'LIVE GEN OFF.'; }
      if (/\bauto\b/.test(n)) { var on = !/\b(off|wylacz|stop)\b/.test(n); api.setAuto(on); return 'Auto wander ' + (on ? 'ON — zmiana presetu co 4 takty w rytm.' : 'OFF.'); }

      // --- tempo / volume / mixer
      var bm = n.match(/\bbpm\s*(\d{2,3}(?:\.\d)?)\b/) || n.match(/\b(\d{2,3}(?:\.\d)?)\s*bpm\b/);
      if (bm) { var nb = api.setBpm(parseFloat(bm[1])); return 'Puls wizualizacji: ' + Math.round(nb) + ' BPM.'; }
      if (/^(bpm|tempo)$/.test(n)) return 'Tempo: ' + (s.beatSource === 'audio' ? 'audio ~' + (s.detBpm || '…') : 'puls ' + Math.round(s.bpm || 128)) + ' BPM. Kali/Trance ~120, Berlin ~128. „bpm 124” zmienia puls.';
      var vm = n.match(/\b(?:glosnosc|volume|vol|glosniej|ciszej)\s*(\d{1,3})?\b/);
      if (vm) {
        var v = vm[1] != null ? Number(vm[1]) : (/glosniej/.test(n) ? (s.radioVol || 90) + 15 : (s.radioVol || 90) - 15);
        v = Math.max(0, Math.min(100, v));
        if (deckId) { api.deckVol(deckId, v / 100); return 'Deck ' + deckId + ' głośność ' + v + '%.'; }
        api.setRadioVol(v); return 'Głośność radia ' + v + '%.';
      }
      var xm = n.match(/\b(?:crossfader|xfade|fader|przenikanie)\s*(a|b|srodek|middle|center|\d{1,3})\b/);
      if (xm) {
        var x = xm[1] === 'a' ? 0 : xm[1] === 'b' ? 1 : /\d/.test(xm[1]) ? Number(xm[1]) / 100 : 0.5;
        api.xfade(Math.max(0, Math.min(1, x))); return 'Crossfader → ' + Math.round(Math.max(0, Math.min(1, x)) * 100) + '%.';
      }
      if (/\bsync\b/.test(n) && (deckId || /\b(deck|dek|tempo|bpm)\b/.test(n) || /^sync [ab]$/.test(n))) {
        var who = deckId || 'B'; return api.syncDeck(who) ? 'Deck ' + who + ' zsynchronizowany.' : 'SYNC: potrzebuję BPM obu decków — chwila, analizuję.';
      }

      // --- YouTube (curated, ToS-safe IFrame)
      if (ytId) {
        var known = api.ytList.find(function (t) { return t.id === ytId; }) || { id: ytId, title: 'YouTube · ' + ytId, genre: 'yt', bpm: 128 };
        api.playYt(known); return '▶ YouTube: ' + known.title + (Sync.online ? '' : ' (offline — zagra gdy wróci sieć)') + '.';
      }
      if (/\b(next|nastepny|dalej)\b.*\b(yt|youtube|track|utwor|kawalek|playlist)\b|\b(yt|youtube)\b.*\b(next|nastepny|dalej)\b/.test(n)) {
        var nx = api.nextYt(); return '▶ Następny z playlisty: ' + nx.title;
      }
      var gm = n.match(/\b(trance|techno|berlin|dax|brother max|mix)\b/);
      if (gm && (/\b(yt|youtube|playlist|play|graj|zagraj|pusc|wlacz|pro)\b/.test(n) || n === gm[1])) {
        var g = gm[1] === 'dax' || gm[1] === 'brother max' ? 'mix' : gm[1];
        var pool = ytPool(g), pk = pool[Math.floor(Math.random() * pool.length)] || api.ytList[1];
        if (!Sync.online) {
          var lt = api.findTrack(g === 'trance' ? 'trance' : g === 'mix' ? 'dd dj fly' : 'berlin techno');
          if (lt) { api.deckLoad('A', lt, true); return 'Offline — YouTube niedostępny, gram lokalnie: ' + lt.name + ' na decku A.'; }
        }
        api.playYt(pk); return '▶ YT ' + g + ': ' + pk.title;
      }
      var ys = n.match(/^(?:yt|youtube|search|szukaj)\s+(.+)$/);
      if (ys) {
        var toks = ys[1].split(' ');
        var hit = api.ytList.find(function (t) { var h = norm(t.title + ' ' + t.genre); return toks.every(function (k) { return h.indexOf(k) !== -1; }); })
          || api.ytList.find(function (t) { var h = norm(t.title + ' ' + t.genre); return toks.some(function (k) { return k.length > 2 && h.indexOf(k) !== -1; }); });
        if (hit) { api.playYt(hit); return '▶ ' + hit.title; }
        return 'Nie mam „' + ys[1] + '” na liście (bez płatnego API). Wklej link YouTube albo: yt trance / techno / berlin / dax.';
      }
      if (/\b(stream|streamy|url audio|radio list)\b/.test(n)) return 'Web-streamy audio są wyłączone (zasada projektu). Źródła: Kali radio + curated YouTube (IFrame) + lokalne/Drive utwory na deckach.';

      // --- Kali radio
      if (/\b(kali|radio|hip ?hop)\b/.test(n) && !deckId) {
        api.kali();
        if (!Sync.online) return 'Offline — YouTube niedostępny, więc gram lokalny „Kali · Hip-Hop 120” na decku A (wizualizacja w rytm z prawdziwego audio).';
        return 'KALI LIVE RADIO 📻 ON — wizualizacja leci w rytm (puls ' + Math.round(s.bpm || 128) + ' BPM, YouTube nie da się analizować FFT). Jeśli cisza: stuknij ▶ w mini-playerze.';
      }

      // --- presets
      if (/\b(poprzedni|prev|previous|wstecz|cofnij)\b/.test(n)) { return 'Poprzedni preset: ' + (api.presetPrev() || '—'); }
      if (/\b(next|nastepn\w*|dalej|losuj|random|rnd|preset|milkdrop|wizualizacj\w*|wizka|viz|zmien)\b/.test(n) && !deckId) {
        if (!s.vizOk) return 'Wizualizacja w trybie lekkim (WebGL niedostępny) — presety niedostępne.';
        return '✨ Preset: ' + (api.presetRandom() || '—');
      }

      // --- decks
      var isPlay = /\b(play|graj|zagraj|pusc|wlacz|odpal|load|zaladuj)\b/.test(n);
      if (deckId || /\b(deck|dek)\b/.test(n)) {
        var id = deckId || 'A';
        var rest = n.replace(/\b(deck|dek|na|on|w|play|graj|zagraj|pusc|wlacz|odpal|load|zaladuj|track|utwor)\b/g, ' ').replace(/\b[ab]\b/g, ' ').replace(/\s+/g, ' ').trim();
        var t = rest ? api.findTrack(rest) : null;
        if (t) { api.deckLoad(id, t, true); return '🎧 Deck ' + id + ': ' + t.name + ' ▶' + (s.radioPlaying ? ' (radio dalej gra — „stop radio” żeby zostawić sam deck)' : ''); }
        if (rest && !t) return 'Nie znalazłem utworu „' + rest + '”. Mam: ' + api.tracks().map(function (x, i) { return (i + 1) + '. ' + x.name; }).join(', ');
        var dn = api.deckPlay(id); return 'Deck ' + id + ' ▶ ' + (dn || '');
      }
      if (isPlay) {
        var rest2 = n.replace(/\b(play|graj|zagraj|pusc|wlacz|odpal|load|zaladuj)\b/g, ' ').trim();
        var t2 = rest2 ? api.findTrack(rest2) : null;
        if (t2) { api.deckLoad('A', t2, true); return '🎧 Deck A: ' + t2.name + ' ▶'; }
        if (!rest2) { api.kali(); return '▶ ' + (Sync.online ? 'Kali radio' : 'lokalny Kali beat (offline)'); }
      }
      var t3 = api.findTrack(n);
      if (t3 && norm(t3.name).indexOf(n) !== -1 && n.length > 3) { api.deckLoad('A', t3, true); return '🎧 Deck A: ' + t3.name + ' ▶'; }

      // --- small talk (bot-chat.js weave, offline)
      if (/\b(kim jestes|kto ty|who are you|d beast|przedstaw sie)\b/.test(n) || /^(mr d|bot d|d bot)[?!. ]*$/.test(n)) return KB.identity;
      if (/\b(dziekuje|dzieki|thanks|thx|spoko|super|git|ok|okej)\b/.test(n)) return pick(['Jasne 💚', 'Leć dalej — jestem tu.', 'OK · LIVE.']);
      if (/\b(pogoda|news|wiadomosc|wiadomosci|co slychac)\b/.test(n)) {
        return Sync.online ? 'Online 💚 — bez płatnego AI nie czytam newsów na żywo, ale sync, pamięć i DJ działają. Opowiedz, co Cię interesuje.' : 'Jestem offline — lecę lokalnie (decki, viz, komendy). Sync wróci sam, gdy będzie sieć.';
      }
      if (global.D7Answers) return global.D7Answers.answer(raw); // v51: real answer instead of echo-ack ("Odbieram"/„Słyszę”)
      var snip = String(raw).length > 120 ? String(raw).slice(0, 117) + '…' : String(raw);
      return pick([
        'Słyszę: „' + snip + '”. Mogę odpalić Kali radio, zmienić preset, puścić deck albo pokazać „pomoc”. Sieć: ' + netLine() + '.',
        'OK — „' + snip + '”. Jestem Daniel (Bot D): rozmowa + DJ + pamięć. Zapisuję to w historii. Co dalej?',
        'Notuję: „' + snip + '”. Chcesz coś zagrać („kali radio”, „deck a double d”) czy zapamiętać („zapamiętaj …”)?'
      ]);
    }

    return { handle: handle, statusText: statusText, help: HELP };
  }

  // ------------------------------------------------------------------ remote (WhatsApp / classic remote) + Grok inbox
  var Remote = {
    since: null, timer: 0, api: null, say: null,
    start: function (api, say) {
      this.api = api; this.say = say;
      var self = this;
      self.prime().then(function () {
        clearInterval(self.timer);
        self.timer = setInterval(function () { self.poll(); self.pollInbox(); }, 6000);
      });
    },
    prime: function () {
      var self = this;
      return Sync.getJSON('/api/remote-queue').then(function (q) {
        var last = '';
        ((q && q.cmds) || []).forEach(function (c) { if ((c.ts || '') > last) last = c.ts; });
        self.since = last || (q && q.updatedAt) || nowIso();
      }).then(function () { return self.primeInbox(); });
    },
    poll: function () {
      var self = this;
      if (!Sync.online || self.since == null) return;
      timeoutFetch('/api/remote-queue?since=' + encodeURIComponent(self.since), { cache: 'no-store' }, 5000)
        .then(function (r) { return r.json(); })
        .then(function (q) {
          ((q && q.cmds) || []).forEach(function (c) {
            if ((c.ts || '') <= self.since) return;
            self.since = c.ts;
            self.apply(c);
          });
        }).catch(function () {});
    },
    apply: function (entry) {
      var a = this.api, cmd = entry.cmd || entry.type || '', args = entry.args || {};
      try {
        switch (cmd) {
          case 'playTrack': {
            var id = args.id || args.videoId;
            var t = a.ytList.find(function (x) { return x.id === id; }) || { id: id, title: args.title || 'YouTube · ' + id, genre: 'yt', bpm: 128 };
            if (id) a.playYt(t);
            this.say('📱 Remote ▶ ' + t.title);
            break;
          }
          case 'searchPlay': this.say('📱 Remote: yt ' + (args.query || '')); a.runText('yt ' + (args.query || '')); break;
          case 'next': this.say('📱 Remote: next yt'); a.nextYt(); break;
          case 'pause': this.say('📱 Remote: pauza'); a.stopAll(); break;
          case 'vizWander': case 'viz': this.say('📱 Remote: ✨ ' + (a.presetRandom() || 'preset')); break;
          case 'vizFs': this.say('📱 Remote: fullscreen'); a.enterFs(); break;
          case 'auto': this.say('📱 Remote: auto'); a.setAuto(true); break;
          case 'kali': this.say('📱 Remote: Kali radio'); a.kali(); break;
          case 'botSay': this.say(args.text || 'D Beast live 💚'); break;
          case 'say': case 'command': a.runText(args.text || args.query || ''); break;
          default: break;
        }
      } catch (e) { console.warn('[BotD] remote', cmd, e); }
    },
    seen: null,
    primeInbox: function () {
      var self = this;
      self.seen = lsGet(LS.inbox, null);
      return Sync.getJSON('/api/grok-bridge').then(function (b) {
        var ids = ((b && b.inbox) || []).map(function (e) { return e.id; });
        if (!self.seen) { self.seen = ids.slice(-80); lsSet(LS.inbox, self.seen); } // first run: don't replay history
      });
    },
    pollInbox: function () {
      var self = this;
      if (!Sync.online || !self.seen) return;
      if ((self._n = (self._n || 0) + 1) % 2) return; // every ~12 s
      timeoutFetch('/api/grok-bridge', { cache: 'no-store' }, 6000).then(function (r) { return r.json(); }).then(function (b) {
        ((b && b.inbox) || []).forEach(function (e) {
          if (!e.id || self.seen.indexOf(e.id) !== -1) return;
          self.seen.push(e.id);
          self.say('💬 ' + (/grok/.test(e.role || '') || !e.role ? 'Grok' : e.role) + ' → Daniel: ' + String(e.text || '').slice(0, 600));
        });
        self.seen = self.seen.slice(-120);
        lsSet(LS.inbox, self.seen);
      }).catch(function () {});
    }
  };

  /** Register this X7 node in the bot mesh (once a day, online only). */
  function registerMesh() {
    var last = lsGet(LS.mesh, 0);
    if (Date.now() - last < 864e5) return;
    Sync.enqueue('/api/bot-mesh/register', {
      id: 'x7-bot-d', name: 'Daniel (Bot D) · D7 DJ · główny bot', role: 'main-bot', url: location.origin,
      caps: ['chat', 'dj', 'kali-radio', 'milkdrop', 'decks', 'offline', 'sync', 'remote', 'grok-inbox', 'chat-log', 'bot-pamiec', 'mesh']
    });
    lsSet(LS.mesh, Date.now());
  }

  global.BotD = { version: '43', name: BOT, app: APP, createBot: createBot, Sync: Sync, Memory: Memory, Remote: Remote, registerMesh: registerMesh, KB: KB, HELP: HELP, norm: norm };
})(window);
