/**
 * miiRendererGLB.js
 * ------------------------------------------------------------------
 * Remplace miiRenderer3D.js. Expose la MÊME API globale (`window.MiiViewer3D`
 * avec `new MiiViewer3D(mountEl)`, `.update(miiInstance)`, `.rotateBy(deg)`)
 * pour que miiMaker.js n'ait besoin de changer qu'UNE ligne (le chemin du
 * script chargé par ensureMiiViewer3D()).
 *
 * Contrairement à miiRenderer3D.js (têtes seules générées via l'API FFL,
 * cassée pour type=all_body), ce fichier :
 *   - charge une seule fois assets/mii/Mii_Maker_for_4.0_v2.glb (365 meshes,
 *     corps + squelette + 5 animations bakées),
 *   - traduit les valeurs RÉELLES du CharInfo Nintendo lu par mii.js
 *     (faceType, hairType, eyeType, glassesType/glassesColor, moleEnabled...
 *     vérifiées bit à bit dans mii.js autour de la ligne ~7654) vers les
 *     noms de variantes du GLB.
 *
 * ⚠️ Limites connues de CE fichier GLB (pas du code) :
 *   - "mouth" et "beauty_mark" (grain de beauté) partagent la MÊME catégorie
 *     Blender ("mouth picker"). On ne peut donc PAS afficher un grain de
 *     beauté en même temps qu'une bouche personnalisée dans cet asset :
 *     si moleEnabled=true, le grain de beauté remplace temporairement la
 *     bouche choisie. Pour corriger ça il faudrait séparer le mesh
 *     "beauty_mark" dans son propre nœud/enfant du corps, côté Blender.
 *   - Les lunettes (glassesColor) sont des meshes de couleur séparés
 *     ("glasses3_2", "glasses3_3"...) et non un tint de matériau : le mapping
 *     glassesType -> forme + glassesColor -> suffixe "_N" est une estimation
 *     raisonnable, pas une garantie 1:1 avec le vrai FFL.
 *   - makeupType / wrinklesType : les noms de mesh dans le GLB ne suivent
 *     aucune numérotation ("head.016", "head.029"...), on fait donc confiance
 *     à l'ORDRE de déclaration dans le fichier comme étant l'ordre d'index
 *     voulu par l'auteur du rig (impossible à vérifier autrement sans le
 *     fichier .blend d'origine).
 * ------------------------------------------------------------------
 */

