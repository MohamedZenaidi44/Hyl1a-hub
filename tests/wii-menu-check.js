/**
 * Vérification du menu d'accueil façon Wii (wiiMenu.js / wiiMenu.css).
 *
 * Pour chaque résolution cible :
 *  - capture d'écran dans tests/shots/
 *  - aucun débordement horizontal du document
 *  - rangée de chaînes entièrement visible verticalement (défilement
 *    horizontal interne permis), centrée quand elle tient à l'écran
 *  - zones de la grille (barre haute / onglets / hero / rangée / barre basse)
 *    sans aucun chevauchement entre elles
 *  - hero : carte à gauche du texte (≥1100px), empilée carte au-dessus (<1100px)
 *  - <700px : aide clavier masquée + horloge réduite
 *  - menu jamais en chevauchement avec le HUD déplacé dans la grille
 *
 * Tests d'interactions (1920x1080) :
 *  - clic sur un onglet → changement de page
 *  - ← / → : navigation dans la rangée ; aux bords, changement de page
 *  - ↑ / ↓ : changement de page (catégorie)
 *  - Entrée / bouton « Ouvrir » → lancement (sélecteur de thèmes, app légère)
 *  - Hyl1a Bio → redirection vers le site bio (nouvel onglet), sans fenêtre
 *  - survol → sélection + carte du hero synchronisée
 *  - box art plein cadre dans la carte hero (GBA/DS/NES/N64/Plaza/Mii Maker)
 *  - Plaza : box art dans le grand carré + visuel hero dans le rectangle
 *  - tuiles et box art basculent iiSU clair/sombre avec le thème
 *  - HUD (profil, bandeau, horloge, bouton, musique, visualiseur, aide)
 *    correctement intégré à la grille
 *  - carte hero : verre translucide (flou) + fond translucide ; rectangle de
 *    descriptions translucide ; contour animé (wiiHeroContour) partout :
 *    carte hero, descriptions, chaînes et onglets
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
  { width: 1280, height: 720 },
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
   coin bas-gauche de la barre basse (aucun panneau opaque à cet endroit).
   Un voile plat donne ~0, une vidéo visible donne plusieurs unités. */
