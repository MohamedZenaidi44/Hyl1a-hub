/**
 * mii_compositor_v10.js — Compose la texture du visage (yeux, sourcils, bouche, nez) sur un
 * canvas, à appliquer sur le mesh "face_canvas".
 *
 * v10 : remplace le calage "à l'œil" de v9 par les VRAIES formules Nintendo décompilées
 * depuis aboood40091/ffl (Wii U Face Library, v1.3.10), fichiers :
 *   - src/FFLiRawMask.cpp          → CalcRawMask() : positions/échelles/rotations réelles
 *   - src/detail/FFLiCharInfo.cpp  → FFLiiGetEyeRotateOffset / FFLiiGetEyebrowRotateOffset
 *                                     + FFLiiGetAdjustedEyeH / FFLiiGetAdjustedMouthH
 *
 * ⚠️ IMPORTANT — ce qui EST et n'EST PAS couvert par ces vraies constantes :
 *   - Yeux, sourcils, bouche : COUVERTS. Ce sont les 3 pièces que la "RawMask" 2D de
 *     Nintendo positionne réellement sur une texture plate (exactement notre cas ici).
 *   - Nez : PAS couvert par CalcRawMask. Dans le vrai FFL, le nez est un MESH 3D séparé
 *     positionné dans l'espace du modèle (FFLiCharModelCreator.cpp, unités arbitraires liées
 *     au maillage de tête), pas dans l'espace 2D à 64 unités de la RawMask. Il n'existe donc
 *     pas de conversion directe et fiable vers notre canvas 2D — la position du nez reste une
 *     estimation calibrée à l'œil (comme avant), clairement isolée plus bas dans le code.
 *   - Moustache / grain de beauté : les vraies constantes existent (ajoutées ci-dessous) mais
 *     à VALIDER visuellement — Nintendo dessine la moustache en 2 moitiés superposées au même
 *     centre (contrairement aux yeux/sourcils qui sont écartés), et vos SVG mustache-*.svg
 *     n'ont pas été inspectés pour confirmer s'ils sont conçus comme des demi-moustaches ou
 *     des moustaches complètes. À tester avec un mustache_type connu.
 */

const CANVAS_SIZE = 512;

// baseScale : la RawMask Nintendo travaille dans un espace de base de 64 unités, mis à
// l'échelle vers la résolution réelle de la texture (ici notre CANVAS_SIZE).
// f32 baseScale = resolution * (1.f / 64.f);  <-- FFLiRawMask.cpp ligne 193
const BASE_SCALE = CANVAS_SIZE / 64;

// ---- Constantes de calibrage RÉELLES (FFLiRawMask.cpp, CalcRawMask, lignes 179-191) ----
const POS_X_ADD = 3.5323312;
const POS_Y_ADD = 4.629278;

const SPACING_MUL = 0.88961464;
const POS_X_MUL   = 1.7792293;
const POS_Y_MUL   = 1.0760943;

const POS_Y_ADD_EYE      = POS_Y_ADD + 13.822246;
const POS_Y_ADD_EYEBROW  = POS_Y_ADD + 11.920528;
const POS_Y_ADD_MOUTH    = POS_Y_ADD + 24.629572;
const POS_Y_ADD_MUSTACHE = POS_Y_ADD + 27.134275;
const POS_X_ADD_MOLE     = POS_X_ADD + 14.233834;
const POS_Y_ADD_MOLE     = POS_Y_ADD + 11.178394 + 2 * POS_Y_MUL;

// ---- Rotation : PAS de table d'offset ici. ----
// La vraie table FFLiiGetEyeRotateOffset/FFLiiGetEyebrowRotateOffset (FFLiCharInfo.cpp) sert à
// compenser une inclinaison CUITE DANS les textures brutes internes de Nintendo (chaque type
// d'œil/sourcil de leur atlas est dessiné avec un angle de base différent — la table le corrige
// pour que le résultat final soit droit). Vos SVG (cfl_res/svg/) sont un tout autre jeu d'assets,
// déjà dessinés bien droits, sans cette inclinaison cuite dedans. Appliquer la table Nintendo
// telle quelle tourne donc le sourcil/œil de ~270-330° pour rien → c'est exactement le triangle
// bizarre que vous avez vu.
// On applique uniquement la rotation BRUTE choisie par l'utilisateur (eye_rotation / eyebrow_
// rotation), sans l'offset par type. Zéro degré de rotation reste "SVG tel quel, non tourné".
function rawRotateDegrees(rotateField) {
  return ((rotateField % 32) + 32) % 32 * (360 / 32);
}

