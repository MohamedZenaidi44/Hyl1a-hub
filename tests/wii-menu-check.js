/**
 * Vérification du menu d'accueil façon Wii (wiiMenu.js / wiiMenu.css).
 *
 * Pour chaque résolution cible :
 *  - capture d'écran dans tests/shots/
 *  - aucun débordement horizontal du document
 *  - chaînes entièrement dans la viewport, toutes de même taille
 *  - grille centrée
 *  - aucun chevauchement entre chaînes, onglets, info, HUD (profil, horloge, barres)
 *
 * Tests d'interactions (1920x1080 + 390px) :
 *  - clic sur un onglet → changement de page
 *  - flèches ← → ↑ ↓ → sélection
 *  - flèche → au bord droit → changement de page
 *  - Entrée → lancement (ouverture du sélecteur de thèmes, sans app lourde)
 *  - survol → sélection
 *  - prefers-reduced-motion → animations neutralisées
 *
 * Lancement : node tests/wii-menu-check.js
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

function toRect(b) {
  return {
    left: b.x, top: b.y,
    right: b.x + b.width, bottom: b.y + b.height,
    width: b.width, height: b.height,
  };
}

async function preparePage(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('.wii-menu .wii-channel', { timeout: 20000 });
  // Contourne l'auth (inchangée par la refonte) : cela déclenche l'écran
  // d'avertissement Wii, qu'on retire ensuite complètement pour que les
  // clics/survol atteignent le menu.
  await page.evaluate(() => {
    const auth = document.getElementById('auth-overlay');
    if (auth) auth.style.display = 'none';
  });
  await new Promise(r => setTimeout(r, 400)); // laisse activate() de wiiWarning.js s'exécuter
  await page.evaluate(() => {
    const warn = document.getElementById('wii-warning-overlay');
    if (warn) warn.remove();
  });
  await new Promise(r => setTimeout(r, 700)); // laisser passer les animations d'entrée
}

/* Texture du fond d'écran dans une zone libre de l'UI :
   un voile plat donne ~0, une vidéo visible donne plusieurs unités. */
async function wallpaperVisibility(shotPath) {
  const sharp = require('sharp');
  const { channels } = await sharp(shotPath)
    .extract({ left: 40, top: 560, width: 280, height: 380 })
    .stats();
  return channels.slice(0, 3).reduce((s, c) => s + c.stdev, 0) / 3;
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
      return { left: r.x, top: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height, label: el.textContent.trim().slice(0, 24) };
    });

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      docScrollWidth: document.scrollingElement.scrollWidth,
      docScrollHeight: document.scrollingElement.scrollHeight,
      grid: rectOf('.wii-channels'),
      tabs: rectOf('.wii-tabs'),
      info: rectOf('.wii-info'),
      hint: rectOf('.wii-hint'),
      faces: all('.wii-channel-face'),
      channels: all('.wii-channel'),
      tabRects: all('.wii-tab'),
      hud: {
        userPanel: rectOf('#user-panel'),
        clock: rectOf('#clock-panel'),
        marquee: rectOf('#marquee-bar'),
        music: rectOf('#music-bar-container'),
        changelogBtn: rectOf('#btn-changelog-toggle'),
      },
    };
    // rectOf/all renvoient left/top/right/bottom pour rectsIntersect
  });
}

