/**
 * MiiCharacter.js
 * ------------------------------------------------------------------
 * Système de création de Mii basé UNIQUEMENT sur le fichier local
 *   assets/mii/Mii_Maker_for_4.0_v2.glb
 * Aucune dépendance à une API externe (FFL, mii-unsecure.ariankordi.net...).
 *
 * Ce fichier remplace la logique de génération de mesh via API dans
 * miiRenderer3D.js. Il expose une classe MiiCharacter que miiMaker.js
 * (éditeur) et miiPlaza.js (avatars multiples) peuvent utiliser.
 *
 * Prérequis dans la page hôte (déjà chargés par le projet, cf. miiBuilder.js) :
 *   - THREE (r128, build classique, pas de modules)
 *   - THREE.GLTFLoader
 *   - THREE.SkeletonUtils (nécessaire pour dupliquer un Mii avec squelette
 *     dans la Plaza sans partager les mêmes os entre avatars)
 * ------------------------------------------------------------------
 */

// ============================================================================
// 1) DÉFINITION DES CATÉGORIES
// ----------------------------------------------------------------------------
// Chaque catégorie du Mii correspond, dans le GLB, à un nœud racine
// "<nom> picker" / "<nom> picker.001" qui contient un enfant "page selector"
// (ou "page selector.00X"). Les enfants de ce "page selector" sont les
// variantes réelles (un mesh par variante). C'est le rig Blender du modèle
// qui organise les choses ainsi - on s'appuie dessus tel quel plutôt que de
// le reconstruire.
//
// IMPORTANT : dans le fichier, 4 catégories portent toutes le nom Blender
// "mustache picker*" alors qu'elles contiennent en réalité moustache / barbe
// / maquillage / rides. On ne peut donc PAS se fier uniquement au nom du
// nœud racine : on identifie la catégorie par le CONTENU (noms des variantes),
// ce qui reste valide même si le fichier est ré-exporté avec des index
// différents.
// ============================================================================

const CATEGORY_DETECTORS = [
  // { label exposé au reste de l'app, test appliqué à la liste des noms de variantes }
  { label: 'beard', test: (names) => names.some((n) => /beard/i.test(n)) },
  { label: 'makeup', test: (names) => names.some((n) => /makeup/i.test(n)) },
  { label: 'wrinkles', test: (names) => names.some((n) => /wrinkle/i.test(n)) },
  { label: 'mustache', test: (names) => names.some((n) => /mustache/i.test(n)) },
  { label: 'glasses', test: (names) => names.some((n) => /glasses/i.test(n)) },
  { label: 'hair', test: (names) => names.some((n) => /^hair/i.test(n)) },
  { label: 'eyebrow', test: (names) => names.some((n) => /eyebrow/i.test(n)) },
  { label: 'eye', test: (names) => names.some((n) => /^eye\d/i.test(n)) },
  { label: 'nose', test: (names) => names.some((n) => /^nose/i.test(n)) },
  { label: 'mouth', test: (names) => names.some((n) => /mouth|beauty_mark/i.test(n)) },
  { label: 'head', test: (names) => names.some((n) => /^head\./i.test(n)) },
  { label: 'body', test: (names) => names.some((n) => /^torso/i.test(n)) },
];

// ============================================================================
// 1b) CORRESPONDANCE CATÉGORIE -> MESH(S) D'AFFICHAGE DU VISAGE
// ----------------------------------------------------------------------------
// Dans le GLB, le visage affiché n'est PAS constitué des meshes du "picker"
// (ceux-ci sont disposés en grille à côté du Mii pour le sélecteur). Le visage
// possède à la place de petits "slots" (quads 4 vertices) nommés d'après la
// partie (eye.L, eye.R, nose, mouth, hair, head...) et positionnés AU BON
// ENDROIT sur le tête. La géométrie réelle de chaque variante est modélisée à
// l'échelle du visage (1:1), seul le NOEUD de la variante porte la mise à
// l'échelle/position de la grille du picker.
//
// Le rendu correct consiste donc à COPIER la géométrie + le matériau de la
// variante sélectionnée SUR le slot correspondant, en CONSERVANT le transform
// du slot (position sur le visage), puis à masquer toute la grille du picker.
// Les catégories à deux slots (yeux, sourcils) reçoivent la même géométrie sur
// les deux, le slot droit étant reflété (scale.x = -1).
// ============================================================================

