/**
 * mii.js — Un Mii de la Plaza (entité **3D** + animations de base).
 *
 * Le Mii est construit en **vraie 3D complète** (tête FFL + corps glTF Wii U)
 * par `mii3d.js`, puis inséré dans la **scène partagée** de la Plaza.
 * Repli automatique si la 3D échoue (WebGL/FFL indisponible) : un sprite image
 * (rendu `/miis/image.png`) puis un Mii procédural dessiné en canvas — la place
 * n'est jamais vide.
 *
 * Animations : veille (`idle`), locomotion (`walk`/`run`) et un ensemble
 * d'expressions/gestes type Tomodachi (`wave`, `talk`, `cheer`, `dance`,
 * `sad`, `lookaround`, `wavetransition`) plus `sit` pour plus tard (bancs).
 * Les clips sont bakés hors-ligne (`tests/retarget.html`) et chargés par
 * `miiAnims.js`.
 */

import * as THREE from 'three';
import { buildMii3D, canBuild3D } from './mii3d.js';

const IMAGE_BASE = 'https://mii-unsecure.ariankordi.net/miis/image.png';

const DEFAULT_HEIGHT = 1.9;   // taille d'un Mii en unités monde
const WALK_SPEED = 1.15;      // unités/s (allure naturelle d'un Mii)
const ARRIVE_EPS = 0.12;
const MODEL_YAW = 0;          // correction d'orientation du modèle 3D si besoin
const SIT_DROP = 0.12;        // abaissement du groupe quand le Mii s'assied (banc)
const MII_RADIUS = 0.32;      // rayon de collision du Mii (obstacles)
/* Corrections de pitch tête PAR CLIP (le bake Miitomo penche la tête vers le
 * sol : podwalk ~23°, podsit ~12°) — appliquées pondérées par le clip actif. */
const HEAD_FIX_DEGS = { podwalk: -16, podsit: -8 };

/* Temps réutilisables (évite les allocations par frame). */
const _tmpV = new THREE.Vector3();
const _tmpQ = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0);

/** URL du rendu image (2D) d'un Mii à partir de ses données FFSD (base64). */
export function miiImageUrl(b64, { width = 256, type = 'all_body' } = {}) {
  return `${IMAGE_BASE}?data=${encodeURIComponent(b64)}&verifyCharInfo=0&type=${type}&width=${width}&shaderType=wiiu`;
}