function analyzeLayout(L) {
  const issues = [];
  const { width: vw, height: vh } = L.viewport;

  // 1. Pas de débordement horizontal
  if (L.docScrollWidth > vw + 1) {
    issues.push(`débordement horizontal : scrollWidth=${L.docScrollWidth} > viewport=${vw}`);
  }

  // 2. Toutes les chaînes dans la viewport
  L.channels.forEach((c, i) => {
    if (c.left < -1 || c.top < -1 || c.right > vw + 1 || c.bottom > vh + 1) {
      issues.push(`chaîne ${i} (${c.label}) hors viewport : ${JSON.stringify(c)}`);
    }
  });

  // 3. Proportions régulières : faces toutes identiques
  if (L.faces.length > 1) {
    const w0 = Math.round(L.faces[0].width), h0 = Math.round(L.faces[0].height);
    L.faces.forEach((f, i) => {
      if (Math.abs(Math.round(f.width) - w0) > 1 || Math.abs(Math.round(f.height) - h0) > 1) {
        issues.push(`face ${i} taille différente (${Math.round(f.width)}x${Math.round(f.height)} vs ${w0}x${h0})`);
      }
    });
  }

  // 4. Chaque ligne de chaînes est centrée horizontalement
  const rows = new Map();
  for (const c of L.channels) {
    const key = Math.round(c.top / 10) * 10;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(c);
  }
  for (const [top, row] of rows) {
    const left = Math.min(...row.map(r => r.left));
    const right = vw - Math.max(...row.map(r => r.right));
    if (Math.abs(left - right) > 60) {
      issues.push(`ligne y=${top} non centrée : marge gauche=${Math.round(left)}px, droite=${Math.round(right)}px`);
    }
  }
  if (L.grid && (L.grid.bottom > vh + 1 || L.grid.top < -1)) {
    issues.push(`grille hors viewport verticalement : top=${Math.round(L.grid.top)} bottom=${Math.round(L.grid.bottom)}`);
  }

  // 5. Pas de chevauchement entre chaînes
  for (let i = 0; i < L.channels.length; i++) {
    for (let j = i + 1; j < L.channels.length; j++) {
      if (rectsIntersect(L.channels[i], L.channels[j])) {
        issues.push(`chevauchement chaînes ${i} (${L.channels[i].label}) / ${j} (${L.channels[j].label})`);
      }
    }
  }

  // 6. Pas de chevauchement entre onglets
  for (let i = 0; i < L.tabRects.length; i++) {
    for (let j = i + 1; j < L.tabRects.length; j++) {
      if (rectsIntersect(L.tabRects[i], L.tabRects[j])) {
        issues.push(`chevauchement onglets ${i} (${L.tabRects[i].label}) / ${j} (${L.tabRects[j].label})`);
      }
    }
  }

  // 7. Le contenu visible du menu ne chevauche pas le HUD
  const menuZones = [
    ['onglets', L.tabRects],
    ['info', L.info],
    ['chaînes', L.channels],
  ];
  const hudEntries = Object.entries(L.hud).filter(([, r]) => r && r.width > 0 && r.height > 0);
  for (const [name, zones] of menuZones) {
    const list = Array.isArray(zones) ? zones : (zones ? [zones] : []);
    for (const m of list) {
      for (const [hudName, h] of hudEntries) {
        if (rectsIntersect(m, h)) {
          issues.push(`chevauchement ${name}${m.label ? ' (' + m.label + ')' : ''} / HUD:${hudName}`);
        }
      }
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

  const state = () => page.evaluate(() => {
    const channels = Array.from(document.querySelectorAll('.wii-channel'));
    const tabs = Array.from(document.querySelectorAll('.wii-tab'));
    return {
      selected: channels.findIndex(c => c.classList.contains('selected')),
      channelCount: channels.length,
      selectedLabel: (channels.find(c => c.classList.contains('selected')) || {}).textContent,
      activeTab: tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'),
      infoTitle: (document.querySelector('.wii-info-title') || {}).textContent,
    };
  });

  // État initial
  let s = await state();
  results.push(['sélection initiale = 1re chaîne', s.selected === 0, JSON.stringify(s)]);

  // Onglet "Jeux" (index 1) : 7 chaînes (dont Plaza), grille 3 colonnes
  await page.click('.wii-tabs .wii-tab:nth-child(2)');
  await new Promise(r => setTimeout(r, 350));
  s = await state();
  results.push(['clic onglet → page Jeux (7 chaînes)', s.activeTab === 1 && s.channelCount === 7, JSON.stringify(s)]);

  // → : même ligne, colonne suivante (0 → 1)
  await page.keyboard.press('ArrowRight');
  s = await state();
  results.push(['→ : sélection 0 → 1', s.selected === 1, `selected=${s.selected}`]);

  // ↓ : ligne suivante (1 → 4)
  await page.keyboard.press('ArrowDown');
  s = await state();
  results.push(['↓ : sélection 1 → 4', s.selected === 4, `selected=${s.selected}`]);

  // ↑ : retour ligne du haut (4 → 1)
  await page.keyboard.press('ArrowUp');
  s = await state();
  results.push(['↑ : sélection 4 → 1', s.selected === 1, `selected=${s.selected}`]);

  // → → jusqu'au bord droit puis changement de page
  await page.keyboard.press('ArrowRight'); // 1 → 2 (colonne 2, bord droit)
  s = await state();
  results.push(['→ : sélection 1 → 2 (bord droit)', s.selected === 2, `selected=${s.selected}`]);
  await page.keyboard.press('ArrowRight'); // bord droit → page suivante (Mii)
  s = await state();
  results.push(['→ au bord droit → page suivante', s.activeTab === 2 && s.channelCount === 2, JSON.stringify(s)]);
  await page.keyboard.press('ArrowLeft'); // bord gauche → page précédente (Jeux)
  s = await state();
  results.push(['← au bord gauche → page précédente', s.activeTab === 1 && s.channelCount === 7, JSON.stringify(s)]);

  // Survol : la sélection suit la souris (sans cliquer : un clic lancerait l'app)
  const box = await page.evaluate(() => {
    const r = document.querySelector('.wii-channels .wii-channel:nth-child(5)').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(box.x, box.y);
  await new Promise(r => setTimeout(r, 250));
  s = await state();
  results.push(['survol → sélection suit la souris (5e chaîne)', s.selected === 4 && s.infoTitle === 'N64', `selected=${s.selected} info=${s.infoTitle}`]);

  // Focus clavier visible (tab accessible en boutons)
  const focusable = await page.evaluate(() => document.querySelectorAll('button.wii-channel').length);
  results.push(['chaînes = boutons focusables', focusable === 7, `count=${focusable}`]);

  // Entrée : "Thèmes" → sélecteur de thèmes (pas d'app lourde).
  // Clic réel sur l'onglet (le focus y reste), puis Entrée : doit ouvrir la
  // chaîne sélectionnée et non re-sélectionner l'onglet.
  await page.click('.wii-tabs .wii-tab:nth-child(6)'); // Thèmes
  await new Promise(r => setTimeout(r, 300));
  s = await state();
  results.push(['clic onglet → page Thèmes (1 chaîne, info = Personnaliser)',
    s.channelCount === 1 && s.infoTitle === 'Personnaliser', JSON.stringify(s)]);
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 500));
  const overlayOpen = await page.evaluate(() => !!document.getElementById('theme-overlay'));
  results.push(['Entrée → lancement réel (sélecteur de thèmes ouvert)', overlayOpen, `overlay=${overlayOpen}`]);
  await page.evaluate(() => {
    const btn = document.querySelector('.theme-close-btn');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Clic souris → lancement réel (même canal que la touche Entrée)
  await page.click('.wii-channels .wii-channel:nth-child(1)');
  await new Promise(r => setTimeout(r, 500));
  const overlayOpen2 = await page.evaluate(() => !!document.getElementById('theme-overlay'));
  results.push(['clic sur la chaîne → lancement réel', overlayOpen2, `overlay=${overlayOpen2}`]);
  await page.evaluate(() => {
    const btn = document.querySelector('.theme-close-btn');
    if (btn) btn.click();
  });

  // Mesure des couleurs de thème du menu (glow/rebords, icônes vs face de tuile)
  const readThemeColors = () => page.evaluate(() => {
    const parse = (v) => {
      const m = String(v).match(/rgba?\(([^)]+)\)/);
      const p = m ? m[1].split(',').map(s => parseFloat(s)) : [255, 255, 255, 1];
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lum = (c) => (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
    const cs = getComputedStyle(document.querySelector('.wii-menu'));
    const hi = lum(parse(cs.getPropertyValue('--wii-hi')));
    const icon = lum(parse(cs.getPropertyValue('--wii-icon-color')));
    const face = lum(parse(getComputedStyle(document.querySelector('.wii-channel-face')).backgroundColor));
    return { hi: +hi.toFixed(2), icon: +icon.toFixed(2), iconVsFace: +Math.abs(icon - face).toFixed(2) };
  });

  // Thème sombre : glow/rebords NOIRS, icônes BLANCHES (lisibles)
  await page.click('.wii-tabs .wii-tab:nth-child(2)'); // Jeux (6 chaînes)
  await new Promise(r => setTimeout(r, 350));
  await page.evaluate(() => window.ThemeManager && window.ThemeManager.apply('black', false));
  await new Promise(r => setTimeout(r, 450));
  const darkLayout = await collectLayout(page);
  const darkIssues = analyzeLayout(darkLayout);
  results.push(['thème sombre : disposition intacte', darkIssues.length === 0, darkIssues.join(' | ') || 'aucun défaut']);
  const dark = await readThemeColors();
  results.push(['thème noir : glow/rebords noirs + icônes blanches lisibles',
    dark.hi < 0.1 && dark.icon > 0.75 && dark.iconVsFace > 0.5, JSON.stringify(dark)]);
  await page.screenshot({ path: path.join(SHOTS_DIR, 'wii-theme-black-1920x1080.png') });
  const bgBlack = await wallpaperVisibility(path.join(SHOTS_DIR, 'wii-theme-black-1920x1080.png'));
  results.push(['fond d\'écran visible en thème noir (texture mesurée)', bgBlack > 2, `variance=${bgBlack.toFixed(2)}`]);
  await page.evaluate(() => window.ThemeManager && window.ThemeManager.apply('white', false));
  await new Promise(r => setTimeout(r, 350));
  const light = await readThemeColors();
  results.push(['thème blanc : glow/rebords blancs + icônes noires lisibles',
    light.hi > 0.9 && light.icon < 0.25 && light.iconVsFace > 0.5, JSON.stringify(light)]);
  await page.screenshot({ path: path.join(SHOTS_DIR, 'wii-theme-white-1920x1080.png') });
  const bgWhite = await wallpaperVisibility(path.join(SHOTS_DIR, 'wii-theme-white-1920x1080.png'));
  results.push(['fond d\'écran visible en thème blanc (texture mesurée)', bgWhite > 2, `variance=${bgWhite.toFixed(2)}`]);

  // Mode économie : la disposition doit rester intacte
  await page.evaluate(() => window.ThemeManager && window.ThemeManager.setEcoMode(true, true));
  await new Promise(r => setTimeout(r, 350));
  const ecoLayout = await collectLayout(page);
  const ecoIssues = analyzeLayout(ecoLayout);
  results.push(['mode économie : disposition intacte', ecoIssues.length === 0, ecoIssues.join(' | ') || 'aucun défaut']);
  await page.evaluate(() => window.ThemeManager && window.ThemeManager.setEcoMode(false, true));
  await new Promise(r => setTimeout(r, 300));

  // Lancement d'une vraie app (fenêtrée) depuis une chaîne
  await page.click('.wii-tabs .wii-tab:nth-child(1)'); // Utilisateur
  await new Promise(r => setTimeout(r, 300));
  await page.click('.wii-channels .wii-channel:nth-child(1)'); // Hyl1a Bio
  await new Promise(r => setTimeout(r, 2200)); // splash + ouverture
  const appOpened = await page.evaluate(() =>
    !!(document.querySelector('.mii-fullscreen-container') ||
       (window.WindowManager && window.WindowManager.windows && window.WindowManager.windows['bio']) ||
       (document.getElementById('window-layer') && document.getElementById('window-layer').children.length)));
  results.push(['clic chaîne → vraie app ouverte (Hyl1a Bio)', appOpened, `opened=${appOpened}`]);

  // prefers-reduced-motion
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const anim = await page.evaluate(() => {
    const el = document.querySelector('.wii-channel');
    const cs = getComputedStyle(el);
    return { duration: cs.animationDuration, transition: cs.transitionDuration };
  });
  results.push(['prefers-reduced-motion → animations neutralisées',
    parseFloat(anim.duration) < 0.01 && parseFloat(anim.transition) < 0.01,
    JSON.stringify(anim)]);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

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

      const L = await collectLayout(page);
      const issues = analyzeLayout(L);

      const shot = path.join(SHOTS_DIR, `wii-${vp.width}x${vp.height}.png`);
      await page.screenshot({ path: shot });

      const status = issues.length ? 'ÉCHEC' : 'OK';
      if (issues.length) failed += 1;
      console.log(`\n=== ${vp.width}x${vp.height} → ${status} (capture : ${path.relative(process.cwd(), shot)})`);
      issues.forEach(i => console.log('   ✗ ' + i));

      await page.close();
    }

    console.log('\n=== Tests d\'interactions ===');
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
  if (!uniqueLogs.length) {
    console.log('   aucune');
  } else {
    uniqueLogs.slice(0, 30).forEach(l => console.log('   ' + l));
    console.log(`   (${uniqueLogs.length} message(s) distinct(s))`);
  }

  console.log(failed ? `\nRÉSULTAT : ${failed} vérification(s) en échec.` : '\nRÉSULTAT : toutes les vérifications passent.');
  process.exit(failed ? 1 : 0);
})().catch(e => {
  console.error('Erreur du script de test :', e);
  process.exit(2);
});
