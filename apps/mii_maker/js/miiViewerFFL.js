/**
 * miiViewerFFL.js
 * ------------------------------------------------------------------
 * Rendu d'un Mii COMPLET (tête + corps) en vraie 3D avec FFL.js (le moteur de
 * rendu Wii U de Nintendo, portage WASM/Three.js par Arian Kordi — AGPL-3.0).
 *
 * Différences clés avec l'ancien `miiRendererGLB.js` :
 *   - FFL.js reconstruit la TÊTE à partir des DONNÉES FFSD du Mii, donc le
 *     rendu est EXACT (vraies textures, vrais shaders FFL, vraies couleurs).
 *   - Le CORPS est un glTF authentique de Wii U (`MiiBodyMiddle.bfres` converti),
 *     mis à l'échelle selon la taille/corpulence du Mii (`CharModel.getBodyScale`)
 *     puis la tête FFL y est attachée sur l'os de cou (cf. helpers de FFL.js).
 *   - FFL.js nécessite Three.js >= r144 ; ce module est un ESM chargé via
 *     l'importmap `three` déclaré dans index.html (r180), isolé du
 *     `window.THREE` r128 utilisé ailleurs.
 *
 * L'API publique (`MiiViewerFFL`) reprend celle de `window.MiiViewer3D` :
 *   new MiiViewerFFL(mountEl), await .update(mii), .rotateBy(deg), .camera
 * Plus un ajout : `.setBodyView(bool)` bascule entre cadrage visage et corps
 * entier, et le glisser à la souris/au doigt fait tourner le Mii à 360°.
 * ------------------------------------------------------------------
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FFL, CharModel, FFLCharModelDescDefault, PantsColor, pantsColors } from './ffl/ffl.js';
import FFLShaderMaterial from './ffl/materials/FFLShaderMaterial.js';
import { miiToFFLStoreData } from './miiFFLData.js';
import { addSkeletonScalingExtensions } from './ffl/helpers/SkeletonScalingExtensions.js';
import { detectModelDesc } from './ffl/helpers/ModelScaleDesc.js';
import {
  prepareBodyForCharModel,
  attachHeadToBody,
  disposeModel,
  adjustCameraForBodyHead,
  getFaceCamera,
  getWholeBodyCamera,
} from './ffl/helpers/BodyUtilities.js';

// Ressource FFL (données de shaders/textures de la bibliothèque Mii Wii U).
const RESOURCE_URL = 'apps/mii_maker/assets/ffl/FFLResHigh.dat';
// Build Emscripten « single-file » (WASM embarqué en base64) → définit
// globalThis.ModuleFFL, exactement comme dans le harnais de test.
const WASM_SCRIPT_URL = 'apps/mii_maker/js/ffl/ffl-emscripten-single-file.js';
// Corps Mii Wii U (glTF), un par genre. Voir FFL.js/helpers/BodyUtilities.js.
const BODY_MALE_URL = 'apps/mii_maker/assets/ffl/body/male.glb';
const BODY_FEMALE_URL = 'apps/mii_maker/assets/ffl/body/female.glb';

// Couleur de pantalon par défaut (comme les rendus normaux Wii U).
const PANTS_COLOR = pantsColors[PantsColor.GrayNormal].clone().convertLinearToSRGB();

let _fflPromise = null;
let _bodyTemplatesPromise = null;

function loadScriptOnce(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = url;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('[MiiViewerFFL] échec chargement ' + url));
    document.head.appendChild(s);
  });
}

/** Initialise FFL.js une seule fois (module WASM + ressource), réutilisable. */
export function ensureFFL() {
  if (_fflPromise) return _fflPromise;
  _fflPromise = (async () => {
    await loadScriptOnce(WASM_SCRIPT_URL);
    const ModuleFFL = globalThis.ModuleFFL;
    if (!ModuleFFL) {
      throw new Error('[MiiViewerFFL] ModuleFFL introuvable après chargement du WASM.');
    }
    const res = await fetch(RESOURCE_URL);
    if (!res.ok) {
      throw new Error(`[MiiViewerFFL] ressource FFL introuvable (${res.status}) : ${RESOURCE_URL}`);
    }
    return FFL.initWithResource(res, ModuleFFL);
  })();
  return _fflPromise;
}

/** Précharge les modèles de corps (glTF) une seule fois, indexés par genre. */
export function ensureBodyTemplates() {
  if (_bodyTemplatesPromise) return _bodyTemplatesPromise;
  _bodyTemplatesPromise = (async () => {
    // Ajoute le scaling par-os à Three.js (requis pour getBodyScale).
    addSkeletonScalingExtensions(THREE.Skeleton);
    const loader = new GLTFLoader();
    const load = (url) => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
    const [male, female] = await Promise.all([load(BODY_MALE_URL), load(BODY_FEMALE_URL)]);
    return { 0: male, 1: female }; // FFLGender: 0 = Male, 1 = Female.
  })();
  return _bodyTemplatesPromise;
}

export class MiiViewerFFL {
  constructor(mount) {
    this.mount = mount;
    this.model = null;
    this.body = null;
    this._disposed = false;
    this._bodyView = false;
    this._dragging = false;
    this._lastX = 0;
    this.clock = new THREE.Clock();
    this._initScene();
    this._animate();
  }

  _initScene() {
    const w = this.mount.clientWidth || 400;
    const h = this.mount.clientHeight || 400;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(25, w / h, 0.1, 1000);
    this.camera.position.set(0, 1.05, 3.2);
    this.camera.lookAt(0, 1.0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Requis par FFL : ses shaders écrivent déjà en espace linéaire.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.mount.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.15));
    const dir = new THREE.DirectionalLight(0xffffff, 0.75);
    dir.position.set(2, 4, 3);
    this.scene.add(dir);

