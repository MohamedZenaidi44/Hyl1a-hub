/**
 * Verification thème blanc/noir de la page de sélection GBA (menu gxmb) :
 *
 *  G1) le wallpaper GBA.webp est présent (image + motif de secours multi-couches) ;
 *  G2) la même image dans les deux thèmes (le fond ne change jamais) ;
 *  G3) les contours des jaquettes et de l'aperçu passent en monochrome
 *      (blanc-gris en thème blanc, noir-gris en thème noir) — plus d'accent ;
 *  G4) captures des deux thèmes + scrim de lisibilité adaptatif
 *      (image claire assombrie en noir, éclaircie en blanc) ;
 *  G5) aucune erreur console.
 *
 * Lancement : node tests/gba-theme-check.js  (serveur requis sur :5500)
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

async function launchGba(page) {
  await page.evaluate(() => {
    const t = document.createElement('div');
    t.setAttribute('data-app', 'gba');
    document.body.appendChild(t);
    window.handleAppLaunch(t);
    t.remove();
  });
  await page.waitForSelector('.gxmb-root', { timeout: 20000 });
  await page.waitForSelector('.gxmb-item .gxmb-cover img', { timeout: 20000 }).catch(() => {});
  await sleep(3500);
}

async function applyTheme(page, id) {
  await page.evaluate((t) => window.ThemeManager.apply(t, false), id);
  await sleep(500);
}

async function sample(page) {
  return page.evaluate(() => {
    const wp = document.querySelector('.gxmb-wallpaper');
    const item = document.querySelector('.gxmb-item');
    const prev = document.querySelector('.gxmb-preview-frame');
    const cs = wp ? getComputedStyle(wp) : null;
    const bg = cs ? cs.backgroundImage : '';
    return {
      has: !!wp,
      layers: (bg.match(/gradient\(/g) || []).length,
      hasRepeat: bg.includes('repeating-linear-gradient'),
      imageLayer: (() => { const m = bg.match(/url\("?([^")]+)"?\)/); return m ? m[1] : ''; })(),
      wlBase: cs ? cs.getPropertyValue('--wl-base-a').trim() : '',
      wlDot: cs ? cs.getPropertyValue('--wl-dot').trim() : '',
      frame: item ? getComputedStyle(item, '::before').backgroundImage : '',
      frameOpacity: (() => {
        const rest = document.querySelector('.gxmb-item:not(.is-active)') || item;
        return rest ? getComputedStyle(rest, '::before').opacity : '';
      })(),
      meta: (() => { const el = document.querySelector('.gxmb-meta'); return el ? getComputedStyle(el).color : ''; })(),
      count: (() => { const el = document.querySelector('.gxmb-count'); return el ? getComputedStyle(el).color : ''; })(),
      clockDate: (() => { const el = document.querySelector('.gxmb-clock-date'); return el ? getComputedStyle(el).color : ''; })(),
      title: (() => { const el = document.querySelector('.gxmb-title'); return el ? getComputedStyle(el).color : ''; })(),
      playBg: (() => { const el = document.querySelector('#gxmb-play'); return el ? getComputedStyle(el).backgroundColor : ''; })(),
      playColor: (() => { const el = document.querySelector('#gxmb-play'); return el ? getComputedStyle(el).color : ''; })(),
      playShadow: (() => { const el = document.querySelector('#gxmb-play'); return el ? getComputedStyle(el).boxShadow : ''; })(),
      cornerBg: (() => { const el = document.querySelector('#gxmb-corner'); return el ? getComputedStyle(el).backgroundImage : ''; })(),
      cornerShadow: (() => { const el = document.querySelector('#gxmb-corner'); return el ? getComputedStyle(el).boxShadow : ''; })(),
      exitBbg: (() => { const el = document.querySelector('.gxmb-exit b'); return el ? getComputedStyle(el).backgroundColor : ''; })(),
      dotActive: (() => { const el = document.querySelector('.gxmb-preview-dot.is-active'); return el ? getComputedStyle(el).backgroundColor : ''; })(),
      clockTop: (() => { const el = document.querySelector('#gxmb-clock-time'); return el ? el.getBoundingClientRect().top : 999; })(),
      searchTop: (() => { const el = document.querySelector('#gxmb-search'); return el ? el.getBoundingClientRect().top : 0; })(),
      prevFrame: prev ? getComputedStyle(prev, '::before').backgroundImage : '',
      bodyClass: document.body.className,
      activeFrame: (() => {
        const act = document.querySelector('.gxmb-item.is-active');
        return act ? getComputedStyle(act, '::before').opacity : '';
      })(),
    };
  });
}

async function cornerMean(sharp, file) {
  const { channels } = await sharp(file)
    .extract({ left: 4, top: 1000, width: 80, height: 76 })
    .stats();
  return channels.slice(0, 3).reduce((s, c) => s + c.mean, 0) / 3;
}

async function contentVariance(sharp, file) {
  const { channels } = await sharp(file)
    .extract({ left: 400, top: 200, width: 1100, height: 700 })
    .stats();
  return channels.slice(0, 3).reduce((s, c) => s + c.stdev, 0) / 3;
}

(async () => {
  if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const sharp = require('sharp');
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
    await launchGba(page);

    /* ───────── Thème noir ───────── */
    await applyTheme(page, 'black');
    const black = await sample(page);
    const blackShot = path.join(SHOTS_DIR, 'gba-theme-black.png');
    await page.screenshot({ path: blackShot });

    /* ───────── Thème blanc ───────── */
    await applyTheme(page, 'white');
    const white = await sample(page);
    const whiteShot = path.join(SHOTS_DIR, 'gba-theme-white.png');
    await page.screenshot({ path: whiteShot });

    /* ───────── G1) Wallpaper présent ───────── */
    R('G1 wallpaper GBA.webp présent (+ motif de secours)',
      black.has && white.has && black.layers >= 6 && white.layers >= 6 && white.hasRepeat,
      `couches=${white.layers} repeating=${white.hasRepeat}`);
    R('G1b image GBA.webp chargée dans les deux thèmes',
      /GBA\.webp$/.test(black.imageLayer) && /GBA\.webp$/.test(white.imageLayer),
      `noir=${black.imageLayer.split('/').pop()} blanc=${white.imageLayer.split('/').pop()}`);

    /* ───────── G2) Même fond dans les deux thèmes ───────── */
    R('G2a base de secours sombre en thème noir',
      black.bodyClass.includes('theme-black') && black.wlBase === '#07080b',
      `class=${black.bodyClass.includes('theme-black')} base=${black.wlBase}`);
    R('G2b base de secours claire en thème blanc',
      white.bodyClass.includes('theme-white') && white.wlBase === '#fbfcfe',
      `class=${white.bodyClass.includes('theme-white')} base=${white.wlBase}`);
    R('G2c même wallpaper dans les deux thèmes (image identique)',
      black.imageLayer !== '' && black.imageLayer === white.imageLayer && black.wlBase !== white.wlBase,
      `image=${white.imageLayer.split('/').pop()} ; motif de secours recoloré`);

    /* ───────── G3) Contours jaquettes monochromes ───────── */
    const accentRx = /0, 200, 255|0, 140, 255|255, 83, 214/;
    R('G3a contour noir-gris en thème noir',
      black.frame.includes('rgb(75, 81, 92)') && !accentRx.test(black.frame) && !accentRx.test(black.prevFrame),
      black.frame.slice(0, 120));
    R('G3b contour blanc-gris en thème blanc',
      white.frame.includes('rgb(255, 255, 255)') && white.frame.includes('rgb(185, 193, 207)')
        && !accentRx.test(white.frame) && !accentRx.test(white.prevFrame),
      white.frame.slice(0, 120));
    R('G3c aperçu : même recolorisation',
      black.prevFrame.includes('rgb(75, 81, 92)') && white.prevFrame.includes('rgb(185, 193, 207)'),
      `noir=${black.prevFrame.includes('rgb(75, 81, 92)')} blanc=${white.prevFrame.includes('rgb(185, 193, 207)')}`);
    R('G3d contour discret au repos, plein sur l\u2019actif',
      parseFloat(white.frameOpacity) < 1 && parseFloat(white.activeFrame) === 1,
      `repos=${white.frameOpacity} actif=${white.activeFrame}`);

    /* ───────── G7) Contrôles monochromes (plus de bleu accent) ───────── */
    const blueRx = /0, 140, 255|0, 200, 255/;
    R('G7a bouton Jouer monochrome par thème',
      white.playBg === 'rgb(16, 16, 16)' && black.playBg === 'rgb(245, 245, 245)'
        && white.playColor === 'rgb(255, 255, 255)' && black.playColor === 'rgb(10, 10, 10)'
        && !blueRx.test(white.playShadow + black.playShadow),
      `blanc=${white.playBg}/${white.playColor} noir=${black.playBg}/${black.playColor}`);
    R('G7b rectangle supprimé derrière Jouer',
      white.cornerBg === 'none' && black.cornerBg === 'none'
        && white.cornerShadow === 'none' && black.cornerShadow === 'none',
      `bg=${white.cornerBg} shadow=${white.cornerShadow}`);
    R('G7c pastille B monochrome',
      white.exitBbg === 'rgb(28, 31, 36)' && black.exitBbg === 'rgb(245, 245, 245)',
      `blanc=${white.exitBbg} noir=${black.exitBbg}`);
    R('G7d pastille active (aperçu) monochrome',
      !blueRx.test(white.dotActive + black.dotActive),
      `blanc=${white.dotActive} noir=${black.dotActive}`);
    R('G8 horloge remontée au-dessus de la barre de recherche',
      white.clockTop < white.searchTop - 4 && black.clockTop < black.searchTop - 4,
      `blanc=${white.clockTop.toFixed(1)}<${white.searchTop.toFixed(1)} noir=${black.clockTop.toFixed(1)}<${black.searchTop.toFixed(1)}`);

    /* ───────── G4) Coins + scrim sur image claire ───────── */
    const blackCorner = await cornerMean(sharp, blackShot);
    const whiteCorner = await cornerMean(sharp, whiteShot);
    const blackVar = await contentVariance(sharp, blackShot);
    const whiteVar = await contentVariance(sharp, whiteShot);
    R('G4a scrim adaptatif : coin nettement plus sombre en thème noir',
      blackCorner < whiteCorner - 40,
      `noir=${blackCorner.toFixed(1)} vs blanc=${whiteCorner.toFixed(1)}`);
    R('G4b coin bas-gauche clair en thème blanc', whiteCorner > 170, `luma coin=${whiteCorner.toFixed(1)}`);
    R('G4c contenu rendu dans les deux thèmes',
      blackVar > 8 && whiteVar > 8, `stdev noir=${blackVar.toFixed(1)} blanc=${whiteVar.toFixed(1)}`);

    /* ───────── G6) Textes lisibles (contraste par thème) ───────── */
    const colorLuma = (s) => {
      const m = String(s).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? 0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3] : -1;
    };
    R('G6a textes secondaires sombres en thème blanc',
      colorLuma(white.meta) < 130 && colorLuma(white.count) < 130 && colorLuma(white.clockDate) < 130,
      `meta=${colorLuma(white.meta).toFixed(0)} count=${colorLuma(white.count).toFixed(0)} date=${colorLuma(white.clockDate).toFixed(0)}`);
    R('G6b titre sombre en blanc / clair en noir',
      colorLuma(white.title) < 100 && colorLuma(black.title) > 180,
      `blanc=${colorLuma(white.title).toFixed(0)} noir=${colorLuma(black.title).toFixed(0)}`);

    /* ───────── G5) Console propre ───────── */
    const uniqLogs = [...new Set(logs)];
    R('G5 aucune erreur console', uniqLogs.length === 0, uniqLogs.slice(0, 3).join(' | '));

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
