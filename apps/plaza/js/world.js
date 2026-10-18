/**
 * world.js — La scène de la Plaza : sol, caméra inclinée, décor, éclairage.
 *
 * Ce module ne connaît NI les Mii NI l'UI : il se contente de construire et de
 * faire vivre le « cadre » de la place (façon sélecteur de Mii de la Wii).
 * main.js l'instancie, puis appelle `update()` à chaque frame.
 *
 * Export : createWorld({ scene, aspect, quality }) → objet monde.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAMERA, GROUND, THEMES, DECOR_COLORS } from './config.js';

/* ── Petit générateur pseudo-aléatoire déterministe ──
 * La place doit être identique à chaque chargement (mêmes arbres, mêmes bancs),
 * d'où un RNG à graine plutôt que Math.random(). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Texture de dalles dessinée en canvas (aucun asset externe) ──
 * Dalles adoucies : damier à peine perceptible, biseau « lumière haut-gauche »,
 * mouchetures de granit discrètes — la pierre pastel de la D.A. Mii. */
function makeTileTexture(theme) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const base = '#' + new THREE.Color(theme.tile).getHexString();
  const line = '#' + new THREE.Color(theme.tileLine).getHexString();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  const half = S / 2;
  for (const [ox, oy] of [[0, 0], [half, 0], [0, half], [half, half]]) {
    // Damier très léger (une diagonale à peine plus claire)
    ctx.fillStyle = ox === oy ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0)';
    ctx.fillRect(ox, oy, half, half);
    // Biseau : liseré clair en haut/gauche, ombre douce en bas/droite
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(ox + 3, oy + half - 4);
    ctx.lineTo(ox + 3, oy + 3);
    ctx.lineTo(ox + half - 4, oy + 3);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.moveTo(ox + half - 3, oy + 4);
    ctx.lineTo(ox + half - 3, oy + half - 3);
    ctx.lineTo(ox + 4, oy + half - 3);
    ctx.stroke();
  }
  // Joints des dalles
  ctx.strokeStyle = line;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(1.5, 1.5, S - 3, S - 3);
  ctx.beginPath();
  ctx.moveTo(half, 0); ctx.lineTo(half, S);
  ctx.moveTo(0, half); ctx.lineTo(S, half);
  ctx.stroke();
  // Mouchetures (déterministes) pour casser l'aplat
  const rng2 = mulberry32(99);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.03 + rng2() * 0.05).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(rng2() * S, rng2() * S, 0.8 + rng2() * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── Textures d'ambiance (canvas, pastel) ── */

/** Ciel en dégradé vertical doux, pour le dôme. */
function makeSkyTexture(theme) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, '#' + new THREE.Color(theme.skyTop).getHexString());
  g.addColorStop(0.55, '#' + new THREE.Color(theme.sky).getHexString());
  g.addColorStop(1, '#' + new THREE.Color(theme.fog).getHexString());
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Nuage : tache blanche douce (sprite). */
function makeCloudTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Halo chaud des lampadaires (sprite additif). */
function makeGlowTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,236,180,0.9)');
  g.addColorStop(0.4, 'rgba(255,236,180,0.35)');
  g.addColorStop(1, 'rgba(255,236,180,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Rosace de dallage autour de la fontaine (teinte du thème). */
function makeMotifTexture(theme) {
  const S = 512, R = S / 2;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const line = '#' + new THREE.Color(theme.motif).getHexString();
  const accent = '#' + new THREE.Color(theme.motifAccent).getHexString();
  // Anneaux
  ctx.strokeStyle = line;
  ctx.lineWidth = 16;
  ctx.beginPath(); ctx.arc(R, R, R * 0.86, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(R, R, R * 0.58, 0, Math.PI * 2); ctx.stroke();
  // Huit pétales dans la bande visible autour de la vasque
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(R + Math.cos(a) * R * 0.72, R + Math.sin(a) * R * 0.72);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.042, R * 0.052, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // Pastilles entre les pétales
  ctx.fillStyle = line;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
    ctx.beginPath();
    ctx.arc(R + Math.cos(a) * R * 0.86, R + Math.sin(a) * R * 0.86, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Rayures pastel du toit du kiosque. */
function makeStripeTexture(C) {
  const W = 256, H = 32;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const a = '#' + new THREE.Color(C.stripeA).getHexString();
  const b = '#' + new THREE.Color(C.stripeB).getHexString();
  const n = 8, sw = W / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? b : a;
    ctx.fillRect(i * sw, 0, sw + 1, H);
  }
  const tex = new THREE.CanvasTexture(c);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Miroitement d'eau (taches douces, répétées et défilantes). */
function makeWaterTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const rng2 = mulberry32(5150);
  for (let i = 0; i < 26; i++) {
    const x = rng2() * S, y = rng2() * S, r = 3 + rng2() * 9;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ── Décor : quelques objets low-poly réutilisables ── */

function makeTree(rng, C) {
  const g = new THREE.Group();
  const h = 1.6 + rng() * 1.1;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.26, h, 8),
    new THREE.MeshStandardMaterial({ color: C.trunk, roughness: 1 })
  );
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  g.add(trunk);

  // Houppier « nuage » : grosses boules arrondies (icosaèdre lissé),
  // l'esprit rondouillard du sélecteur de Mii.
  const base = new THREE.Color(rng() > 0.5 ? C.foliage : C.foliageAlt);
  base.offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.06);
  const foliageMat = new THREE.MeshStandardMaterial({ color: base, roughness: 1 });
  const parts = [
    { r: 1.05 + rng() * 0.3, x: 0, y: h + 0.35, z: 0 },
    { r: 0.6 + rng() * 0.2, x: 0.62, y: h + 0.12, z: 0.28 },
    { r: 0.6 + rng() * 0.2, x: -0.55, y: h + 0.18, z: -0.3 },
    { r: 0.48 + rng() * 0.14, x: 0.05, y: h + 1.0, z: 0.05 }
  ];
  for (const p of parts) {
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(p.r, 1), foliageMat);
    blob.position.set(p.x, p.y, p.z);
    blob.castShadow = true;
    g.add(blob);
  }
  g.userData.swayable = g.children.slice(1);
  return g;
}

function makeBush(C) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: C.bush, roughness: 1 });
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mat);
  m.scale.set(1.2, 0.8, 1.2);
  m.position.y = 0.35;
  m.castShadow = true;
  g.add(m);
  return g;
}

