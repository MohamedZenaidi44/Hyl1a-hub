/**
 * Mii Maker — constructeur de Mii complet (codec Nintendo FFLStoreData), avec
 * une interface d'édition plein écran alignée sur l'identité iiSU / Wii du hub :
 *   - barre d'onglets-icônes en haut (9 onglets) ;
 *   - aperçu du Mii à gauche (rendu FFL 3D) + bouton « Quitter » ;
 *   - panneau d'options à droite (sous-onglets, vignettes adaptatives, palette).
 * Thème clair/sombre hérité du ThemeManager (variables --tile-*, --panel-*, --accent).
 *
 * Le Mii est encodé en FFSD (96 octets) base64 et stocké dans Firestore
 * `avatars/{uid}.visual_base64` (même format que le reste de l'app).
 *
 * Aperçu 3D : FFL.js (moteur Wii U, portage WASM/Three.js) via
 *   miiMaker.js → miiRendererFFL.js (window.MiiViewerFFL) → miiViewerFFL.js
 * Ressource locale : assets/ffl/FFLResHigh.dat. En cas d'échec on retombe sur
 * l'aperçu 2D :
 *   https://mii-unsecure.ariankordi.net/miis/image.png?data=<FFSD base64>
 *
 * export default renderMiiMaker(container)  ← appelé par app.js (_lazy).
 */

import Mii from './mii.js';
import { ensureFFLValidMii } from './miiFFLData.js';
import {
  SKIN, HAIR, EYE, MOUTH, GLASSES as GLASS, FAV,
  buildPartSvg, nonePartSvg, preloadBase, preloadGroup,
} from './miiParts.js';

const RENDER_BASE = 'https://mii-unsecure.ariankordi.net/miis/image.png';

// Mii « par défaut » valide (généré depuis mii.js). Sert de base quand
// l'utilisateur n'a pas encore de Mii. Format FFLStoreData (96 octets) base64.
const DEFAULT_MII_B64 =
  'AAEAAAAAAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAAAAAAABowBgANMAYgBgAaAwAACEAUgg9AAAAAAAAAAAAAAAAAAAAAAAAAAAAADXP';

/* ------------------- Icônes des onglets (Feature menu) -------------------- */
// Pictogrammes neutres (blanc/currentColor), sans emoji. viewBox 48×48.
const _SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" '
  + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const TAB_ICONS = {
  // Infos : petite plaque (barre à points) au-dessus d'une tête à sourire.
  infos: _SVG + '<rect x="15" y="4" width="18" height="10" rx="3"/>'
    + '<path d="M20 9h.01M24 9h.01M28 9h.01"/>'
    + '<circle cx="24" cy="31" r="10"/>'
    + '<path d="M20 31c1 1.3 2.5 2 4 2s3-.7 4-2"/></svg>',
  // Corps : silhouette debout.
  corps: _SVG + '<circle cx="24" cy="13" r="7"/>'
    + '<path d="M14 44c0-9 4.5-14 10-14s10 5 10 14"/></svg>',
  // Visage : grand visage rond, 2 yeux, sourire.
  visage: _SVG + '<circle cx="24" cy="24" r="17"/>'
    + '<circle cx="18" cy="21" r="1.7" fill="currentColor"/>'
    + '<circle cx="30" cy="21" r="1.7" fill="currentColor"/>'
    + '<path d="M17 30c2 2.4 4.6 3.6 7 3.6s5-1.2 7-3.6"/></svg>',
  // Cheveux : casque de cheveux avec raie.
  cheveux: _SVG + '<path d="M10 27c0-9 6-16 14-16s14 7 14 16"/>'
    + '<path d="M10 27v6M38 27v6"/>'
    + '<path d="M16 15c2-3 5-4 8-4s6 1 8 4"/></svg>',
  // Sourcils : deux sourcils en V.
  sourcils: _SVG + '<path d="M8 27c4-6 10-6 14 0"/>'
    + '<path d="M26 27c4-6 10-6 14 0"/></svg>',
  // Yeux : deux yeux ovales avec pupille.
  yeux: _SVG + '<path d="M6 24c4-6 9-8 13-8s9 2 13 8"/>'
    + '<circle cx="19" cy="24" r="3.2" fill="currentColor"/>'
    + '<path d="M35 24c-4-6-9-8-13-8"/>'
    + '<circle cx="29" cy="24" r="3.2" fill="currentColor"/></svg>',
  // Nez : profil en « L » courbe.
  nez: _SVG + '<path d="M28 8c-3 7-7 11-7 17a6 6 0 0 0 6 6h4"/>'
    + '<path d="M18 31h12"/></svg>',
  // Bouche : paire de lèvres.
  bouche: _SVG + '<path d="M8 20c3 8 9 12 16 12s13-4 16-12"/>'
    + '<path d="M10 22c4-2 9-3 14-3s10 1 14 3"/></svg>',
  // Accessoires : lunettes + moustache.
  accessoires: _SVG + '<circle cx="14" cy="25" r="6"/>'
    + '<circle cx="34" cy="25" r="6"/><path d="M20 25h8"/>'
    + '<path d="M7 23L4 18M41 23l3-5"/>'
    + '<path d="M15 40c2.5-2 6-2 9-2s6.5 0 9 2"/></svg>',
};
function tabIcon(id) {
  const s = document.createElement('span');
  s.className = 'mii-cat-icon';
  s.innerHTML = TAB_ICONS[id] || '';
  return s;
}

