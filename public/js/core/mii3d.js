/**
 * mii3d.js — helper partagé pour afficher un Mii en vraie 3D animé (FFL.js).
 *
 * Utilisé par :
 *   - auth.js       → photo de profil en haut à gauche (#top-avatar-container)
 *   - social.js     → panneau social droit (#social-focus-mii-container)
 *
 * Chaîne de rendu (réutilise le moteur du Mii Maker) :
 *   miiRendererFFL.js (classic, définit window.MiiViewerFFL)
 *     → miiViewerFFL.js (ESM, moteur FFL.js WASM + Three.js via l'importmap)
 *
 * Chaque "viewer" est rattaché à un DOM mount. La gestion est par-mount pour
 * permettre d'avoir deux vues en même temps (avatar permanent + panneau social).
 *
 * API :
 *   await window.Mii3D.renderInto(mount, b64, { face: true|false })  → viewer
 *   window.Mii3D.dispose(mount)      → libère le viewer d'un mount
 *   window.Mii3D.disposeAll()        → libère tous les viewers
 */
(function (global) {
  const RENDERER_SCRIPT_URL = new URL('apps/mii_maker/js/miiRendererFFL.js', document.baseURI).href;
  const MII_MODULE_URL = new URL('apps/mii_maker/js/mii.js', document.baseURI).href;

  let _modulesPromise = null;
  const _viewers = new Map(); // mount → viewer

  function loadScriptOnce(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('[Mii3D] échec chargement ' + url));
      document.head.appendChild(s);
    });
  }

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function ensureModules() {
    if (!_modulesPromise) {
      _modulesPromise = (async () => {
        if (!global.MiiViewerFFL) await loadScriptOnce(RENDERER_SCRIPT_URL);
        const mod = await import(MII_MODULE_URL);
        return mod.default || mod.Mii;
      })();
    }
    return _modulesPromise;
  }

  const Mii3D = {
    b64ToBytes,
    ensureModules,

    /** True si le viewer de ce mount existe déjà. */
    has(mount) {
      return _viewers.has(mount);
    },

    /**
     * Crée (ou met à jour) le viewer 3D sur `mount` à partir du blob FFSD base64.
     * @param {HTMLElement} mount
     * @param {string} b64  FFLStoreData 96 octets, encodé base64
     * @param {object} [opts]
     * @param {boolean} [opts.face]  true = cadrage visage (défaut), false = corps entier
     * @returns {Promise<object>} le viewer
     */
    async renderInto(mount, b64, opts) {
      if (!mount) throw new Error('[Mii3D] mount manquant');
      if (!b64) throw new Error('[Mii3D] blob Mii manquant');

      const MiiClass = await ensureModules();
      const mii = new MiiClass(b64ToBytes(b64));

      // Le viewer se dimensionne sur le mount → il doit être visible avant.
      const prevDisplay = mount.style.display;
      mount.style.display = mount.getAttribute('data-mii3d-display') || 'block';
      void mount.offsetWidth; // force le calcul de layout (clientWidth/Height)

      let viewer = _viewers.get(mount);
      if (!viewer) {
        viewer = new global.MiiViewerFFL(mount);
        _viewers.set(mount, viewer);
      }

      await viewer.update(mii);
      // setBodyView(true) = cadrage corps entier ; setBodyView(false) = visage.
      // Donc « face » demandé → bodyView = false.
      const wantFace = !opts || opts.face === undefined ? true : !!opts.face;
      viewer.setBodyView(!wantFace);

      mount.style.display = prevDisplay;
      return viewer;
    },

    /** Libère le viewer rattaché à un mount (supprime le canvas + contexte WebGL). */
    dispose(mount) {
      const viewer = _viewers.get(mount);
      if (!viewer) return;
      _viewers.delete(mount);
      try { viewer.dispose(); } catch (e) { /* ignore */ }
    },

    /** Libère tous les viewers (utile au logout / rechargement). */
    disposeAll() {
      _viewers.forEach((viewer) => { try { viewer.dispose(); } catch (e) { /* ignore */ } });
      _viewers.clear();
    },
  };

  global.Mii3D = Mii3D;
})(window);
