/**
 * config.js — Constantes de réglage de la Plaza.
 *
 * Regroupe toutes les « valeurs magiques » (couleurs, caméra, tailles) au même
 * endroit pour pouvoir ajuster l'ambiance sans toucher à la logique. Aucune
 * dépendance ici : ce module est importé par world.js / main.js.
 */

/* ── Identité de l'app (intégration au hub) ── */
export const APP_ID = 'miiPlaza';
export const APP_TITLE = 'Plaza';

/* ── Caméra : vue de dessus inclinée façon sélecteur de Mii (Wii) ──
 * `tiltDeg`  : inclinaison par rapport au sol (55–65° => effet « diorama »).
 * `azimuthDeg`: orientation fixe (pas de rotation libre), léger biais négatif
 *               pour voir la place de trois-quart.
 * `distance` : distance caméra ↔ cible ; bornée par min/max (molette).
 */
export const CAMERA = {
  fov: 45,
  near: 0.1,
  far: 200,
  target: { x: 0, y: 1.0, z: 0 },
  tiltDeg: 58,               // inclinaison initiale (vue « diorama »)
  minTiltDeg: 3,             // quasi vue du dessus
  maxTiltDeg: 82,            // presque à l'horizontale (mais jamais sous le sol)
  azimuthDeg: -12,           // orientation initiale
  distance: 27,
  minDistance: 6,            // permet de s'approcher d'un Mii
  maxDistance: 60,
  zoomStep: 1.6,
  panLimit: 26,              // déplacement latéral max de la cible (unités)
  parallaxMax: 0.06
};

/* ── Sol ── */
export const GROUND = {
  radius: 27,
  tilesPerUnit: 0.32 // fréquence du motif de dalles
};

/* ── Cycle jour/nuit (thèmes d'ambiance) ──
 * On démarre sur `day` ; les autres sont prévus pour l'étape « ambiance ».
 */
export const THEMES = {
  day: {
    sky: 0xcfe3f2,
    fog: 0xcfe3f2,
    fogNear: 26,
    fogFar: 78,
    ground: 0xeef2f6,
    tile: 0xe1e9f1,
    tileLine: 0xd2dce6,
    hemiSky: 0xffffff,
    hemiGround: 0x9fb4c4,
    hemiIntensity: 1.0,
    sunColor: 0xfff4e0,
    sunIntensity: 1.35,
    sunPos: { x: 22, y: 34, z: 14 },
    accent: 0x2cc49a,
    skyTop: 0x9ec9ee,           // haut du dôme de ciel
    grass: 0xa7d5a0,            // pelouse autour de la place
    cloud: 0xffffff,
    cloudOpacity: 0.85,
    motif: 0xc9d9e8,            // rosace de dallage
    motifAccent: 0x8fd0a8
  },
  evening: {
    sky: 0xf3d9c0,
    fog: 0xf3d9c0,
    fogNear: 24,
    fogFar: 74,
    ground: 0xf0e6dc,
    tile: 0xe7d8c8,
    tileLine: 0xd8c4ae,
    hemiSky: 0xffd9b0,
    hemiGround: 0x7c6a5a,
    hemiIntensity: 0.9,
    sunColor: 0xffb877,
    sunIntensity: 1.25,
    sunPos: { x: -26, y: 22, z: 10 },
    accent: 0xff9f5a,
    skyTop: 0xa98bbd,
    grass: 0xaebd92,
    cloud: 0xffd9b8,
    cloudOpacity: 0.7,
    motif: 0xe0cdb8,
    motifAccent: 0xf0a878
  },
  night: {
    sky: 0x1b2740,
    fog: 0x1b2740,
    fogNear: 20,
    fogFar: 66,
    ground: 0x2a3852,
    tile: 0x233047,
    tileLine: 0x2f3f5c,
    hemiSky: 0x5a6f96,
    hemiGround: 0x18202f,
    hemiIntensity: 0.75,
    sunColor: 0xbfd3ff,
    sunIntensity: 0.7,
    sunPos: { x: 14, y: 30, z: -18 },
    accent: 0x7ec4ff,
    skyTop: 0x0b1424,
    grass: 0x223049,
    cloud: 0x93a9cf,
    cloudOpacity: 0.25,
    motif: 0x2b3a57,
    motifAccent: 0x5f86c8
  }
};

/* Qualités de rendu (réglage « Qualité : basse / moyenne / haute »). */
export const QUALITY = {
  low:    { pixelRatio: 1,   shadows: false, shadowMap: 512 },
  medium: { pixelRatio: 1.5, shadows: true,  shadowMap: 1024 },
  high:   { pixelRatio: 2,   shadows: true,  shadowMap: 2048 }
};

/* Couleurs partagées du décor low-poly. */
export const DECOR_COLORS = {
  trunk: 0x8a6a4a,
  foliage: 0x5fae74,
  foliageAlt: 0x74c088,
  bush: 0x6bbb82,
  wood: 0xb08b62,
  stone: 0xd8dee4,
  stoneDark: 0xbcc6cf,
  water: 0x8fd0e8,
  waterDeep: 0x63b6d8,
  lampPost: 0x8f9aa6,
  lampGlow: 0xfff2c4,
  flowers: [0xf7b6c9, 0xf9e08a, 0xffffff, 0xcdb7f2, 0xffc9a8],
  stem: 0x7cbf7a,
  stripeA: 0x7cc48b,   // toit du kiosque (rayures pastel)
  stripeB: 0xf7f3e8
};
