/**
 * Verification du cycle jour/nuit branche sur l'heure reelle :
 *
 *  H1) themeForHour : bornes correctes (5-18 jour, 18-22 soir, 22-5 nuit) ;
 *  H2) au chargement, le theme correspond a l'heure locale reelle ;
 *  H3) transitionTo : fondu doux (couleur melangee en cours de route) puis
 *      convergence exacte vers le theme cible ;
 *  H4) setTheme : application immediate ;
 *  H5) la scene rend toujours apres le cycle (variance pixels).
 *
 * Lancement : node tests/theme-check.js  (serveur requis sur :5500)
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5500/';
const SHOTS_DIR = path.join(__dirname, 'shots');

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

async function launchPlaza(page) {
  await page.evaluate(() => {
    const t = document.createElement('div');
    t.setAttribute('data-app', 'miiPlaza');
    document.body.appendChild(t);
    window.handleAppLaunch(t);
    t.remove();
  });
  await page.waitForSelector('.plaza-root canvas', { timeout: 20000 });
  await sleep(3000);
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

  try {
    const page = await browser.newPage();
    page.on('console', (m) => { if (m.type() === 'error') logs.push(`[console.error] ${m.text()}`); });
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.toString()}`));
    await page.setViewport({ width: 1920, height: 1080 });
    await preparePage(page);
    await launchPlaza(page);

    /* ───────── H1) Bornes de themeForHour ───────── */
    const h1 = await page.evaluate(() => {
      const f = document.querySelector('.plaza-root')._plaza.themeForHour;
      if (typeof f !== 'function') return null;
      const cases = [[0, 'night'], [4, 'night'], [5, 'day'], [11, 'day'],
                     [12, 'day'], [17, 'day'], [18, 'evening'], [21, 'evening'],
                     [22, 'night'], [23, 'night']];
      const bad = cases.filter(([h, t]) => f(h) !== t);
      return { bad, n: cases.length };
    });
    R('H1 bornes 5-18 jour / 18-22 soir / 22-5 nuit',
      h1 && h1.bad.length === 0,
      h1 ? (h1.bad.length ? 'echecs: ' + JSON.stringify(h1.bad) : h1.n + ' cas ok')
         : 'themeForHour absent');

    /* ───────── H2) Theme initial = heure locale ───────── */
    const h2 = await page.evaluate(() => {
      const p = document.querySelector('.plaza-root')._plaza;
      const h = new Date().getHours();
      return { attendu: p.themeForHour(h), actuel: p.world.getThemeName(), h };
    });
    R('H2 theme initial = heure locale',
      h2.actuel === h2.attendu,
      `h=${h2.h} attendu=${h2.attendu} actuel=${h2.actuel}`);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'theme-boot.png') });

    /* ───────── H3) transitionTo : fondu puis convergence ───────── */
    const target = h2.actuel === 'night' ? 'day' : 'night';
    const mid = await page.evaluate(async (tgt) => {
      const p = document.querySelector('.plaza-root')._plaza;
      const sky = (name) => ({ day: 'cfe3f2', evening: 'f3d9c0', night: '1b2740' }[name]);
      const fromHex = sky(p.world.getThemeName());
      p.world.transitionTo(tgt, 1.0);
      const nameNow = p.world.getThemeName();
      await new Promise(r => setTimeout(r, 450));
      const midHex = p.scene.background.getHexString();
      await new Promise(r => setTimeout(r, 1100));
      const endHex = p.scene.background.getHexString();
      const endName = p.world.getThemeName();
      return { nameNow, endName, fromHex, midHex, endHex, toHex: sky(tgt) };
    }, target);
    R('H3a transitionTo annonce la cible', mid.nameNow === target && mid.endName === target,
      `cible=${target} nom=${mid.nameNow}/${mid.endName}`);
    R('H3b couleur melangee pendant le fondu',
      mid.midHex !== mid.fromHex && mid.midHex !== mid.toHex,
      `${mid.fromHex} -> ${mid.midHex} -> ${mid.toHex}`);
    R('H3c convergence exacte sur la cible', mid.endHex === mid.toHex,
      `fin=${mid.endHex} attendu=${mid.toHex}`);
    await page.screenshot({ path: path.join(SHOTS_DIR, 'theme-apres-transition.png') });

    /* ───────── H4) setTheme : application immediate ───────── */
    const h4 = await page.evaluate(() => {
      const p = document.querySelector('.plaza-root')._plaza;
      p.world.setTheme('evening');
      return { name: p.world.getThemeName(), hex: p.scene.background.getHexString() };
    });
    R('H4 setTheme immediat', h4.name === 'evening' && h4.hex === 'f3d9c0',
      `nom=${h4.name} ciel=${h4.hex}`);

    /* ───────── H5) Rendu apres cycle ───────── */
    await sleep(800);
    const shotPath = path.join(SHOTS_DIR, 'theme-final.png');
    await page.screenshot({ path: shotPath });
    const sharp = require('sharp');
    const { channels } = await sharp(shotPath)
      .extract({ left: 500, top: 300, width: 900, height: 600 })
      .stats();
    const variance = channels.slice(0, 3).reduce((s, c) => s + c.stdev, 0) / 3;
    R('H5 scene rendue apres le cycle', variance > 8, `stdev=${variance.toFixed(2)}`);

    await page.close();
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
