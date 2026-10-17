/**
 * miiParts.js — Vignettes 2D du Mii Maker, à partir du jeu d'SVG
 * `assets/cfl_res/svg/` (52×52, tous dessinés dans le même repère tête).
 * C'est le jeu COMPLET officiel (12/132/60/24/18/36/6/6/20) ; chaque trait
 * est colorié avec des teintes-jetons, recoloriées selon le Mii courant pour
 * que les vignettes reflètent la couleur choisie (yeux, cheveux…).
 *
 * Deux usages :
 *   - buildPartSvg(mii, group, type) → vignette ISOLÉE d'UN trait (tête seule,
 *     bouche seule, coiffure seule…), recadrée sur le dessin → c'est ce
 *     qu'affichent les grilles de cases (façon vrai Mii Maker).
 *   - buildFaceSvg(mii, override)    → Mii complet (aperçu composité).
 *
 * Nommage des fichiers (vérifié sur le jeu d'assets) :
 *   face-01..12 (type+1) | hair-0..131 (type) | eyes-01..60 | eyebrows-01..24
 *   nose-01..18 | mouth-01..36 | makeup-01..12 | wrinkles-01..12
 *   mustache-1..6 | goatee-1..6 (type+1) | glasses-0..19 (type)
 * Pour makeup/wrinkles/mustache/goatee/glasses, type 0 = « aucune ».
 */

const SVG_BASE = 'apps/mii_maker/assets/cfl_res/svg';
const SVGNS = 'http://www.w3.org/2000/svg';

/* ---------------------- Palettes (partagées avec les swatches) ------------- */
export const SKIN = ['#f6d7b4', '#eec39a', '#dba777', '#b9824e', '#8a5a30', '#5c3a1e'];
export const HAIR = ['#2b2b2b', '#4a2f1a', '#7a4b22', '#b07a3a', '#c98a4b', '#e0c078', '#9a9a9a', '#f2e6c8'];
export const EYE = ['#2b2b2b', '#4a4a4a', '#6b4a2a', '#3a5a8a', '#2f7a4a', '#6a3a7a'];
export const MOUTH = ['#c0392b', '#e08a6a', '#d94f6a', '#8a2a2a', '#f0a0a0'];
export const GLASSES = ['#2b2b2b', '#6b6b6b', '#8a5a2a', '#3a5a8a', '#c0392b', '#d9c07a'];
export const FAV = ['#d94f4f', '#e08a3a', '#e0c23a', '#5aa84a', '#3a8ad9', '#3ad9c2', '#3a5ad9', '#8a3ad9', '#d93ab0', '#8a5a3a', '#f0f0f0', '#2b2b2b'];

const MAKEUP_COLOR = '#e07f92';

/* ------------------------------- Cache SVG -------------------------------- */
const svgCache = new Map();
function getSvgText(name) {
  if (!svgCache.has(name)) {
    const p = fetch(`${SVG_BASE}/${name}`)
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');
    svgCache.set(name, p);
  }
  return svgCache.get(name);
}

/* ---------------------------- Nommage fichiers ---------------------------- */
const pad2 = (n) => String(n).padStart(2, '0');
export function partFileName(group, type) {
  switch (group) {
    case 'face': return `face-${pad2(type + 1)}.svg`;
    case 'hair': return `hair-${type}.svg`;
    case 'eyes': return `eyes-${pad2(type + 1)}.svg`;
    case 'eyebrows': return `eyebrows-${pad2(type + 1)}.svg`;
    case 'nose': return `nose-${pad2(type + 1)}.svg`;
    case 'mouth': return `mouth-${pad2(type + 1)}.svg`;
    case 'makeup': return `makeup-${pad2(type + 1)}.svg`;
    case 'wrinkles': return `wrinkles-${pad2(type + 1)}.svg`;
    case 'mustache': return `mustache-${type + 1}.svg`;
    case 'goatee': return `goatee-${type + 1}.svg`;
    case 'glasses': return `glasses-${Math.min(type, 19)}.svg`;
    default: return null;
  }
}

