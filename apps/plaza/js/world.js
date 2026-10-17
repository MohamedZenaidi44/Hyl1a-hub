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

/* ── Texture de dalles dessinée en canvas (aucun asset externe) ── */
function makeTileTexture(theme) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const base = '#' + new THREE.Color(theme.tile).getHexString();
  const line = '#' + new THREE.Color(theme.tileLine).getHexString();
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  // Damier très léger pour casser l'uniformité
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, 0, S / 2, S / 2);
  ctx.fillRect(S / 2, S / 2, S / 2, S / 2);
  // Joints des dalles
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, S - 3, S - 3);
  ctx.beginPath();
  ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S);
  ctx.moveTo(0, S / 2); ctx.lineTo(S, S / 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/* ── Décor : quelques objets low-poly réutilisables ── */

function makeTree(rng, C) {
  const g = new THREE.Group();
  const h = 1.6 + rng() * 1.1;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, h, 6),
    new THREE.MeshStandardMaterial({ color: C.trunk, roughness: 1 })
  );
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  g.add(trunk);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: rng() > 0.5 ? C.foliage : C.foliageAlt, roughness: 1
  });
  const blobs = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < blobs; i++) {
    const r = 0.7 + rng() * 0.5;
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), foliageMat);
    blob.position.set((rng() - 0.5) * 0.7, h + 0.2 + i * 0.55, (rng() - 0.5) * 0.7);
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
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.7), wood);
  seat.position.y = 0.55; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.1), wood);
  back.position.set(0, 0.85, -0.3); back.castShadow = true; g.add(back);
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
  const water = new THREE.MeshStandardMaterial({
    color: C.water, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.85
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
  return g;
}

function makeKiosk(C) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0xf5efe2, roughness: 1 });
  const roof = new THREE.MeshStandardMaterial({ color: DECOR_COLORS.foliage, roughness: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.2, 8), wall);
  body.position.y = 1.1; body.castShadow = true; g.add(body);
  const r = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.2, 8), roof);
  r.position.y = 2.8; r.castShadow = true; g.add(r);
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

  /* --- Fontaine centrale --- */
  const fountain = makeFountain(DECOR_COLORS);
  root.add(fountain);
  poi.obstacles.push({ x: 0, z: 0, r: 5.0 }); // vasque (rayon 5,0)

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

  /* ── Ambiance / thème ── */
  let theme = THEMES.day;
  function setTheme(name) {
    const t = THEMES[name] || THEMES.day;
    theme = t;
    scene.background = new THREE.Color(t.sky);
    scene.fog = new THREE.Fog(t.fog, t.fogNear, t.fogFar);
    groundMat.color.setHex(t.ground);
    hemi.color.setHex(t.hemiSky);
    hemi.groundColor.setHex(t.hemiGround);
    hemi.intensity = t.hemiIntensity;
    sun.color.setHex(t.sunColor);
    sun.intensity = t.sunIntensity;
    sun.position.set(t.sunPos.x, t.sunPos.y, t.sunPos.z);
    sun.target.position.set(0, 0, 0);
    tileTex.image && (tileTex.needsUpdate = true);
    // Lampadaires : s'allument la nuit / le soir
    const lit = name === 'night' || name === 'evening';
    poi.lamps.forEach(l => { if (l.userData.bulbMat) l.userData.bulbMat.emissiveIntensity = lit ? 1.4 : 0.0; });
  }
  setTheme('day');

  /* ── Animation douce (eau, feuillage, pommeau) ── */
  let t = 0;
  function update(dt) {
    t += dt;
    if (controls) { clampTarget(); controls.update(); }
    const jet = fountain.userData.jet;
    if (jet) {
      jet.scale.y = 1 + Math.sin(t * 3.0) * 0.12;
      jet.rotation.y = t * 0.8;
    }
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
  }

  return { camera, controls, poi, update, setTheme, resize, resetView, dispose, getTheme: () => theme };
}