function makeBench(C) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 1 });
  const metal = new THREE.MeshStandardMaterial({ color: C.stoneDark, roughness: 0.7, metalness: 0.2 });
  // Assise en lattes
  for (const oz of [-0.24, 0, 0.24]) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.19), wood);
    slat.position.set(0, 0.55, oz); slat.castShadow = true; g.add(slat);
  }
  // Dossier en deux planches douces
  for (const oy of [0.72, 0.94]) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.17, 0.08), wood);
    back.position.set(0, oy, -0.3); back.castShadow = true; g.add(back);
  }
  for (const sx of [-0.85, 0.85]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.7), metal);
    leg.position.set(sx, 0.27, 0); leg.castShadow = true; g.add(leg);
  }
  return g;
}

function makeLamp(C) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8),
    new THREE.MeshStandardMaterial({ color: C.lampPost, roughness: 0.6, metalness: 0.3 })
  );
  post.position.y = 1.6; post.castShadow = true; g.add(post);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: C.lampGlow, emissive: C.lampGlow, emissiveIntensity: 0.0, roughness: 0.4
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), bulbMat);
  bulb.position.y = 3.35; g.add(bulb);
  g.userData.bulbMat = bulbMat;
  return g;
}

function makeFountain(C) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.9 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: C.stoneDark, roughness: 0.9 });
  const waterTex = makeWaterTexture();
  waterTex.repeat.set(3, 3);
  const water = new THREE.MeshStandardMaterial({
    color: C.water, map: waterTex, roughness: 0.25, metalness: 0.1,
    transparent: true, opacity: 0.88
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.0, 0.7, 48), stone);
  base.position.y = 0.35; base.receiveShadow = true; base.castShadow = true; g.add(base);

  const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.28, 48), water);
  basin.position.y = 0.7; g.add(basin);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 1.6, 24), stoneDark);
  pedestal.position.y = 1.5; pedestal.castShadow = true; g.add(pedestal);

  const topBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.9, 0.4, 32), stone);
  topBowl.position.y = 2.4; topBowl.castShadow = true; g.add(topBowl);

  const topWater = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.12, 32), water);
  topWater.position.y = 2.6; g.add(topWater);

  const jet = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 1.4, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: C.waterDeep, transparent: true, opacity: 0.6, roughness: 0.2 })
  );
  jet.position.y = 3.3; g.add(jet);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), stone);
  finial.position.y = 4.1; g.add(finial);

  g.userData.jet = jet;
  g.userData.topWater = topWater;
  g.userData.waterMat = water;
  return g;
}

