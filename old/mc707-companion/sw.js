/**
 * D7 DJ · PRO8 Fluid (v43) — service worker
 * - update flow: skipWaiting + clients.claim, then every open page is asked for its version;
 *   stale pages (v41/v42 or no answer) are reloaded so nobody keeps running old code
 * - guard: old pages may not post X7_STATE settings snapshots (v < 41) — dropped locally, never reach the server
 * - shell cache: pages, css/js (incl. Bot D brain), MilkDrop presets, icons, Bot Pamięć snapshot
 * - media cache: built-in beats precached; full-track caching on demand ("offline" command);
 *   Range requests are answered from cache with 206 slices so <audio> can seek offline
 * - API: network-first with timeout; offline → last good JSON or {ok:false, offline:true}
 * Network-first for HTML/JS/CSS so tunnel updates always show up when online.
 */
const V = '54';
const SHELL_CACHE = 'd7-dj-pro8-fluid-v43';
const MEDIA_CACHE = 'd7-dj-media-v2';
const OLD_MEDIA = ['d7-dj-media-v1', 'ddj-x7-media-v1'];
const API_CACHE = 'd7-dj-api-v2';
const KEEP = [SHELL_CACHE, MEDIA_CACHE, API_CACHE];

const SHELL = [
  './', './index.html', './pro-dj', './pro-dj.html', './kali-live', './kali-live.html',
  './css/special-x.css?v=' + V, './css/pro8.css?v=' + V, './css/d7-chat.css?v=' + V,
  './js/d7-answers.js?v=' + V, './js/bot-d.js?v=' + V, './v51.html', './app.html', './js/one.js?v=' + V, './js/one-pro.js?v=' + V, './js/d7-v51.js?v=' + V, './js/pro8.js?v=' + V, './js/d7-chat.js?v=' + V, './js/special-x.js?v=' + V,
  './libs/butterchurn.min.js?v=' + V, './libs/butterchurnPresets.min.js?v=' + V, './libs/butterchurnPresetsExtra.min.js?v=' + V,
  './manifest.webmanifest', './favicon.ico', './favicon.png',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png', './icons/apple-touch-icon.png', './icons/bot-d-shark.png',
  './samples/memory-public.json',
];
// classic.html extras: best effort, never block install
const SHELL_OPTIONAL = [
  './classic.html', './kali.html', './pro-dj-classic.html', './kali-live-classic.html', './css/main.css', './js/app.js?v=' + V, './js/audio-engine.js', './js/deck.js', './js/fx.js', './js/midi.js',
  './js/bpm.js', './js/waveform.js', './js/viz.js', './js/bot-chat.js', './js/yt-pro.js',
];
const MEDIA = ['./samples/kali-hiphop-120.wav', './samples/berlin-techno-128.wav', './samples/trance-120.wav'];

function addAll(cacheName, list, required) {
  return caches.open(cacheName).then((c) => Promise.all(list.map((u) =>
    fetch(u, { cache: 'no-store' }).then((r) => {
      if (r && r.ok && r.status === 200) return c.put(u, r);
      if (required) throw new Error('precache ' + u + ' ' + (r && r.status));
    }).catch((e) => { if (required) throw e; })
  )));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    addAll(SHELL_CACHE, SHELL, true)
      .then(() => Promise.all([addAll(SHELL_CACHE, SHELL_OPTIONAL, false), addAll(MEDIA_CACHE, MEDIA, false)]))
      .then(() => self.skipWaiting())
  );
});

/** Carry already-downloaded tracks over from the previous media cache (no 16 MB re-download). */
async function migrateMedia() {
  const dst = await caches.open(MEDIA_CACHE);
  for (const name of OLD_MEDIA) {
    if (!(await caches.has(name))) continue;
    const src = await caches.open(name);
    for (const req of await src.keys()) {
      if (await dst.match(req)) continue;
      const res = await src.match(req);
      if (res) await dst.put(req, res);
    }
  }
}

function askVersion(client) {
  return new Promise((resolve) => {
    try {
      const ch = new MessageChannel();
      const t = setTimeout(() => resolve(null), 3500);
      ch.port1.onmessage = (e) => { clearTimeout(t); resolve(e.data && e.data.v ? String(e.data.v) : null); };
      client.postMessage({ type: 'd7-version?', v: V }, [ch.port2]);
    } catch (_) { resolve(null); }
  });
}