// f32 FFLiiGetAdjustedMouthH(f32 height, s32 type) — hauteur mini pour certains types de bouche
function getAdjustedMouthH(height, type) {
  const TYPES_WITH_MIN = [3, 15, 19, 20, 21, 23, 25];
  if (TYPES_WITH_MIN.includes(type) && height < 12) return 12;
  return height;
}

// f32 FFLiiGetAdjustedEyeH(f32 height, s32 type) — idem pour certains types d'yeux
function getAdjustedEyeH(height, type) {
  if ((type === 14 || type === 26) && height < 12) return 12;
  return height;
}

// ---- Palettes OFFICIELLES Nintendo (inchangées) ----
const SKIN_COLORS = ['#FFD3AD', '#FEB66B', '#DE7942', '#FFAA8C', '#AD5129', '#632C18', '#ffbea5', '#ffc58f', '#8c3c23', '#3c2d23'];
const HAIR_COLORS = ['#000000', '#402010', '#5C180A', '#7C3A14', '#787880', '#4E3E11', '#875917', '#D0A049'];
const EYE_COLORS = ['#000000', '#717372', '#663C2C', '#686537', '#4B58A8', '#387059'];
const MOUTH_COLORS = ['#D04401', '#F30100', '#FD393A', '#F58862', '#1F1D1D'];
const GLASSES_COLORS = ['#000000', '#5d391a', '#a01612', '#2e3969', '#a4601e', '#766f67'];

const PLACEHOLDER = {
  eyeIris: '#0010BF',
  eyebrow: '#E30000',
  mouthMain: '#0055FF',
  mouthHighlight: '#FF5F5F',
  // Même #FF5F5F utilisé dans les nose-*.svg (contour/ombre du nez) — à ne pas confondre avec
  // le highlight de bouche ci-dessus, ce sont deux fichiers différents donc pas de conflit.
  noseLine: '#FF5F5F',
};

// Couleur de contour du nez : une teinte plus foncée que la peau, pas de "vraie" couleur
// Nintendo connue pour ça ici (le nez officiel est un mesh 3D ombré, pas un simple trait 2D) —
// une teinte neutre gris-brun discrète évite au moins le rouge vif qui saute aux yeux.
// Décalage horizontal du nez, en pixels (positif = vers la droite, négatif = vers la gauche).
// Pas une vraie donnée Mii (chez Nintendo le nez est toujours centré) — purement pour ajuster
// visuellement si le nez ne tombe pas pile au centre sur votre rendu. Modifiez cette valeur,
// sauvegardez, rechargez la page.
const NOSE_OFFSET_X = -8;


// Multiplicateur de taille du nez : 1 = taille normale (calculée depuis nose_scale du Mii),
// 1.5 = 50% plus grand, 0.7 = 30% plus petit, etc. Modifiez, sauvegardez, rechargez.
const NOSE_SIZE_MULTIPLIER = 1.5;

const NOSE_LINE_COLOR = '#070605';

async function loadSvgText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`SVG introuvable: ${path}`);
  return res.text();
}

function recolorSvg(svgText, replacements) {
  let out = svgText;
  for (const [from, to] of replacements) out = out.split(from).join(to);
  return out;
}

