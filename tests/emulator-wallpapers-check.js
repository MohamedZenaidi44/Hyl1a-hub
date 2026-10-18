/**
 * Wallpapers par émulateur (dossier « emulator BC ») :
 *
 *  W1) chaque émulateur affiche l'image correspondant à son nom de fichier
 *      (DS → NDS.jpeg, N64 → N64.png, NES → NES.jpeg, GBA → GBA.png) ;
 *  W2) c'est la même image dans les deux thèmes (clair/sombre) : le fond
 *      ne change jamais, seule l'interface s'adapte ;
 *  W3) remplissage plein écran (cover centré, pas de déformation) ;
 *  W4) fond neutre de secours défini si l'image manque (DS/N64/NES) ;
 *  W5) captures des menus dans les deux thèmes.
 *
 * Lancement : node tests/emulator-wallpapers-check.js  (serveur requis :5500)
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5500/';
const SHOTS_DIR = path.join(__dirname, 'shots');

const EMULATORS = [
  { app: 'ds', file: 'NDS.jpeg', sel: '.gxmb-wallpaper', shot: 'emu-ds' },
  { app: 'n64', file: 'N64.png', sel: '.gxmb-wallpaper', shot: 'emu-n64' },
  { app: 'nes', file: 'NES.jpeg', sel: '.gxmb-wallpaper', shot: 'emu-nes' },
  { app: 'gba', file: 'GBA.png', sel: '.gxmb-wallpaper', shot: 'emu-gba' },
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
  ].filter(Boolean);
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error('Chrome introuvable (definir CHROME_PATH)');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function preparePage(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('.wii-menu .wii-channel', { timeout: 20000 });
  await page.evaluate(() => {
    const auth = document.getElementById('auth-overlay');
    if (auth) auth.style.display = 'none';
  });
  await sleep(400);
  await page.evaluate(() => {
    const warn = document.getElementById('wii-warning-overlay');
    if (warn) warn.remove();
  });
  await sleep(600);
}

async function launchApp(page, appId) {
  await page.evaluate((a) => {
    const t = document.createElement('div');
    t.setAttribute('data-app', a);
    document.body.appendChild(t);
    window.handleAppLaunch(t);
    t.remove();
  }, appId);
}

async function sampleWall(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    const cs = el ? getComputedStyle(el) : null;
    const bg = cs ? cs.backgroundImage : '';
    const m = bg.match(/url\("?([^")]+)"?\)/);
    return {
      has: !!el,
      url: m ? m[1] : '',
      size: cs ? cs.backgroundSize : '',
      pos: cs ? cs.backgroundPosition : '',
      color: cs ? cs.backgroundColor : '',
      body: document.body.className,
    };
  }, sel);
}

(async () => {
  if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const results = [];
  const logs = [];
  const R = (name, ok, detail = '') => {
    results.push([name, !!ok, detail]);
    console.log(`   ${ok ? '\u2713' : '\u2717'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--hide-scrollbars',
           '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  const fname = (u) => decodeURIComponent((u || '').split('/').pop().split('?')[0]);

  try {
    for (const emu of EMULATORS) {
      const page = await browser.newPage();
      page.on('console', (m) => { if (m.type() === 'error') logs.push(`[${emu.app}][console.error] ${m.text()}`); });
      page.on('pageerror', (e) => logs.push(`[${emu.app}][pageerror] ${e.toString()}`));
      await page.setViewport({ width: 1920, height: 1080 });
      await preparePage(page);

      await launchApp(page, emu.app);
      await page.waitForSelector(emu.sel, { timeout: 20000 });
      await sleep(3500);

      /* Thème noir */
      await page.evaluate(() => window.ThemeManager.apply('black', false));
      await sleep(500);
      const black = await sampleWall(page, emu.sel);
      await page.screenshot({ path: path.join(SHOTS_DIR, `${emu.shot}-black.png`) });

      /* Thème blanc */
      await page.evaluate(() => window.ThemeManager.apply('white', false));
      await sleep(500);
      const white = await sampleWall(page, emu.sel);
      await page.screenshot({ path: path.join(SHOTS_DIR, `${emu.shot}-white.png`) });

      /* W1) Bonne image par émulateur */
      R(`${emu.app.toUpperCase()} → ${emu.file} (image chargée)`,
        black.has && fname(black.url) === emu.file && fname(white.url) === emu.file,
        `noir=${fname(black.url)} blanc=${fname(white.url)}`);

      /* W2) Même image dans les deux thèmes */
      R(`${emu.app.toUpperCase()} même image dans les deux thèmes`,
        black.url !== '' && black.url === white.url,
        fname(black.url));

      /* W3) Cover centré */
      R(`${emu.app.toUpperCase()} cover centré (plein écran, sans déformation)`,
        black.size.includes('cover') && black.pos.includes('50% 50%'),
        `size=${black.size.split(',').map(s => s.trim()).join(' | ')} pos=${black.pos.split(',').map(s => s.trim()).join(' | ')}`);

      /* W4) Fond neutre de secours (DS/N64/NES : couleur dans la pile) */
      if (emu.app !== 'gba') {
        R(`${emu.app.toUpperCase()} fond neutre de secours défini`,
          black.color === 'rgb(20, 22, 28)',
          `bg-color=${black.color}`);
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter(([, ok]) => !ok).length;
  console.log('\n=== Erreurs console / page ===');
  const uniq = [...new Set(logs)];
  if (!uniq.length) console.log('   aucune');
  else uniq.slice(0, 30).forEach(l => console.log('   ' + l));

  console.log(failed ? `\nRESULTAT : ${failed} echec(s).` : '\nRESULTAT : tout passe.');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('Erreur du script de test :', e); process.exit(2); });
