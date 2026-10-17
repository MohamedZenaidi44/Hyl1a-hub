/**
 * miiRendererFFL.js  (script « classic », chargé via loadScript par miiMaker.js)
 * ------------------------------------------------------------------
 * Expose `window.MiiViewerFFL` avec la MÊME API que l'ancien
 * `window.MiiViewer3D` :
 *   new MiiViewerFFL(mountEl)
 *   await viewer.update(miiInstance)
 *   viewer.rotateBy(deg)
 *   viewer.setBodyView(bool) // cadrage visage / corps entier
 *   viewer.camera            // THREE.PerspectiveCamera (null tant que non prêt)
 *
 * Le moteur réel (FFL.js + Three r180 en ESM) est chargé dynamiquement via
 * l'importmap `three` de index.html. Comme `new` est appelé de façon
 * synchrone par miiMaker.js, cette classe est un PROXY : la construction du
 * vrai viewer est différée jusqu'au premier `update()` (asynchrone).
 * ------------------------------------------------------------------
 */
(function (global) {
  let MODULE_URL;
  try {
    const self = document.currentScript;
    MODULE_URL = (self && self.src)
      ? new URL('miiViewerFFL.js', self.src).href
      : new URL('apps/mii_maker/js/miiViewerFFL.js', document.baseURI).href;
  } catch (e) {
    MODULE_URL = 'apps/mii_maker/js/miiViewerFFL.js';
  }

  let modPromise = null;
  function loadModule() {
    if (!modPromise) modPromise = import(MODULE_URL);
    return modPromise;
  }

  class MiiViewerFFL {
    constructor(mount) {
      this.mount = mount;
      this._impl = null;
      this._ready = loadModule().then((m) => {
        if (!this._impl) this._impl = new m.MiiViewerFFL(this.mount);
        return this._impl;
      });
    }

    /** Caméra du rendu (null tant que le moteur n'est pas initialisé). */
    get camera() {
      return this._impl ? this._impl.camera : null;
    }

    async update(mii) {
      const impl = await this._ready;
      return impl.update(mii);
    }

    rotateBy(deg) {
      if (this._impl) {
        this._impl.rotateBy(deg);
      } else {
        this._ready.then((impl) => impl.rotateBy(deg)).catch(() => {});
      }
    }

    setBodyView(enabled) {
      if (this._impl) {
        this._impl.setBodyView(enabled);
      } else {
        this._ready.then((impl) => impl.setBodyView(enabled)).catch(() => {});
      }
    }

    dispose() {
      if (this._impl) {
        this._impl.dispose();
      } else {
        this._ready.then((impl) => impl.dispose()).catch(() => {});
      }
    }
  }

  global.MiiViewerFFL = MiiViewerFFL;
})(window);