function makeKiosk(C) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0xf5efe2, roughness: 1 });
  const plinth = new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.9 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.25, 8), plinth);
  base.position.y = 0.13; base.castShadow = true; g.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.2, 8), wall);
  body.position.y = 1.35; body.castShadow = true; g.add(body);
  // Toit rayé pastel + pompon
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: makeStripeTexture(C), roughness: 0.9
  });
  const r = new THREE.Mesh(new THREE.ConeGeometry(2.15, 1.3, 8), roofMat);
  r.position.y = 3.1; r.castShadow = true; g.add(r);
  const finial = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshStandardMaterial({ color: C.stripeA, roughness: 0.8 })
  );
  finial.position.y = 3.85; g.add(finial);
  return g;
}

/* ── Monde ── */
export function createWorld({ scene, aspect, quality, domElement }) {
  const rng = mulberry32(20261016);
  const root = new THREE.Group();
  scene.add(root);

  const poi = {
    center: new THREE.Vector3(0, 0, 0),
    benches: [], trees: [], lamps: [],
    /* Obstacles circulaires pour les Mii ({x, z, r, benchIdx?}) et rayon jouable. */
    obstacles: [], maxRadius: GROUND.radius - 1.2,
  };

  /* --- Éclairage --- */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9fb4c4, 1.0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.35);
  sun.position.set(22, 34, 14);
  if (quality.shadows) {
    sun.castShadow = true;
    const S = quality.shadowMap;
    sun.shadow.mapSize.set(S, S);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    const d = GROUND.radius * 1.1;
    sun.shadow.camera.left = -d; sun.shadow.camera.right = d;
    sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0006;
    sun.shadow.radius = 3;
  }
  scene.add(sun);
  scene.add(sun.target);

  /* --- Sol --- */
  const tileTex = makeTileTexture(THEMES.day);
  tileTex.repeat.set(GROUND.radius * 2 * GROUND.tilesPerUnit, GROUND.radius * 2 * GROUND.tilesPerUnit);
  const groundMat = new THREE.MeshStandardMaterial({
    color: THEMES.day.ground, map: tileTex, roughness: 0.95
  });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(GROUND.radius, 96), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // Bourrelet extérieur (bord de la place)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(GROUND.radius, 0.35, 12, 96),
    new THREE.MeshStandardMaterial({ color: DECOR_COLORS.stone, roughness: 0.9 })
  );
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.1;
  rim.receiveShadow = true;
  root.add(rim);

  /* --- Pelouse + dôme de ciel (DA douce, façon Mii) --- */
  const grassMat = new THREE.MeshStandardMaterial({ color: THEMES.day.grass, roughness: 1 });
  const grass = new THREE.Mesh(
    new THREE.RingGeometry(GROUND.radius + 0.4, GROUND.radius + 58, 64, 1),
    grassMat
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.05;
  grass.receiveShadow = true;
  root.add(grass);

  const skyTexs = {
    day: makeSkyTexture(THEMES.day),
    evening: makeSkyTexture(THEMES.evening),
    night: makeSkyTexture(THEMES.night)
  };
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTexs.day, side: THREE.BackSide, fog: false, depthWrite: false
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 16), skyMat);
  root.add(skyDome);

  /* Étoiles : Points nets (taille écran), visibles la nuit seulement. */
  const starGeo = new THREE.BufferGeometry();
  {
    const starRng = mulberry32(2026);
    const N = 170;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const az = starRng() * Math.PI * 2;
      const elev = 0.12 + starRng() * 1.35;        // au-dessus de l'horizon
      const r = 118;
      pos[i * 3] = Math.cos(az) * Math.cos(elev) * r;
      pos[i * 3 + 1] = Math.sin(elev) * r;
      pos[i * 3 + 2] = Math.sin(az) * Math.cos(elev) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 2.2, sizeAttenuation: false,
    transparent: true, opacity: 0, depthWrite: false, fog: false
  });
  const stars = new THREE.Points(starGeo, starMat);
  root.add(stars);

  /* --- Fontaine centrale --- */
  const fountain = makeFountain(DECOR_COLORS);
  root.add(fountain);
  poi.obstacles.push({ x: 0, z: 0, r: 5.0 }); // vasque (rayon 5,0)
  const waterMap = fountain.userData.waterMat.map;

  /* --- Rosace de dallage + ondes (autour de la fontaine) --- */
  const motifTexs = {
    day: makeMotifTexture(THEMES.day),
    evening: makeMotifTexture(THEMES.evening),
    night: makeMotifTexture(THEMES.night)
  };
  const motifMat = new THREE.MeshBasicMaterial({
    map: motifTexs.day, transparent: true, depthWrite: false, opacity: 0.9
  });
  const motif = new THREE.Mesh(new THREE.CircleGeometry(9.4, 64), motifMat);
  motif.rotation.x = -Math.PI / 2;
  motif.position.y = 0.02;
  root.add(motif);

  const rippleGeo = new THREE.RingGeometry(0.94, 1, 40);
  const ripples = [];
  for (const sp of [
    { r: 3.6, y: 0.86, phase: 0.0 }, { r: 3.6, y: 0.86, phase: 0.34 },
    { r: 3.6, y: 0.86, phase: 0.67 },
    { r: 1.3, y: 2.68, phase: 0.15 }, { r: 1.3, y: 2.68, phase: 0.62 }
  ]) {
    const ring = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false
    }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = sp.y;
    ring.userData.baseR = sp.r;
    ring.userData.phase = sp.phase;
    ripples.push(ring);
    root.add(ring);
  }

  /* --- Décor disposé en anneaux (déterministe) --- */
  const ringDef = [
    { r: 20.5, n: 10, kind: 'tree' },
    { r: 16.5, n: 7, kind: 'tree' },
    { r: 12.0, n: 5, kind: 'bench' },
    { r: 22.5, n: 6, kind: 'lamp' },
    { r: 9.5, n: 6, kind: 'bush' }
  ];
  for (const def of ringDef) {
    const base = rng() * Math.PI * 2;
    for (let i = 0; i < def.n; i++) {
      const a = base + (i / def.n) * Math.PI * 2 + (rng() - 0.5) * 0.25;
      const rr = def.r + (rng() - 0.5) * 1.6;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      let obj;
      if (def.kind === 'tree') {
        obj = makeTree(rng, DECOR_COLORS);
        poi.trees.push(new THREE.Vector3(x, 0, z));
        poi.obstacles.push({ x, z, r: 0.45 });   // tronc
      } else if (def.kind === 'bench') {
        obj = makeBench(DECOR_COLORS);
        const benchIdx = poi.benches.length;
        poi.benches.push(new THREE.Vector3(x, 0, z));
        // Banc ≈ deux cercles (assise 2,0 × 0,7) le long de son axe local X.
        const yaw = Math.atan2(-z, -x);
        for (const ox of [-0.55, 0.55]) {
          poi.obstacles.push({
            x: x + Math.cos(yaw) * ox,
            z: z - Math.sin(yaw) * ox,
            r: 0.5, benchIdx,
          });
        }
      } else if (def.kind === 'lamp') {
        obj = makeLamp(DECOR_COLORS);
        poi.lamps.push(obj);
        poi.obstacles.push({ x, z, r: 0.28 });   // mât
      } else {
        obj = makeBush(DECOR_COLORS);
        poi.obstacles.push({ x, z, r: 0.5 });    // buisson
      }
      obj.position.set(x, 0, z);
      obj.rotation.y = rng() * Math.PI * 2;
      if (def.kind === 'bench') obj.rotation.y = Math.atan2(-z, -x); // bancs tournés vers le centre
      root.add(obj);
    }
  }

  // Kiosque à l'écart
  const kiosk = makeKiosk(DECOR_COLORS);
  kiosk.position.set(-8.5, 0, 13.5);
  kiosk.rotation.y = 0.6;
  root.add(kiosk);
  poi.obstacles.push({ x: -8.5, z: 13.5, r: 2.2 }); // kiosque

  /* --- Fleurs sauvages sur la pelouse (instanciées, 2 draw calls) --- */
  const flowerRng = mulberry32(4242);
  const N_FLOWERS = 64;
  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.02, 0.03, 0.34, 5),
    new THREE.MeshStandardMaterial({ color: DECOR_COLORS.stem, roughness: 1 }),
    N_FLOWERS
  );
  const heads = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.085, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
    N_FLOWERS
  );
  const dummy = new THREE.Object3D();
  const petal = new THREE.Color();
  for (let i = 0; i < N_FLOWERS; i++) {
    const a = flowerRng() * Math.PI * 2;
    const rr = GROUND.radius + 1.8 + flowerRng() * 11;
    const sc = 0.8 + flowerRng() * 0.55;
    dummy.position.set(Math.cos(a) * rr, 0.13 * sc, Math.sin(a) * rr);
    dummy.rotation.set(0, flowerRng() * Math.PI, 0);
    dummy.scale.setScalar(sc);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 0.32 * sc;
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    heads.setColorAt(i, petal.setHex(DECOR_COLORS.flowers[i % DECOR_COLORS.flowers.length]));
  }
  stems.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  root.add(stems, heads);

  /* --- Halo des lampadaires (s'allume le soir / la nuit) --- */
  const glowMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(), color: 0xffe9b0, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  for (const l of poi.lamps) {
    const glow = new THREE.Sprite(glowMat);
    glow.position.set(l.position.x, 3.35, l.position.z);
    glow.scale.set(2.6, 2.6, 1);
    root.add(glow);
  }

  /* --- Nuages pastel qui dérivent lentement --- */
  const cloudMat = new THREE.SpriteMaterial({
    map: makeCloudTexture(), color: THEMES.day.cloud, transparent: true,
    opacity: THEMES.day.cloudOpacity, depthWrite: false
  });
  const clouds = new THREE.Group();
  const cloudRng = mulberry32(777);
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(cloudMat);
    const a = (i / 7) * Math.PI * 2 + cloudRng() * 0.6;
    const rr = 16 + cloudRng() * 28;
    const w = 9 + cloudRng() * 8;
    s.position.set(Math.cos(a) * rr, 16 + cloudRng() * 7, Math.sin(a) * rr);
    s.scale.set(w, w * (0.42 + cloudRng() * 0.2), 1);
    clouds.add(s);
  }
  root.add(clouds);

  /* --- Places assises (2 par banc) ---
   * Le Mii s'assoit légèrement vers l'avant du banc et regarde dans la même
   * direction que celui-ci (rotation.y du banc). */
  poi.seats = [];
  for (let bi = 0; bi < poi.benches.length; bi++) {
    const b = poi.benches[bi];
    const yaw = Math.atan2(-b.z, -b.x);
    for (const dx of [-0.5, 0.5]) {
      const x = b.x + Math.cos(yaw) * dx + Math.sin(yaw) * 0.05;
      const z = b.z - Math.sin(yaw) * dx + Math.cos(yaw) * 0.05;
      poi.seats.push({ x, z, yaw, occupied: false, benchIdx: bi });
    }
  }

  /* ── Caméra orbitale LIBRE ──
   * Souris/tactile : clic-glisser = tourner autour de la place, molette =
   * zoom, clic-droit (ou deux doigts) = déplacer. La rotation verticale est
   * bornée pour ne jamais passer sous le sol. */
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);

  const controls = domElement ? new OrbitControls(camera, domElement) : null;
  if (controls) {
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.8;
    controls.screenSpacePanning = false; // le déplacement suit le sol
    controls.minDistance = CAMERA.minDistance;
    controls.maxDistance = CAMERA.maxDistance;
    controls.minPolarAngle = THREE.MathUtils.degToRad(90 - CAMERA.maxTiltDeg);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(90 - CAMERA.minTiltDeg);
    controls.target.set(CAMERA.target.x, CAMERA.target.y, CAMERA.target.z);
    // Position initiale « diorama » (vue inclinée de trois-quart).
    const az = THREE.MathUtils.degToRad(CAMERA.azimuthDeg);
    const tilt = THREE.MathUtils.degToRad(CAMERA.tiltDeg);
    const horiz = Math.cos(tilt) * CAMERA.distance;
    camera.position.set(
      CAMERA.target.x + Math.sin(az) * horiz,
      CAMERA.target.y + Math.sin(tilt) * CAMERA.distance,
      CAMERA.target.z + Math.cos(az) * horiz
    );
    controls.update();
  }

  /** Garde la cible (et donc la caméra) au-dessus de la place. */
  function clampTarget() {
    if (!controls) return;
    const t = controls.target;
    const cx = THREE.MathUtils.clamp(t.x, -CAMERA.panLimit, CAMERA.panLimit);
    const cz = THREE.MathUtils.clamp(t.z, -CAMERA.panLimit, CAMERA.panLimit);
    const cy = THREE.MathUtils.clamp(t.y, 0, 6);
    const dx = cx - t.x, dy = cy - t.y, dz = cz - t.z;
    if (dx || dy || dz) {
      t.x = cx; t.y = cy; t.z = cz;
      camera.position.x += dx; camera.position.y += dy; camera.position.z += dz;
    }
  }

  /* ── Ambiance / thème ──
   * Un « échantillon » regroupe toutes les valeurs d'ambiance (couleurs,
   * intensités) pour pouvoir les interpoler en douceur entre deux thèmes
   * (cycle jour/nuit branché sur l'heure réelle par main.js). */
  function themeSample(name) {
    const t = THEMES[name] || THEMES.day;
    const lit = name === 'night' || name === 'evening';
    return {
      name,
      bg: new THREE.Color(t.sky),
      fog: new THREE.Color(t.fog),
      fogNear: t.fogNear,
      fogFar: t.fogFar,
      ground: new THREE.Color(t.ground),
      grass: new THREE.Color(t.grass),
      hemiSky: new THREE.Color(t.hemiSky),
      hemiGround: new THREE.Color(t.hemiGround),
      hemiIntensity: t.hemiIntensity,
      sun: new THREE.Color(t.sunColor),
      sunIntensity: t.sunIntensity,
      sunPos: new THREE.Vector3(t.sunPos.x, t.sunPos.y, t.sunPos.z),
      cloud: new THREE.Color(t.cloud),
      cloudOpacity: t.cloudOpacity,
      lamp: lit ? 1.4 : 0,
      glow: lit ? 0.5 : 0,
      star: name === 'night' ? 0.9 : 0
    };
  }

  /** Applique l'échantillon `s` (interpolé depuis `from` à l'avancement e). */
  function applySample(s, e, from) {
    const f = from || s, k = from ? e : 0;
    const L = THREE.MathUtils.lerp;
    scene.background.copy(f.bg).lerp(s.bg, k);
    scene.fog.color.copy(f.fog).lerp(s.fog, k);
    scene.fog.near = L(f.fogNear, s.fogNear, k);
    scene.fog.far = L(f.fogFar, s.fogFar, k);
    groundMat.color.copy(f.ground).lerp(s.ground, k);
    grassMat.color.copy(f.grass).lerp(s.grass, k);
    hemi.color.copy(f.hemiSky).lerp(s.hemiSky, k);
    hemi.groundColor.copy(f.hemiGround).lerp(s.hemiGround, k);
    hemi.intensity = L(f.hemiIntensity, s.hemiIntensity, k);
    sun.color.copy(f.sun).lerp(s.sun, k);
    sun.intensity = L(f.sunIntensity, s.sunIntensity, k);
    sun.position.copy(f.sunPos).lerp(s.sunPos, k);
    sun.target.position.set(0, 0, 0);
    cloudMat.color.copy(f.cloud).lerp(s.cloud, k);
    cloudMat.opacity = L(f.cloudOpacity, s.cloudOpacity, k);
    glowMat.opacity = L(f.glow, s.glow, k);
    starMat.opacity = L(f.star, s.star, k);
    const lampI = L(f.lamp, s.lamp, k);
    poi.lamps.forEach(l => { if (l.userData.bulbMat) l.userData.bulbMat.emissiveIntensity = lampI; });
  }

  function swapThemeTextures(name) {
    skyMat.map = skyTexs[name] || skyTexs.day;
    skyMat.needsUpdate = true;
    motifMat.map = motifTexs[name] || motifTexs.day;
    motifMat.needsUpdate = true;
  }

  /** Photographie des valeurs d'ambiance actuellement affichées. */
  function currentSample() {
    const s = themeSample(themeName);
    s.bg.copy(scene.background);
    s.fog.copy(scene.fog.color);
    s.fogNear = scene.fog.near;
    s.fogFar = scene.fog.far;
    s.ground.copy(groundMat.color);
    s.grass.copy(grassMat.color);
    s.hemiSky.copy(hemi.color);
    s.hemiGround.copy(hemi.groundColor);
    s.hemiIntensity = hemi.intensity;
    s.sun.copy(sun.color);
    s.sunIntensity = sun.intensity;
    s.sunPos.copy(sun.position);
    s.cloud.copy(cloudMat.color);
    s.cloudOpacity = cloudMat.opacity;
    s.glow = glowMat.opacity;
    s.star = starMat.opacity;
    const b = poi.lamps[0] && poi.lamps[0].userData.bulbMat;
    s.lamp = b ? b.emissiveIntensity : 0;
    return s;
  }

  let themeName = 'day';
  let trans = null;

  /** Applique un thème immédiatement. */
  function setTheme(name) {
    themeName = THEMES[name] ? name : 'day';
    trans = null;
    applySample(themeSample(themeName));
    swapThemeTextures(themeName);
    if (tileTex.image) tileTex.needsUpdate = true;
  }

  /** Passe à un thème en fondu doux (durée en secondes) — cycle jour/nuit. */
  function transitionTo(name, seconds) {
    const nn = THEMES[name] ? name : 'day';
    if (nn === themeName) return;
    themeName = nn;
    trans = {
      from: currentSample(), to: themeSample(nn),
      k: 0, dur: seconds || 3, swapped: false
    };
  }

  scene.background = new THREE.Color(THEMES.day.sky);
  scene.fog = new THREE.Fog(THEMES.day.fog, THEMES.day.fogNear, THEMES.day.fogFar);
  setTheme('day');

  /* ── Animation douce (eau, feuillage, pommeau) ── */
  let t = 0;
  function update(dt) {
    t += dt;
    // Fondu de thème en cours (cycle jour/nuit)
    if (trans) {
      trans.k = Math.min(1, trans.k + dt / trans.dur);
      const e = trans.k * trans.k * (3 - 2 * trans.k);   // smoothstep
      applySample(trans.to, e, trans.from);
      if (!trans.swapped && e >= 0.5) {
        swapThemeTextures(trans.name);
        trans.swapped = true;
      }
      if (trans.k >= 1) trans = null;
    }
    if (controls) { clampTarget(); controls.update(); }
    const jet = fountain.userData.jet;
    if (jet) {
      jet.scale.y = 1 + Math.sin(t * 3.0) * 0.12;
      jet.rotation.y = t * 0.8;
    }
    // Eau : miroitement qui défile + ondes concentriques
    waterMap.offset.x = (waterMap.offset.x + dt * 0.008) % 1;
    waterMap.offset.y = (waterMap.offset.y + dt * 0.016) % 1;
    for (const ring of ripples) {
      const p = (t * 0.28 + ring.userData.phase) % 1;
      ring.scale.setScalar(ring.userData.baseR * (0.5 + p * 0.48));
      ring.material.opacity = 0.4 * (1 - p) * (1 - p);
    }
    // Nuages : dérive très lente
    clouds.rotation.y += dt * 0.006;
    // Léger balancement des feuillages
    root.traverse(o => {
      if (o.userData && o.userData.swayable) {
        const s = 1 + Math.sin(t * 1.2 + o.position.x + o.position.z) * 0.02;
        o.userData.swayable.forEach(m => { m.scale.setScalar(s); });
      }
    });
  }

  function resize(newAspect) {
    camera.aspect = newAspect;
    camera.updateProjectionMatrix();
  }

  /** Recentre la caméra sur la vue « diorama » d'origine. */
  function resetView() {
    if (!controls) return;
    const az = THREE.MathUtils.degToRad(CAMERA.azimuthDeg);
    const tilt = THREE.MathUtils.degToRad(CAMERA.tiltDeg);
    const horiz = Math.cos(tilt) * CAMERA.distance;
    controls.target.set(CAMERA.target.x, CAMERA.target.y, CAMERA.target.z);
    camera.position.set(
      CAMERA.target.x + Math.sin(az) * horiz,
      CAMERA.target.y + Math.sin(tilt) * CAMERA.distance,
      CAMERA.target.z + Math.cos(az) * horiz
    );
    controls.update();
  }

  function dispose() {
    if (controls) controls.dispose();
    scene.remove(hemi, sun, sun.target, root);
    root.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
    tileTex.dispose();
    for (const k of Object.keys(skyTexs)) skyTexs[k].dispose();
    for (const k of Object.keys(motifTexs)) motifTexs[k].dispose();
  }

  return {
    camera, controls, poi, update, setTheme, transitionTo, resize, resetView, dispose,
    getTheme: () => THEMES[themeName], getThemeName: () => themeName
  };
}