const DISPLAY_SLOTS = {
  head: ['head'],
  eye: ['eye.L', 'eye.R'],
  eyebrow: ['eyebrow.L', 'eyebrow.R'],
  nose: ['nose'],
  mouth: ['mouth'],
  glasses: ['glasses'],
  mustache: ['mustache'],
  beard: ['beard'],
  makeup: ['makeup'],
  wrinkles: ['wrinkles'],
  hair: ['hair'],
  beauty: ['beauty mark'],
};

// Variante "aucun" (chauve/sans lunettes/sans moustache/...) : on la détecte
// soit par le nom (convention "0<categorie>", "0 beard", "hair none"), soit
// par un matériau "none" sans géométrie utile.
function isNoneVariant(variant, primaryMesh) {
  if (!primaryMesh) return true;
  const mat = primaryMesh.material;
  if (mat && mat.name === 'none') return true;
  if (/^0\s*[a-z]/i.test(variant.name)) return true;
  if (/none/i.test(variant.name)) return true;
  return false;
}

// NOTE : il n'y a volontairement PAS de table "paramètre FFL -> catégorie"
// ici. mii.js expose un vrai CharInfo Nintendo (faceType, hairType, eyeType,
// glassesType/glassesColor, moleEnabled, etc. - vérifié bit à bit dans
// mii.js), et la correspondance exacte entre ces index numériques et les
// noms de variantes de CE GLB (ex: "0eyebrow"=index0, "eyebrow10"=index10,
// mais "hair.130"=index1 d'une AUTRE catégorie "beard" à cause de meshes
// réutilisés) est une logique 100% spécifique au format Mii, pas au GLB
// en général. Elle vit dans miiRendererGLB.js (buildLinearIndex + résolveurs
// glasses/mole), pour garder CE fichier générique et réutilisable ailleurs.
//
// Par défaut, MiiCharacter affiche simplement la première variante déclarée
// de chaque catégorie (voir load()) ; c'est à l'appelant (miiRendererGLB.js)
// d'appliquer les vraies valeurs juste après via setPart()/setPartByIndex().

// ============================================================================
// 2) CHARGEMENT UNIQUE DU GLB (cache)
// ----------------------------------------------------------------------------
// Le GLB (~7.8 Mo, 365 meshes) n'est parsé qu'une seule fois par session,
// même si plusieurs MiiCharacter sont créés (éditeur + N avatars de Plaza).
// Les instances suivantes sont produites par clonage (THREE.SkeletonUtils.clone)
// qui duplique la hiérarchie + le squelette sans redécoder le GLB.
// ============================================================================

const GLB_URL_DEFAULT = 'apps/mii_maker/assets/mii/Mii_Maker_for_4.0_v2.glb';

let _loadPromise = null;

function loadSourceGLTF(url) {
  if (_loadPromise) return _loadPromise;
  const loader = new THREE.GLTFLoader();
  _loadPromise = new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      (err) => reject(err)
    );
  });
  return _loadPromise;
}

// ============================================================================
// 3) DÉTECTION AUTOMATIQUE DES CATÉGORIES / VARIANTES
// ----------------------------------------------------------------------------
// On parcourt la scène (root.traverse) à la recherche de nœuds de type
// "X picker" / "X picker.001" possédant un enfant "page selector*".
// On ignore les enfants "snap.*" (utilitaires de rig Blender, pas des
// variantes réelles) et on garde tout le reste, y compris les nœuds SANS
// mesh (ex: "hair none") qui représentent une option "aucun".
// ============================================================================

