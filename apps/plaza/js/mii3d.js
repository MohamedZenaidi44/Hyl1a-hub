/**
 * mii3d.js — Construit un Mii COMPLET en vraie 3D (tête + corps) pour la Plaza.
 *
 * Réutilise le pipeline du Mii Maker (FFL.js) :
 *   - la TÊTE est reconstruite par FFL depuis les données FFSD (rendu exact) ;
 *   - le CORPS est le glTF Wii U local (`assets/ffl/body/male|female.glb`),
 *     mis à l'échelle selon le Mii, puis la tête y est attachée sur l'os de cou.
 *
 * Différence avec `MiiViewerFFL` : pas de renderer/caméra dédiés — on renvoie un
 * simple `THREE.Group` à insérer dans la **scène partagée** de la Plaza (un seul
 * renderer pour toute la place), déjà normalisé à la hauteur voulue, pieds à y=0.
 *
 * Export : buildMii3D({ b64, renderer, height }) → { group, mixer, model, body, dispose }
 */

import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

import Mii from '../../mii_maker/js/mii.js';
import { CharModel, FFLCharModelDescDefault, PantsColor, pantsColors } from '../../mii_maker/js/ffl/ffl.js';
import FFLShaderMaterial from '../../mii_maker/js/ffl/materials/FFLShaderMaterial.js';
import { miiToFFLStoreData } from '../../mii_maker/js/miiFFLData.js';
import { detectModelDesc } from '../../mii_maker/js/ffl/helpers/ModelScaleDesc.js';
import { prepareBodyForCharModel, attachHeadToBody, disposeModel } from '../../mii_maker/js/ffl/helpers/BodyUtilities.js';
import { ensureFFL, ensureBodyTemplates } from '../../mii_maker/js/miiViewerFFL.js';
import { loadMiiAnims } from './miiAnims.js';

const PANTS_COLOR = pantsColors[PantsColor.GrayNormal].clone().convertLinearToSRGB();

// Hauteur du Mii « natif » (corps échelle 1 + tête FFL) en unités monde, avant
// normalisation. Calibré sur les tailles d'os/maillages de FFL (corps ≈ 12 u,
// tête ≈ 14,3 u posée sur l'os de cou). Sert de référence pour l'échelle cible.
const NATIVE_MII_HEIGHT = 19.7;

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * @param {{ b64:string, renderer:THREE.WebGLRenderer, height?:number }} opts
 * @returns {Promise<{group:THREE.Group, mixer:THREE.AnimationMixer, model:any, body:any, dispose:()=>void}>}
 */
export async function buildMii3D({ b64, renderer, height = 1.9, scale = null }) {
  const ffl = await ensureFFL();
  const templates = await ensureBodyTemplates();

  ffl.setRenderer(renderer);

  // Échelle monde cible. Le corps ET la tête doivent être mis à l'échelle AVANT
  // l'attache : `skeleton.attach` fige l'échelle de la tête (matrixAutoUpdate
  // = false) sur sa valeur locale d'attache, donc un scale appliqué au groupe
  // parent ne l'affecte pas (et réduisait le corps sans la tête → tête géante).
  const S = (scale != null) ? scale : (height / NATIVE_MII_HEIGHT);

  const mii = new Mii(b64ToBytes(b64));
  const data = miiToFFLStoreData(mii);

  // 1) Tête FFL reconstruite depuis les données du Mii.
  const model = new CharModel(ffl, data, FFLCharModelDescDefault, FFLShaderMaterial, renderer);
  model.meshes.traverse((m) => { m.frustumCulled = false; });

  // 2) Corps glTF du bon genre (cloné avec son skinning) + animation de veille.
  const gltf = templates[model.charInfo.gender] || templates[0];
  const bodyModel = SkeletonUtils.clone(gltf.scene);
  bodyModel.traverse((m) => { m.frustumCulled = false; });
  bodyModel.scale.setScalar(S);              // corps mis à l'échelle
  model.meshes.scale.setScalar(S);           // tête : l'attache multiplie par 0,142857 → tête = S × 0,142857

  const mixer = new THREE.AnimationMixer(bodyModel);
  const actions = {};
  {
    const anims = await loadMiiAnims().catch(() => null);
    const clips = (anims && anims.list) ? anims.list : (gltf.animations || []);
    for (const clip of clips) {
      const action = mixer.clipAction(clip);
      actions[clip.name] = action;
    }
    // Repli : aucune animation bakée → clip d'origine du glTF.
    if (!actions.idle && gltf.animations && gltf.animations.length) {
      const clip = gltf.animations.find((a) => a.name === 'Wait') || gltf.animations[0];
      actions.idle = mixer.clipAction(clip);
    }
  }

  // Cycle de vie des animations : fondu entre états, gestes « one-shot ».
  let current = null;
  function play(name, { fade = 0.25, once = false } = {}) {
    const a = actions[name];
    if (!a) return null;
    if (current === a && !once) return a;
    a.enabled = true;
    a.setEffectiveWeight(1);
    if (once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.reset(); }
    else { a.setLoop(THREE.LoopRepeat, Infinity); }
    if (current && current !== a) a.crossFadeFrom(current, fade, true);
    a.play();
    current = a;
    return a;
  }
  if (actions.idle) play('idle', { fade: 0 });

  const body = {
    model: bodyModel,
    animations: gltf.animations,
    mixer,
    scaleDesc: detectModelDesc(bodyModel),
  };

  // 3) Couleurs + mise à l'échelle des os, puis attache de la tête.
  bodyModel.updateMatrixWorld(true);
  prepareBodyForCharModel(body, FFLShaderMaterial, model.favoriteColor, model.getBodyScale(), PANTS_COLOR);
  attachHeadToBody(body, model.meshes);

  // 4) Le modèle est déjà à l'échelle monde (S) : on l'insère tel quel.
  //    L'origine du corps est légèrement au-dessus de la semelle (≈ 0,46 u natives) :
  //    on remonte le groupe pour poser les pieds pile sur le sol (y = 0).
  const group = new THREE.Group();
  group.add(bodyModel);
  group.position.y = S * 0.46;
  group.updateMatrixWorld(true);

  const dispose = () => {
    try { mixer.stopAllAction(); mixer.uncacheRoot(bodyModel); } catch (e) { /* ignore */ }
    group.remove(bodyModel);
    try { disposeModel(bodyModel); } catch (e) { /* ignore */ }
    try { model.dispose(); } catch (e) { /* ignore */ }
  };

  const walkAction = actions.podwalk || actions.walk;
  const walkClip = walkAction ? walkAction.getClip() : null;
  // `strideNative` mesuré au bake = amplitude Z de la cheville = UN pas ;
  // la distance parcourue par cycle complet (clip entier) = 2 pas.
  const strideWorld = walkClip && walkClip.userData.strideNative
    ? walkClip.userData.strideNative * S * 2
    : 0;

  return {
    group, mixer, model, body, dispose,
    actions, play,
    strideWorld,
    walkPeriod: walkClip ? walkClip.duration : 1,
  };
}

/** true si le Mii porte des données FFSD exploitables. */
export function canBuild3D(b64) {
  return typeof b64 === 'string' && b64.length > 8;
}
