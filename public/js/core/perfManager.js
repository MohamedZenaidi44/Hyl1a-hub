/**
 * PerfManager — détection automatique de matériel peu puissant
 *
 * Active le « Mode Économie » (voir ThemeManager.setEcoMode) sur les vieux
 * ordinateurs / appareils faibles, pour préserver la fluidité. La détection
 * ne s'applique que si l'utilisateur n'a jamais choisi lui-même (préférence
 * manuelle figée via localStorage 'hylia-eco-mode-manual').
 *
 * Signaux utilisés :
 *   - navigator.connection.saveData (mode économie de données)
 *   - navigator.hardwareConcurrency (cœurs CPU)
 *   - navigator.deviceMemory (RAM approximative, en Go)
 *   - prefers-reduced-motion
 *   - renderer WebGL logiciel (SwiftShader / WARP / llvmpipe…)
 *   - mesure réelle du nombre d'images par seconde (rAF)
 */

(function () {
  'use strict';

  const MANUAL_KEY = 'hylia-eco-mode-manual';
  const ECO_KEY = 'hylia-eco-mode';

  function prefersReducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  /* Signaux statiques — verdict rapide sans attendre une mesure */
  function weakHardware() {
    try {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn && conn.saveData) return true;

      const cores = navigator.hardwareConcurrency || 0;
      if (cores && cores <= 2) return true;

      const mem = navigator.deviceMemory || 0; // Go
      if (cores && mem && cores <= 4 && mem <= 4) return true;

      if (prefersReducedMotion()) return true;

      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = String(
          (dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || ''
        ).toLowerCase();
        if (/swiftshader|llvmpipe|softwarerasterizer|software|microsoft basic|basic render|\bwarp\b|generic renderer/.test(renderer)) {
          return true;
        }
      }
    } catch (e) { /* ignorer */ }
    return false;
  }

  /* Mesure FPS sur une courte fenêtre (rAF) */
  function sampleFps(durationMs) {
    return new Promise((resolve) => {
      let frames = 0;
      let start = 0;
      let raf = 0;
      const tick = (t) => {
        if (!start) start = t;
        frames++;
        if (t - start >= durationMs) {
          const fps = (frames * 1000) / (t - start);
          resolve(fps);
        } else {
          raf = requestAnimationFrame(tick);
        }
      };
      raf = requestAnimationFrame(tick);
    });
  }

  function apply(active) {
    if (window.ThemeManager && typeof window.ThemeManager.setEcoMode === 'function') {
      window.ThemeManager.setEcoMode(active, false);
    }
  }

  async function run() {
    // L'utilisateur a déjà choisi : on respecte son choix.
    if (localStorage.getItem(MANUAL_KEY) === 'true') return;

    // Verdict matériel immédiat.
    if (weakHardware()) {
      apply(true);
      return;
    }

    // Sinon, on mesure la fluidité réelle après stabilisation.
    await new Promise((r) => setTimeout(r, 2500));
    if (document.hidden) return; // pas de mesure fiable en arrière-plan

    const fps = await sampleFps(1500);
    // Sous ~40 fps, l'appareil peine : on bascule en mode économie.
    if (fps > 0 && fps < 40) {
      apply(true);
    } else if (localStorage.getItem(ECO_KEY) === 'true') {
      // Appareil redevenu OK et aucun choix manuel : on sort du mode économie.
      apply(false);
    }
  }

  window.PerfManager = {
    detect: weakHardware,
    sampleFps,
    run,
    resetAuto: function () {
      localStorage.removeItem(MANUAL_KEY);
      run();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(run, 0));
  } else {
    setTimeout(run, 0);
  }
})();