// THREE r128 GLTFLoader fait passer les noms de nœuds par
// PropertyBinding.sanitizeNodeName (espaces -> "_", suppression de [ ] . : /),
// ce qui casse la correspondance par nom ("body picker.001" -> "body_picker001",
// "torso f" -> "torso_f", "nose1.002" -> "nose1002"...). Le loader conserve
// heureusement le nom Blender D'ORIGINE dans object.userData.name. On s'appuie
// donc toujours sur ce nom d'origine, ce qui rend valides tous les motifs
// (regex, numéros de variante) de miiRendererGLB.js sans rien y changer.
function nodeName(object) {
  if (!object) return '';
  return (object.userData && object.userData.name) || object.name || '';
}

function getByName(root, wanted) {
  let found = null;
  root.traverse((o) => {
    if (!found && nodeName(o) === wanted) found = o;
  });
  return found;
}

function detectCategories(root) {
  const categories = {}; // label -> { rootNode, pageSelector, variants: [{name, object}] }
  const rawPickers = [];

  root.traverse((node) => {
    if (!/ picker(\.\d+)?$/i.test(nodeName(node))) return;
    const pageSelector = node.children.find((c) => /^page selector/i.test(nodeName(c)));
    if (!pageSelector) return;
    rawPickers.push({ node, pageSelector });
  });

  for (const { node, pageSelector } of rawPickers) {
    const variantObjects = pageSelector.children.filter(
      (c) => !/^snap\./i.test(nodeName(c))
    );
    if (variantObjects.length === 0) continue;

    const names = variantObjects.map((o) => nodeName(o));
    const detector = CATEGORY_DETECTORS.find((d) => d.test(names));
    if (!detector) {
      console.warn('[MiiCharacter] catégorie non reconnue, nœud ignoré:', nodeName(node), names.slice(0, 3));
      continue;
    }
    categories[detector.label] = {
      rootNode: node,
      pageSelector,
      variants: variantObjects.map((o) => ({ name: nodeName(o), object: o })),
    };
  }

  return categories;
}

// ============================================================================
// 4) CLASSE PRINCIPALE
// ============================================================================

export class MiiCharacter {
  /**
   * @param {THREE.Scene} scene - scène dans laquelle ajouter le Mii
   * @param {object} [options]
   * @param {string} [options.glbUrl] - chemin vers Mii_Maker_for_4.0_v2.glb
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.glbUrl = options.glbUrl || GLB_URL_DEFAULT;

    this.root = null; // THREE.Object3D racine du Mii (clone de "Mii Armature")
    this.categories = {}; // label -> { rootNode, pageSelector, variants }
    this.currentSelection = {}; // label -> variant name actuellement visible
    this.mixer = null;
    this.clips = {}; // name -> THREE.AnimationClip
    this.activeAction = null;

    this._slots = {}; // nodeName d'origine -> mesh slot du visage (eye.L, nose...)
    this._beautyOn = null; // nom de la variante beauty_mark "activée"
    this._beautyOff = null; // nom de la variante beauty_mark "désactivée" (option 0)
  }

  /** Récupère (et mémorise) les meshes-slot du visage par leur nom Blender d'origine. */
  _buildSlots() {
    const wanted = new Set(Object.values(DISPLAY_SLOTS).flat());
    this._slots = {};
    this.root.traverse((o) => {
      if (!o.isMesh) return;
      const n = nodeName(o);
      if (wanted.has(n) && !this._slots[n]) {
        // Mémorise l'échelle d'origine pour pouvoir refléter puis restaurer.
        o.userData._baseScaleX = Math.abs(o.scale.x) || 1;
        this._slots[n] = o;
      }
    });
  }

  /** Retire d'un slot les meshes "extra" ajoutés pour les variantes multi-mesh. */
  _clearSlotExtras(slot) {
    for (let i = slot.children.length - 1; i >= 0; i--) {
      const c = slot.children[i];
      if (c.userData && c.userData._slotExtra) slot.remove(c);
    }
  }