async function wallpaperVisibility(shotPath) {
  const sharp = require('sharp');
  const { channels } = await sharp(shotPath)
    .extract({ left: 40, top: 982, width: 560, height: 64 })
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
      topbar: rectOf('.wii-topbar'),
      hero: rectOf('.wii-hero'),
      heroCard: rectOf('.wii-hero-card'),
      row: rectOf('.wii-channels-frame'),
      bottom: rectOf('.wii-bottom'),
      grid: rectOf('.wii-channels'),
      tabs: rectOf('.wii-tabs'),
      info: rectOf('.wii-info'),
      hint: rectOf('.wii-hint'),
      timeFontSize: (() => {
        const t = document.querySelector('#top-time');
        return t ? parseFloat(getComputedStyle(t).fontSize) : 0;
      })(),
      faces: Array.from(document.querySelectorAll('.wii-channel-face')).map(el => {
        const r = el.getBoundingClientRect();
        // Taille de layout (sans le scale de sélection) pour comparer les faces
        return { left: r.x, top: r.y, right: r.right, bottom: r.bottom,
                 width: el.offsetWidth, height: el.offsetHeight,
                 label: el.textContent.trim().slice(0, 24) };
      }),
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

  // 1. Pas de débordement horizontal du document
  if (L.docScrollWidth > vw + 1) {
    issues.push(`débordement horizontal : scrollWidth=${L.docScrollWidth} > viewport=${vw}`);
  }

  // 2. Rangée et chaînes entièrement visibles verticalement
  //    (le défilement horizontal interne de la rangée reste permis)
  if (L.row && (L.row.top < -1 || L.row.bottom > vh + 1)) {
    issues.push(`rangée hors viewport verticalement : top=${Math.round(L.row.top)} bottom=${Math.round(L.row.bottom)}`);
  }
  L.channels.forEach((c, i) => {
    if (c.top < -1 || c.bottom > vh + 1) {
      issues.push(`chaîne ${i} (${c.label}) hors viewport verticalement : top=${Math.round(c.top)} bottom=${Math.round(c.bottom)}`);
    }
  });

  // 3. Proportions régulières : faces toutes identiques
  //    (taille de layout : le scale de la chaîne sélectionnée est ignoré)
  if (L.faces.length > 1) {
    const w0 = Math.round(L.faces[0].width), h0 = Math.round(L.faces[0].height);
    L.faces.forEach((f, i) => {
      if (Math.abs(Math.round(f.width) - w0) > 1 || Math.abs(Math.round(f.height) - h0) > 1) {
        issues.push(`face ${i} taille différente (${Math.round(f.width)}x${Math.round(f.height)} vs ${w0}x${h0})`);
      }
    });
  }

  // 4. Quand la rangée tient à l'écran, elle est centrée
  //    (sinon elle défile et reste alignée au début)
  if (L.row && L.channels.length) {
    const first = L.channels[0];
    const last = L.channels[L.channels.length - 1];
    const content = last.right - first.left;
    if (content <= L.row.width - 2) {
      const left = first.left - L.row.left;
      const right = L.row.right - last.right;
      if (Math.abs(left - right) > 60) {
        issues.push(`rangée non centrée : marge gauche=${Math.round(left)}px, droite=${Math.round(right)}px`);
      }
    }
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

  // 7. Zones de la grille : aucun chevauchement entre elles
  const zones = [
    ['barre haute', L.topbar],
    ['onglets', L.tabs],
    ['hero', L.hero],
    ['rangée', L.row],
    ['barre basse', L.bottom],
  ].filter(([, r]) => r);
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (rectsIntersect(zones[i][1], zones[j][1])) {
        issues.push(`chevauchement zones : ${zones[i][0]} / ${zones[j][0]}`);
      }
    }
  }

  // 8. Hero : carte et texte côte à côte (≥1100px) ou empilés (<1100px)
  if (L.heroCard && L.info) {
    if (vw >= 1100) {
      if (L.heroCard.right > L.info.left + 1) {
        issues.push(`hero : carte et texte superposés (carte.right=${Math.round(L.heroCard.right)} info.left=${Math.round(L.info.left)})`);
      }
    } else if (L.heroCard.bottom > L.info.top + 1) {
      issues.push(`hero empilé : carte et texte superposés (carte.bottom=${Math.round(L.heroCard.bottom)} info.top=${Math.round(L.info.top)})`);
    }
  }

  // 9. Petits écrans : aide clavier masquée + horloge réduite
  if (vw < 700) {
    if (L.hint && L.hint.width > 0) {
      issues.push('aide clavier visible alors que <700px');
    }
    if (L.timeFontSize > 34) {
      issues.push(`horloge non réduite (<700px) : ${L.timeFontSize}px`);
    }
  }

  // 10. Le contenu visible du menu ne chevauche pas le HUD
  const menuZones = [
    ['onglets', L.tabRects],
    ['info', L.info],
    ['chaînes', L.channels],
  ];
  const hudEntries = Object.entries(L.hud).filter(([, r]) => r && r.width > 0 && r.height > 0);
  for (const [name, zonesList] of menuZones) {
    const list = Array.isArray(zonesList) ? zonesList : (zonesList ? [zonesList] : []);
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

  // Onglet "Jeux" (index 1) : 5 chaînes, rangée unique
  await page.click('.wii-tabs .wii-tab:nth-child(2)');
  await new Promise(r => setTimeout(r, 350));
  s = await state();
  results.push(['clic onglet → page Jeux (5 chaînes)', s.activeTab === 1 && s.channelCount === 5, JSON.stringify(s)]);

  // → : chaîne suivante dans la rangée (0 → 1)
  await page.keyboard.press('ArrowRight');
  s = await state();
  results.push(['→ : sélection 0 → 1', s.selected === 1, `selected=${s.selected}`]);

  // ↓ : page suivante (Mii, 3 chaînes)
  await page.keyboard.press('ArrowDown');
  s = await state();
  results.push(['↓ : page suivante (Mii)', s.activeTab === 2 && s.channelCount === 3 && s.selected === 0, JSON.stringify(s)]);

  // ↑ : page précédente (Jeux)
  await page.keyboard.press('ArrowUp');
  s = await state();
  results.push(['↑ : page précédente (Jeux)', s.activeTab === 1 && s.channelCount === 5 && s.selected === 0, JSON.stringify(s)]);

  // → ×3 : avance dans la rangée (0 → 3)
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  s = await state();
  results.push(['→ ×3 : avance dans la rangée (0 → 3)', s.selected === 3, `selected=${s.selected}`]);

  // → : dernière chaîne (4/5), puis bord droit → page suivante
  await page.keyboard.press('ArrowRight');
  s = await state();
  results.push(['→ : dernière chaîne (4/5)', s.selected === 4, `selected=${s.selected}`]);
  await page.keyboard.press('ArrowRight'); // bord droit → page suivante (Mii)
  s = await state();
  results.push(['→ au bord droit → page suivante', s.activeTab === 2 && s.channelCount === 3, JSON.stringify(s)]);
  await page.keyboard.press('ArrowLeft'); // bord gauche → page précédente (Jeux)
  s = await state();
  results.push(['← au bord gauche → page précédente', s.activeTab === 1 && s.channelCount === 5, JSON.stringify(s)]);

  // Survol : la sélection suit la souris (sans cliquer : un clic lancerait l'app)
  const box = await page.evaluate(() => {
    const r = document.querySelector('.wii-channels .wii-channel:nth-child(4)').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.move(box.x, box.y);
  await new Promise(r => setTimeout(r, 250));
  s = await state();
  results.push(['survol → sélection suit la souris (4e chaîne)', s.selected === 3 && s.infoTitle === 'N64', `selected=${s.selected} info=${s.infoTitle}`]);

  // La carte du hero suit la sélection (4e chaîne = N64 → box art iiSU
  // plein cadre : object-fit cover et dimensions = celles du grand carré)
  const heroArt = await page.evaluate(() => {
    const card = document.querySelector('.wii-hero-card');
    const art = document.querySelector('.wii-hero-art');
    const cr = card ? card.getBoundingClientRect() : null;
    const ar = art ? art.getBoundingClientRect() : null;
    return {
      src: art ? (art.getAttribute('src') || '') : '',
      cover: art ? getComputedStyle(art).objectFit : '',
      fills: !!(cr && ar && Math.abs(cr.width - ar.width) < 2 && Math.abs(cr.height - ar.height) < 2),
      mask: art ? art.classList.contains('is-mask') : false,
    };
  });
  results.push(['carte du hero synchronisée (N64) + box art plein cadre',
    heroArt.src.includes('n64') && heroArt.cover === 'cover' && heroArt.fills,
    JSON.stringify(heroArt)]);

  // Focus clavier visible (tab accessible en boutons)
  const focusable = await page.evaluate(() => document.querySelectorAll('button.wii-channel').length);
  results.push(['chaînes = boutons focusables', focusable === 5, `count=${focusable}`]);

  // ── Vérifs de visuels : helpers (survol d'une chaîne + lecture des cadres) ──
  const hoverChannel = async (n) => {
    const box = await page.evaluate((idx) => {
      const r = document.querySelector('.wii-channels .wii-channel:nth-child(' + idx + ')').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, n);
    await page.mouse.move(box.x, box.y);
    await new Promise(r => setTimeout(r, 350));
  };
  const readFill = () => page.evaluate(() => {
    const near = (a, b) => !!(a && b && Math.abs(a.width - b.width) < 2 && Math.abs(a.height - b.height) < 2);
    const card = document.querySelector('.wii-hero-card');
    const art = document.querySelector('.wii-hero-art');
    const info = document.querySelector('.wii-info');
    const bg = document.querySelector('.wii-info-bg');
    return {
      title: (document.querySelector('.wii-info-title') || {}).textContent || '',
      artSrc: art ? (art.getAttribute('src') || '') : '',
      artCover: art ? getComputedStyle(art).objectFit : '',
      artFills: near(art && art.getBoundingClientRect(), card && card.getBoundingClientRect()),
      bgSrc: bg ? (bg.getAttribute('src') || '') : '',
      bgCover: bg ? getComputedStyle(bg).objectFit : '',
      bgVisible: bg ? getComputedStyle(bg).display !== 'none' : false,
      bgFills: near(bg && bg.getBoundingClientRect(), info && info.getBoundingClientRect()),
      hasHero: info ? info.classList.contains('has-hero') : false,
    };
  });

  // Plaza (page Mii) : la box art remplit le grand carré et le visuel
  // « hero » remplit tout le rectangle de descriptions
  await page.click('.wii-tabs .wii-tab:nth-child(3)'); // Mii
  await new Promise(r => setTimeout(r, 350));
  await hoverChannel(2); // Plaza
  const plazaFill = await readFill();
  results.push(['Plaza : box art remplit le grand carré',
    plazaFill.title === 'Plaza' && plazaFill.artSrc.includes('boxart/plaza')
      && plazaFill.artCover === 'cover' && plazaFill.artFills,
    JSON.stringify(plazaFill)]);
  results.push(['Plaza : visuel hero remplit le rectangle de descriptions',
    plazaFill.bgSrc.includes('hero/plaza') && plazaFill.bgCover === 'cover'
      && plazaFill.bgVisible && plazaFill.bgFills && plazaFill.hasHero,
    JSON.stringify(plazaFill)]);

  // Autres chaînes (Réseau / Media) : visuels générés, mêmes pleins cadres
  await page.click('.wii-tabs .wii-tab:nth-child(4)'); // Réseau
  await new Promise(r => setTimeout(r, 350));
  await hoverChannel(1); // Chat Général
  const chatFill = await readFill();
  results.push(['Réseau : box art + hero pleins cadres (Chat Général)',
    chatFill.title === 'Chat Général' && chatFill.artSrc.includes('boxart/global') && chatFill.artFills
      && chatFill.bgSrc.includes('hero/global') && chatFill.bgFills && chatFill.hasHero,
    JSON.stringify(chatFill)]);
  await page.click('.wii-tabs .wii-tab:nth-child(5)'); // Media
  await new Promise(r => setTimeout(r, 350));
  await hoverChannel(1); // Radio
  const radioFill = await readFill();
  results.push(['Media : box art + hero pleins cadres (Radio)',
    radioFill.title === 'Radio' && radioFill.artSrc.includes('boxart/radio') && radioFill.artFills
      && radioFill.bgSrc.includes('hero/radio') && radioFill.bgFills && radioFill.hasHero,
    JSON.stringify(radioFill)]);

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

  // Bouton « Ouvrir » du hero → même lancement
  await page.click('.wii-launch-btn');
  await new Promise(r => setTimeout(r, 500));
  const overlayOpenBtn = await page.evaluate(() => !!document.getElementById('theme-overlay'));
  results.push(['bouton « Ouvrir » → lancement réel', overlayOpenBtn, `overlay=${overlayOpenBtn}`]);
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
  await new Promise(r => setTimeout(r, 450)); // fermeture de l'overlay terminée

  // HUD intégré à la grille (déplacé du body vers les zones de la grille)
  const hudInGrid = await page.evaluate(() => ({
    profile: !!document.querySelector('.wii-topbar #user-panel'),
    marquee: !!document.querySelector('.wii-topbar #marquee-bar'),
    clock: !!document.querySelector('.wii-topbar #clock-panel'),
    changelog: !!document.querySelector('.wii-topbar #btn-changelog-toggle'),
    music: !!document.querySelector('.wii-bottom #music-bar-container'),
    visualizer: !!document.querySelector('#music-bar-container #modern-visualizer-container'),
    hint: !!document.querySelector('.wii-bottom .wii-hint'),
  }));
  results.push(['HUD intégré à la grille (profil, bandeau, horloge, bouton, musique, visualiseur, aide)',
    Object.values(hudInGrid).every(Boolean), JSON.stringify(hudInGrid)]);

  // Verre : carte hero (flou + fond translucide + contour animé) et
  // rectangle de descriptions (flou + fond translucide)
  const heroStyles = await page.evaluate(() => {
    const card = document.querySelector('.wii-hero-card');
    const info = document.querySelector('.wii-info');
    const csCard = getComputedStyle(card);
    const csInfo = getComputedStyle(info);
    const alphaFrom = (str) => {
      const m = String(str).match(/rgba?\(([^)]+)\)/g) || [];
      const alphas = m.map(s => { const p = s.match(/[\d.]+/g).map(Number); return p.length > 3 ? p[3] : 1; });
      return alphas.length ? Math.min(...alphas) : 1;
    };
    const ringAnim = (el) => getComputedStyle(el, '::before').animationName;
    return {
      cardBlur: csCard.backdropFilter,
      infoBlur: csInfo.backdropFilter,
      cardAnim: ringAnim(card),
      cardAlpha: alphaFrom(csCard.backgroundColor),
      infoAlpha: alphaFrom(csInfo.backgroundColor),
      ringAnim: {
        card: ringAnim(card),
        info: ringAnim(info),
        tab: ringAnim(document.querySelector('.wii-tab')),
        face: ringAnim(document.querySelector('.wii-channel-face')),
      },
    };
  });
  results.push(['carte hero : verre (flou) + fond translucide + contour animé',
    heroStyles.cardBlur !== 'none' && heroStyles.cardAlpha < 0.9
      && /wiiHeroContour/.test(heroStyles.cardAnim),
    JSON.stringify(heroStyles)]);
  results.push(['rectangle de descriptions : verre translucide',
    heroStyles.infoBlur !== 'none' && heroStyles.infoAlpha < 0.9,
    `blur=${heroStyles.infoBlur} alpha=${heroStyles.infoAlpha}`]);
  const rings = heroStyles.ringAnim;
  results.push(['contour animé aussi sur descriptions, chaînes et onglets',
    Object.values(rings).every(v => /wiiHeroContour/.test(v || '')),
    JSON.stringify(rings)]);

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
  await page.click('.wii-tabs .wii-tab:nth-child(2)'); // Jeux (5 chaînes)
  await new Promise(r => setTimeout(r, 350));
  await page.evaluate(() => window.ThemeManager && window.ThemeManager.apply('black', false));
  await new Promise(r => setTimeout(r, 450));
  // Les tuiles et la box art basculent sur les variantes iiSU sombres
  const darkArt = await page.evaluate(() => {
    const disp = (el) => el ? getComputedStyle(el).display : 'absent';
    const face = document.querySelector('.wii-channels .wii-channel:nth-child(1) .wii-channel-face');
    const light = face ? face.querySelector('.art-light') : null;
    const dark = face ? face.querySelector('.art-dark') : null;
    const heroLight = document.querySelector('.wii-hero-card .wii-hero-art.art-light');
    const heroDark = document.querySelector('.wii-hero-card .wii-hero-art.art-dark');
    return {
      tileLight: disp(light), tileDark: disp(dark),
      tileDarkSrc: dark ? (dark.getAttribute('src') || '') : '',
      heroLight: disp(heroLight), heroDark: disp(heroDark),
      heroDarkSrc: heroDark ? (heroDark.getAttribute('src') || '') : '',
    };
  });
  results.push(['thème noir : tuiles et box art basculées sur les variantes iiSU sombres',
    darkArt.tileLight === 'none' && darkArt.tileDark !== 'none' && darkArt.tileDarkSrc.includes('gba-d')
      && darkArt.heroLight === 'none' && darkArt.heroDark !== 'none' && darkArt.heroDarkSrc.includes('gba-d'),
    JSON.stringify(darkArt)]);
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
  // Retour aux variantes iiSU claires
  const lightArt = await page.evaluate(() => {
    const disp = (el) => el ? getComputedStyle(el).display : 'absent';
    const face = document.querySelector('.wii-channels .wii-channel:nth-child(1) .wii-channel-face');
    const light = face ? face.querySelector('.art-light') : null;
    const dark = face ? face.querySelector('.art-dark') : null;
    return {
      tileLight: disp(light), tileDark: disp(dark),
      tileLightSrc: light ? (light.getAttribute('src') || '') : '',
    };
  });
  results.push(['thème blanc : tuiles rebasculées sur les variantes iiSU claires',
    lightArt.tileDark === 'none' && lightArt.tileLight !== 'none' && lightArt.tileLightSrc.includes('gba-l'),
    JSON.stringify(lightArt)]);
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

  // Hyl1a Bio : plus de fenêtre interne — le clic (et « Ouvrir ») dirige
  // vers le site bio dans un nouvel onglet
  await page.evaluate(() => {
    window.__bioOpen = null;
    window.open = function (u) { window.__bioOpen = String(u); return null; };
  });
  await page.click('.wii-tabs .wii-tab:nth-child(1)'); // Utilisateur
  await new Promise(r => setTimeout(r, 300));
  await page.click('.wii-channels .wii-channel:nth-child(1)'); // Hyl1a Bio
  await new Promise(r => setTimeout(r, 500));
  const bioLaunch = await page.evaluate(() => ({
    opened: window.__bioOpen || '',
    internal: !!(document.querySelector('.mii-fullscreen-container') ||
      (document.getElementById('window-layer') && document.getElementById('window-layer').children.length)),
  }));
  results.push(['Hyl1a Bio : le clic ouvre le site bio sans fenêtre interne',
    bioLaunch.opened.includes('web2-rho-one.vercel.app') && !bioLaunch.internal,
    JSON.stringify(bioLaunch)]);
  await page.evaluate(() => { window.__bioOpen = null; });
  await page.click('.wii-launch-btn');
  await new Promise(r => setTimeout(r, 400));
  const bioBtn = await page.evaluate(() => window.__bioOpen || '');
  results.push(['Hyl1a Bio : bouton « Ouvrir » → site bio', bioBtn.includes('web2-rho-one.vercel.app'), bioBtn]);

  // Une vraie app fenêtrée s'ouvre toujours depuis une chaîne (Hall of Fame)
  await page.click('.wii-tabs .wii-tab:nth-child(2)'); // Jeux
  await new Promise(r => setTimeout(r, 350));
  await page.click('.wii-channels .wii-channel:nth-child(5)'); // Hall of Fame
  await new Promise(r => setTimeout(r, 1800)); // splash + ouverture
  const appOpened = await page.evaluate(() =>
    !!(document.querySelector('.mii-fullscreen-container') ||
       (document.getElementById('window-layer') && document.getElementById('window-layer').children.length)));
  results.push(['clic chaîne → vraie app ouverte (Hall of Fame)', appOpened, `opened=${appOpened}`]);

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