/** Reload every open page that is not running this version (old cached v39/v40 tabs). */
async function refreshStaleClients() {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: false });
  await Promise.all(list.map(async (c) => {
    const v = await askVersion(c);
    if (v === V) return;
    // Never await navigate() here: this runs inside activate's waitUntil, and the navigation's fetch is
    // dispatched to this very SW, which only handles fetches once activation finished → deadlock.
    const msg = () => { try { c.postMessage({ type: 'd7-reload', v: V }); } catch (_) {} };
    try { if (c.navigate) { c.navigate(c.url).catch(msg); return; } } catch (_) {}
    msg();
  }));
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    migrateMedia().catch(() => {})
      .then(() => caches.keys())
      .then((keys) => Promise.all(keys.filter((k) => KEEP.indexOf(k) < 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => refreshStaleClients().catch(() => {}))
  );
});

/** Old clients (v39 pushed default settings from every fresh device) — drop their X7_STATE posts here. */
async function guardStatePost(req) {
  try {
    const body = await req.clone().text();
    const j = JSON.parse(body || '{}');
    if (j && j.role === 'state' && /^X7_STATE /.test(j.text || '')) {
      let v = 0;
      try { v = Number(JSON.parse(j.text.slice(9)).v) || 0; } catch (_) { v = 0; }
      if (v < Number(V)) {
        return new Response(JSON.stringify({ ok: true, dropped: true, reason: 'stale client state (v' + v + ')' }), {
          status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-DDJ-Dropped': '1' },
        });
      }
    }
  } catch (_) {}
  return fetch(req);
}

function timeout(ms, p) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

function offlineJson() {
  return new Response(JSON.stringify({ ok: false, offline: true, error: 'offline' }), {
    status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-DDJ-Offline': '1' },
  });
}

/** Serve a Range request from a cached full response. */
async function rangeFromCache(req, cached) {
  const range = req.headers.get('range');
  if (!range) return cached;
  const buf = await cached.arrayBuffer();
  const total = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, total - parseInt(m[2], 10)); end = total - 1; }
  if (start >= total) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + total } });
  end = Math.min(end, total - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method === 'POST' && new URL(req.url).pathname === '/api/grok-bridge') { event.respondWith(guardStatePost(req)); return; }
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // YouTube etc. untouched
  const path = url.pathname;

  // ---- API: network-first (6 s), cache last good JSON, offline JSON fallback
  if (path.startsWith('/api/')) {
    if (path.startsWith('/api/remote-queue')) return; // live only
    event.respondWith(
      timeout(6000, fetch(req)).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(API_CACHE).then((c) => c.put(url.pathname, copy)); }
        return res;
      }).catch(() => (path === '/api/account-status' ? Promise.resolve(null) : caches.open(API_CACHE).then((c) => c.match(url.pathname))).then((m) => (m ? m.text().then((t) => new Response(t, { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-DDJ-Offline': '1' } })) : offlineJson())))
    );
    return;
  }

  // ---- Media: cache-first (with Range support), network fallback
  if (/\.(wav|mp3|ogg|m4a|flac)$/i.test(path)) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then((c) => c.match(url.pathname, { ignoreSearch: true }).then((m) => {
        if (m) return rangeFromCache(req, m);
        return fetch(req).then((res) => {
          // A full 200 (no Range) is cacheable; 206 slices are not
          if (res && res.status === 200 && !req.headers.get('range')) { const copy = res.clone(); c.put(url.pathname, copy); }
          return res;
        });
      }))
    );
    return;
  }

  // ---- Shell (navigation / html / js / css / json): network-first, cache fallback
  const isNav = req.mode === 'navigate';
  const isShell = isNav || path.endsWith('/') || /\.(html|js|css|webmanifest|json)$/.test(path) || path === '/pro-dj' || path === '/kali-live' || path === '/kali';
  if (isShell) {
    event.respondWith(
      timeout(isNav ? 8000 : 10000, fetch(req)).then((res) => {
        if (res && res.ok && res.status === 200) { const copy = res.clone(); caches.open(SHELL_CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.open(SHELL_CACHE).then((c) =>
        c.match(req).then((m) => m || c.match(req, { ignoreSearch: true })).then((m) => {
          if (m) return m;
          if (isNav) {
            const alt = path.indexOf('kali') >= 0 ? './kali-live.html' : path.indexOf('pro-dj') >= 0 ? './pro-dj.html' : './index.html';
            return c.match(alt).then((x) => x || c.match('./'));
          }
          return Response.error();
        })
      ))
    );
    return;
  }

  // ---- Icons / images: cache-first
  if (/\.(png|svg|ico|jpg|jpeg|webp)$/i.test(path)) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(SHELL_CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