/* ── Textures utilitaires du secours 2D (canvas, hors-ligne) ── */

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Mii procédural de secours (aucune dépendance réseau). */
function proceduralMiiTexture(name) {
  const W = 128, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const hue = hashStr(name || 'Mii') % 360;
  const skin = `hsl(28, 55%, ${72 + (hashStr(name) % 8)}%)`;
  const shirt = `hsl(${hue}, 62%, 55%)`;

  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(W * 0.30, H);
  ctx.lineTo(W * 0.34, H * 0.52);
  ctx.quadraticCurveTo(W * 0.5, H * 0.44, W * 0.66, H * 0.52);
  ctx.lineTo(W * 0.70, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = skin;
  ctx.fillRect(W * 0.24, H * 0.52, W * 0.10, H * 0.36);
  ctx.fillRect(W * 0.66, H * 0.52, W * 0.10, H * 0.36);

  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.30, W * 0.30, H * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `hsl(${(hue + 40) % 360}, 45%, 28%)`;
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.20, W * 0.31, H * 0.13, 0, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath(); ctx.arc(W * 0.43, H * 0.29, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.57, H * 0.29, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(W * 0.5, H * 0.33, W * 0.10, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Ombre « blob » douce (dégradé radial). */
function blobShadowTexture() {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.45)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

/** Étiquette du nom (pilule arrondie). */
function labelTexture(name) {
  const pad = 20, font = '600 40px Nunito, Segoe UI, sans-serif';
  const c = document.createElement('canvas');
  const ctx0 = c.getContext('2d');
  ctx0.font = font;
  const w = Math.ceil(ctx0.measureText(name).width) + pad * 2;
  const h = 64;
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const r = h / 2;
  ctx.fillStyle = 'rgba(20,26,36,0.72)';
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(w - r, 0);
  ctx.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(r, h);
  ctx.arc(r, r, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#eef6ff';
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: w / h };
}

/* ── Entité Mii ── */

export class MiiEntity {
  /**
   * @param {THREE.Scene} scene
   * @param {{name:string, b64:string, position?:THREE.Vector3, height?:number, renderer?:THREE.WebGLRenderer}} opts
   */
  constructor(scene, opts) {
    this.scene = scene;
    this.name = opts.name || 'Mii';
    this.b64 = opts.b64 || '';
    this.renderer = opts.renderer || null;
    this.height = opts.height || DEFAULT_HEIGHT;
    this.speed = WALK_SPEED;
    this.state = 'idle';
    this.t = Math.random() * 10;
    this.target = null;
    this.is3D = false;
    this.model = null;
    this.mixer = null;
    this._built = null;
    this._disposed = false;
    this._animName = null;
    this._gesturing = false;
    this._idleTimer = 3 + Math.random() * 6;
    /* Pilotage social (social.js) : quand `scripted` est vrai, l'IA locale
     * (veille/gestes) est suspendue et le directeur décide des animations. */
    this.scripted = false;
    this.yawTarget = null;
    this.seat = null;
    this.busy = false;
    /* Collisions : obstacles du monde ({x, z, r, benchIdx?}) + limite de la place. */
    this.obstacles = opts.obstacles || [];
    this.maxRadius = opts.maxRadius || 0;
    this._ignoreBench = null;   // banc ignoré le temps d'aller s'asseoir
    this._headBone = null;      // os « head » (correction de pitch)
    this._chestBone = null;     // os « chest » (le nametag y est accroché — stable)
    this._tagOffset = 1.12;     // hauteur du nametag au-dessus du torse (calculée par Mii)
    this._hdg = null;           // cap de marche (rad) — pilotage en courbes
    this._avoid = 0;            // décalage d'évitement lissé (rad)
    this._swayPh = Math.random() * Math.PI * 2;  // phase de l'ondulation de marche

    // Groupe racine (position au sol + orientation).
    this.group = new THREE.Group();
    this.group.position.copy(opts.position || new THREE.Vector3(0, 0, 0));

    // `content` porte le modèle : c'est lui qu'on anime (rebond, respiration).
    this.content = new THREE.Group();
    this.group.add(this.content);

    // Ombre au sol.
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.7),
      new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.group.add(this.shadow);

    // Étiquette du nom.
    const lbl = labelTexture(this.name);
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: lbl.tex, transparent: true, depthWrite: false }));
    const lh = 0.32;
    this.label.scale.set(lh * lbl.aspect, lh, 1);
    this.label.position.y = this.height + 0.3;
    this.label.center.set(0.5, 0);
    this.group.add(this.label);

    scene.add(this.group);

    this._load();
  }

  async _load() {
    try {
      if (!this.renderer || !canBuild3D(this.b64)) throw new Error('3D indisponible');
      const built = await buildMii3D({ b64: this.b64, renderer: this.renderer, height: this.height });
      if (this._disposed) { built.dispose(); return; }
      this._built = built;
      this.content.add(built.group);
      this.mixer = built.mixer;
      this.model = built.group;   // groupe de scène (tête + corps)
      this._headBone = this.model.getObjectByName('head') || null;
      this._chestBone = this.model.getObjectByName('chest') || null;
      // Le nametag est posé d'après le sommet RÉEL de la tête (cheveux compris),
      // calculé au premier update() (les matrices du squelette ne sont fiables
      // qu'une fois la première frame d'animation appliquée).
      this._tagNeedsCalc = !!this._headBone;
      this.is3D = true;
      this._animName = 'idle';
      this._walkName = built.actions && built.actions.podwalk ? 'podwalk' : 'walk';
      this.strideWorld = built.strideWorld || 0;
      this.walkPeriod = built.walkPeriod || 1;

      // Fin d'un geste (« wave », « look around ») → retour à la veille.
      if (this.mixer) {
        this.mixer.addEventListener('finished', () => {
          if (this.scripted || !this._gesturing || this._disposed) return;
          this._gesturing = false;
          this._idleTimer = 5 + Math.random() * 7;
          this._animName = 'idle';
          this._built && this._built.play('idle', { fade: 0.3 });
        });
      }
    } catch (e) {
      if (!this._disposed) this._loadSprite();
    }
  }

  /* ── Secours 2D : sprite image puis procédural ── */
  _loadSprite() {
    const material = new THREE.SpriteMaterial({ transparent: true, depthWrite: true });
    this.sprite = new THREE.Sprite(material);
    this.sprite.center.set(0.5, 0);
    this.sprite.scale.set(this.height * 0.5, this.height, 1);
    this.content.add(this.sprite);

    const apply = (tex) => {
      if (this._disposed) { tex.dispose(); return; }
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      material.map = tex;
      material.needsUpdate = true;
      const img = tex.image;
      if (img && img.width && img.height) {
        this.sprite.scale.set(this.height * (img.width / img.height), this.height, 1);
      }
    };

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    if (!this.b64) { apply(proceduralMiiTexture(this.name)); return; }
    loader.load(miiImageUrl(this.b64), apply, undefined, () => apply(proceduralMiiTexture(this.name)));
  }

  /** Fait marcher le Mii vers un point du sol (pilotage doux, en courbes). */
  walkTo(x, z) {
    this.target = new THREE.Vector2(x, z);
    this.state = 'walk';
    this.yawTarget = null;
    // Cap de départ = direction actuelle du Mii : les trajets s'enchaînent en
    // courbes continues (façon flânerie), sans zigzag d'un trajet à l'autre.
    this._hdg = this.group.rotation.y - MODEL_YAW;
    this._avoid = 0;
  }

  /** Repasse en veille. */
  idle() { this.state = 'idle'; this.target = null; }

  /** Arrête net le déplacement (sans changer d'animation). */
  halt() { this.target = null; if (this.state === 'walk') this.state = 'idle'; }

  /** Regarde progressivement vers un point du sol (lissage dans update). */
  faceTo(x, z) {
    const dx = x - this.group.position.x;
    const dz = z - this.group.position.z;
    if (dx * dx + dz * dz < 1e-6) return;
    this.yawTarget = MODEL_YAW + Math.atan2(dx, dz);
  }

  /** Joue une animation précise (pilotage scripté par social.js). */
  playAnim(name, { once = false, fade = 0.25 } = {}) {
    if (!this._built) return null;
    const act = this._built.play(name, { once, fade });
    if (act) this._animName = name;
    return act;
  }

  /** Assied le Mii sur une place de banc {x, z, yaw}. */
  sitAt(seat) {
    this.halt();
    this.state = 'sit';
    this.seat = seat;
    this.group.position.set(seat.x, -SIT_DROP, seat.z);
    this.group.rotation.y = MODEL_YAW + (seat.yaw || 0);
    this.yawTarget = null;
    if (this.shadow) this.shadow.position.y = 0.02 + SIT_DROP;
    this.playAnim('podsit', { once: false, fade: 0.3 });
  }

  /** Se relève et repart (vers un point ou en veille). */
  standUp(x, z) {
    this.seat = null;
    this.group.position.y = 0;
    if (this.shadow) this.shadow.position.y = 0.02;
    if (typeof x === 'number' && typeof z === 'number') this.walkTo(x, z);
    else this.idle();
  }

  get position() { return this.group.position; }

  update(dt) {
    if (this._disposed) return;
    this.t += dt;

    this._driveAnim(dt);
    if (this.mixer) this.mixer.update(dt);
    this._applyHeadFix();

    if (this.state === 'walk' && this.target) {
      const dx = this.target.x - this.group.position.x;
      const dz = this.target.y - this.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= ARRIVE_EPS) {
        this.group.position.x = this.target.x;
        this.group.position.z = this.target.y;
        this._resolveCollisions();
        this.idle();
      } else {
        // Pilotage « flânerie » (façon Tomodachi Life) : le cap converge vers
        // la cible avec une courbure limitée (rayon ∝ distance → jamais
        // d'orbite) + une ondulation lente qui s'estompe près du but.
        const desired = Math.atan2(dx, dz);
        if (this._hdg == null) this._hdg = this.group.rotation.y - MODEL_YAW;
        let diff = desired - this._hdg;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const err = Math.abs(diff);
        const radius = Math.max(0.45, Math.min(err > 1.2 ? 0.7 : err > 0.5 ? 1.4 : 3.0, dist * 0.5));
        const maxTurn = (this.speed / radius) * dt;
        this._hdg += Math.max(-maxTurn, Math.min(maxTurn, diff));
        // Évitement : se décale latéralement s'il y a un autre Mii devant
        // (contournement visible, comme un piéton) — lissé.
        let avoidWant = 0;
        if (!this.scripted && this.others) {
          const fx = Math.sin(this._hdg), fz = Math.cos(this._hdg);
          for (let i = 0; i < this.others.length; i++) {
            const o = this.others[i];
            if (o === this || o._disposed) continue;
            const ox = o.group.position.x - this.group.position.x;
            const oz = o.group.position.z - this.group.position.z;
            const od2 = ox * ox + oz * oz;
            if (od2 > 6.76 || od2 < 1e-6) continue;
            const od = Math.sqrt(od2);
            const ahead = (ox * fx + oz * fz) / od;
            if (ahead < -0.1) continue;
            const cross = fz * ox - fx * oz;
            avoidWant += (cross >= 0 ? -1 : 1) * ((6.76 - od2) / 6.76) * Math.max(0, ahead) * 1.5;
          }
          avoidWant = Math.max(-1.1, Math.min(1.1, avoidWant));
        }
        this._avoid += (avoidWant - this._avoid) * Math.min(1, dt * 12);
        let dir = this._hdg + this._avoid + Math.sin(this.t * 0.9 + this._swayPh) * 0.13 * Math.min(1, dist / 2.2);
        if (dist < 0.8) {
          // Approche finale : visée directe, l'évitement s'estompe avec la
          // distance (pas d'à-coup en arrivant près de quelqu'un).
          dir = desired + this._avoid * (dist / 0.8);
          this._hdg = desired;
        }
        const step = Math.min(this.speed * dt, dist);
        this.group.position.x += Math.sin(dir) * step;
        this.group.position.z += Math.cos(dir) * step;
        this._resolveCollisions();

        if (this.is3D) {
          // Orientation du modèle (lissage) vers la direction réelle.
          const want = MODEL_YAW + dir;
          let d2 = want - this.group.rotation.y;
          while (d2 < -Math.PI) d2 += Math.PI * 2;
          while (d2 > Math.PI) d2 -= Math.PI * 2;
          this.group.rotation.y += d2 * Math.min(1, dt * 8);
        } else if (this.sprite && Math.abs(Math.sin(dir)) > 0.05) {
          this.content.scale.x = Math.sin(dir) < 0 ? -1 : 1;
        }
        // Rebond synchronisé aux pas (le clip 3D a déjà sa propre oscillation).
        if (this.is3D) {
          const bobW = this.strideWorld > 0 ? (4 * Math.PI * this.speed) / this.strideWorld : 9;
          this.content.position.y = Math.abs(Math.sin(this.t * bobW)) * 0.02;
        } else {
          this.content.position.y = Math.abs(Math.sin(this.t * 9)) * 0.06;
        }
      }
    }

    if (this.state === 'idle') {
      this.content.position.y = Math.sin(this.t * 1.6) * 0.015;
    }
    if (this.state === 'sit') {
      this.content.position.y = Math.sin(this.t * 1.6) * 0.01;
    }

    // Rotation douce vers `yawTarget` (regarder quelqu'un / s'asseoir).
    if (this.state !== 'walk' && this.yawTarget != null && this.is3D) {
      let diff = this.yawTarget - this.group.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 6);
      if (Math.abs(diff) < 0.01) this.yawTarget = null;
    }

    // Le nametag est accroché au TORSE (os « chest ») : il reste fixe même quand
    // la tête bouge (hochements, gestes) ; l'offset est calculé depuis le sommet
    // réel de la tête pour poser le nom juste au-dessus, quel que soit le Mii.
    const tagBone = this._chestBone || this._headBone;
    if (tagBone) {
      if (this._tagNeedsCalc) {
        const box = new THREE.Box3().setFromObject(this._headBone || tagBone);
        const cy = tagBone.getWorldPosition(_tmpV).y;
        // Ne valide que quand la mesure est saine (matrices du squelette prêtes) ;
        // sinon on réessaie à la frame suivante.
        if (isFinite(box.max.y) && box.max.y > cy && box.max.y - cy < 2.5) {
          this._tagOffset = box.max.y - cy + 0.12;
          this._tagNeedsCalc = false;
        }
      }
      tagBone.getWorldPosition(_tmpV);
      this.group.worldToLocal(_tmpV);
      this.label.position.y = _tmpV.y + this._tagOffset;
    }
  }

  /** Fait glisser le Mii hors des obstacles (fountain, arbres, bancs…). */
  _resolveCollisions() {
    if (this.obstacles.length) {
      for (let i = 0; i < this.obstacles.length; i++) {
        const o = this.obstacles[i];
        if (o.benchIdx != null && this._ignoreBench === o.benchIdx) continue;
        const dx = this.group.position.x - o.x;
        const dz = this.group.position.z - o.z;
        const rr = o.r + MII_RADIUS;
        const d2 = dx * dx + dz * dz;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 1e-4;
          const k = (rr - d) / d;
          this.group.position.x += dx * k;
          this.group.position.z += dz * k;
        }
      }
    }
    if (this.maxRadius > 0) {
      const d = Math.hypot(this.group.position.x, this.group.position.z);
      if (d > this.maxRadius) {
        const k = this.maxRadius / d;
        this.group.position.x *= k;
        this.group.position.z *= k;
      }
    }
  }

  /** Redresse la tête selon le(s) clip(s) actif(s) (podwalk penche ~23° vers le
   *  sol, podsit ~12°) : correction monde (axe X du personnage) pondérée par le
   *  poids du clip, ramenée dans le repère du groupe (facteur = G⁻¹ · C · G). */
  _applyHeadFix() {
    if (!this._headBone || !this._built) return;
    const acts = this._built.actions;
    for (const name in HEAD_FIX_DEGS) {
      const act = acts[name];
      // `isRunning()` obligatoire : getEffectiveWeight() renvoie la valeur
      // initiale (1) d'une action jamais jouée → correction fantôme sinon.
      const w = (act && act.isRunning()) ? act.getEffectiveWeight() : 0;
      if (w < 0.01) continue;
      // Correction LOCALE (repère de l'os) : le clip penche la tête par rapport
      // à la poitrine → rotation constante autour de l'axe X local du personnage,
      // indépendante du cap (une correction « monde » devient fausse dès que le
      // Mii regarde ailleurs qu'au nord).
      _tmpQ.setFromAxisAngle(_axisX, HEAD_FIX_DEGS[name] * Math.PI / 180 * w);
      this._headBone.quaternion.premultiply(_tmpQ);
    }
  }

  /** Sélectionne l'animation selon l'état (marche / veille + gestes). */
  _driveAnim(dt) {
    if (!this.is3D || !this._built) return;

    if (this.state === 'walk') {
      // Même piloté par social.js, un Mii qui marche doit jouer la marche.
      const act = this._built.play(this._walkName || 'walk');
      if (act) {
        // Cadence synchrone au déplacement (pas de glissement des pieds).
        const cycle = this.strideWorld / this.walkPeriod;
        if (cycle > 0) act.setEffectiveTimeScale(this.speed / cycle);
        this._animName = 'walk';
        this._gesturing = false;
      }
      return;
    }

    if (this.scripted) return;     // piloté par social.js (parlé, assis…)
    if (this._gesturing) return;   // laisse le geste se terminer
    if (this._animName !== 'idle') {
      this._built.play('idle', { fade: 0.3 });
      this._animName = 'idle';
    }
    this._idleTimer -= dt;
    if (this._idleTimer <= 0) this._startGesture();
  }

  /** Déclenche un geste ponctuel (levée de main, danse, tristesse…). */
  _startGesture() {
    const pool = [
      'wave', 'podnod', 'podtalk', 'poddance', 'poddance2', 'podsad',
      'lookaround', 'dance',
    ];
    const name = pool[(Math.random() * pool.length) | 0];
    const act = this._built.play(name, { once: true });
    if (!act) { this._idleTimer = 5; return; }
    this._gesturing = true;
    this._animName = name;
  }

  dispose() {
    this._disposed = true;
    this.scene.remove(this.group);
    if (this._built) { this._built.dispose(); this._built = null; }
    this.shadow.geometry.dispose();
    if (this.shadow.material.map) this.shadow.material.map.dispose();
    this.shadow.material.dispose();
    if (this.label.material.map) this.label.material.map.dispose();
    this.label.material.dispose();
    if (this.sprite) {
      if (this.sprite.material.map) this.sprite.material.map.dispose();
      this.sprite.material.dispose();
    }
  }
}