(function (global) {
  const GLB_URL = 'apps/mii_maker/assets/mii/Mii_Maker_for_4.0_v2.glb';
  const GLTFLOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  const SKELETONUTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js';

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error('[miiRendererGLB] échec chargement ' + url));
      document.head.appendChild(s);
    });
  }

  // ==========================================================================
  // Résolution des index FFL -> noms de variantes du GLB
  // --------------------------------------------------------------------------
  // Convention observée dans le GLB : une variante nommée "0<categorie>"
  // (ex: "0eyebrow", "0glasses", "0mustache", "0 beard", "0 makeup",
  // "0 wrinkles") représente toujours l'index 0. Quand une telle variante
  // "0X" existe dans la catégorie, les noms numérotés qui suivent
  // ("eyebrow10", "glasses3"...) portent directement leur index FFL.
  // Quand elle n'existe PAS (eye, nose, mouth, head - toujours un shape,
  // jamais "aucun"), la variante "<categorie>1" correspond à l'index FFL 0
  // (numérotation humaine 1-based -> index 0-based = n-1).
  // ==========================================================================

  function isZeroVariant(name) {
    return /^0[^0-9]/.test(name);
  }

  function trailingNumber(name) {
    const m = name.match(/(\d+)(?:\.\d+)?$/);
    return m ? parseInt(m[1], 10) : null;
  }

  /**
   * Construit une Map(indexFFL -> nomDeVariante) pour une catégorie, en
   * COMPACTANT toujours vers une plage 0..N-1 sans trou. On ne se contente
   * pas de soustraire un offset au numéro trouvé dans le nom, car certains
   * meshes sont réutilisés entre catégories (ex: "hair.130"/"hair.131"/
   * "hair.132" appartiennent en fait à "beard" dans ce GLB, ce qui casse la
   * numérotation continue des coiffures si on garde le numéro brut). On
   * trie donc les variantes numérotées par leur numéro puis on les
   * ré-indexe séquentiellement à partir de 0 (après la variante "0X" si
   * elle existe, toujours forcée en index 0).
   *
   * Si les noms ne suivent pas un schéma "<categorie><N>" clair (cas de
   * beard/makeup/wrinkles, qui réutilisent des noms de mesh d'autres
   * catégories sans numéro cohérent), on retombe sur l'ordre de
   * déclaration dans le GLB, qui reste la meilleure approximation possible
   * de l'ordre voulu par l'auteur du rig.
   */
  function buildLinearIndex(label, variants) {
    const stem = label.toLowerCase();
    const zeroVariant = variants.find((v) => isZeroVariant(v.name));
    const rest = variants.filter((v) => v !== zeroVariant);
    const matchesStem = variants.every(
      (v) => v === zeroVariant || v.name.toLowerCase().replace(/[\s_]/g, '').startsWith(stem)
    );

    let ordered;
    if (matchesStem) {
      const numbered = rest
        .map((v) => ({ name: v.name, n: trailingNumber(v.name) }))
        .filter((x) => x.n !== null)
        .sort((a, b) => a.n - b.n);
      const unnumbered = rest.filter((v) => trailingNumber(v.name) === null).map((v) => v.name);
      ordered = numbered.map((x) => x.name).concat(unnumbered);
    } else {
      ordered = rest.map((v) => v.name); // ordre de déclaration du GLB
    }
    if (zeroVariant) ordered = [zeroVariant.name, ...ordered];

    const map = new Map();
    ordered.forEach((name, i) => map.set(i, name));
    return map;
  }

  // ==========================================================================
  // Classe exposée globalement, API identique à l'ancien MiiViewer3D
  // ==========================================================================

  class MiiViewer3D {
    constructor(mount) {
      this.mount = mount;
      this.character = null;
      this.indexMaps = {}; // categorie -> Map(indexFFL -> nomVariante)
      this.moleOnName = null;
      this.moleOffName = null;
      this.clock = new THREE.Clock();
      this._initScene();
      this._animate();
    }

    _initScene() {
      const w = this.mount.clientWidth || 400;
      const h = this.mount.clientHeight || 400;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
      this.camera.position.set(0, 1.05, 3.2);
      this.camera.lookAt(0, 1.0, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.mount.appendChild(this.renderer.domElement);

      this.scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 1.15));
      const dir = new THREE.DirectionalLight(0xffffff, 0.75);
      dir.position.set(2, 4, 3);
      this.scene.add(dir);

      // Groupe pivot pour la rotation (rotateBy), le Mii est ajouté dedans.
      this.rig = new THREE.Group();
      this.scene.add(this.rig);

      this._resizeHandler = () => this._onResize();
      window.addEventListener('resize', this._resizeHandler);
    }

    _onResize() {
      const w = this.mount.clientWidth;
      const h = this.mount.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }

    _animate() {
      requestAnimationFrame(() => this._animate());
      const dt = this.clock.getDelta();
      if (this.character) this.character.update(dt);
      this.renderer.render(this.scene, this.camera);
    }

    /** Rotation manuelle (boutons ◀ ▶ dans miiMaker.js). */
    rotateBy(deg) {
      this.rig.rotation.y += THREE.MathUtils.degToRad(deg);
    }

    async _ensureCharacter() {
      if (this.character) return;

      if (!window.THREE.GLTFLoader) await loadScript(GLTFLOADER_URL);
      if (!window.THREE.SkeletonUtils) await loadScript(SKELETONUTILS_URL);

      const { MiiCharacter } = await import('./MiiCharacter.js');
      this.character = new MiiCharacter(this.rig, { glbUrl: GLB_URL });
      await this.character.load();
      this.character.playAnimation('Idle');

      // Construit les tables d'index FFL une seule fois, catégorie par catégorie.
      for (const [label, cat] of Object.entries(this.character.categories)) {
        let variants = cat.variants;

        if (label === 'mouth') {
          // Le grain de beauté (beauty_mark) partage la catégorie "mouth"
          // dans ce GLB : on le retire avant de construire l'index des
          // formes de bouche, et on le garde à part (voir moleOnName/Off).
          this.moleOnName = variants.find((v) => /^beauty_mark$/i.test(v.name))?.name || null;
          this.moleOffName = variants.find((v) => /^0 ?beauty_mark$/i.test(v.name))?.name || null;
          variants = variants.filter((v) => !/beauty_mark/i.test(v.name));
        }

        if (label === 'hair') {
          // "hair none" (nœud sans mesh = chauve) et "hair_sprite" (helper
          // de matériau capturé par erreur dans la catégorie car son nom
          // commence par "hair") ne sont pas des coiffures numérotées :
          // on les retire pour garder 0..131 propre et contigu.
          variants = variants.filter((v) => !/^hair none$/i.test(v.name) && !/sprite/i.test(v.name));
        }

        if (label === 'glasses') {
          // On ignore ici les meshes de couleur ("glasses3_2", "glasses3_3"...),
          // gérés séparément dans _setGlasses(). Seules les formes de base
          // ("0glasses", "glasses1"..."glasses5") entrent dans l'index linéaire.
          variants = variants.filter((v) => /^0glasses$|^glasses\d+$/i.test(v.name));
        }

        this.indexMaps[label] = buildLinearIndex(label, variants);
      }
    }

    _setByIndex(category, index) {
      const map = this.indexMaps[category];
      if (!map || index === undefined || index === null) return;
      const name = map.get(index) ?? map.get(0);
      if (name) this.character.setPart(category, name);
    }

    _setGlasses(type, color) {
      const map = this.indexMaps.glasses;
      if (!map) return;
      const shapeName = map.get(type) ?? map.get(0);
      if (!shapeName) return;

      if (shapeName === '0glasses' || color === undefined || color === null) {
        this.character.setPart('glasses', shapeName);
        return;
      }
      // Estimation: variante colorée "<forme>_<color+1>" si elle existe, sinon forme de base.
      const coloredName = `${shapeName}_${color + 1}`;
      const cat = this.character.categories.glasses;
      const exists = cat.variants.some((v) => v.name === coloredName);
      this.character.setPart('glasses', exists ? coloredName : shapeName);
    }

    /**
     * Reconstruit l'apparence du Mii à partir d'une instance `window.Mii`
     * (mii.js) : gender, faceType, hairType, eyeType, eyebrowType, noseType,
     * mouthType, mustacheType, beardType, glassesType/glassesColor,
     * makeupType, wrinklesType, moleEnabled, flipHair.
     */
    async update(mii) {
      await this._ensureCharacter();
      if (!mii) return;

      this.character.setPart('body', mii.gender === 1 ? 'torso f' : 'torso m');

      this._setByIndex('head', mii.faceType);
      this._setByIndex('wrinkles', mii.wrinklesType);
      this._setByIndex('makeup', mii.makeupType);
      this._setByIndex('hair', mii.hairType);
      this._setByIndex('eye', mii.eyeType);
      this._setByIndex('eyebrow', mii.eyebrowType);
      this._setByIndex('nose', mii.noseType);
      this._setByIndex('mouth', mii.mouthType);
      this._setByIndex('mustache', mii.mustacheType);
      this._setByIndex('beard', mii.beardType);
      this._setGlasses(mii.glassesType, mii.glassesColor);

      // Grain de beauté : slot séparé de la bouche (plus d'écrasement).
      this.character.setBeautyMark(!!mii.moleEnabled);

      // Miroir de la coiffure (mèche à gauche/droite) : le rendu passe par le
      // slot "hair", on reflète donc le slot plutôt que le mesh du picker.
      const hairVariantName = this.indexMaps.hair?.get(mii.hairType);
      if (hairVariantName) {
        this.character.setPart('hair', hairVariantName, { mirror: !!mii.flipHair });
      }
    }
  }

  global.MiiViewer3D = MiiViewer3D;
})(window);
