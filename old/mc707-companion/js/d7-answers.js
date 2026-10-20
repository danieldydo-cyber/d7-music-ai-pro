/* D7 Answers v51 — real offline answers in PL/EN/DE/UK/ES/FR for every D bot.
 * Fixes bots that only acknowledged ("Odbieram" / "Słyszę: …" / "Notuję: …") without answering. */
(function (g) {
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/\s+/g, ' ').trim(); }
  var MARK = {
    uk: /[іїєґ]|\b(привіт|дякую|що|як)\b/i, ru: /[ыэъ]|\b(привет|спасибо|что|как)\b/i,
    de: /\b(hallo|danke|wie|was|ich|bitte|musik|nicht|ist)\b/, es: /\b(hola|gracias|que|como|musica|por favor|quiero)\b/,
    fr: /\b(bonjour|salut|merci|comment|musique|je|est-ce)\b/, en: /\b(hi|hello|what|how|the|is|you|please|thanks|can|play|music|who)\b/,
    pl: /[ąćęłńóśźż]|\b(czesc|siema|jak|co|jest|dzieki|prosze|muzyk|zagraj|jestem|ty)\b/
  };
  function detect(t) {
    var raw = String(t || ''), n = norm(raw);
    if (MARK.uk.test(raw)) return 'uk'; if (MARK.ru.test(raw)) return 'ru';
    var order = ['pl', 'de', 'es', 'fr', 'en'];
    for (var i = 0; i < order.length; i++) if (MARK[order[i]].test(i === 0 ? raw.toLowerCase() + ' ' + n : n)) return order[i];
    return 'pl';
  }
  var T = {
    hi: { pl: 'Hej! Tu D 💚 — DJ, radio, wizualizacje MilkDrop i boty. W czym pomóc?', en: 'Hey! D here 💚 — DJ, radio, MilkDrop visuals and bots. How can I help?', de: 'Hallo! Hier ist D 💚 — DJ, Radio, MilkDrop-Visuals und Bots. Wobei kann ich helfen?', uk: 'Привіт! Це D 💚 — DJ, радіо, візуалізації MilkDrop і боти. Чим допомогти?', ru: 'Привет! Это D 💚 — DJ, радио, MilkDrop и боты. Чем помочь?', es: '¡Hola! Soy D 💚 — DJ, radio, visuales MilkDrop y bots. ¿En qué te ayudo?', fr: 'Salut ! Ici D 💚 — DJ, radio, visuels MilkDrop et bots. Je peux aider ?' },
    who: { pl: 'Jestem D — główny bot aplikacji D7 DJ · X7S Daniela Dydo (Kraków). Program-pomocnik: miksowanie, radio internetowe, wizualizacje, budowanie botów.', en: 'I am D — the main bot of D7 DJ · X7S by Daniel Dydo (Kraków). A helper program: mixing, internet radio, visuals, bot building.', de: 'Ich bin D — der Haupt-Bot von D7 DJ · X7S von Daniel Dydo (Krakau). Mixen, Internetradio, Visuals, Bot-Builder.', uk: 'Я D — головний бот D7 DJ · X7S Даніеля Диди (Краків): мікс, інтернет-радіо, візуалізації, конструктор ботів.', ru: 'Я D — главный бот D7 DJ · X7S (Краков): микс, радио, визуализации, боты.', es: 'Soy D — el bot principal de D7 DJ · X7S de Daniel Dydo (Cracovia): mezcla, radio, visuales y bots.', fr: 'Je suis D — le bot principal de D7 DJ · X7S de Daniel Dydo (Cracovie) : mix, radio, visuels, bots.' },
    thanks: { pl: 'Nie ma sprawy 💚', en: 'You are welcome 💚', de: 'Gern geschehen 💚', uk: 'Будь ласка 💚', ru: 'Пожалуйста 💚', es: 'De nada 💚', fr: 'Avec plaisir 💚' },
    time: { pl: 'Teraz jest ', en: 'It is now ', de: 'Es ist jetzt ', uk: 'Зараз ', ru: 'Сейчас ', es: 'Ahora son las ', fr: 'Il est ' },
    radio: { pl: '📻 Radio: otwórz /v51.html → zakładka Radio (RMF FM, Radio ZET, Trójka, Chillizet, TOK FM, Radio 357, Nowy Świat + tysiące z radio-browser.info).', en: '📻 Radio: open /v51.html → Radio tab (Polish stations + thousands from radio-browser.info).', de: '📻 Radio: /v51.html → Radio (polnische Sender + tausende via radio-browser.info).', uk: '📻 Радіо: /v51.html → Радіо (польські станції + тисячі з radio-browser.info).', ru: '📻 Радио: /v51.html → Радио.', es: '📻 Radio: /v51.html → Radio (emisoras polacas + miles de radio-browser.info).', fr: '📻 Radio : /v51.html → Radio (stations polonaises + des milliers via radio-browser.info).' },
    viz: { pl: '✨ Wizualizacje MilkDrop (butterchurn): /v51.html → Wizualizacja · „następny preset”, pełny ekran, reaguje na radio/mikrofon.', en: '✨ MilkDrop visuals (butterchurn): /v51.html → Visualizer · next preset, fullscreen, reacts to radio/mic.', de: '✨ MilkDrop-Visuals: /v51.html → Visualizer.', uk: '✨ Візуалізації MilkDrop: /v51.html → Візуалізація.', ru: '✨ MilkDrop: /v51.html.', es: '✨ Visuales MilkDrop: /v51.html → Visualizador.', fr: '✨ Visuels MilkDrop : /v51.html → Visualiseur.' },
    dj: { pl: '🎧 Tip DJ: ', en: '🎧 DJ tip: ', de: '🎧 DJ-Tipp: ', uk: '🎧 Порада DJ: ', ru: '🎧 Совет DJ: ', es: '🎧 Consejo DJ: ', fr: '🎧 Astuce DJ : ' },
    bpm: { pl: 'Tempa: techno 120–150, house 115–130, hip-hop 80–100, DnB 160–180, trance ~120–138 BPM.', en: 'Tempos: techno 120–150, house 115–130, hip-hop 80–100, DnB 160–180, trance ~120–138 BPM.' },
    help: { pl: 'Umiem: radio („radio”), wizualizacje („viz”), porady DJ („bpm”, „miks”), godzina, matematyka („2+2”), boty („zbuduj bota”), status synchronizacji („sync”). Piszę po polsku, angielsku, niemiecku, ukraińsku, hiszpańsku i francusku.', en: 'I can: radio, visuals, DJ tips (bpm, mix), time, math (2+2), bot builder, sync status. I speak PL, EN, DE, UK, ES, FR.' },
    sync: { pl: '🔄 Status pamięci/Google i synchronizacji botów: /v51.html → Sync (Drive, Gmail, Grok, bot-mesh).', en: '🔄 Memory/Google & multi-bot sync status: /v51.html → Sync.' },
    build: { pl: '🧩 Bot Builder: /v51.html → Bot Builder — nadaj nazwę, język, osobowość i reguły „pytanie → odpowiedź”.', en: '🧩 Bot Builder: /v51.html → Bot Builder — name, language, persona and Q→A rules.' },
    fallback: { pl: 'Nie mam jeszcze pewnej odpowiedzi na: „%s”. Spróbuj: „pomoc”, „radio”, „bpm”, „viz”, „sync” — albo podłącz Mózg AI (Ollama/OpenRouter) w /d/agents.html, wtedy odpowiem na wszystko.', en: 'I do not have a solid answer for “%s” yet. Try: help, radio, bpm, viz, sync — or connect an AI brain (Ollama/OpenRouter) in /d/agents.html for open questions.', de: 'Dazu („%s“) habe ich noch keine sichere Antwort. Versuch: Hilfe, Radio, BPM — oder verbinde ein KI-Gehirn in /d/agents.html.', uk: 'Поки не маю точної відповіді на «%s». Спробуй: допомога, радіо, bpm — або підключи AI-мозок у /d/agents.html.', ru: 'Пока нет точного ответа на «%s». Подключи AI-мозг в /d/agents.html.', es: 'Aún no tengo una respuesta segura para «%s». Prueba: ayuda, radio, bpm — o conecta un cerebro IA en /d/agents.html.', fr: 'Pas encore de réponse sûre à « %s ». Essaie : aide, radio, bpm — ou connecte un cerveau IA dans /d/agents.html.' }
  };
  var TIPS = { pl: ['Miksuj na granicach fraz (16/32 beaty).', 'Bass swap na takcie w połowie przejścia — nigdy dwa pełne basy.', 'Utwory dalej niż ±8% tempa łącz echo-outem.', '174 BPM gra jak 87 half-time.'], en: ['Mix on phrase boundaries (16/32 beats).', 'Swap the bass mid-transition — never two full basslines.', 'Tracks more than ±8% apart: echo-out instead.', '174 BPM plays as 87 half-time.'] };
  function L(key, lang) { var o = T[key]; return o[lang] || o.en || o.pl; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function math(n) { var m = n.replace(/,/g, '.').match(/^(?:ile (?:to )?|what is |calc |oblicz )?([\d.\s+\-*/()%^]+)\??$/); if (!m || !/\d\s*[+\-*/%^]\s*\d/.test(m[1])) return null; try { var v = Function('"use strict";return (' + m[1].replace(/\^/g, '**') + ')')(); return isFinite(v) ? '= ' + (+v.toFixed(8)) : null; } catch (_) { return null; } }
  function answer(text, opts) {
    opts = opts || {}; var lang = opts.lang && opts.lang !== 'auto' ? opts.lang.slice(0, 2) : detect(text), n = norm(text);
    if (!n) return L('hi', lang);
    var custom = opts.rules || []; for (var i = 0; i < custom.length; i++) { try { if (custom[i].q && n.indexOf(norm(custom[i].q)) !== -1) return custom[i].a; } catch (_) {} }
    var mres = math(n); if (mres) return mres;
    if (/^(hej|hejka|czesc|siema|elo|hello|hi|hey|hallo|hola|salut|bonjour|привіт|привет|dzien dobry)\b/.test(n) || /^(привіт|привет)/i.test(text)) return L('hi', lang);
    if (/\b(kim jestes|kto ty|who are you|wer bist du|quien eres|qui es tu|хто ти|кто ты|przedstaw sie)\b/.test(n) || /хто ти|кто ты/i.test(text)) return L('who', lang);
    if (/\b(dzieki|dziekuje|thanks|thank you|thx|danke|gracias|merci)\b/.test(n) || /дякую|спасибо/i.test(text)) return L('thanks', lang);
    if (/\b(godzina|ktora|time|uhrzeit|hora|heure|data|date)\b/.test(n)) return L('time', lang) + new Date().toLocaleString(lang === 'uk' ? 'uk-UA' : lang);
    if (/\b(radio|stacj\w*|station\w*|sender|emisora)\b/.test(n)) return L('radio', lang);
    if (/\b(viz|wizualiz\w*|milkdrop|visual\w*|preset)\b/.test(n)) return L('viz', lang);
    if (/\b(bpm|tempo)\b/.test(n)) return L('bpm', lang);
    if (/\b(mix|miks\w*|przejsci\w*|transition|dj)\b/.test(n)) return L('dj', lang) + pick(TIPS[lang] || TIPS.en);
    if (/\b(sync|synchroniz\w*|pamiec|memory|google|drive|mesh)\b/.test(n)) return L('sync', lang);
    if (/\b(bot builder|zbuduj bota|stworz bota|build a bot|create bot|kreator)\b/.test(n)) return L('build', lang);
    if (/\b(pomoc|help|hilfe|ayuda|aide|co umiesz|what can you do)\b/.test(n) || /допомог|помощ/i.test(text)) return L('help', lang);
    if (opts.noFallback) return null;
    var s = String(text).slice(0, 80); return L('fallback', lang).replace('%s', s);
  }
  g.D7Answers = { answer: answer, detect: detect, version: '51' };
})(typeof window !== 'undefined' ? window : globalThis);
