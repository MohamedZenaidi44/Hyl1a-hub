/**
 * population.js — Génération de Mii **aléatoires** pour peupler la Plaza.
 *
 * Réutilise le codec FFSD du Mii Maker (`mii.js` + `miiFFLData.js`) : on part
 * du Mii par défaut, on randomise les traits (mêmes bornes que le bouton
 * « ↻ » du Mii Maker), on valide le Mii pour FFL et on l'encode en base64
 * (même format que `avatars/{uid}.visual_base64`).
 *
 * Les Mii générés sont **déterministes** (PRNG mulberry32) : même graine →
 * même Mii, ce qui permet de les recréer à l'identique à chaque visite.
 */

import Mii from '../../mii_maker/js/mii.js';
import { ensureFFLValidMii } from '../../mii_maker/js/miiFFLData.js';
import { DEFAULT_MII_B64 } from './storage.js';

/** Prénoms français courts (≤ 10 caractères, limite de `miiName`). */
export const MII_NAMES = [
  'Léa', 'Hugo', 'Chloé', 'Nathan', 'Manon', 'Lucas', 'Zoé', 'Louis',
  'Emma', 'Jules', 'Camille', 'Tom', 'Inès', 'Noah', 'Jade', 'Gabriel',
  'Louise', 'Raphaël', 'Alice', 'Arthur', 'Lina', 'Théo', 'Rose', 'Sacha',
  'Mila', 'Paul', 'Anna', 'Nino', 'Éva', 'Malo', 'Lila', 'Marius',
];

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** PRNG rapide déterministe (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fabrique un Mii aléatoire déterministe.
 * @param {number} seed graine (entier)
 * @param {string} name prénom affiché (≤ 10 caractères)
 * @returns {{name:string, b64:string}}
 */
export function makeRandomMii(seed, name) {
  const rng = mulberry32(seed);
  const r = (min, max) => Math.floor(min + rng() * (max - min + 1));

  const mii = new Mii(b64ToBytes(DEFAULT_MII_B64));
  mii.gender = r(0, 1);
  mii.skinColor = r(0, 5);
  mii.faceType = r(0, 11);
  mii.wrinklesType = 0;
  mii.makeupType = 0;
  mii.hairType = r(0, 131);
  mii.hairColor = r(0, 7);
  mii.flipHair = rng() > 0.5;
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
  mii.miiName = name;

  ensureFFLValidMii(mii); // birthPlatform + nom non vide (requis par FFL)
  return { name, b64: mii.encodeFFSD().toString('base64') };
}

/**
 * Fabrique `count` Mii aléatoires aux prénoms **uniques**.
 * @param {number} count nombre de Mii souhaités (≤ MII_NAMES.length)
 * @param {{seed?:number, exclude?:string[]}} [opts]
 * @returns {Array<{name:string, b64:string}>}
 */
export function makePopulation(count, { seed = 20261016, exclude = [] } = {}) {
  const rng = mulberry32(seed);
  const taken = new Set(exclude.map((n) => (n || '').toLowerCase()));
  const pool = MII_NAMES.filter((n) => !taken.has(n.toLowerCase()));
  // Mélange de Fisher–Yates déterministe.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    out.push(makeRandomMii((seed + 101 * (i + 1)) >>> 0, pool[i]));
  }
  return out;
}
