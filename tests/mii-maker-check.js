/**
 * Vérification de l'interface du Mii Maker (apps/mii_maker).
 *
 * Pour chaque résolution cible :
 *  - lance l'app Mii Maker en plein écran (comme depuis le menu Wii) ;
 *  - capture d'écran dans tests/shots/ ;
 *  - mesure la disposition (topbar, aperçu, panneau, sous-onglets, listes) ;
 *  - détecte débordements, chevauchements et zones vides anormales.
 *
 * Lancement : node tests/mii-maker-check.js
 * (serveur requis sur http://localhost:5500)
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5500/';

const VIEWPORTS = [
  { width: 2560, height: 1440 },
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
];

const SHOTS_DIR = path.join(__dirname, 'shots');

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome introuvable (définir CHROME_PATH)');
}

function rectsIntersect(a, b, tolerance = 1) {
  return !(
    a.right <= b.left + tolerance ||
    b.right <= a.left + tolerance ||
    a.bottom <= b.top + tolerance ||
    b.bottom <= a.top + tolerance
  );
}

async function preparePage(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('.wii-menu .wii-channel', { timeout: 20000 });
  await page.evaluate(() => {
    const auth = document.getElementById('auth-overlay');
    if (auth) auth.style.display = 'none';
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    const warn = document.getElementById('wii-warning-overlay');
    if (warn) warn.remove();
  });
  await new Promise(r => setTimeout(r, 300));
}

async function launchMiiMaker(page) {
  await page.evaluate(() => {
    const tile = document.createElement('div');
    tile.setAttribute('data-app', 'miiMaker');
    document.body.appendChild(tile);
    window.handleAppLaunch(tile);
  });
  await page.waitForSelector('.mii-fullscreen-container .mii-screen', { timeout: 20000 });
  // Laisse le rendu (3D ou fallback 2D) se stabiliser.
  await new Promise(r => setTimeout(r, 1600));
}

async function collectLayout(page) {
  return page.evaluate(() => {
    const rectOf = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.x, top: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const all = (sel) => Array.from(document.querySelectorAll(sel)).map(el => {
      const r = el.getBoundingClientRect();
      return { left: r.x, top: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height, label: (el.textContent || '').trim().slice(0, 20) };
    });
    const container = document.querySelector('.mii-fullscreen-container');
    const cs = container ? getComputedStyle(container) : null;
    const topbarEl = document.querySelector('.mii-topbar');
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      docScrollWidth: document.scrollingElement.scrollWidth,
      docScrollHeight: document.scrollingElement.scrollHeight,
      container: rectOf('.mii-fullscreen-container'),
      screen: rectOf('.mii-screen'),
      topbar: rectOf('.mii-topbar'),
      catWrap: rectOf('.mii-cat-wrap'),
      main: rectOf('.mii-main'),
      preview: rectOf('.mii-preview'),
      options: rectOf('.mii-options'),
      subtabs: rectOf('.mii-subtabs'),
      optionsBody: rectOf('.mii-options-body'),
      listArea: rectOf('.mii-list-area'),
      colorPanel: rectOf('.mii-color-panel'),
      saveBtn: rectOf('.mii-save-btn'),
      quit: rectOf('.mii-quit'),
      tabs: all('.mii-cat-tab'),
      subtabBtns: all('.mii-subtab'),
      thumbs: all('.mii-thumb'),
      previewTools: all('.mii-cat-btn'),
      containerOverflow: cs ? { overflowX: cs.overflowX, overflowY: cs.overflowY } : null,
      topbarScrollable: topbarEl ? { scrollWidth: topbarEl.scrollWidth, clientWidth: topbarEl.clientWidth } : null,
    };
  });
}

function analyzeLayout(L) {
  const issues = [];
  const { width: vw, height: vh } = L.viewport;
  const inView = (r, name) => {
    if (!r) { issues.push(`${name} introuvable`); return; }
    if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) {
      issues.push(`${name} hors viewport : ` +
        `L${Math.round(r.left)} T${Math.round(r.top)} R${Math.round(r.right)} B${Math.round(r.bottom)} (vp ${vw}x${vh})`);
    }
  };

  if (L.docScrollWidth > vw + 1) issues.push(`débordement horizontal document : ${L.docScrollWidth} > ${vw}`);
  if (L.docScrollHeight > vh + 1) issues.push(`débordement vertical document : ${L.docScrollHeight} > ${vh}`);

  inView(L.screen, 'écran');
  inView(L.topbar, 'barre d\'onglets');
  inView(L.main, 'zone principale');
  inView(L.preview, 'aperçu');
  inView(L.options, 'panneau options');
  inView(L.listArea, 'liste');
  inView(L.colorPanel, 'palette couleurs');
  inView(L.saveBtn, 'bouton sauvegarder');
  inView(L.quit, 'bouton quitter');

  // La barre d'onglets + zone principale ne doivent pas se chevaucher.
  if (L.topbar && L.main && rectsIntersect(L.topbar, L.main)) {
    issues.push('chevauchement barre d\'onglets / zone principale');
  }
  // Aperçu et options côte à côte, pas de chevauchement.
  if (L.preview && L.options && rectsIntersect(L.preview, L.options)) {
    issues.push('chevauchement aperçu / panneau options');
  }
  // Sous-onglets au-dessus du corps, pas de chevauchement.
  if (L.subtabs && L.optionsBody && rectsIntersect(L.subtabs, L.optionsBody)) {
    issues.push('chevauchement sous-onglets / corps des options');
  }
  // Liste et palette côte à côte.
  if (L.listArea && L.colorPanel && rectsIntersect(L.listArea, L.colorPanel)) {
    issues.push('chevauchement liste / palette');
  }

  // Les onglets ne doivent pas se chevaucher entre eux.
  for (let i = 0; i < L.tabs.length; i++) {
    for (let j = i + 1; j < L.tabs.length; j++) {
      if (rectsIntersect(L.tabs[i], L.tabs[j])) {
        issues.push(`chevauchement onglets ${i} / ${j}`);
      }
    }
  }

  // Aucun onglet hors de la barre d'onglets — sauf si la barre défile (strip).
  const topbarScrolls = L.topbarScrollable && L.topbarScrollable.scrollWidth > L.topbarScrollable.clientWidth + 1;
  if (L.topbar && !topbarScrolls) {
    L.tabs.forEach((t, i) => {
      if (t.left < L.topbar.left - 1 || t.right > L.topbar.right + 1) {
        issues.push(`onglet ${i} dépasse la barre (L${Math.round(t.left)} R${Math.round(t.right)} / barre L${Math.round(L.topbar.left)} R${Math.round(L.topbar.right)})`);
      }
    });
  }

  // Vignettes entièrement dans la zone de liste (sinon tuiles coupées).
  if (L.listArea) {
    L.thumbs.forEach((t, i) => {
      if (t.right > L.listArea.right + 1 || t.left < L.listArea.left - 1) {
        issues.push(`vignette ${i} dépasse la liste horizontalement`);
      }
    });
  }

  // Répartition : côte à côte, l'aperçu + les options tiennent dans la largeur.
  if (L.preview && L.options && L.main) {
    const sameRow = Math.abs(L.preview.top - L.options.top) < 5;
    if (sameRow) {
      const total = L.preview.width + L.options.width;
      if (total > L.main.width + 2) {
        issues.push(`aperçu+options (${Math.round(total)}) dépasse la zone principale (${Math.round(L.main.width)})`);
      }
    }
  }

  // Vignettes : taille raisonnable (pas de tuiles géantes 2 colonnes).
  if (L.thumbs.length) {
    const w = L.thumbs[0].width;
    if (w > 200) {
      issues.push(`vignettes trop larges : ${Math.round(w)}px (grille non adaptative ?)`);
    }
  }

  return issues;
}

async function runInteractions(browser, logs) {
  const results = [];
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') logs.push(`[console.error] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.toString()}`));
  await page.setViewport({ width: 1920, height: 1080 });
  await preparePage(page);
  await launchMiiMaker(page);

  const readState = () => page.evaluate(() => {
    const cs = (sel, prop) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el)[prop] : null;
    };
    const thumbs = Array.from(document.querySelectorAll('.mii-thumb'));
    const rows = new Set(thumbs.map(t => Math.round(t.getBoundingClientRect().top / 6)));
    const firstRow = thumbs.filter(t => Math.round(t.getBoundingClientRect().top / 6) === Math.round(thumbs[0] ? thumbs[0].getBoundingClientRect().top / 6 : 0));
    return {
      saveBg: cs('.mii-save-btn', 'backgroundImage'),
      tabColor: cs('.mii-cat-tab', 'color'),
      activeTabBg: cs('.mii-cat-tab.active', 'backgroundImage'),
      optionsBg: cs('.mii-options', 'backgroundColor'),
      optionsBgImage: cs('.mii-options', 'backgroundImage'),
      bodyBg: cs('.mii-bg-left', 'backgroundImage'),
      thumbCount: thumbs.length,
      thumbW: thumbs[0] ? +thumbs[0].getBoundingClientRect().width.toFixed(1) : 0,
      cols: firstRow.length,
      rows: rows.size,
      activeTab: (document.querySelector('.mii-cat-tab.active') || {}).title,
      subtabCount: document.querySelectorAll('.mii-subtab').length,
      docScrollW: document.scrollingElement.scrollWidth,
      vw: window.innerWidth,
    };
  });

  let s = await readState();
  results.push(['vue par défaut : pas de vignettes géantes',
    s.thumbCount === 0 || (s.thumbW > 0 && s.thumbW < 200),
    `w=${s.thumbW} cols=${s.cols} total=${s.thumbCount}`]);
  results.push(['thème blanc : accent VERT sur bouton/onglet actif (bleu supprimé)',
    /rgb\(60, 184, 90\)/.test(s.saveBg || ''),
    s.saveBg]);
  results.push(['fond de scène : dégradé vert façon Mii Maker Wii U',
    /rgb\(106, 218, 130\)/.test(s.bodyBg || ''),
    ((s.bodyBg || '').match(/rgb\(\d+, \d+, \d+\)/g) || []).slice(0, 3).join(' ')]);
  results.push(['panneau d\'options : verre vert dépoli (plus de fenêtre blanche)',
    /rgba?\(174, 238, 194/.test(s.optionsBgImage || '') && !/rgba\(255, 255, 255, 0\.[5-9]/.test(s.optionsBg || ''),
    (s.optionsBgImage || '').slice(0, 60) + ' | bg=' + s.optionsBg]);

  // Le mode éco coupe backdrop-filter : on le désactive pour vérifier le flou annoncé
  await page.evaluate(() => document.body.classList.remove('eco-mode'));
  await new Promise(r => setTimeout(r, 150));
  const bdf = await page.evaluate(() => {
    const el = document.querySelector('.mii-options');
    if (!el) return null;
    const c = getComputedStyle(el);
    return c.backdropFilter || c.webkitBackdropFilter;
  });
  results.push(['panneau d\'options : flou backdrop-filter (hors mode éco)',
    /blur\(/.test(bdf || ''), String(bdf)]);
  const anim = await page.evaluate(() => {
    const bg = document.querySelector('.mii-bg-left');
    if (!bg) return null;
    const b = getComputedStyle(bg, '::before');
    const a = getComputedStyle(bg, '::after');
    return `${b.animationName} | ${a.animationName}`;
  });
  results.push(['fond de scène : animations présentes (nappes + étincelles)',
    /miiBGFlow/.test(anim || '') && /miiSparkleDrift/.test(anim || ''), String(anim)]);

  // Changement de catégorie : Cheveux (3e onglet) → beaucoup de vignettes
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('.mii-cat-tab');
    tabs[3].click();
  });
  await new Promise(r => setTimeout(r, 500));
  s = await readState();
  results.push(['onglet Cheveux : coiffures affichées', s.thumbCount >= 100, `thumbs=${s.thumbCount} cols=${s.cols} w=${s.thumbW}`]);
  results.push(['pas de débordement horizontal après changement d\'onglet', s.docScrollW <= s.vw + 1, `scrollW=${s.docScrollW} vw=${s.vw}`]);

  // Onglet Visage → sous-onglets (Forme/Détails)
  await page.evaluate(() => document.querySelectorAll('.mii-cat-tab')[2].click());
  await new Promise(r => setTimeout(r, 350));
  s = await readState();
  results.push(['onglet Visage : sous-onglets présents', s.subtabCount === 2, `subs=${s.subtabCount}`]);

  // Clic sur un swatch de couleur → état actif
  const swatchOk = await page.evaluate(() => {
    const sw = document.querySelector('.mii-color-swatch');
    if (!sw) return false;
    sw.click();
    return true;
  });
  await new Promise(r => setTimeout(r, 250));
  results.push(['palette : clic sur une couleur', swatchOk && (await page.evaluate(() => !!document.querySelector('.mii-color-swatch.active'))), `ok=${swatchOk}`]);

  // Thème noir : la mise en page reste intacte + couleur de fond change
  await page.evaluate(() => window.ThemeManager && window.ThemeManager.apply('black', false));
  await new Promise(r => setTimeout(r, 450));
  const dark = await readState();
  const darkLayout = await collectLayout(page);
  const darkIssues = analyzeLayout(darkLayout);
  results.push(['thème noir : disposition intacte', darkIssues.length === 0, darkIssues.join(' | ') || 'aucun défaut']);
  results.push(['thème noir : accent VERT + fond vert sombre',
    /rgb\(70, 204, 103\)/.test(dark.saveBg || '') && /rgb\(47, 174, 103\)/.test(dark.bodyBg || ''),
    `accent=${((dark.saveBg || '').match(/rgb\(\d+, \d+, \d+\)/g) || []).slice(0, 2).join(' ')} / fond=${((dark.bodyBg || '').match(/rgb\(\d+, \d+, \d+\)/g) || []).slice(0, 2).join(' ')}`]);
  results.push(['thème noir : texte des onglets clair (règle iisu-theme neutralisée)',
    /rgba\(235, 255, 240/.test(dark.tabColor || ''),
    `color=${dark.tabColor}`]);
  await page.screenshot({ path: path.join(SHOTS_DIR, 'mii-maker-theme-black-1920x1080.png') });

  await page.evaluate(() => window.ThemeManager && window.ThemeManager.apply('white', false));
  await new Promise(r => setTimeout(r, 350));

  await page.close();
  return results;
}

(async () => {
  if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const logs = [];
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--hide-scrollbars'],
  });

  let failed = 0;

  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      page.on('console', (m) => { if (m.type() === 'error') logs.push(`[${vp.width}x${vp.height}][console.error] ${m.text()}`); });
      page.on('pageerror', (e) => logs.push(`[${vp.width}x${vp.height}][pageerror] ${e.toString()}`));

      await page.setViewport(vp);
      await preparePage(page);
      await launchMiiMaker(page);

      const L = await collectLayout(page);
      const issues = analyzeLayout(L);

      const shot = path.join(SHOTS_DIR, `mii-maker-${vp.width}x${vp.height}.png`);
      await page.screenshot({ path: shot });

      const status = issues.length ? 'ÉCHEC' : 'OK';
      if (issues.length) failed += 1;
      console.log(`\n=== ${vp.width}x${vp.height} → ${status} (capture : ${path.relative(process.cwd(), shot)})`);
      if (L.preview) {
        console.log(`   aperçu ${Math.round(L.preview.width)}x${Math.round(L.preview.height)} | options ${Math.round(L.options.width)}x${Math.round(L.options.height)} | topbar h=${Math.round(L.topbar.height)} | tab w=${L.tabs.length ? Math.round(L.tabs[0].width) : 0} | vignette w=${L.thumbs.length ? Math.round(L.thumbs[0].width) : 0}`);
      }
      issues.forEach(i => console.log('   ✗ ' + i));

      await page.close();
    }

    console.log('\n=== Interactions / thèmes ===');
    const results = await runInteractions(browser, logs);
    for (const [name, ok, detail] of results) {
      if (!ok) failed += 1;
      console.log(`   ${ok ? '✓' : '✗'} ${name} — ${detail}`);
    }
  } finally {
    await browser.close();
  }

  console.log('\n=== Erreurs console / page ===');
  const uniqueLogs = [...new Set(logs)];
  if (!uniqueLogs.length) console.log('   aucune');
  else uniqueLogs.slice(0, 25).forEach(l => console.log('   ' + l));

  console.log(failed ? `\nRÉSULTAT : ${failed} résolution(s) en échec.` : '\nRÉSULTAT : toutes les résolutions passent.');
  process.exit(failed ? 1 : 0);
})().catch(e => {
  console.error('Erreur du script de test :', e);
  process.exit(2);
});
