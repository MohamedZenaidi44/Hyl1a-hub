/**
 * main.js — Point d'entrée de l'app PLAZA.
 *
 * Contrat commun des apps du hub : `export default async function render(container)`.
 * Le hub (app.js) crée un `.mii-fullscreen-container` puis appelle cette fonction.
 *
 * Étape 1 : scène Three.js (sol, caméra inclinée, éclairage) + boucle de rendu.
 * Les Mii, l'IA, les interactions et l'UI complète viendront dans les étapes
 * suivantes (le code est déjà découpé pour les accueillir).
 */

import * as THREE from 'three';
import { createWorld } from './world.js';
import { APP_ID, APP_TITLE, QUALITY } from './config.js';
import { MiiEntity } from './mii.js';
import { loadLocalMii } from './storage.js';
import { makePopulation } from './population.js';
import { createSocial } from './social.js';

/* Injecte la feuille de style de l'app une seule fois. */
function ensureStyles() {
  const href = new URL('../css/plaza.css', import.meta.url).href;
  if (document.querySelector(`link[data-plaza-css="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.plazaCss = href;
  document.head.appendChild(link);
}

/** Thème d'ambiance selon l'heure locale (mêmes bornes que le rythme du
 *  jour des Mii : matin 5-12 et après-midi 12-18 = jour, 18-22 = soir,
 *  22-5 = nuit). */
function themeForHour(h) {
  if (h >= 5 && h < 18) return 'day';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}

export default async function renderPlaza(container) {
  ensureStyles();

  /* ── Détermine la qualité selon le mode éco / détection de perf du hub ── */
  const eco = document.body.classList.contains('eco-mode');
  const quality = eco ? QUALITY.low : QUALITY.medium;

  /* ── Structure HTML (HUD en verre sombre, façon hub) ── */
  container.classList.add('plaza-root');
  container.innerHTML = `
    <div class="plaza-canvas-area" id="plaza-canvas-container"></div>
    <div class="plaza-vignette" aria-hidden="true"></div>
    <header class="plaza-hud plaza-hud-top">
      <button class="plaza-back" id="plaza-back" type="button" title="Retour au menu (Échap)">
        <span class="plaza-back-icon">◀</span> Menu
      </button>
      <div class="plaza-title">
        <span class="plaza-title-name">${APP_TITLE}</span>
        <span class="plaza-title-sub" id="plaza-count">0 Mii</span>
      </div>
      <div class="plaza-hud-right">
        <span class="plaza-chip" id="plaza-clock">--:--</span>
        <span class="plaza-chip plaza-chip-dim" id="plaza-fps">-- fps</span>
      </div>
    </header>
    <div class="plaza-loading" id="plaza-loading">
      <div class="plaza-spinner"></div>
      <span>Préparation de la place…</span>
    </div>
  `;

  const canvasArea = container.querySelector('#plaza-canvas-container');
  const loadingEl = container.querySelector('#plaza-loading');
  const fpsEl = container.querySelector('#plaza-fps');
  const clockEl = container.querySelector('#plaza-clock');

  /* ── Renderer ── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0xcfe3f2, 1);
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
  canvasArea.appendChild(renderer.domElement);

  /* ── Scène + monde ── */
  const scene = new THREE.Scene();
  let width = canvasArea.clientWidth || window.innerWidth;
  let height = canvasArea.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);

  const world = createWorld({ scene, aspect: width / height, quality, domElement: renderer.domElement });

  /* ── Cycle jour/nuit sur l'heure réelle ──
   * Le thème correspondant à l'heure locale est appliqué dès le chargement,
   * puis un fondu doux suit chaque changement de tranche horaire (vérifié
   * à chaque tick de l'horloge HUD). */
  let themeBucket = themeForHour(new Date().getHours());
  world.setTheme(themeBucket);

  /* ── Les Mii ──
   * « Mon Mii » (Firestore ou défaut) + une petite population de Mii
   * aléatoires déterministes (population.js). Le directeur social (social.js)
   * gère l'errance, les croisements, les conversations et les bancs. */
  const miis = [];
  const myMii = await loadLocalMii();
  const me = new MiiEntity(scene, {
    name: myMii.name,
    b64: myMii.b64,
    position: new THREE.Vector3(0, 0, 6),
    renderer,
    obstacles: world.poi.obstacles,
    maxRadius: world.poi.maxRadius,
  });
  miis.push(me);

  const POPULATION_SIZE = 5;
  const locals = makePopulation(POPULATION_SIZE, { exclude: [myMii.name] });
  for (let i = 0; i < locals.length; i++) {
    const a = (i / locals.length) * Math.PI * 2 + 0.7;
    const r = 7 + (i % 3) * 2.5;
    miis.push(new MiiEntity(scene, {
      name: locals[i].name,
      b64: locals[i].b64,
      position: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r),
      renderer,
      obstacles: world.poi.obstacles,
      maxRadius: world.poi.maxRadius,
    }));
  }

  // Chaque Mii connaît les autres (évitement latéral pendant la marche).
  for (const m of miis) m.others = miis;

  const social = createSocial({ world, miis });

  const countEl = container.querySelector('#plaza-count');
  if (countEl) countEl.textContent = `${miis.length} Mii`;

  /* ── Redimensionnement (responsive + DPR plafonné) ── */
  const onResize = () => {
    width = canvasArea.clientWidth || window.innerWidth;
    height = canvasArea.clientHeight || window.innerHeight;
    if (!width || !height) return;
    world.resize(width / height);
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
  };
  window.addEventListener('resize', onResize);
  const ro = ('ResizeObserver' in window) ? new ResizeObserver(onResize) : null;
  if (ro) ro.observe(canvasArea);

  /* ── Entrées ──
   * La caméra est libre (OrbitControls) : clic-glisser = tourner, molette =
   * zoom, clic-droit = déplacer. « R » recentre sur la vue d'origine. */
  const onKeyView = (e) => { if (e.key === 'r' || e.key === 'R') world.resetView(); };
  window.addEventListener('keydown', onKeyView);

  const close = () => {
    const reg = window.AppRegistry && window.AppRegistry[APP_ID];
    if (reg && typeof reg.close === 'function') reg.close();
  };
  container.querySelector('#plaza-back').addEventListener('click', close);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  /* ── Horloge HUD + bascule jour/nuit ── */
  const clockTimer = setInterval(() => {
    const d = new Date();
    clockEl.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const bucket = themeForHour(d.getHours());
    if (bucket !== themeBucket) {
      themeBucket = bucket;
      world.transitionTo(bucket, 4);   // fondu de 4 s entre deux ambiances
    }
  }, 10000);
  clockEl.textContent = (() => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); })();

  /* ── Visibilité de l'onglet : on met en pause hors écran ── */
  let visible = true;
  const onVisibility = () => { visible = document.visibilityState === 'visible'; };
  document.addEventListener('visibilitychange', onVisibility);

  /* ── Boucle : logique à pas fixe (30 Hz) + rendu libre (rAF) ── */
  const STEP = 1 / 30;
  let acc = 0, last = performance.now();
  let frames = 0, fpsTimer = 0;
  let rafId = 0;
  let disposed = false;

  function cleanup() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    clearInterval(clockTimer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', onKeyView);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    if (ro) ro.disconnect();
    for (let i = 0; i < miis.length; i++) miis[i].dispose();
    world.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  function frame(now) {
    // Si le conteneur a été retiré du DOM (fermeture par le hub), on s'arrête.
    if (!container.isConnected) { cleanup(); return; }
    rafId = requestAnimationFrame(frame);

    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25; // garde-fou après un onglet caché

    // Stats FPS
    frames++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      fpsEl.textContent = Math.round(frames / fpsTimer) + ' fps';
      frames = 0; fpsTimer = 0;
    }

    if (visible) {
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard++ < 8) {
        world.update(STEP);
        social.update(STEP);
        for (let i = 0; i < miis.length; i++) miis[i].update(STEP);
        acc -= STEP;
      }
      renderer.render(scene, world.camera);
    }
  }

  // On masque l'écran de chargement une fois la première frame prête.
  requestAnimationFrame((t) => {
    last = t;
    renderer.render(scene, world.camera);
    loadingEl.classList.add('plaza-loading-hidden');
    frame(t);
  });

  // Exposé pour les étapes suivantes (IA, social, UI).
  container._plaza = { THREE, scene, renderer, world, quality, miis, me, social, themeForHour };
}