  /**
   * Peint un slot du visage avec la variante demandée : copie la géométrie +
   * le matériau du mesh principal, réplique les éventuels meshes secondaires
   * (ex: le nez = base peau + nez texturé), et applique le miroir droite/gauche.
   */
  _paintSlot(slot, meshes, mirror) {
    slot.visible = true;
    slot.geometry = meshes[0].geometry;
    slot.material = meshes[0].material;
    const base = slot.userData._baseScaleX || 1;
    slot.scale.x = mirror ? -base : base;
    this._clearSlotExtras(slot);
    for (let k = 1; k < meshes.length; k++) {
      const src = meshes[k];
      const extra = new THREE.Mesh(src.geometry, src.material);
      extra.position.copy(src.position);
      extra.quaternion.copy(src.quaternion);
      extra.scale.copy(src.scale);
      extra.userData._slotExtra = true;
      slot.add(extra);
    }
  }

  /** Masque un slot (variante "aucun") et nettoie ses éventuels meshes extra. */
  _hideSlot(slot) {
    slot.visible = false;
    this._clearSlotExtras(slot);
  }

  /** Active/désactive le grain de beauté (slot séparé de la bouche). */
  setBeautyMark(enabled) {
    const slot = this._slots['beauty mark'];
    if (!slot) return;
    const name = enabled ? this._beautyOn : this._beautyOff;
    if (!name) { this._hideSlot(slot); return; }
    const cat = this.categories.mouth;
    const variant = cat && cat.variants.find((v) => v.name === name);
    const meshes = [];
    if (variant) variant.object.traverse((o) => { if (o.isMesh) meshes.push(o); });
    if (!variant || meshes.length === 0 || isNoneVariant(variant, meshes[0])) {
      this._hideSlot(slot);
    } else {
      this._paintSlot(slot, meshes, false);
    }
  }

  /**
   * Charge (ou réutilise le cache) le GLB, clone une instance indépendante,
   * détecte les catégories, applique les valeurs par défaut et l'ajoute à la scène.
   */
  async load() {
    const gltf = await loadSourceGLTF(this.glbUrl);

    // On ne modifie jamais gltf.scene directement (source partagée en cache) :
    // on clone à chaque instanciation. SkeletonUtils.clone gère correctement
    // les SkinnedMesh + squelette partagé par référence de bones, contrairement
    // à Object3D.clone() qui casserait le binding os/squelette.
    const source = getByName(gltf.scene, 'Mii Armature') || gltf.scene;
    this.root = THREE.SkeletonUtils
      ? THREE.SkeletonUtils.clone(source)
      : source.clone(true); // fallback dégradé si SkeletonUtils absent (pas d'anim multi-instance fiable)

    this.scene.add(this.root);

    this.categories = detectCategories(this.root);

    // Le Mii ne doit PAS afficher la grille du picker (les variantes servent
    // uniquement de source de géométrie). On masque donc les conteneurs
    // "picker.parent", ainsi que les helpers de l'UI du rig ("category
    // selection", quad "body" redondant avec les meshes cube du corps).
    this.root.traverse((o) => {
      const n = nodeName(o);
      if (/^picker\.parent$/i.test(n)) o.visible = false;
      if (/^category selection$/i.test(n)) o.visible = false;
      if (n === 'body') o.visible = false;
    });

    // Slots du visage + variantes du grain de beauté (partagent la catégorie
    // Blender "mouth" dans ce GLB).
    this._buildSlots();
    const mouthCat = this.categories.mouth;
    if (mouthCat) {
      this._beautyOn = mouthCat.variants.find((v) => /^beauty_mark$/i.test(v.name))?.name || null;
      this._beautyOff = mouthCat.variants.find((v) => /^0 ?beauty_mark$/i.test(v.name))?.name || null;
    }

    // Masquer TOUTES les variantes de toutes les catégories, puis
    // n'afficher que la variante par défaut de chacune.
    for (const [label, cat] of Object.entries(this.categories)) {
      for (const variant of cat.variants) {
        variant.object.visible = false;
      }
      this.setPart(label, cat.variants[0].name, { silent: true });
    }
    this.setBeautyMark(false);

    // Animation : les clips sont déjà bakées dans le GLB (Idle, wave, ...).
    if (gltf.animations && gltf.animations.length) {
      this.mixer = new THREE.AnimationMixer(this.root);
      for (const clip of gltf.animations) {
        this.clips[clip.name] = clip;
      }
    }

    return this;
  }

