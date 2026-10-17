/**
 * social.js — Directeur des interactions « façon Tomodachi Life ».
 *
 * « Mini IA » (règles + état, comme Nintendo — pas d'IA génératrice) :
 *   - **Personnalité** par Mii (4 traits 0-3, dérivés du nom, déterministes) :
 *     mouvement (vitesse + rayon d'errance), parole (bulles, discussions),
 *     énergie (fatigue), réflexion (contemplation, entêtement).
 *   - **Besoins** qui évoluent : énergie (baisse en marchant, remonte assis),
 *     social (baisse avec le temps, remonte en interaction), amusement
 *     (baisse, remonte aux points d'intérêt / en dansant).
 *   - **Affinités** par paire : certaines paires sont amies, d'autres non ;
 *     chaque interaction les fait évoluer et biaise qui parle à qui, le type
 *     de conversation et la fréquence des rencontres.
 *   - Les intentions **découlent des besoins** : fatigué → banc ; envie de
 *     compagnie → va voir son meilleur ami ; ennui → contemple un point
 *     d'intérêt (fontaine, kiosque…) ; sinon flânerie, souvent vers un POI.
 *
 * Interactions : meet → greet → talk → outcome → part (phases ci-dessous).
 * Les Mii scriptés (`mii.scripted = true`) sont pilotés par le directeur.
 * Toutes les décisions et interactions sont journalisées dans `log`.
 */

import { makeBubble } from './emotes.js';