/* ------------------------------- Couleurs --------------------------------- */
function hexToRgb(hex) {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function shade(hex, f) {
  const { r, g, b } = hexToRgb(hex);
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const h = (v) => cl(v).toString(16).padStart(2, '0');
  return `#${h(r * f)}${h(g * f)}${h(b * f)}`;
}
function replaceAll(s, from, to) { return s.split(from).join(to); }

const pick = (arr, i) => arr[(((i | 0) % arr.length) + arr.length) % arr.length];

function partColors(s) {
  return {
    skin: pick(SKIN, s.skinColor),
    hair: pick(HAIR, s.hairColor),
    eye: pick(EYE, s.eyeColor),
    mouth: pick(MOUTH, s.mouthColor),
    glasses: pick(GLASSES, s.glassesColor),
    eyebrow: pick(HAIR, s.eyebrowColor),
    facial: pick(HAIR, s.facialHairColor),
    makeup: MAKEUP_COLOR,
  };
}

/** Recolore le corps d'un SVG selon le groupe (remplace les teintes-jetons).
 *  Les silhouettes de tête (fill blanc + contour gris) restent neutres. */
// Rôles (décodés en comparant au jeu MiiWiki) : #FF5F5F = contour/trait (noir),
// #0055FF = dents (blanc), #00FF00 = artefact invisible ; la famille brune
// (ci-dessous) = SEULE partie colorée par la couleur de bouche (lèvres).
const MOUTH_BROWN = ['#712A04', '#8B3610', '#A24119', '#B24821', '#BB4D25', '#BE4E26'];
function recolorMouth(body, c) {
  let b = body;
  MOUTH_BROWN.forEach((tok, i) => { b = replaceAll(b, tok, shade(c.mouth, 0.55 + i * 0.11)); });
  b = replaceAll(b, '#FF5F5F', ICON_DARK); // contour / trait sombre
  b = replaceAll(b, '#0055FF', '#ffffff'); // dents
  b = replaceAll(b, '#00FF00', '#ffffff');
  return b;
}
function recolorPart(group, body, c) {
  switch (group) {
    case 'face':
      return replaceAll(body, '"white"', `"${c.skin}"`);
    case 'hair':
      return replaceAll(
        replaceAll(replaceAll(body, '"white"', `"${c.hair}"`), '#5F5F5F', shade(c.hair, 0.7)),
        '#BFBFBF', shade(c.hair, 1.35)
      );
    case 'eyes':
      return replaceAll(replaceAll(body, '#6C7070', c.eye), '#0010BF', shade(c.eye, 0.45));
    case 'eyebrows':
      return replaceAll(body, '#E30000', c.eyebrow);
    case 'nose':
      return replaceAll(body, '#FF5F5F', ICON_DARK);
    case 'mouth':
      return recolorMouth(body, c);
    case 'glasses':
      return replaceAll(
        replaceAll(replaceAll(body, '#7B0000', c.glasses), '#030303', c.glasses),
        '#F60000', shade(c.glasses, 0.5)
      );
    case 'makeup':
      return replaceAll(
        replaceAll(replaceAll(replaceAll(body,
          '#FFBABA', c.makeup), '#F0B48C', c.makeup), '#C98F6E', c.makeup),
        '#808786', shade(c.makeup, 0.65)
      );
    case 'wrinkles':
      return replaceAll(body, '#996D54', shade(c.skin, 0.72));
    case 'mustache':
    case 'goatee':
      return replaceAll(body, '#1E1E1E', c.facial);
    default:
      return body;
  }
}

function bodyOf(svg) {
  const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  return m ? m[1] : '';
}

/* -------------------------- Couleur des icônes ---------------------------- */
// Teinte sombre neutre : traits faciaux sans couleur propre (nez, sourires sans
// lèvres, icône « aucune »).
const ICON_DARK = '#2b2b2b';

/* ------------------------------- Snapshot --------------------------------- */
/** Extrait les champs utiles d'une instance Mii, puis applique l'override. */
export function snapshot(mii, override) {
  const s = {
    faceType: mii.faceType,
    hairType: mii.hairType,
    eyeType: mii.eyeType,
    eyebrowType: mii.eyebrowType,
    noseType: mii.noseType,
    mouthType: mii.mouthType,
    mustacheType: mii.mustacheType,
    beardType: mii.beardType,
    glassesType: mii.glassesType,
    makeupType: mii.makeupType,
    wrinklesType: mii.wrinklesType,
    flipHair: !!mii.flipHair,
    skinColor: mii.skinColor,
    hairColor: mii.hairColor,
    eyeColor: mii.eyeColor,
    mouthColor: mii.mouthColor,
    glassesColor: mii.glassesColor,
    eyebrowColor: mii.eyebrowColor,
    facialHairColor: mii.facialHairColor,
  };
  return Object.assign(s, override || {});
}

/* --------------------------- Mesure (recadrage) --------------------------- */
// Mesure la bounding-box d'un fragment SVG dans le repère tête (0..52) pour
// recadrer la vignette sur le dessin (tête seule = tête, bouche seule = bouche…).
let measureHost = null;
function measureBBox(markup) {
  if (!measureHost) {
    measureHost = document.createElementNS(SVGNS, 'svg');
    measureHost.setAttribute('viewBox', '0 0 52 52');
    measureHost.style.cssText = 'position:absolute;left:-99999px;top:-99999px;width:52px;height:52px;';
    document.body.appendChild(measureHost);
  }
  measureHost.innerHTML = markup;
  let bb = { x: 0, y: 0, width: 52, height: 52 };
  try {
    const b = measureHost.getBBox();
    if (b && b.width > 0 && b.height > 0) bb = { x: b.x, y: b.y, width: b.width, height: b.height };
  } catch (e) { /* SVG sans géométrie : on garde le cadre complet */ }
  measureHost.innerHTML = '';
  return bb;
}

function wrap(size, viewBox, inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" `
    + `width="${size}" height="${size}" `
    + `viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" fill="none">${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* --------------------------- Vignette d'un trait -------------------------- */
/**
 * Vignette ISOLÉE d'un seul trait du Mii (recadrée sur le dessin).
 * @param {object} mii
 * @param {string} group  face|hair|eyes|eyebrows|nose|mouth|makeup|wrinkles|mustache|goatee|glasses
 * @param {number} type   index du trait
 * @param {number} [size]
 * @returns {Promise<string>} data-URL SVG
 */
export async function buildPartSvg(mii, group, type, size = 96) {
  const file = partFileName(group, type);
  if (!file) return '';
  const text = await getSvgText(file);
  if (!text) return '';
  // Trait colorié selon les couleurs COURANTES du Mii (les pupilles suivent la
  // couleur des yeux, la bouche suit la couleur de bouche, etc.).
  let body = recolorPart(group, bodyOf(text), partColors(snapshot(mii)));
  if (!body) return '';
  if (group === 'hair' && mii.flipHair) body = `<g transform="translate(52 0) scale(-1 1)">${body}</g>`;
  const inner = `<g>${body}</g>`;
  const bb = measureBBox(inner);
  const pad = Math.max(bb.width, bb.height) * 0.12 + 1;
  const vb = `${(bb.x - pad).toFixed(2)} ${(bb.y - pad).toFixed(2)} `
    + `${(bb.width + pad * 2).toFixed(2)} ${(bb.height + pad * 2).toFixed(2)}`;
  return wrap(size, vb, inner);
}

/** Vignette « aucune » (cercle pointillé barré) — pour makeup/rides/barbe/lunettes. */
export function nonePartSvg(size = 96) {
  const inner = `<circle cx="26" cy="26" r="18" fill="none" stroke="${ICON_DARK}" stroke-width="2" stroke-dasharray="4 4"/>`
    + `<line x1="15" y1="37" x2="37" y2="15" stroke="${ICON_DARK}" stroke-width="2.4" stroke-linecap="round"/>`;
  return wrap(size, '0 0 52 52', inner);
}

/* --------------------------- Composition complète ------------------------- */
/**
 * Mii complet (tous les traits) — utilisé pour un aperçu composité 2D.
 * @param {object} mii
 * @param {object} [override] champs Mii à remplacer
 * @param {number} [size]
 * @returns {Promise<string>} data-URL SVG
 */
export async function buildFaceSvg(mii, override, size = 96) {
  const s = snapshot(mii, override);
  const colors = partColors(s);
  const optional = (type) => (type && type > 0 ? type : null);
  const layers = [];
  const add = async (group, type) => {
    if (type == null) return;
    const file = partFileName(group, type);
    if (!file) return;
    const text = await getSvgText(file);
    if (!text) return;
    const body = recolorPart(group, bodyOf(text), colors);
    if (body) layers.push(`<g>${body}</g>`);
  };
  await add('face', s.faceType);
  await add('wrinkles', optional(s.wrinklesType));
  await add('makeup', optional(s.makeupType));
  await add('mustache', optional(s.mustacheType));
  await add('goatee', optional(s.beardType));
  await add('nose', s.noseType);
  await add('mouth', s.mouthType);
  await add('eyes', s.eyeType);
  await add('eyebrows', s.eyebrowType);
  await add('glasses', optional(s.glassesType));
  const hairBody = await getSvgText(partFileName('hair', s.hairType) || '');
  if (hairBody) {
    let hb = recolorPart('hair', bodyOf(hairBody), colors);
    if (s.flipHair) hb = `<g transform="translate(52 0) scale(-1 1)">${hb}</g>`;
    layers.push(`<g>${hb}</g>`);
  }
  return wrap(size, '0 0 52 52', layers.join(''));
}

/* --------------------------------- Preload -------------------------------- */
/** Précharge en parallèle tous les fichiers SVG d'un groupe. */
export function preloadGroup(group, count) {
  const jobs = [];
  for (let i = 0; i < count; i++) {
    const f = partFileName(group, i);
    if (f) jobs.push(getSvgText(f));
  }
  return Promise.all(jobs);
}

/** Précharge les pièces de base (toutes sauf les 132 coiffures). */
export function preloadBase() {
  const groups = [
    ['face', 12], ['eyes', 60], ['eyebrows', 24], ['nose', 18],
    ['mouth', 36], ['glasses', 20], ['makeup', 12], ['wrinkles', 12],
    ['mustache', 6], ['goatee', 6],
  ];
  return Promise.all(groups.map(([g, n]) => preloadGroup(g, n)));
}

if (typeof window !== 'undefined') {
  window.MiiParts = { buildPartSvg, buildFaceSvg, nonePartSvg, preloadGroup, preloadBase, SKIN, HAIR, EYE, MOUTH, GLASSES, FAV };
}