  /** Liste les catégories détectées et le nombre de variantes (pour construire l'UI dynamiquement). */
  getCategories() {
    return Object.fromEntries(
      Object.entries(this.categories).map(([label, cat]) => [
        label,
        cat.variants.map((v) => v.name),
      ])
    );
  }

  /**
   * Affiche la variante `variantName` de la catégorie `category` SUR LE VISAGE.
   * Le mesh-slot du visage reçoit la géométrie/matériau de la variante (les
   * meshes du picker ne servent que de source et restent masqués avec leur
   * grille). Une variante "aucun" masque le slot correspondant.
   */
  setPart(category, variantName, { silent = false, mirror = null } = {}) {
    const cat = this.categories[category];
    if (!cat) {
      console.warn(`[MiiCharacter] catégorie inconnue: ${category}`);
      return false;
    }
    const variant = cat.variants.find((v) => v.name === variantName);
    if (!variant) {
      console.warn(`[MiiCharacter] variante introuvable: ${category}/${variantName}`);
      return false;
    }
    for (const v of cat.variants) v.object.visible = false;
    variant.object.visible = true;
    this.currentSelection[category] = variantName;

    // Le grain de beauté vit dans la catégorie "mouth" mais possède son
    // propre slot : on le route vers celui-ci au lieu d'écraser la bouche.
    if (/beauty_mark/i.test(variantName)) {
      this.setBeautyMark(true);
      if (!silent) this._onPartChanged?.(category, variantName);
      return true;
    }

    const slotNames = DISPLAY_SLOTS[category] || [];
    const slots = slotNames.map((n) => this._slots[n]).filter(Boolean);
    const meshes = [];
    variant.object.traverse((o) => { if (o.isMesh) meshes.push(o); });

    if (slots.length === 0) {
      // Catégorie sans slot de visage dédié (ex: body géré par meshes cube).
    } else if (isNoneVariant(variant, meshes[0])) {
      for (const s of slots) this._hideSlot(s);
    } else {
      for (const s of slots) {
        const m = /\.R$/.test(nodeName(s)) ? true : (mirror === null ? false : !!mirror);
        this._paintSlot(s, meshes, m);
      }
    }

    if (!silent) this._onPartChanged?.(category, variantName);
    return true;
  }

  /** Variante d'une catégorie par index (0-based) plutôt que par nom. */
  setPartByIndex(category, index) {
    const cat = this.categories[category];
    if (!cat || !cat.variants[index]) return false;
    return this.setPart(category, cat.variants[index].name);
  }

  /** Joue un clip d'animation par son nom exact ('Idle', 'wave', 'look around', 'wave transition', 'baked mii animation'). */
  playAnimation(name, { loop = true, fadeDuration = 0.3 } = {}) {
    if (!this.mixer || !this.clips[name]) {
      console.warn(`[MiiCharacter] animation introuvable: ${name}`);
      return;
    }
    const action = this.mixer.clipAction(this.clips[name]);
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    if (this.activeAction && this.activeAction !== action) {
      this.activeAction.crossFadeTo(action, fadeDuration, false);
    }
    action.play();
    this.activeAction = action;
  }

  /** À appeler dans la boucle de rendu (delta en secondes). */
  update(delta) {
    if (this.mixer) this.mixer.update(delta);
  }

  /** Libère la géométrie/matériaux clonés et retire le Mii de la scène. */
  dispose() {
    if (!this.root) return;
    this.scene.remove(this.root);
    this.root.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose();
      }
    });
    this.mixer?.stopAllAction();
    this.root = null;
  }
}

export { GLB_URL_DEFAULT };