const INTERACT_RADIUS = 2.4;   // distance de croisement pour déclencher
const TALK_DIST = 1.35;        // distance face à face pendant la conversation
const MIN_SEP = 0.75;          // distance minimale entre deux Mii (anti-collage)
const TALK_MIN = 3.5;          // durée de conversation (s)
const TALK_MAX = 7.5;
const COOLDOWN_MIN = 16;       // cooldown par Mii après interaction (s)
const COOLDOWN_MAX = 38;
const WANDER_MIN = 4;          // temps entre deux errances (s)
const WANDER_MAX = 11;
const SIT_MIN = 12;            // durée assise (s)
const SIT_MAX = 26;
const BOUNDS = 17;             // rayon d'errance dans la place
const ENERGY_SIT = 0.30;       // seuil de fatigue → banc
const SOCIAL_SEEK = 0.38;      // seuil de solitude → va voir un ami
const FUN_POI = 0.32;          // seuil d'ennui → point d'intérêt

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* Hash déterministe (djb2) — personnalité stable par nom. */
function hashName(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Personnalité 0-3 sur 4 traits (façon Tomodachi : mouvement/parole/énergie/réflexion). */
function personalityOf(name) {
  const h = hashName(name);
  return {
    movement: (h >> 2) & 3,
    speech: (h >> 4) & 3,
    energy: (h >> 6) & 3,
    thinking: (h >> 8) & 3,
  };
}

/* Le point d'errance est retiré tant qu'il tombe dans un obstacle. */
function randPoint(world, m) {
  const obs = (world.poi && world.poi.obstacles) || [];
  const maxR = Math.min(BOUNDS, (world.poi && world.poi.maxRadius ? world.poi.maxRadius : BOUNDS) - 1);
  // Les Mii « actifs » (mouvement élevé) rôdent plus loin que les calmes.
  const pers = m && m._soc ? m._soc.pers : null;
  const reach = pers ? 0.45 + 0.18 * pers.movement : 0.7;
  for (let tries = 0; tries < 12; tries++) {
    const a = Math.random() * Math.PI * 2;
    const r = 5 + Math.random() * (maxR - 5) * reach;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    let ok = true;
    for (let i = 0; i < obs.length; i++) {
      const dx = x - obs[i].x, dz = z - obs[i].z;
      const rr = obs[i].r + 0.6;
      if (dx * dx + dz * dz < rr * rr) { ok = false; break; }
    }
    if (ok) return { x, z };
  }
  return { x: 0, z: -Math.min(BOUNDS, 10) };
}

/**
 * @param {{world:{poi:Object}, miis:import('./mii.js').MiiEntity[]}} opts
 */
export function createSocial({ world, miis }) {
  const seats = (world.poi && world.poi.seats) || [];
  const log = [];          // {t, type, ...} — décisions, interactions et poses
  const pairs = [];        // interactions en cours
  const bubbles = new Map();
  let t = 0;

  /* ── Points d'intérêt (contemplation) : gros objets du décor ── */
  const POI_OBS = ((world.poi && world.poi.obstacles) || [])
    .filter((o) => o.r >= 1.5)
    .map((o) => ({ o, type: o.r >= 4 ? 'fountain' : 'spot' }));

  /** Point de contemplation côté Mii : approche en ligne droite garantie.
   *  Choisit le POI le plus proche (avec un peu d'imprévu). */
  function poiSpotFor(m, ob) {
    if (!POI_OBS.length) return null;
    const list = ob ? [{ o: ob, type: ob.type || 'spot' }] : POI_OBS;
    let best = null, bd = Infinity;
    for (const it of list) {
      const dx = m.group.position.x - it.o.x;
      const dz = m.group.position.z - it.o.z;
      const score = Math.hypot(dx, dz) + Math.random() * 6;
      if (score < bd) { bd = score; best = { it, dx, dz }; }
    }
    const o = best.it.o;
    const dd = Math.max(0.001, Math.hypot(best.dx, best.dz));
    return {
      x: o.x + (best.dx / dd) * (o.r + 1.1),
      z: o.z + (best.dz / dd) * (o.r + 1.1),
      cx: o.x, cz: o.z, cr: o.r, type: best.it.type,
    };
  }

  /* ── Affinités par paire (0 inconnus → 1 meilleurs amis) ── */
  const aff = new Map();
  const affKey = (a, b) => (a.name < b.name ? a.name + '|' + b.name : b.name + '|' + a.name);
  for (let i = 0; i < miis.length; i++) {
    for (let j = i + 1; j < miis.length; j++) {
      const h = hashName(affKey(miis[i], miis[j]));
      // Une paire sur trois se connaît déjà (amis), les autres sont inconnues.
      const v = h % 3 === 0 ? 0.50 + (h % 40) / 100 : 0.15 + (h % 30) / 100;
      aff.set(affKey(miis[i], miis[j]), v);
    }
  }
  const getAff = (a, b) => aff.get(affKey(a, b)) || 0;

  /* ── Init : personnalité, besoins, bulles ── */
  for (const m of miis) {
    const b = makeBubble();
    // Bulle À CÔTÉ de la tête (et non au-dessus du nametag).
    b.sprite.position.set(0.82, m.height - 0.32, 0);
    m.group.add(b.sprite);
    bubbles.set(m, b);
    m.busy = false;
    m._soc = {
      cooldown: 4 + Math.random() * 10,
      wander: 1.5 + Math.random() * 4,
      goingSeat: null,
      sitLeft: 0,
      pers: personalityOf(m.name),
      needs: {
        energy: 0.55 + Math.random() * 0.35,
        social: 0.45 + Math.random() * 0.40,
        fun: 0.50 + Math.random() * 0.40,
      },
      focus: null,   // ami visé (intention « compagnie »)
      poi: null,     // point d'intérêt visé
      poiLeft: 0,    // contemplation en cours (s)
    };
    // Le trait « mouvement » module la vitesse de marche (±7 %).
    m.speed *= 0.93 + 0.045 * m._soc.pers.movement;
  }

  function freeSeat() {
    const free = seats.filter((s) => !s.occupied);
    return free.length ? pick(free) : null;
  }

  /* ── Interactions entre deux Mii ── */

  /** Type d'interaction selon l'affinité et les traits (plus amis → plus doux). */
  function kindFor(a, b) {
    const v = getAff(a, b);
    const stubborn = (a._soc.pers.thinking + b._soc.pers.thinking) / 6;
    const speech = (a._soc.pers.speech + b._soc.pers.speech) / 6;
    const chat = 0.30 + 0.45 * v + 0.15 * speech;
    const laugh = 0.20 + 0.25 * v;
    const dance = 0.10 + 0.20 * v;
    const argue = Math.max(0.02, 0.42 - 0.50 * v + 0.20 * stubborn);
    const tot = chat + laugh + dance + argue;
    let r = Math.random() * tot;
    if ((r -= chat) <= 0) return 'chat';
    if ((r -= laugh) <= 0) return 'laugh';
    if ((r -= dance) <= 0) return 'dance';
    return 'argue';
  }

  function startPair(a, b, kind = kindFor(a, b)) {
    a.busy = b.busy = true;
    a.scripted = b.scripted = true;
    // Positions de rendez-vous face à face : `b` reste sur place et `a` se
    // place à TALK_DIST de `b` — évite que les deux se traversent quand ils
    // étaient déjà proches au déclenchement.
    let dx = a.group.position.x - b.group.position.x;
    let dz = a.group.position.z - b.group.position.z;
    let d = Math.hypot(dx, dz);
    if (d < 1e-3) { dx = 1; dz = 0; d = 1; }
    const ux = dx / d, uz = dz / d;
    // Écartement immédiat s'ils étaient collés au déclenchement (jamais de
    // conversation à moins de 1,05 u, dès la première frame).
    if (d < 1.05) {
      const k = (1.05 - d) / 2;
      a.group.position.x += ux * k; a.group.position.z += uz * k;
      b.group.position.x -= ux * k; b.group.position.z -= uz * k;
    }
    const pb = { x: b.group.position.x, z: b.group.position.z };
    const pa = { x: pb.x + ux * TALK_DIST, z: pb.z + uz * TALK_DIST };
    a.walkTo(pa.x, pa.z);
    b.halt();                       // b attend sur place…
    b.faceTo(pa.x, pa.z);           // …en regardant a approcher.
    pairs.push({ a, b, kind, phase: 'meet', t: 0, pa, pb, speaker: a, swapIn: 1.6, talkLeft: 0 });
  }

  function startSpeaker(p) {
    const listener = p.speaker === p.a ? p.b : p.a;
    p.speaker.playAnim('podtalk', { once: false });
    listener.playAnim(pick(['podwaitf', 'podnod']), { once: true });
    p.swapIn = 1.5 + Math.random() * 1.2;
  }

  function startOutcome(p) {
    const { a, b } = p;
    if (p.kind === 'chat') {
      a.playAnim('podnod', { once: true });
      b.playAnim('podwave', { once: true });
      bubbles.get(a).show('heart', 1.6);
      bubbles.get(b).show('heart', 1.6);
    } else if (p.kind === 'laugh') {
      a.playAnim('podlaugh', { once: true });
      b.playAnim('podlaugh', { once: true });
      bubbles.get(a).show('note', 2.2);
      bubbles.get(b).show('note', 2.2);
    } else if (p.kind === 'argue') {
      a.playAnim('podangry', { once: false });
      b.playAnim('podangry', { once: false });
      bubbles.get(a).show('angry', 2.4);
      bubbles.get(b).show('angry', 2.4);
    } else { // dance
      a.playAnim('poddance', { once: false });
      b.playAnim('poddance2', { once: false });
      bubbles.get(a).show('note', 3.0);
      bubbles.get(b).show('note', 3.0);
    }
  }

  function endPair(p) {
    const { a, b } = p;
    p.phase = 'done';
    a.busy = b.busy = false;
    a.scripted = b.scripted = false;
    // L'interaction change la relation + restaure le besoin social.
    const before = getAff(a, b);
    const d = { chat: 0.08, laugh: 0.10, dance: 0.06, argue: -0.14 }[p.kind] || 0;
    const after = Math.max(0, Math.min(1, before + d));
    aff.set(affKey(a, b), after);
    for (const m of [a, b]) {
      m._soc.needs.social = Math.min(1, m._soc.needs.social + 0.45);
      if (p.kind === 'dance') m._soc.needs.fun = Math.min(1, m._soc.needs.fun + 0.35);
      else if (p.kind !== 'argue') m._soc.needs.fun = Math.min(1, m._soc.needs.fun + 0.15);
    }
    a._soc.cooldown = COOLDOWN_MIN + Math.random() * (COOLDOWN_MAX - COOLDOWN_MIN);
    b._soc.cooldown = a._soc.cooldown;
    const pa = randPoint(world, a), pb = randPoint(world, b);
    setTimeoutSafe(() => { if (!a.busy) a.walkTo(pa.x, pa.z); }, 500);
    setTimeoutSafe(() => { if (!b.busy) b.walkTo(pb.x, pb.z); }, 650);
    log.push({ t: +t.toFixed(2), type: 'interaction', kind: p.kind, a: a.name, b: b.name,
               affBefore: +before.toFixed(2), affAfter: +after.toFixed(2) });
  }

  // Petit délai sans dépendre de setTimeout réel (compatible tests headless).
  const pending = [];
  function setTimeoutSafe(fn, ms) { pending.push({ fn, left: ms / 1000 }); }
  function runPending(dt) {
    for (let i = pending.length - 1; i >= 0; i--) {
      const it = pending[i];
      it.left -= dt;
      if (it.left <= 0) { pending.splice(i, 1); try { it.fn(); } catch (e) { /* ignore */ } }
    }
  }

  function advancePair(p, dt) {
    p.t += dt;
    const { a, b } = p;
    if (p.phase === 'meet') {
      // On attend que les deux aient rejoint leur position face à face
      // (avec délai de sécurité si un obstacle gêne).
      const da = Math.hypot(a.group.position.x - p.pa.x, a.group.position.z - p.pa.z);
      const db = Math.hypot(b.group.position.x - p.pb.x, b.group.position.z - p.pb.z);
      const arrivedA = a.state !== 'walk' || da < 0.15;
      const arrivedB = b.state !== 'walk' || db < 0.15;
      if ((arrivedA && arrivedB) || p.t > 6) {
        a.halt(); b.halt();
        // Sécurité anti-collage : au moins 1,15 u entre les deux.
        let sx = a.group.position.x - b.group.position.x;
        let sz = a.group.position.z - b.group.position.z;
        const sd = Math.hypot(sx, sz);
        if (sd < 1.15) {
          const ux = sd > 1e-3 ? sx / sd : 1, uz = sd > 1e-3 ? sz / sd : 0;
          const k = (1.15 - sd) / 2;
          a.group.position.x += ux * k; a.group.position.z += uz * k;
          b.group.position.x -= ux * k; b.group.position.z -= uz * k;
        }
        a.faceTo(b.group.position.x, b.group.position.z);
        b.faceTo(a.group.position.x, a.group.position.z);
        p.phase = 'greet'; p.t = 0;
        a.playAnim('wave', { once: true });
        bubbles.get(a).show('excl', 1.2);
        b.playAnim('podnod', { once: true });
      }
    } else if (p.phase === 'meet' || p.phase === 'greet' || p.phase === 'talk' || p.phase === 'outcome') {
      // Garde l'espace face à face à toutes les phases (jamais collés) —
      // séparation plus rapide s'ils sont très proches.
      let sx = a.group.position.x - b.group.position.x;
      let sz = a.group.position.z - b.group.position.z;
      const sd = Math.hypot(sx, sz);
      if (sd < 1.15 && sd > 1e-3) {
        const rate = sd < 0.8 ? 2.2 : 0.9;
        const k = Math.min(rate * dt, (1.15 - sd) / 2);
        a.group.position.x += (sx / sd) * k; a.group.position.z += (sz / sd) * k;
        b.group.position.x -= (sx / sd) * k; b.group.position.z -= (sz / sd) * k;
      }
    }
    if (p.phase === 'greet') {
      if (p.t > 1.3) {
        p.phase = 'talk'; p.t = 0;
        p.talkLeft = TALK_MIN + Math.random() * (TALK_MAX - TALK_MIN);
        p.speaker = Math.random() < 0.5 ? a : b;
        startSpeaker(p);
      }
    } else if (p.phase === 'talk') {
      p.talkLeft -= dt;
      // Les Mii bavards (trait « parole ») font plus de bulles.
      const talkRate = 0.25 + 0.35 * ((a._soc.pers.speech + b._soc.pers.speech) / 6);
      if (Math.random() < dt * talkRate) {
        const m = Math.random() < 0.5 ? a : b;
        bubbles.get(m).show(pick(['note', 'quest', 'excl']), 1.6);
      }
      p.swapIn -= dt;
      if (p.swapIn <= 0 && p.talkLeft > 1.4) {
        p.speaker = p.speaker === a ? b : a;
        startSpeaker(p);
      }
      if (p.talkLeft <= 0) {
        p.phase = 'outcome'; p.t = 0;
        startOutcome(p);
      }
    } else if (p.phase === 'outcome') {
      const dur = { chat: 1.6, laugh: 2.6, argue: 3.2, dance: 3.6 }[p.kind];
      if (p.kind === 'argue' && p.t > 1.8 && !p.sadDone) {
        p.sadDone = true;
        a.playAnim('podsad', { once: true });   // regret
        b.playAnim('podpout', { once: true });  // bouderie
        bubbles.get(a).show('sweat', 1.4);
      }
      if (p.t > dur) endPair(p);
    }
  }

  /* ── Choix d'intention (motivé par les besoins, pas au hasard pur) ── */

  /** Le Mii libre avec qui `m` a le plus d'affinité (un peu d'imprévu). */
  function bestFriend(m) {
    let best = null, bv = -1;
    for (const o of miis) {
      if (o === m || o.busy || o.scripted || o.state === 'sit') continue;
      if (o._soc.cooldown > 0) continue;
      const v = getAff(m, o) + Math.random() * 0.2;
      if (v > bv) { bv = v; best = o; }
    }
    return best;
  }

  function wanderStep(m, dt) {
    const s = m._soc;

    // Un Mii assis est `scripted` : on gère sa pose AVANT le garde-fou.
    if (m.state === 'sit') {
      s.sitLeft -= dt;
      if (Math.random() < dt * 0.08) bubbles.get(m).show(pick(['zzz', 'note', 'heart']), 2);
      // Bâillement occasionnel, puis retour à la pose assise/dodo.
      if (Math.random() < dt * 0.04) {
        m.playAnim('podyawn', { once: true });
        setTimeoutSafe(() => {
          if (m.state === 'sit' && m.scripted) {
            m.playAnim(s.sitAnim || 'podsit', { once: false, fade: 0.4 });
          }
        }, 1500);
      }
      if (s.sitLeft <= 0) {
        s.goingSeat = null;
        if (m.seat) m.seat.occupied = false;
        m.scripted = false;
        const p = randPoint(world, m);
        m.standUp(p.x, p.z);
        log.push({ t: +t.toFixed(2), type: 'stand', name: m.name });
        s.cooldown = 5 + Math.random() * 8;
      }
      return;
    }

    // Contemplation d'un point d'intérêt (debout, scripté).
    if (s.poiLeft > 0) {
      s.poiLeft -= dt;
      if (Math.random() < dt * 0.25) bubbles.get(m).show(pick(['note', 'heart', 'quest']), 1.6);
      if (s.poiLeft <= 0) {
        m.scripted = false;
        m.playAnim('idle', { fade: 0.3 });
        s.wander = 1 + Math.random() * 2;
        s.cooldown = 3 + Math.random() * 6;
      }
      return;
    }

    if (m.busy || m.scripted) return;

    if (m.state === 'walk') {
      if (s.goingSeat) {
        const dx = s.goingSeat.x - m.group.position.x;
        const dz = s.goingSeat.z - m.group.position.z;
        if (dx * dx + dz * dz < 0.16) {
          m.scripted = true;
          m.sitAt(s.goingSeat);
          m._ignoreBench = null;
          s.sitAnim = Math.random() < 0.3 ? 'podsleep' : 'podsit'; // 30 % : dodo sur le banc
          if (s.sitAnim === 'podsleep') m.playAnim('podsleep', { once: false, fade: 0.3 });
          s.sitLeft = SIT_MIN + Math.random() * (SIT_MAX - SIT_MIN);
          bubbles.get(m).show('zzz', 2.5);
          log.push({ t: +t.toFixed(2), type: 'sit', name: m.name, anim: s.sitAnim });
          return;
        }
      }
      // Arrivée à un point d'intérêt → contemplation (rêveurs : plus longtemps).
      if (s.poi) {
        const dx = s.poi.x - m.group.position.x;
        const dz = s.poi.z - m.group.position.z;
        if (dx * dx + dz * dz < 0.5) {
          s.poiLeft = 3 + Math.random() * 4 + s.pers.thinking * 1.1;
          m.scripted = true;
          m.halt();
          m.faceTo(s.poi.cx, s.poi.cz);
          m.playAnim(Math.random() < 0.5 ? 'podlook' : 'podthink', { once: false, fade: 0.3 });
          bubbles.get(m).show(pick(['note', 'heart', 'quest']), 2);
          s.needs.fun = Math.min(1, s.needs.fun + 0.45);
          log.push({ t: +t.toFixed(2), type: 'poi', name: m.name, poi: s.poi.type });
          s.poi = null;
          s.poiTries = 0;
          return;
        }
      }
      // Rendez-vous avec l'ami visé → conversation dès qu'il est à portée.
      if (s.focus) {
        const o = s.focus;
        if (o.busy || o.scripted || o.state === 'sit' || o._soc.cooldown > 0 || o === m) {
          s.focus = null;
        } else {
          const ddx = o.group.position.x - m.group.position.x;
          const ddz = o.group.position.z - m.group.position.z;
          const dd = Math.hypot(ddx, ddz);
          if (dd <= INTERACT_RADIUS) {
            s.focus = null;
            startPair(m, o);
            return;
          }
          s.focusT -= dt;
          if (s.focusT <= 0) {
            s.focusT = 1.2;
            const inv = 1.6 / Math.max(0.001, dd);
            m.walkTo(o.group.position.x - ddx * inv, o.group.position.z - ddz * inv);
          }
        }
      }
      // Détection de blocage (obstacle contourné trop longtemps / cible coincée).
      s.mvT = (s.mvT || 0) + dt;
      if (s.lx == null) { s.lx = m.group.position.x; s.lz = m.group.position.z; }
      if (s.mvT >= 0.6) {
        const moved = Math.hypot(m.group.position.x - s.lx, m.group.position.z - s.lz);
        s.mvT = 0; s.lx = m.group.position.x; s.lz = m.group.position.z;
        if (moved < 0.06) {
          if (s.goingSeat) {
            const rdx = s.goingSeat.x - m.group.position.x;
            const rdz = s.goingSeat.z - m.group.position.z;
            if (rdx * rdx + rdz * rdz < 1.44) {
              // Presque au banc : on s'assoit quand même (fin de contournement).
              m.scripted = true;
              m.sitAt(s.goingSeat);
              m._ignoreBench = null;
              s.sitAnim = Math.random() < 0.3 ? 'podsleep' : 'podsit';
              if (s.sitAnim === 'podsleep') m.playAnim('podsleep', { once: false, fade: 0.3 });
              s.sitLeft = SIT_MIN + Math.random() * (SIT_MAX - SIT_MIN);
              bubbles.get(m).show('zzz', 2.5);
              log.push({ t: +t.toFixed(2), type: 'sit', name: m.name, anim: s.sitAnim });
              s.goingSeat = null;
              return;
            }
            s.goingSeat.occupied = false; s.goingSeat = null; m._ignoreBench = null;
          }
          if (s.poi) {
            s.poiTries = (s.poiTries || 0) + 1;
            if (s.poiTries <= 3) {
              // Ré-approche du même point, côté Mii actuel.
              const np = poiSpotFor(m, { x: s.poi.cx, z: s.poi.cz, r: s.poi.cr, type: s.poi.type });
              if (np) {
                s.poi = np;
                m.walkTo(np.x, np.z);
                s.lx = m.group.position.x; s.lz = m.group.position.z;
                return;
              }
            }
            s.poi = null; s.poiTries = 0;
          }
          s.focus = null;
          const p = randPoint(world, m);
          m.walkTo(p.x, p.z);
        }
      }
      return;
    }

    // idle → nouvelle intention (dictée par les besoins).
    s.wander -= dt;
    if (s.wander > 0) return;
    s.wander = WANDER_MIN + Math.random() * (WANDER_MAX - WANDER_MIN);
    const n = s.needs;

    // Fatigue → va s'asseoir (l'énergie remonte sur le banc).
    if (n.energy < ENERGY_SIT && s.cooldown <= 0) {
      const seat = freeSeat();
      if (seat) {
        seat.occupied = true;
        s.goingSeat = seat;
        m._ignoreBench = seat.benchIdx; // laisse le Mii approcher de SON banc
        m.walkTo(seat.x, seat.z);
        log.push({ t: +t.toFixed(2), type: 'intent', what: 'seat', name: m.name,
                   energy: +n.energy.toFixed(2) });
        return;
      }
    }

    // Envie de compagnie → va voir son meilleur ami.
    if (n.social < SOCIAL_SEEK && s.cooldown <= 0) {
      const friend = bestFriend(m);
      if (friend) {
        s.focus = friend;
        s.focusT = 0;
        const ddx = friend.group.position.x - m.group.position.x;
        const ddz = friend.group.position.z - m.group.position.z;
        const dd = Math.max(0.001, Math.hypot(ddx, ddz));
        const inv = 1.6 / dd;
        m.walkTo(friend.group.position.x - ddx * inv, friend.group.position.z - ddz * inv);
        log.push({ t: +t.toFixed(2), type: 'intent', what: 'seek', name: m.name,
                   target: friend.name, aff: +getAff(m, friend).toFixed(2) });
        return;
      }
    }

    // Ennui → contemple un point d'intérêt (fontaine, kiosque…).
    if (n.fun < FUN_POI) {
      const poi = poiSpotFor(m);
      if (poi) {
        s.poi = poi;
        m.walkTo(poi.x, poi.z);
        log.push({ t: +t.toFixed(2), type: 'intent', what: 'poi', name: m.name, poi: poi.type });
        return;
      }
    }

    // Sinon : flânerie (souvent vers un point d'intérêt, parfois un point libre).
    const strollPoi = Math.random() < 0.55 ? poiSpotFor(m) : null;
    if (strollPoi) {
      m.walkTo(strollPoi.x, strollPoi.z);
    } else {
      const p = randPoint(world, m);
      m.walkTo(p.x, p.z);
    }
  }

  /* ── Boucle principale ── */

  function update(dt) {
    t += dt;
    runPending(dt);

    for (const m of miis) {
      bubbles.get(m).update(dt);
      if (m._soc.cooldown > 0) m._soc.cooldown -= dt;
      // Besoins : l'énergie baisse en marchant et remonte assis ; le social
      // baisse avec le temps (restauré en interaction) ; l'amusement baisse.
      const s = m._soc, n = s.needs;
      if (m.state === 'sit') {
        n.energy = Math.min(1, n.energy + dt * 0.05);
      } else if (!m.busy && !m.scripted) {
        const walkMul = m.state === 'walk' ? 1.6 : 0.7;
        n.energy = Math.max(0, n.energy - dt * (0.012 + 0.006 * s.pers.energy) * walkMul);
        n.social = Math.max(0, n.social - dt * (0.008 + 0.004 * s.pers.speech));
        n.fun = Math.max(0, n.fun - dt * 0.011);
      } else {
        n.energy = Math.max(0, n.energy - dt * 0.004);
      }
    }

    for (let i = pairs.length - 1; i >= 0; i--) {
      advancePair(pairs[i], dt);
      if (pairs[i].phase === 'done') pairs.splice(i, 1);
    }

    for (const m of miis) wanderStep(m, dt);

    // Anti-collage : jamais deux Mii superposés. Les Mii scriptés/assis ne
    // bougent pas ; les Mii libres (promeneurs) sont repoussés — y compris
    // s'ils passent près d'une paire en pleine conversation.
    for (let i = 0; i < miis.length; i++) {
      for (let j = i + 1; j < miis.length; j++) {
        const a = miis[i], b = miis[j];
        const aFixed = a.busy || a.scripted || a.state === 'sit';
        const bFixed = b.busy || b.scripted || b.state === 'sit';
        if (aFixed && bFixed) continue;
        let dx = a.group.position.x - b.group.position.x;
        let dz = a.group.position.z - b.group.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 1e-4 && d < MIN_SEP) {
          const push = MIN_SEP - d;
          dx /= d; dz /= d;
          if (!aFixed && !bFixed) {
            a.group.position.x += dx * push / 2; a.group.position.z += dz * push / 2;
            b.group.position.x -= dx * push / 2; b.group.position.z -= dz * push / 2;
          } else if (!aFixed) {
            a.group.position.x += dx * push; a.group.position.z += dz * push;
          } else {
            b.group.position.x -= dx * push; b.group.position.z -= dz * push;
          }
        }
      }
    }

    // Croisement → interaction (les amis se parlent plus volontiers).
    for (let i = 0; i < miis.length; i++) {
      const a = miis[i];
      if (a.busy || a.scripted || a._soc.cooldown > 0) continue;
      if (a.state !== 'idle' && a.state !== 'walk') continue;
      for (let j = i + 1; j < miis.length; j++) {
        const b = miis[j];
        if (b.busy || b.scripted || b._soc.cooldown > 0) continue;
        if (b.state !== 'idle' && b.state !== 'walk') continue;
        const dx = a.group.position.x - b.group.position.x;
        const dz = a.group.position.z - b.group.position.z;
        if (dx * dx + dz * dz > INTERACT_RADIUS * INTERACT_RADIUS) continue;
        if (Math.random() < dt * (0.35 + 1.5 * getAff(a, b))) startPair(a, b);
      }
    }
  }

  return {
    update,
    log,
    pairs,
    /** Affinité entre deux Mii (index) — lecture seule pour les tests. */
    affinity(i, j) {
      const a = miis[i], b = miis[j];
      return a && b ? +getAff(a, b).toFixed(2) : 0;
    },
    /** Besoins d'un Mii (index) — lecture seule pour les tests. */
    needs(i) {
      const m = miis[i];
      if (!m) return null;
      const n = m._soc.needs;
      return { energy: +n.energy.toFixed(2), social: +n.social.toFixed(2), fun: +n.fun.toFixed(2) };
    },
    /** Personnalité d'un Mii (index) — lecture seule pour les tests. */
    personality(i) {
      const m = miis[i];
      return m ? { ...m._soc.pers } : null;
    },
    /** Type d'interaction tiré pour une paire (sans effet de bord). */
    kindFor(i, j) {
      const a = miis[i], b = miis[j];
      return a && b ? kindFor(a, b) : 'chat';
    },
    /** Déclenche une interaction immédiate (tests / debug). */
    forceMeet(i, j, kind = 'chat') {
      const a = miis[i], b = miis[j];
      if (!a || !b || a.busy || b.busy) return false;
      a.group.position.set(a.group.position.x, 0, a.group.position.z);
      b.group.position.set(a.group.position.x + 1.1, 0, a.group.position.z + 0.4);
      startPair(a, b, kind);
      return true;
    },
  };
}