    // Groupe pivot pour rotateBy() et le glisser : le Mii tourne autour de
    // l'axe vertical passant par ses pieds (origine).
    this.rig = new THREE.Group();
    this.scene.add(this.rig);

    this._initDrag();

    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);
  }

  /** Glisser souris/doigt → rotation 360° du Mii. */
  _initDrag() {
    const dom = this.renderer.domElement;
    dom.style.touchAction = 'none';
    dom.style.cursor = 'grab';

    const down = (e) => {
      this._dragging = true;
      this._lastX = e.clientX;
      dom.style.cursor = 'grabbing';
      try { dom.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      e.preventDefault();
    };
    const move = (e) => {
      if (!this._dragging) return;
      const dx = e.clientX - this._lastX;
      this._lastX = e.clientX;
      this.rig.rotation.y += dx * 0.01;
      e.preventDefault();
    };
    const up = (e) => {
      if (!this._dragging) return;
      this._dragging = false;
      dom.style.cursor = 'grab';
      try { dom.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    };

    dom.addEventListener('pointerdown', down);
    dom.addEventListener('pointermove', move);
    dom.addEventListener('pointerup', up);
    dom.addEventListener('pointercancel', up);
    this._dragCleanup = () => {
      dom.removeEventListener('pointerdown', down);
      dom.removeEventListener('pointermove', move);
      dom.removeEventListener('pointerup', up);
      dom.removeEventListener('pointercancel', up);
    };
  }

  _onResize() {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this._applyCamera();
  }

  _animate() {
    if (this._disposed) return;
    requestAnimationFrame(() => this._animate());
    const dt = this.clock.getDelta();
    // Anime le corps (respiration) ; la tête suit via l'attache sur l'os.
    if (this.body && this.body.mixer) this.body.mixer.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  /** Rotation manuelle (boutons ◀ ▶ dans miiMaker.js). */
  rotateBy(deg) {
    this.rig.rotation.y += THREE.MathUtils.degToRad(deg);
  }

  /** Cadrage visage (false) ou corps entier (true). */
  setBodyView(enabled) {
    this._bodyView = !!enabled;
    this._applyCamera();
  }

  /**
   * Positionne la caméra de façon authentique (comme la Wii U) : caméra fixe
   * (regard vers -Z), c'est le Mii qui tourne via `this.rig`.
   */
  _applyCamera() {
    if (!this.model || !this.body) return;
    const w = this.mount.clientWidth || 400;
    const h = this.mount.clientHeight || 400;
    const aspect = w / h;

    let cam;
    if (this._bodyView) {
      cam = getWholeBodyCamera(aspect, this.model.charInfo.height);
    } else {
      cam = getFaceCamera();
      cam.aspect = aspect;
      adjustCameraForBodyHead(cam, this.body);
      cam.updateProjectionMatrix();
    }
    this.camera = cam;
  }

  _clearModel() {
    if (this.model) {
      try { this.model.dispose(); } catch (e) { /* ignore */ }
      this.model = null;
    }
    if (this.body) {
      try { this.rig.remove(this.body.model); } catch (e) { /* ignore */ }
      try { this.body.mixer && this.body.mixer.uncacheRoot(this.body.model); } catch (e) { /* ignore */ }
      try { disposeModel(this.body.model); } catch (e) { /* ignore */ }
      this.body = null;
    }
  }

  /**
   * Reconstruit le Mii complet (tête FFL + corps) depuis une instance `Mii`.
   * @param {import('./mii.js').default} mii
   */
  async update(mii) {
    const ffl = await ensureFFL();
    const templates = await ensureBodyTemplates();
    if (this._disposed) return;

    // Indique à FFL si on est en WebGL1 (flip des textures) — sans effet WebGL2.
    ffl.setRenderer(this.renderer);

    const data = miiToFFLStoreData(mii);

    this._clearModel();

    // 1) Tête FFL (reconstruite depuis les données FFSD).
    const model = new CharModel(ffl, data, FFLCharModelDescDefault, FFLShaderMaterial, this.renderer);
    // Évite la disparition de pièces (nez, front) par frustum culling.
    model.meshes.traverse((m) => { m.frustumCulled = false; });

    // 2) Corps glTF du bon genre (cloné avec son skinning).
    const gltf = templates[model.charInfo.gender] || templates[0];
    const bodyModel = SkeletonUtils.clone(gltf.scene);
    bodyModel.traverse((m) => { m.frustumCulled = false; });

    const mixer = new THREE.AnimationMixer(bodyModel);
    if (gltf.animations && gltf.animations.length) {
      const clip = gltf.animations.find((a) => a.name === 'Wait') || gltf.animations[0];
      mixer.clipAction(clip).play().setLoop(THREE.LoopRepeat, Infinity);
    }

    const body = {
      model: bodyModel,
      animations: gltf.animations,
      mixer,
      scaleDesc: detectModelDesc(bodyModel),
    };

    // 3) Matériaux/couleurs du corps selon le Mii + mise à l'échelle.
    bodyModel.updateMatrixWorld(true);
    prepareBodyForCharModel(body, FFLShaderMaterial, model.favoriteColor, model.getBodyScale(), PANTS_COLOR);

    // 4) Attache la tête sur l'os de cou du corps.
    attachHeadToBody(body, model.meshes);

    this.rig.add(bodyModel);
    this.model = model;
    this.body = body;

    this._applyCamera();
  }

  dispose() {
    this._disposed = true;
    window.removeEventListener('resize', this._resizeHandler);
    if (this._dragCleanup) this._dragCleanup();
    this._clearModel();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
