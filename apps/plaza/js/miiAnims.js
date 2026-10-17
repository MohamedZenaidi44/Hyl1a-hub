/**
 * miiAnims.js — Charge (une seule fois) les clips d'animation des Mii de la Plaza.
 *
 * Les clips JSON sont « bakés » hors-ligne par `tests/retarget.html` : ils
 * contiennent, pour chaque os du corps FFL, une suite de quaternions locaux
 * échantillonnés (retargetés depuis les animations Nintendo, ou fabriqués comme
 * la marche). Ce module les convertit en `THREE.AnimationClip`.
 *
 *   idle, lookaround, wave, wavetransition, baked  → retargetés
 *   walk, run, talk, cheer, dance, sit, sad         → procéduraux (style Tomodachi)
 */

import * as THREE from 'three';

const CLIP_NAMES = [
  'idle', 'walk', 'lookaround', 'wave', 'wavetransition', 'baked',
  'run', 'talk', 'cheer', 'dance', 'sit', 'sad',
  // Vraies animations Miitomo (retargetées des .pod par tests/pod-bake.html)
  'podwalk', 'podrun', 'podwait', 'podwaitf', 'podnod', 'podwave',
  'podtalk', 'poddance', 'poddance2', 'podjump', 'podsad', 'podsit',
  'podlook', 'podthink',
  'podlaugh', 'podangry', 'podsleep', 'podyawn', 'podpout',
];

function url(name) {
  return new URL(`../assets/anims/${name}.json`, import.meta.url).href;
}

function toClip(name, data) {
  const tracks = [];
  for (const [bone, values] of Object.entries(data.tracks)) {
    tracks.push(new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, data.times, values));
  }
  const clip = new THREE.AnimationClip(name, data.duration, tracks);
  clip.userData = {
    strideNative: data.strideNative || 0,
    liftNative: data.liftNative || 0,
  };
  return clip;
}

let _cache = null;

/** Renvoie { byName, list } — téléchargé une seule fois pour tout l'onglet. */
export function loadMiiAnims() {
  if (_cache) return _cache;
  _cache = (async () => {
    const byName = {};
    await Promise.all(CLIP_NAMES.map(async (name) => {
      try {
        const res = await fetch(url(name));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        byName[name] = toClip(name, await res.json());
      } catch (e) {
        console.warn('[miiAnims] échec du chargement du clip', name, e);
      }
    }));
    return { byName, list: Object.values(byName) };
  })();
  return _cache;
}
