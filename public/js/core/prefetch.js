/**
 * prefetch.js — préchargement opportuniste du hub.
 *
 * Objectif : rendre l'ouverture des menus d'émulateurs et le lancement des
 * jeux quasi instantanés, sans charger les émulateurs au démarrage.
 *
 *   - survol / focus d'une tuile : importe le menu (déjà en cache module),
 *     précharge le wallpaper et les fichiers EmulatorJS du core concerné ;
 *   - en idle après le chargement du hub : préimporte les 4 menus ;
 *   - sélection d'un jeu dans un menu XMB : précharge la ROM (HTTP cache).
 */
(function () {
  'use strict';

  const EJS_BASE = 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/emulatorjs/';

  const APPS = {
    gba: { js: '/apps/gba/js/gba.js', wallpaper: 'public/assets/emulators/GBA.webp', core: 'cores/mgba-legacy-wasm.data' },
    ds:  { js: '/apps/ds/js/ds.js',   wallpaper: 'public/assets/emulators/NDS.webp', core: 'cores/desmume-wasm.data' },
    nes: { js: '/apps/nes/js/nes.js', wallpaper: 'public/assets/emulators/NES.webp', core: 'cores/fceumm-legacy-wasm.data' },
    n64: { js: '/apps/n64/js/n64.js', wallpaper: 'public/assets/emulators/N64.webp', core: 'cores/mupen64plus_next-wasm.data' },
  };

  const EJS_COMMON = [
    'loader.js',
    'emulator.min.js',
    'emulator.min.css',
    'compression/extract7z.js',
  ];

  const warmedApps = new Set();
  const warmedConsoles = new Set();
  const warmedRoms = new Set();

  function lowPriorityFetch(url) {
    const opts = { cache: 'default' };
    try { opts.priority = 'low'; } catch (e) { /* ignore */ }
    return fetch(url, opts).then(function (res) {
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const pump = function () {
        reader.read().then(function (r) { if (!r.done) pump(); }).catch(function () {});
      };
      pump();
    }).catch(function () {});
  }

  function warmApp(appId) {
    const cfg = APPS[appId];
    if (!cfg || warmedApps.has(appId)) return;
    warmedApps.add(appId);
    import(cfg.js).catch(function () {});
    const img = new Image();
    img.decoding = 'async';
    img.src = cfg.wallpaper;
  }

  function warmConsole(appId) {
    const cfg = APPS[appId];
    if (!cfg || warmedConsoles.has(appId)) return;
    warmedConsoles.add(appId);
    EJS_COMMON.concat([cfg.core]).forEach(function (p) {
      lowPriorityFetch(EJS_BASE + p);
    });
  }

  function warmRom(url) {
    if (!url || !/^https?:/i.test(url) || warmedRoms.has(url)) return;
    if (navigator.connection && navigator.connection.saveData) return;
    warmedRoms.add(url);
    lowPriorityFetch(url);
  }

  function appIdOf(node) {
    const el = node && node.closest && node.closest('.grid-tile, .app-trigger');
    return el ? el.getAttribute('data-app') : null;
  }

  function onIntent(e) {
    const appId = appIdOf(e.target);
    if (!appId) return;
    warmApp(appId);
    warmConsole(appId);
  }

  document.addEventListener('mouseover', onIntent, { passive: true });
  document.addEventListener('focusin', onIntent, true);

  window.HyliaPrefetch = {
    app: warmApp,
    console: warmConsole,
    rom: warmRom,
  };

  const idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 0); };
  function scheduleIdlePrefetch() {
    idle(function () { Object.keys(APPS).forEach(warmApp); }, { timeout: 2500 });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(scheduleIdlePrefetch, 1200);
    }, { once: true });
  } else {
    setTimeout(scheduleIdlePrefetch, 0);
  }
})();
