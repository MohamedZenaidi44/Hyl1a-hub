/**
 * emu-save-sync-check.js — vérifie la sync cloud multi-plateformes (emu-save-sync.js)
 *
 * Partie A : test fonctionnel (auth + worker mockés) du cycle
 *            GET → PUT (avec grace period) → FORCE_SAVE_SYNC → protection save vierge.
 * Partie B : vérifie que les 4 pages player chargent la sync et détectent la bonne plateforme.
 *
 * Prérequis : serveur statique sur http://localhost:5500 (node tests/static-server.js)
 * Lancer : node tests/emu-save-sync-check.js
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5500';
const WORKER_HOST = 'gba-saves.mohzn44.workers.dev';

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error('Chrome introuvable');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`   ${ok ? '\u2713' : '\u2717'} ${name}${detail ? ` — ${detail}` : ''}`);
  ok ? passed++ : failed++;
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--hide-scrollbars',
           '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  try {
    /* ───────────────────────── Partie A : cycle fonctionnel DS ───────────────────────── */
    console.log('\nPartie A — cycle fonctionnel (DS, mocks)');

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(800);

    await page.evaluate(async () => {
      history.replaceState(null, '', '#name=Pok%C3%A9mon%20Version%20Noire&core=desmume');

      window.__calls = [];
      const origFetch = window.fetch.bind(window);
      window.fetch = (input, init = {}) => {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (url.includes('gba-saves.mohzn44.workers.dev')) {
          const method = String(init.method || 'GET').toUpperCase();
          const headers = init.headers || {};
          window.__calls.push({
            url, method,
            auth: headers.Authorization || headers.authorization || '',
            bodySize: init.body ? init.body.byteLength || 0 : 0,
          });
          if (method === 'GET') return Promise.resolve(new Response('No save found', { status: 404 }));
          return Promise.resolve(new Response(JSON.stringify({ ok: true, size: 8 }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          }));
        }
        return origFetch(input, init);
      };

      window.FirebaseAuth = {
        currentUser: { uid: 'test-uid-123', getIdToken: async () => 'fake-token' },
        onAuthStateChanged: () => {},
      };

      window.__saveBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      window.EJS_emulator = {
        gameManager: {
          getSaveFile: () => window.__saveBytes,
          saveSaveFiles: () => {},
          getSaveFilePath: () => '/data/saves/desmume/test.dsv',
          writeFile: () => {},
          loadSaveFiles: () => {},
        },
        enableSaveUpdateEvent: () => {},
        startSaveInterval: () => {},
        on: () => {},
      };

      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/public/js/core/emu-save-sync.js';
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    });

    const init = await page.evaluate(() => ({
      hasApi: typeof window.EmuSaveSync === 'object',
      platform: window.EmuSaveSync?.platform(),
      key: window.EmuSaveSync?.cloudKey(),
      onGameStart: typeof window.EJS_onGameStart,
    }));
    check('sync chargée et API exposée', init.hasApi);
    check('plateforme détectée depuis core=desmume', init.platform === 'ds', `platform=${init.platform}`);
    check('clé cloud préfixée par plateforme', init.key === 'ds__Pokémon Version Noire', `key="${init.key}"`);
    check('EJS_onGameStart posée avant le loader', init.onGameStart === 'function');

    await page.evaluate(() => window.EJS_onGameStart());

    await sleep(1200);
    const afterBoot = await page.evaluate(() => ({
      calls: window.__calls.slice(),
      status: window.EmuSaveSync.status(),
    }));
    const getCall = afterBoot.calls.find((c) => c.method === 'GET');
    check('GET de la save cloud au démarrage du jeu', !!getCall);
    check('GET authentifié avec le token Firebase', getCall?.auth === 'Bearer fake-token');
    check('syncReady actif après le download', afterBoot.status.syncReady === true);

    console.log('   … attente du 1er upload automatique (grace period 8 s)');
    await sleep(10000);

    let calls = await page.evaluate(() => window.__calls.slice());
    const firstPut = calls.find((c) => c.method === 'PUT');
    check('upload automatique après la grace period', !!firstPut, firstPut ? `${firstPut.bodySize} octets` : 'aucun PUT');
    check('PUT vers la bonne clé cloud', !!firstPut?.url.includes('game=ds__Pok%C3%A9mon%20Version%20Noire'));

    await page.evaluate(() => {
      window.__saveBytes = new Uint8Array([9, 9, 9, 9]);
      window.postMessage({ type: 'FORCE_SAVE_SYNC' }, '*');
    });
    await sleep(900);
    const putCountAfterForce = (await page.evaluate(() => window.__calls.filter((c) => c.method === 'PUT').length));
    check('FORCE_SAVE_SYNC (bouton Quitter) → upload immédiat', putCountAfterForce > (calls.filter((c) => c.method === 'PUT').length));

    await page.evaluate(() => {
      window.__saveBytes = new Uint8Array(8).fill(0);
      window.postMessage({ type: 'FORCE_SAVE_SYNC' }, '*');
    });
    await sleep(900);
    const putCountAfterBlank = (await page.evaluate(() => window.__calls.filter((c) => c.method === 'PUT').length));
    check('save vierge jamais uploadée (protection écrasement)', putCountAfterBlank === putCountAfterForce);

    await page.close();

    /* ─────────────── Partie A2 : rétro-compat clé GBA sans préfixe ─────────────── */
    console.log('\nPartie A2 — rétro-compatibilité GBA');

    const gbaPage = await browser.newPage();
    await gbaPage.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(800);
    const gbaCompat = await gbaPage.evaluate(async () => {
      history.replaceState(null, '', '#name=Kirby%20%26%20the%20Amazing%20Mirror&core=mgba');
      window.FirebaseAuth = {
        currentUser: { uid: 'u2', getIdToken: async () => 't' },
        onAuthStateChanged: () => {},
      };
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/public/js/core/emu-save-sync.js';
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
      return { platform: window.EmuSaveSync.platform(), key: window.EmuSaveSync.cloudKey() };
    });
    check('GBA garde sa clé historique (sans préfixe)', gbaCompat.platform === 'gba' && gbaCompat.key === 'Kirby & the Amazing Mirror', `key="${gbaCompat.key}"`);
    await gbaPage.close();

    /* ───────────────────── Partie B : câblage des 4 pages player ───────────────────── */
    console.log('\nPartie B — chargement de la sync dans les 4 players');

    const players = [
      { app: 'gba', core: 'mgba',             expected: 'gba' },
      { app: 'ds',  core: 'desmume',          expected: 'ds' },
      { app: 'nes', core: 'fceumm',           expected: 'nes' },
      { app: 'n64', core: 'mupen64plus_next', expected: 'n64' },
    ];

    for (const p of players) {
      const pp = await browser.newPage();
      const syncLogs = [];
      pp.on('console', (m) => { const t = m.text(); if (t.includes('[SaveSync]')) syncLogs.push(t); });

      await pp.setRequestInterception(true);
      pp.on('request', (req) => {
        const u = req.url();
        if (u.includes('cdn.emulatorjs.org') || u.includes('pub-045046eb23854c6e897afff1193bf9bf.r2.dev')) return req.abort();
        req.continue();
      });

      const url = `${BASE}/apps/${p.app}/${p.app}_player.html#rom=https%3A%2F%2Fexample.com%2Fx.rom&name=WiringTest&core=${p.core}`;
      await pp.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(1000);

      await pp.evaluate(() => {
        window.FirebaseAuth = {
          currentUser: { uid: 'wiring-uid', getIdToken: async () => 't' },
          onAuthStateChanged: () => {},
        };
      });
      await sleep(1500);

      const state = await pp.evaluate(() => ({
        api: typeof window.EmuSaveSync === 'object',
        platform: window.EmuSaveSync?.platform(),
        key: window.EmuSaveSync?.cloudKey(),
        onGameStart: typeof window.EJS_onGameStart === 'function',
      }));
      const expectedKey = p.expected === 'gba' ? 'WiringTest' : `${p.expected}__WiringTest`;
      check(`${p.app} : sync chargée, plateforme=${state.platform}, clé="${state.key}"`,
        state.api && state.platform === p.expected && state.key === expectedKey && state.onGameStart,
        `api=${state.api} platform=${state.platform} key=${state.key} onGameStart=${state.onGameStart}`);
      check(`${p.app} : auth détectée (pas de "Non connecté")`, syncLogs.some((l) => l.includes('Prêt')));

      await pp.close();
    }

  } finally {
    await browser.close();
  }

  console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} réussis, ${failed} échoués`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error('CHECK FAIL', e); process.exit(1); });