/* ------------------------------ Utilitaires ------------------------------- */
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('[MiiMaker] échec chargement ' + url));
    document.head.appendChild(s);
  });
}

/* --------------------------- Constructeur de UI --------------------------- */
export default async function renderMiiMaker(container) {
  /* --- Modèle : un Mii valide --- */
  let mii;
  try {
    mii = new Mii(b64ToBytes(DEFAULT_MII_B64));
  } catch (e) {
    console.error('[MiiMaker] default Mii decode failed:', e);
    container.innerHTML = '<div style="padding:40px;color:#f88;text-align:center;">Erreur : impossible d\'initialiser le Mii Maker.</div>';
    return;
  }

  let bodyView = true; // Ouvre d'emblée sur le Mii entier (corps + tête).
  let previewTimer = null;

  /* --- Charger le Mii existant de l'utilisateur, si présent --- */
  let existingBio = '';
  const user = window.Auth ? window.Auth.currentUser : null;
  if (user && window.Firestore) {
    try {
      const snap = await window.Firestore.getDoc(
        window.Firestore.doc(window.FirebaseDB, 'avatars', user.uid)
      );
      if (snap.exists()) {
        const d = snap.data();
        existingBio = d.bio || '';
        if (d.visual_base64) {
          try { mii = new Mii(b64ToBytes(d.visual_base64)); }
          catch (e) { console.warn('[MiiMaker] stored Mii invalid, using default', e); }
        }
      }
    } catch (e) { console.warn('[MiiMaker] could not load avatar', e); }
  }
  mii.creatorName = (window.Auth && window.Auth.currentUsername ? window.Auth.currentUsername : 'Hylia').slice(0, 10);

  /* ------------------------------- Structure ------------------------------- */
  // Scène plein écran (proportions du Mii Channel) : bande d'onglets en haut,
  // puis une rangée [aperçu à gauche | panneau d'options à droite].
  const screen = el('div', 'mii-screen');
  const bgLeft = el('div', 'mii-bg-left');

  const topbar = el('div', 'mii-topbar');
  const catWrap = el('div', 'mii-cat-wrap');

  const main = el('div', 'mii-main');

  // --- Aperçu (gauche) ---
  const preview = el('div', 'mii-preview');

  const preview3DMount = el('div', 'mii-preview-3d');
  preview3DMount.id = 'mii-preview-3d';

  // Aperçu 2D (fallback) : masqué sauf si le rendu 3D échoue.
  const preview2D = el('img');
  preview2D.id = 'mii-preview';
  preview2D.alt = 'Aperçu du Mii';

  const loading = el('div', 'mii-loading-overlay');
  loading.id = 'mii-loading-overlay';
  loading.textContent = 'Chargement…';

  // Calque des étoiles : les étoiles d'activation jaillissent SUR le Mii.
  const starLayer = el('div', 'mii-star-layer');

  const previewTools = el('div', 'mii-preview-tools');
  const rotLeftBtn = el('button', 'mii-cat-btn', '◀');
  rotLeftBtn.title = 'Tourner à gauche';
  const rotRightBtn = el('button', 'mii-cat-btn', '▶');
  rotRightBtn.title = 'Tourner à droite';
  const bodyBtn = el('button', 'mii-cat-btn', '⇕');
  bodyBtn.title = 'Vue corps entier / tête';
  const randomBtn = el('button', 'mii-cat-btn', '↻');
  randomBtn.title = 'Mii aléatoire';
  previewTools.append(rotLeftBtn, rotRightBtn, bodyBtn, randomBtn);

  const quitBtn = el('button', 'mii-quit', 'Quitter');
  quitBtn.title = 'Quitter';

  preview.append(preview3DMount, preview2D, loading, starLayer, previewTools, quitBtn);

  // --- Panneau d'options (droite) ---
  const options = el('div', 'mii-options');
  const subtabs = el('div', 'mii-subtabs');
  const optionsBody = el('div', 'mii-options-body');
  const listArea = el('div', 'mii-list-area');
  const colorPanel = el('div', 'mii-color-panel');
  const saveBtn = el('button', 'mii-save-btn', 'Sauvegarder mon Mii');
  optionsBody.append(listArea, colorPanel);
  options.append(subtabs, optionsBody, saveBtn);

  main.append(preview, options);
  screen.append(bgLeft, topbar, main);
  container.innerHTML = '';
  container.append(screen);

  /* --------------------- Aperçu 3D (FFL.js) + fallback 2D ------------------ */
  const FFL_RENDERER_JS = 'apps/mii_maker/js/miiRendererFFL.js'; // définit window.MiiViewerFFL
  const CAM_HEAD = { y: 1.05, z: 3.2 };
  const CAM_BODY = { y: 1.0, z: 6.4 };

  let miiViewer3D = null;
  let miiViewer3DReady = null;
  let viewer3DFailed = false;

  function ensureMiiViewer3D() {
    if (miiViewer3DReady) return miiViewer3DReady;
    miiViewer3DReady = (async () => {
      if (!window.MiiViewerFFL) await loadScript(FFL_RENDERER_JS);
      miiViewer3D = new window.MiiViewerFFL(preview3DMount);
      return miiViewer3D;
    })();
    return miiViewer3DReady;
  }

  // Ancien aperçu 2D — conservé comme filet de sécurité uniquement.
  function buildPreviewUrl() {
    const b64 = mii.encodeFFSD().toString('base64');
    const type = bodyView ? 'all_body_sugar' : 'face';
    const width = bodyView ? 420 : 512;
    return `${RENDER_BASE}?data=${encodeURIComponent(b64)}&verifyCharInfo=0&type=${type}&width=${width}&shaderType=wiiu`;
  }

  function show2DPreview() {
    let url;
    try { url = buildPreviewUrl(); }
    catch (e) { console.error('[MiiMaker] encode failed:', e); return; }
    loading.style.display = 'flex';
    preview2D.onload = () => { loading.style.display = 'none'; };
    preview2D.onerror = () => { loading.style.display = 'none'; };
    preview2D.src = url;
  }

  function applyCamera() {
    if (!miiViewer3D) return;
    // Le viewer FFL (tête + corps) gère lui-même des cadrages authentiques.
    if (typeof miiViewer3D.setBodyView === 'function') {
      miiViewer3D.setBodyView(bodyView);
      return;
    }
    // Ancien viewer (filet de sécurité) : positionne la caméra directement.
    if (!miiViewer3D.camera) return;
    const cam = miiViewer3D.camera;
    const t = bodyView ? CAM_BODY : CAM_HEAD;
    cam.position.set(0, t.y, t.z);
    cam.lookAt(0, t.y - 0.05, 0);
    if (cam.updateProjectionMatrix) cam.updateProjectionMatrix();
  }

  function updatePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(async () => {
      if (viewer3DFailed) { show2DPreview(); return; }
      loading.style.display = 'flex';
      try {
        await ensureMiiViewer3D();
        await miiViewer3D.update(mii);
        applyCamera();
        loading.style.display = 'none';
      } catch (e) {
        console.warn('[MiiMaker] aperçu 3D indisponible, bascule sur le rendu 2D :', e);
        viewer3DFailed = true;
        preview3DMount.style.display = 'none';
        preview2D.style.display = 'block';
        show2DPreview();
      }
    }, 180);
  }

  async function rotateBy(deg) {
    if (viewer3DFailed) return;
    try { await ensureMiiViewer3D(); miiViewer3D.rotateBy(deg); } catch (e) { /* ignore */ }
  }

  /* --------------------- Retour visuel : son + étoiles --------------------- */
  function playSelectSound() {
    try {
      if (window.AudioManager && typeof window.AudioManager.playSelect === 'function') {
        window.AudioManager.playSelect();
      }
    } catch (e) { /* audio indisponible : on ignore */ }
  }

  function burstStars(anchor) {
    if (!anchor) return;
    const N = 9;
    for (let i = 0; i < N; i++) {
      const st = el('div', 'mii-star', '✦');
      const ang = (Math.PI * 2 * i) / N + (Math.random() - 0.5) * 0.5;
      const dist = 40 + Math.random() * 46;
      st.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
      st.style.setProperty('--dy', (Math.sin(ang) * dist).toFixed(1) + 'px');
      st.style.fontSize = (14 + Math.random() * 12).toFixed(1) + 'px';
      anchor.appendChild(st);
      setTimeout(() => st.remove(), 720);
    }
  }

  // Les étoiles apparaissent sur le Mii (aperçu), pas sur la case cliquée.
  function selectFeedback() {
    playSelectSound();
    burstStars(starLayer);
  }

  /* --------------------------- Contrôles réutilisables --------------------- */
  function sectionLabel(t) { return el('div', 'mii-section-label', t); }

  function stepper(labelText, get, set, min, max) {
    const w = el('div', 'mii-slider-group');
    const l = el('div', 'mii-slider-label');
    const valEl = el('span', 'val');
    l.append(el('span', null, labelText), valEl);
    const ctrl = el('div', 'mii-stepper');
    const prev = el('button', 'mii-step-btn', '−');
    const next = el('button', 'mii-step-btn', '+');
    const mid = el('input', 'mii-input');
    mid.type = 'number'; mid.min = min; mid.max = max;
    const sync = () => { const v = get(); mid.value = v; valEl.textContent = v; };
    prev.onclick = () => { set(get() <= min ? max : get() - 1); sync(); updatePreview(); };
    next.onclick = () => { set(get() >= max ? min : get() + 1); sync(); updatePreview(); };
    mid.oninput = () => { const v = clamp(parseInt(mid.value || min, 10) || 0, min, max); set(v); valEl.textContent = v; updatePreview(); };
    ctrl.append(prev, mid, next);
    w.append(l, ctrl);
    sync();
    return w;
  }

  // Polices de construction : chaque sous-onglet remplit la liste (formes) et
  // la palette (couleurs/réglages) du panneau d'options.
  function addSection(parent, text) { parent.appendChild(sectionLabel(text)); }

  function addGrid(parent, count, get, set, group, optional) {
    const g = el('div', 'mii-thumb-grid');
    const tiles = [];
    const fill = (tile, i) => {
      const img = tile.querySelector('img');
      if (!img) return;
      const p = (optional && i === 0) ? Promise.resolve(nonePartSvg(120)) : buildPartSvg(mii, group, i, 120);
      p.then((url) => {
        if (!url) return;
        img.onload = () => img.classList.add('is-loaded');
        img.src = url;
      }).catch(() => {});
    };
    for (let i = 0; i < count; i++) {
      const b = el('button', 'mii-thumb');
      b.type = 'button';
      b.dataset.value = String(i);
      b.appendChild(el('img', 'mii-thumb-img'));
      if (get() === i) b.classList.add('active');
      b.onclick = () => {
        set(i);
        updatePreview();
        selectFeedback();
        tiles.forEach((t, j) => t.classList.toggle('active', j === i));
      };
      tiles.push(b);
      g.appendChild(b);
    }
    gridInvalidators.push(() => tiles.forEach((t, i) => fill(t, i)));
    preloadGroup(group, count);
    tiles.forEach((t, i) => fill(t, i));
    parent.appendChild(g);
    return g;
  }

  function addSwatches(parent, labelText, get, set, colors) {
    parent.appendChild(el('label', 'mii-palette-label', labelText));
    const g = el('div', 'mii-color-grid');
    colors.forEach((c, i) => {
      const b = el('div', 'mii-color-swatch');
      b.style.background = c;
      if (get() === i) b.classList.add('active');
      b.onclick = () => {
        set(i); updatePreview();
        selectFeedback();
        refreshGrids();
        g.querySelectorAll('.mii-color-swatch').forEach((x, j) => x.classList.toggle('active', j === i));
      };
      g.appendChild(b);
    });
    parent.appendChild(g);
    return g;
  }

  function addToggle(parent, labelText, get, set) {
    const btn = el('button', 'mii-toggle-btn');
    const sync = () => { btn.textContent = labelText + ' : ' + (get() ? 'Oui' : 'Non'); };
    btn.onclick = () => { set(!get()); sync(); updatePreview(); selectFeedback(); refreshGrids(); };
    parent.appendChild(btn);
    sync();
    return btn;
  }

  function addGenderPicker(parent) {
    const g = el('div', 'mii-gender');
    const mk = (val, txt) => {
      const b = el('button', 'mii-toggle-btn', txt);
      b.onclick = () => { mii.gender = val; updatePreview(); [...g.children].forEach((x, i) => x.classList.toggle('active', i === val)); };
      if (mii.gender === val) b.classList.add('active');
      return b;
    };
    g.append(mk(0, 'Homme'), mk(1, 'Femme'));
    parent.appendChild(g);
    return g;
  }

  let gridInvalidators = [];
  function refreshGrids() { gridInvalidators.forEach((fn) => fn()); }

  /* ------------------------------- Onglets --------------------------------- */
  // 9 onglets (Feature menu) comme sur la capture : Infos, Corps, Visage,
  // Cheveux, Sourcils, Yeux, Nez, Bouche, Accessoires.
  const TABS = [
    {
      id: 'infos', label: 'Infos', build(L, C) {
        addSection(L, 'Nom du Mii (10 caractères max)');
        const name = el('input', 'mii-input mii-name-input');
        name.type = 'text'; name.maxLength = 10; name.value = mii.miiName || '';
        name.placeholder = 'Mon Mii';
        name.oninput = () => { mii.miiName = name.value.slice(0, 10); updatePreview(); };
        L.appendChild(name);
        addSection(L, 'Bio (affichée sur votre profil)');
        const bio = el('textarea', 'mii-textarea');
        bio.maxLength = 140;
        bio.placeholder = 'Salut ! Je suis sur Hylia Plaza :)';
        bio.value = existingBio || '';
        bio.dataset.field = 'bio';
        L.appendChild(bio);
        addSection(C, 'Genre');
        addGenderPicker(C);
        addSection(C, 'Couleur préférée');
        addSwatches(C, 'Couleur', () => mii.favoriteColor, v => { mii.favoriteColor = v; }, FAV);
      }
    },
    {
      id: 'corps', label: 'Corps', build(L, C) {
        addSection(L, 'Silhouette');
        L.appendChild(stepper('Taille (grandeur)', () => mii.height, v => { mii.height = v; }, 0, 127));
        L.appendChild(stepper('Corpulence', () => mii.build, v => { mii.build = v; }, 0, 127));
        addSection(C, 'Couleur préférée');
        addSwatches(C, 'Couleur', () => mii.favoriteColor, v => { mii.favoriteColor = v; }, FAV);
      }
    },
    {
      id: 'visage', label: 'Visage', subs: [
        {
          label: 'Forme', icon: 'visage', build(L, C) {
            addSection(L, 'Forme du visage');
            addGrid(L, 12, () => mii.faceType, v => { mii.faceType = v; }, 'face');
            addSwatches(C, 'Couleur de peau', () => mii.trueSkinColor, v => { mii.skinColor = v; }, SKIN);
          }
        },
        {
          label: 'Détails', icon: 'visage', build(L, C) {
            addSection(L, 'Rides');
            addGrid(L, 12, () => mii.wrinklesType, v => { mii.wrinklesType = v; }, 'wrinkles', true);
            addSection(L, 'Maquillage');
            addGrid(L, 12, () => mii.makeupType, v => { mii.makeupType = v; }, 'makeup', true);
            addSection(C, 'Réglages');
            C.appendChild(el('div', 'mii-hint', 'Les rides et le maquillage suivent la couleur de peau.'));
          }
        }
      ]
    },
    {
      id: 'cheveux', label: 'Cheveux', build(L, C) {
        addSection(L, 'Coiffure');
        addGrid(L, 132, () => mii.hairType, v => { mii.hairType = v; }, 'hair');
        addSwatches(C, 'Couleur', () => mii.trueHairColor, v => { mii.hairColor = v; }, HAIR);
        addSection(C, 'Réglages');
        addToggle(C, 'Miroir', () => mii.flipHair, v => { mii.flipHair = v; });
      }
    },
    {
      id: 'sourcils', label: 'Sourcils', build(L, C) {
        addSection(L, 'Type');
        addGrid(L, 24, () => mii.eyebrowType, v => { mii.eyebrowType = v; }, 'eyebrows');
        addSwatches(C, 'Couleur', () => mii.trueEyebrowColor, v => { mii.eyebrowColor = v; }, HAIR);
        addSection(C, 'Réglages');
        C.appendChild(stepper('Taille', () => mii.eyebrowScale, v => { mii.eyebrowScale = v; }, 0, 8));
        C.appendChild(stepper('Étirement', () => mii.eyebrowVerticalStretch, v => { mii.eyebrowVerticalStretch = v; }, 0, 6));
        C.appendChild(stepper('Rotation', () => mii.eyebrowRotation, v => { mii.eyebrowRotation = v; }, 0, 11));
        C.appendChild(stepper('Écartement', () => mii.eyebrowSpacing, v => { mii.eyebrowSpacing = v; }, 0, 12));
        C.appendChild(stepper('Position', () => mii.eyebrowYPosition, v => { mii.eyebrowYPosition = v; }, 3, 18));
      }
    },
    {
      id: 'yeux', label: 'Yeux', build(L, C) {
        addSection(L, 'Type');
        addGrid(L, 60, () => mii.eyeType, v => { mii.eyeType = v; }, 'eyes');
        addSwatches(C, 'Couleur', () => mii.trueEyeColor, v => { mii.eyeColor = v; }, EYE);
        addSection(C, 'Réglages');
        C.appendChild(stepper('Taille', () => mii.eyeScale, v => { mii.eyeScale = v; }, 0, 7));
        C.appendChild(stepper('Étirement', () => mii.eyeVerticalStretch, v => { mii.eyeVerticalStretch = v; }, 0, 6));
        C.appendChild(stepper('Rotation', () => mii.eyeRotation, v => { mii.eyeRotation = v; }, 0, 7));
        C.appendChild(stepper('Écartement', () => mii.eyeSpacing, v => { mii.eyeSpacing = v; }, 0, 12));
        C.appendChild(stepper('Position', () => mii.eyeYPosition, v => { mii.eyeYPosition = v; }, 0, 18));
      }
    },
    {
      id: 'nez', label: 'Nez', build(L, C) {
        addSection(L, 'Type');
        addGrid(L, 18, () => mii.noseType, v => { mii.noseType = v; }, 'nose');
        addSection(C, 'Réglages');
        C.appendChild(stepper('Taille', () => mii.noseScale, v => { mii.noseScale = v; }, 0, 8));
        C.appendChild(stepper('Position', () => mii.noseYPosition, v => { mii.noseYPosition = v; }, 0, 18));
      }
    },
    {
      id: 'bouche', label: 'Bouche', build(L, C) {
        addSection(L, 'Type');
        addGrid(L, 36, () => mii.mouthType, v => { mii.mouthType = v; }, 'mouth');
        addSwatches(C, 'Couleur', () => mii.trueMouthColor, v => { mii.mouthColor = v; }, MOUTH);
        addSection(C, 'Réglages');
        C.appendChild(stepper('Taille', () => mii.mouthScale, v => { mii.mouthScale = v; }, 0, 8));
        C.appendChild(stepper('Étirement', () => mii.mouthHorizontalStretch, v => { mii.mouthHorizontalStretch = v; }, 0, 6));
        C.appendChild(stepper('Position', () => mii.mouthYPosition, v => { mii.mouthYPosition = v; }, 0, 18));
      }
    },
    {
      id: 'accessoires', label: 'Accessoires', subs: [
        {
          label: 'Lunettes', icon: 'accessoires', build(L, C) {
            addSection(L, 'Lunettes');
            addGrid(L, 9, () => mii.glassesType, v => { mii.glassesType = v; }, 'glasses', true);
            addSwatches(C, 'Couleur', () => mii.trueGlassesColor, v => { mii.glassesColor = v; }, GLASS);
            addSection(C, 'Réglages');
            C.appendChild(stepper('Taille', () => mii.glassesScale, v => { mii.glassesScale = v; }, 0, 7));
            C.appendChild(stepper('Position', () => mii.glassesYPosition, v => { mii.glassesYPosition = v; }, 0, 20));
          }
        },
        {
          label: 'Poils', icon: 'accessoires', build(L, C) {
            addSection(L, 'Moustache');
            addGrid(L, 6, () => mii.mustacheType, v => { mii.mustacheType = v; }, 'mustache', true);
            addSection(L, 'Barbe');
            addGrid(L, 6, () => mii.beardType, v => { mii.beardType = v; }, 'goatee', true);
            addSwatches(C, 'Couleur', () => mii.trueFacialHairColor, v => { mii.facialHairColor = v; }, HAIR);
            addSection(C, 'Réglages');
            C.appendChild(stepper('Taille moustache', () => mii.mustacheScale, v => { mii.mustacheScale = v; }, 0, 8));
            C.appendChild(stepper('Position moustache', () => mii.mustacheYPosition, v => { mii.mustacheYPosition = v; }, 0, 16));
          }
        },
        {
          label: 'Grain', icon: 'accessoires', build(L, C) {
            addSection(L, 'Grain de beauté');
            addToggle(L, 'Activer', () => mii.moleEnabled, v => { mii.moleEnabled = v; });
            addSection(C, 'Réglages');
            C.appendChild(stepper('Taille', () => mii.moleScale, v => { mii.moleScale = v; }, 0, 8));
            C.appendChild(stepper('Position X', () => mii.moleXPosition, v => { mii.moleXPosition = v; }, 0, 16));
            C.appendChild(stepper('Position Y', () => mii.moleYPosition, v => { mii.moleYPosition = v; }, 0, 30));
          }
        }
      ]
    }
  ];

  let activeTab = TABS[0].id;
  let activeSub = 0;
  const tabButtons = new Map();

  function renderSubtabs(tab) {
    subtabs.innerHTML = '';
    if (!tab.subs || tab.subs.length < 2) { subtabs.style.display = 'none'; return; }
    subtabs.style.display = 'flex';
    tab.subs.forEach((sub, i) => {
      const b = el('button', 'mii-subtab');
      b.type = 'button';
      b.appendChild(tabIcon(sub.icon || tab.id));
      b.appendChild(el('span', 'mii-subtab-label', sub.label));
      if (i === activeSub) b.classList.add('active');
      b.onclick = () => { activeSub = i; renderPanel(); };
      subtabs.appendChild(b);
    });
  }

  function renderPanel() {
    listArea.innerHTML = '';
    colorPanel.innerHTML = '';
    gridInvalidators = [];
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab) return;
    renderSubtabs(tab);
    if (tab.subs && tab.subs.length) {
      const sub = tab.subs[activeSub] || tab.subs[0];
      sub.build(listArea, colorPanel);
    } else {
      tab.build(listArea, colorPanel);
    }
    tabButtons.forEach((btn, id) => btn.classList.toggle('active', id === activeTab));
  }

  TABS.forEach(tab => {
    const b = el('button', 'mii-cat-tab');
    b.type = 'button';
    b.dataset.cat = tab.id;
    b.title = tab.label;
    b.setAttribute('aria-label', tab.label);
    b.appendChild(tabIcon(tab.id));
    b.onclick = () => { activeTab = tab.id; activeSub = 0; renderPanel(); };
    tabButtons.set(tab.id, b);
    catWrap.appendChild(b);
  });
  topbar.appendChild(catWrap);

  /* ------------------------------- Actions --------------------------------- */
  rotLeftBtn.onclick = () => rotateBy(-30);
  rotRightBtn.onclick = () => rotateBy(30);
  bodyBtn.onclick = () => {
    bodyView = !bodyView;
    bodyBtn.classList.toggle('active', bodyView);
    if (viewer3DFailed) updatePreview(); else applyCamera();
  };

  function randomize() {
    const r = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
    mii.gender = r(0, 1);
    mii.skinColor = r(0, 5);
    mii.faceType = r(0, 11);
    mii.wrinklesType = 0;
    mii.makeupType = 0;
    mii.hairType = r(0, 131);
    mii.hairColor = r(0, 7);
    mii.flipHair = Math.random() > 0.5;
    mii.eyeType = r(0, 59);
    mii.eyeColor = r(0, 5);
    mii.eyeScale = r(2, 6);
    mii.eyeSpacing = r(3, 9);
    mii.eyeYPosition = r(8, 15);
    mii.eyebrowType = r(0, 23);
    mii.eyebrowColor = r(1, 7);
    mii.noseType = r(0, 17);
    mii.mouthType = r(0, 35);
    mii.mouthColor = r(0, 4);
    mii.mustacheType = 0;
    mii.beardType = 0;
    mii.glassesType = 0;
    mii.moleEnabled = false;
    mii.height = r(40, 90);
    mii.build = r(40, 90);
    mii.favoriteColor = r(0, 11);
    renderPanel();
    updatePreview();
  }
  randomBtn.onclick = randomize;

  bodyView = true;
  quitBtn.onclick = () => {
    if (window.AppRegistry && window.AppRegistry.miiMaker && window.AppRegistry.miiMaker.close) {
      window.AppRegistry.miiMaker.close();
    }
  };

  function toast(msg, ok = true) {
    const t = el('div', null, msg);
    t.style.cssText = `position:absolute;bottom:24px;left:50%;transform:translateX(-50%);padding:14px 26px;
      border-radius:30px;font-weight:700;z-index:20;color:#fff;pointer-events:none;
      background:${ok ? 'rgba(0,180,80,.9)' : 'rgba(200,50,60,.92)'};box-shadow:0 10px 30px rgba(0,0,0,.4);`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  saveBtn.onclick = async () => {
    if (!user) { toast('Connecte-toi pour sauvegarder ton Mii.', false); return; }
    if (!window.Firestore) { toast('Firestore indisponible.', false); return; }
    saveBtn.disabled = true; saveBtn.textContent = 'Enregistrement…';
    try {
      ensureFFLValidMii(mii); // birthPlatform + nom non vide (requis par FFL)
      const b64 = mii.encodeFFSD().toString('base64');
      const bioInput = listArea.querySelector('textarea[data-field="bio"]');
      const bio = bioInput ? bioInput.value.slice(0, 140) : existingBio;
      if (bioInput) existingBio = bio;
      await window.Firestore.setDoc(
        window.Firestore.doc(window.FirebaseDB, 'avatars', user.uid),
        {
          username: (window.Auth && window.Auth.currentUsername) || 'Mii',
          visual_base64: b64,
          bio: bio,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      if (window.Auth && window.Auth.loadUserMii) window.Auth.loadUserMii();
      toast('Mii sauvegardé !');
    } catch (e) {
      console.error('[MiiMaker] save failed:', e);
      toast('Échec de la sauvegarde.', false);
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = 'Sauvegarder mon Mii';
    }
  };

  /* --------------------------------- Boot ---------------------------------- */
  preloadBase().catch(() => {});
  renderPanel();
  updatePreview();
}