function svgToImage(svgText) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/**
 * Dessine une pièce (déjà recolorée) deux fois, mirroir autour du centre, avec rotation.
 * @param {number} x       - position ABSOLUE en pixels du côté "gauche" (déjà calculée avec BASE_SCALE)
 * @param {number} xRight   - position ABSOLUE en pixels du côté "droit"
 * @param {number} y        - position Y absolue en pixels (identique des 2 côtés)
 * @param {number} w,h      - largeur/hauteur en pixels
 * @param {number} rotLeftDeg  - rotation du côté gauche, en degrés
 * @param {number} rotRightDeg - rotation du côté droit, en degrés (Nintendo: 360 - rotLeft)
 */
function drawMirroredReal(ctx, img, x, xRight, y, w, h, rotLeftDeg, rotRightDeg) {
  // Côté gauche
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotLeftDeg * Math.PI / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  // Côté droit (image retournée horizontalement, comme en v9, + sa propre rotation)
  ctx.save();
  ctx.translate(xRight, y);
  ctx.scale(-1, 1);
  ctx.rotate(-rotRightDeg * Math.PI / 180); // scale(-1,1) inverse le sens de rotation, on compense
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/**
 * @param {object} mii - objet décodé par mii_parser.js (parseMiiData) — utilise directement
 *                       les noms de champs FFL : eye_type, eye_scale, eye_color, eye_height,
 *                       eye_distance, eye_rotation, eyebrow_* idem, mouth_*, nose_* (approx).
 * @param {string} svgBasePath - chemin vers cfl_res/svg/
 * @returns {Promise<HTMLCanvasElement>}
 */
async function composeFaceCanvas(mii, svgBasePath) {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const CENTER = 32 * BASE_SCALE; // = CANVAS_SIZE / 2, exactement comme dans FFLiRawMask.cpp

  // ================= SOURCILS =================
  try {
    const raw = await loadSvgText(`${svgBasePath}/eyebrows-${String(mii.eyebrow_type + 1).padStart(2, '0')}.svg`);
    const browColor = HAIR_COLORS[mii.eyebrow_color % HAIR_COLORS.length];
    const img = await svgToImage(recolorSvg(raw, [[PLACEHOLDER.eyebrow, browColor]]));

    const eyebrowSpacingX = mii.eyebrow_distance * SPACING_MUL;
    const eyebrowBaseScale = 0.4 * mii.eyebrow_scale + 1.0;
    // eyebrowBaseScaleY = 0.12*3+0.64 = 1.0 (scaleY figé à 3 dans ce format de données)
    const eyebrowScaleX = 5.0625 * eyebrowBaseScale;
    const eyebrowScaleY = 4.5 * eyebrowBaseScale * 1.0;
    const eyebrowPosY = mii.eyebrow_height * POS_Y_MUL + POS_Y_ADD_EYEBROW;

    // Rotation brute uniquement (voir avertissement plus haut) — si vos sourcils vous semblent
    // légèrement tournés au neutre, mettez rawRotateDegrees(0) en dur pour désactiver complètement.
    const eyebrowRotate = rawRotateDegrees(mii.eyebrow_rotation);

    const xLeft = (32 - eyebrowSpacingX) * BASE_SCALE;
    const xRight = (eyebrowSpacingX + 32) * BASE_SCALE;
    const y = eyebrowPosY * BASE_SCALE;
    const w = eyebrowScaleX * BASE_SCALE;
    const h = eyebrowScaleY * BASE_SCALE;

    drawMirroredReal(ctx, img, xLeft, xRight, y, w, h, eyebrowRotate, 360 - eyebrowRotate);
  } catch (e) { console.warn('eyebrow SVG manquant', mii.eyebrow_type, e); }

  // ================= YEUX =================
  try {
    const raw = await loadSvgText(`${svgBasePath}/eyes-${String(mii.eye_type + 1).padStart(2, '0')}.svg`);
    const eyeColor = EYE_COLORS[mii.eye_color % EYE_COLORS.length];
    const img = await svgToImage(recolorSvg(raw, [[PLACEHOLDER.eyeIris, eyeColor]]));

    const eyeSpacingX = mii.eye_distance * SPACING_MUL;
    const eyeBaseScale = 0.4 * mii.eye_scale + 1.0;
    // eyeBaseScaleY = 0.12*3+0.64 = 1.0 (scaleY figé à 3 dans ce format de données)
    const eyeScaleX = 5.34375 * eyeBaseScale;
    const eyeScaleY = 4.5 * eyeBaseScale * 1.0;
    const eyePosY = mii.eye_height * POS_Y_MUL + POS_Y_ADD_EYE;

    const eyeRotate = rawRotateDegrees(mii.eye_rotation);

    const xLeft = (32 - eyeSpacingX) * BASE_SCALE;
    const xRight = (eyeSpacingX + 32) * BASE_SCALE;
    const y = eyePosY * BASE_SCALE;
    const w = eyeScaleX * BASE_SCALE;
    // FFLiiGetAdjustedEyeH s'applique indépendamment à chaque œil (leftEyeIndex/rightEyeIndex
    // dans le vrai code — ici on utilise le même eye_type des deux côtés, cas standard)
    const h = getAdjustedEyeH(eyeScaleY * BASE_SCALE, mii.eye_type);

    drawMirroredReal(ctx, img, xLeft, xRight, y, w, h, eyeRotate, 360 - eyeRotate);
  } catch (e) { console.warn('eye SVG manquant', mii.eye_type, e); }

  // ================= BOUCHE =================
  try {
    const raw = await loadSvgText(`${svgBasePath}/mouth-${String(mii.mouth_type + 1).padStart(2, '0')}.svg`);
    const mouthColor = MOUTH_COLORS[mii.mouth_color % MOUTH_COLORS.length];
    const img = await svgToImage(recolorSvg(raw, [
      [PLACEHOLDER.mouthMain, mouthColor],
      [PLACEHOLDER.mouthHighlight, mouthColor],
    ]));

    const mouthBaseScale = 0.4 * mii.mouth_scale + 1.0;
    // idem : mouthScaleY figé (pas de champ mouth_scale_y dans ce format)
    const mouthScaleX = 6.1875 * mouthBaseScale;
    const mouthScaleY = 4.5 * mouthBaseScale * 1.0;
    const mouthPosY = mii.mouth_height * POS_Y_MUL + POS_Y_ADD_MOUTH;

    const x = 32 * BASE_SCALE; // centré, pas de spacing pour la bouche
    const y = mouthPosY * BASE_SCALE;
    const w = mouthScaleX * BASE_SCALE;
    const h = getAdjustedMouthH(mouthScaleY * BASE_SCALE, mii.mouth_type);

    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  } catch (e) { console.warn('mouth SVG manquant', mii.mouth_type, e); }

  // ================= NEZ (approximation — voir avertissement en haut du fichier) =================
  try {
    const raw = await loadSvgText(`${svgBasePath}/nose-${String(mii.nose_type + 1).padStart(2, '0')}.svg`);
    const img = await svgToImage(recolorSvg(raw, [[PLACEHOLDER.noseLine, NOSE_LINE_COLOR]]));
    // Pas de vraie formule 2D disponible ici (le nez Nintendo est un mesh 3D à part) :
    // on garde le calage empirique existant, à ajuster visuellement si besoin.
    const noseY = CANVAS_SIZE * (0.55 + (7 - mii.nose_height) * 0.012);
    const noseW = CANVAS_SIZE * (0.10 + mii.nose_scale * 0.008) * NOSE_SIZE_MULTIPLIER;
    const noseH = noseW;
    ctx.drawImage(img, CENTER + NOSE_OFFSET_X - noseW / 2, noseY - noseH / 2, noseW, noseH);
  } catch (e) { console.warn('nose SVG manquant', mii.nose_type, e); }

  return canvas;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { composeFaceCanvas, SKIN_COLORS, HAIR_COLORS, EYE_COLORS, MOUTH_COLORS, GLASSES_COLORS };
}
if (typeof window !== 'undefined') {
  window.composeFaceCanvas = composeFaceCanvas;
  window.MII_SKIN_COLORS = SKIN_COLORS;
  window.MII_HAIR_COLORS = HAIR_COLORS;
  window.MII_EYE_COLORS = EYE_COLORS;
}
