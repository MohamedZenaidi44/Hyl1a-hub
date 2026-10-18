/**
 * relations.js — Moteur de relations « Tomodachi Life » (règles authentiques).
 *
 * Réimplémentation fidèle du système de relations entre deux Mii, à partir des
 * fonctions décompilées de la ROM (dossier `ghidra_proj_tomodachi`) :
 *
 *   - **Niveau** 0..200 par sens (`FUN_0056b570` : `niveau += delta`, clamp) ;
 *     un événement applique ±40 (0x28) — plusieurs callbacks d'événements.
 *   - **Type** par sens (`FUN_007e09e4` = type a→b, `FUN_007e0b3c` = niveau) ;
 *     `FUN_0056b27c` force `type` dans les deux sens ET met les DEUX niveaux
 *     à 100 (utilisé pour les couples/amoureux).
 *   - **Dérive ambiante** (`FUN_0056b660`) : par événement, une paire ordonnée
 *     au hasard, `delta = TABLE[type][rand(8)]`, les deltas POSITIFS sont
 *     multipliés par `[1,2,2,3][tier]` (octets @0x8BC5FC), puis clamp 0..200.
 *     `tier` = âge du dernier lot (`FUN_007de6a4`, seuils 1/3/5 jours) ;
 *     les paires de type 4 (couple, `FUN_007e12e8`) sont ignorées.
 *   - **Nombre d'événements** (`FUN_007d57b0`) :
 *     `N = floor(minutes ÷ floor(3000 ÷ min(paires, 3000)))`, cap 500 ;
 *     `paires = n(n-1)/2` des Mii présents (`FUN_007e0de4`).
 *   - **Choix de banque de dialogue** (scène talk, `FUN_007956a8`) :
 *     jamais parlé → First (`FUN_003d33f0`) ; sinon `rand(100) < 90` ou
 *     bucket > 1 (`FUN_003d352c`) → Usual, sinon Unusual ; l'anniversaire du
 *     jour non fêté (`FUN_003d3340`) → Birthday. Buckets de jours depuis la
 *     dernière conversation : 7/14/21/30/60/90/120 (`FUN_0042788c`).
 *   - **Événement spécial** (`FUN_007c48f0`) :
 *     `p = (niveau/2)²/100` (+50 le jour du 1er événement), cap 100 ;
 *     portes `FUN_007c4be0` (masque 0x1f) : type ∈ {1,3,6,12}, pas de
 *     partenaire amoureux avec niveau > 50, compatibilité de personnalité.
 *   - **Temps** : 1 jour de jeu = 1080 s (`FUN_007e0ea8`, ÷1080).
 *
 * Écarts documentés (prototype, pas d'écran de jeu complet) :
 *   - pas de statuts 455/événements scriptés → les combats/divorces ne sont
 *     pas produits ; seuls les ±40 de conversation et la confession existent ;
 *   - compatibilité de personnalité réputée vraie (table 7×7 non extraite) ;
 *   - `timeScale` accélère l'horloge de jeu (1 s réelle = `timeScale` s de
 *     jeu, défaut 60) pour que la dérive ROM soit observable avec 6 Mii
 *     (la formule de débit est conservée telle quelle).
 */

export const LEVEL_MAX = 200;
export const EVENT_DELTA = 40;        // 0x28 — FUN_0056b570 (callbacks d'événements)
export const TYPE_LEVEL_FORCE = 100;  // FUN_0056b27c (couples)
export const DAY_SECONDS = 1080;      // FUN_007e0ea8 : ÷1080 = jours
export const TALK_BUCKET_DAYS = [7, 14, 21, 30, 60, 90, 120]; // FUN_0042788c
export const DRIFT_MULT = [1, 2, 2, 3];        // octets @0x8BC5FC
export const DRIFT_MULT_DAYS = [1, 3, 5];      // 86400 / 259200 / 432000 s
export const DRIFT_PAIRS_CAP = 3000;           // DAT_007d582c
export const DRIFT_COUNT_CAP = 500;
export const SPECIAL_TYPE_ALLOW = [1, 3, 6, 12]; // FUN_007c4be0 bit 8
export const LOVER_JEALOUSY_LEVEL = 50;          // 0x32 — FUN_007c4be0 bit 2
export const CONFESSION_LEVEL = 119;             // 0x77 — seuil des événements
export const AMBIENT_EVERY_MIN = 30;             // 1 lot « ambiant » / 30 min de jeu

/** Types de relation observés dans la ROM (par sens). */
export const TYPE = {
  NONE: 0,     // aucun lien
  FRIEND: 1,   // ami
  LOVER: 2,    // amoureux (posé via FUN_0056b27c → niveaux 100)
  SP3: 3,      // type autorisé aux événements spéciaux (sémantique exacte inconnue)
  MARRIED: 4,  // couple/marié (enregistre la famille) — ignoré par la dérive (FUN_007e12e8)
  MARRIED5: 5, // «
  SP6: 6,      // type autorisé aux événements spéciaux
  BROKEN9: 9,  // ruptures (prédicat FUN_0056b8f4)
  BROKEN10: 10,
  FAM11: 11,   // famille/rupture (selon les prédicats)
  SPECIAL12: 12, // « Mii spécial » (FUN_0056be98)
};

/** TABLE de dérive @0x8BC600 — [type][rand(8)] (relevée octet à octet). */
export const DRIFT_TABLE = [
  [200, 100, 60, 20, -20, -40, -60, -100],  // 0
  [100, 60, 40, 20, -20, -40, -60, -100],   // 1 ami
  [80, 50, 30, 20, -20, -30, -50, -80],     // 2 amoureux
  [60, 30, 20, 10, -10, -20, -30, -60],     // 3
  [70, 50, 20, 10, -10, -20, -50, -70],     // 4 marié
  [0, 0, 0, 0, 0, 0, 0, 0],                 // 5
  [60, 30, 20, 10, -10, -20, -30, -60],     // 6
  [100, 60, 40, 20, -20, -40, -60, -100],   // 7
  [100, 60, 40, 20, -20, -40, -60, -100],   // 8
  [100, 60, 40, 20, -20, -30, -40, -60],    // 9
  [100, 60, 40, 20, -20, -30, -40, -60],    // 10
  [100, 60, 40, 20, -20, -30, -40, -60],    // 11
  [100, 60, 40, 20, -20, -40, -60, -100],   // 12
];

/* PRNG déterministe (mulberry32), comme population.js. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Hash djb2 — anniversaires déterministes par nom. */
function hashName(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

const clampLevel = (v) => (v < 0 ? 0 : (v > LEVEL_MAX ? LEVEL_MAX : v));

/** Bucket de conversation (1..8) pour `jours` écoulés (FUN_0042788c). */
export function bucketOfDays(days) {
  for (let i = 0; i < TALK_BUCKET_DAYS.length; i++) {
    if (days < TALK_BUCKET_DAYS[i]) return i + 1;
  }
  return TALK_BUCKET_DAYS.length + 1; // 8
}

/**
 * Dérive d'un événement ambiant (FUN_0056b660).
 * @returns {number} delta signé, multiplicateur appliqué aux positifs uniquement.
 */
export function driftDelta(type, roll, tier = 0) {
  const row = DRIFT_TABLE[type] || DRIFT_TABLE[1];
  const base = row[roll & 7];
  if (base <= 0) return base;
  return base * DRIFT_MULT[tier & 3];
}

/**
 * Nombre d'événements ambiants (FUN_007d57b0).
 * `minutes` = minutes écoulées ; `pairs` = n(n-1)/2.
 */
export function driftCount(minutes, pairs) {
  let m = Math.floor(minutes);
  if (m < 0) m = 0;
  if (pairs === 0) return 0;
  let divisor;
  if (pairs > DRIFT_PAIRS_CAP) divisor = 1;
  else if (pairs === DRIFT_PAIRS_CAP) divisor = 1;
  else divisor = Math.floor(DRIFT_PAIRS_CAP / pairs);
  if (divisor < 1) divisor = 1;
  let n = Math.floor(m / divisor);
  if (n > DRIFT_COUNT_CAP) n = DRIFT_COUNT_CAP;
  return n;
}

/** Tier du multiplicateur (FUN_007de6a4) : âge en jours → 0..3. */
export function tierOfDays(days) {
  if (days < DRIFT_MULT_DAYS[0]) return 0;
  if (days < DRIFT_MULT_DAYS[1]) return 1;
  if (days < DRIFT_MULT_DAYS[2]) return 2;
  return 3;
}

/**
 * Crée le moteur de relations pour `names` (liste de Mii).
 *
 * @param {{names:string[], seed?:number, timeScale?:number,
 *          daySeconds?:number, birthdays?:number[]}} opts
 *   - timeScale : secondes de jeu par seconde réelle (défaut 60).
 *   - birthdays : jour de l'année (0..364) par Mii (défaut : dérivé du nom).
 */
export function createRelations({ names, seed = 20261017, timeScale = 60, daySeconds = DAY_SECONDS, birthdays = null }) {
  const n = names.length;
  const rng = mulberry32(seed);

  const lvl = names.map(() => new Array(n).fill(0));           // niveau a→b
  const typ = names.map(() => new Array(n).fill(TYPE.NONE));   // type a→b
  const lastTalk = names.map(() => new Array(n).fill(0));      // horloge de jeu (0 = jamais)
  const prevTalk = names.map(() => new Array(n).fill(0));
  const bday = names.map((nm, i) => (birthdays && birthdays[i] != null
    ? birthdays[i] : hashName(nm) % 365));
  const bdayYear = new Array(n).fill(0);                       // dernière année fêtée

  let gs = 0;                 // horloge de jeu (s)
  let ambAcc = 0;             // minutes de jeu accumulées depuis le dernier lot
  let lastBatchGs = 0;        // horloge du dernier lot (pour le tier)
  let eventsToday = 0;        // événements spéciaux du jour (bonus +50)
  let lastDay = 0;
  const log = [];

  const everTalked = (a, b) => lastTalk[a][b] !== 0 || lastTalk[b][a] !== 0;
  const bucketOf = (a, b) => {
    if (lastTalk[a][b] === 0) return 1; // First (jamais parlé) — bucket neutre
    const days = (gs - lastTalk[a][b]) / daySeconds;
    return bucketOfDays(days);
  };
  const gameDay = () => Math.floor(gs / daySeconds);
  const gameYear = () => Math.floor(gameDay() / 365) + 1;
  const isBirthdayToday = (i) => (gameDay() % 365) === bday[i];

  /** Change le type des deux sens (sans toucher au niveau). */
  function setType(a, b, type) {
    typ[a][b] = type;
    typ[b][a] = type;
  }

  /**
   * FUN_0056b27c : type dans les deux sens + niveaux forcés à 100.
   * (Enregistrement/désenregistrement de famille omis — pas de foyer ici.)
   */
  function setTypePair(a, b, type) {
    lvl[a][b] = TYPE_LEVEL_FORCE;
    lvl[b][a] = TYPE_LEVEL_FORCE;
    setType(a, b, type);
  }

  /** FUN_0056b570 : niveau(a→b) += delta, clamp 0..200. */
  function addLevel(a, b, delta) {
    lvl[a][b] = clampLevel(lvl[a][b] + delta);
  }

  /** Événement ±40 appliqué dans les deux sens (comme les callbacks ROM). */
  function applyEvent(a, b, delta) {
    addLevel(a, b, delta);
    addLevel(b, a, delta);
  }

  /** Niveau d'un sens (lecture seule). */
  function level(a, b) { return lvl[a][b]; }
  /** Type d'un sens (lecture seule). */
  function type(a, b) { return typ[a][b]; }

  /** Snapshot lisible d'une paire. */
  function relation(a, b) {
    return {
      levelAB: lvl[a][b], levelBA: lvl[b][a],
      typeAB: typ[a][b], typeBA: typ[b][a],
      everTalked: everTalked(a, b),
      bucketA: bucketOf(a, b), bucketB: bucketOf(b, a),
    };
  }

  /**
   * Choix de banque pour une conversation (scène talk, FUN_007956a8) :
   * `mii` = Mii approché (la banque est la sienne), `other` = l'autre.
   * @returns {'first'|'birthday'|'usual'|'unusual'}
   */
  function bankFor(mii, other) {
    if (!everTalked(mii, other)) return 'first';                 // FUN_003d33f0
    if (isBirthdayToday(mii) && bdayYear[mii] !== gameYear()) return 'birthday'; // FUN_003d3340
    const roll = rng() * 100;
    if (roll < 90 || bucketOf(mii, other) > 1) return 'usual';   // FUN_003d352c
    return 'unusual';
  }

  /** Enregistre une conversation (timestamps des deux sens). */
  function onTalk(a, b, bank = null) {
    for (const [x, y] of [[a, b], [b, a]]) {
      prevTalk[x][y] = lastTalk[x][y];
      lastTalk[x][y] = gs;
    }
    if (bank === 'birthday') bdayYear[a] = gameYear();
    log.push({ t: +gs.toFixed(1), type: 'talk', a, b, bank });
  }

  /** Vrai si `mii` a un amoureux de niveau > 50 (jalousie, FUN_007c4be0 bit 2). */
  function hasJealousLover(mii) {
    for (let c = 0; c < n; c++) {
      if (c === mii) continue;
      if (typ[mii][c] === TYPE.LOVER && lvl[mii][c] > LOVER_JEALOUSY_LEVEL) return true;
    }
    return false;
  }

  /**
   * Chance d'événement spécial (FUN_007c48f0 + portes FUN_007c4be0 masque 0x1f).
   * `p = (niveau/2)²/100`, +50 le jour du premier événement, cap 100.
   * @returns {number} 0 si une porte bloque, sinon 0..100.
   */
  function specialChance(a, b) {
    if (SPECIAL_TYPE_ALLOW.indexOf(typ[a][b]) < 0) return 0;      // bit 8
    if (hasJealousLover(a) || hasJealousLover(b)) return 0;       // bit 2
    // (bits 1/4/0x10 : mariage, même famille, compat perso → non modélisés ;
    //  compat de personnalité réputée vraie — table 7×7 non extraite.)
    const levelRef = Math.max(lvl[a][b], lvl[b][a]);
    let p = Math.pow(Math.floor(levelRef / 2), 2) / 100;
    if (eventsToday === 0) p += 50;                               // +50 (1er de la journée)
    if (p > 100) p = 100;
    return p;
  }

  /**
   * Tire un événement spécial en fin d'interaction positive.
   * Confession possible si amis des deux côtés (type 1) et niveaux ≥ 119 :
   * pose amoureux (type 2, niveaux 100) — sémantique de FUN_0056b27c.
   * @returns {'confession'|'none'}
   */
  function rollSpecial(a, b) {
    if (typ[a][b] !== TYPE.FRIEND || typ[b][a] !== TYPE.FRIEND) return 'none';
    if (lvl[a][b] < CONFESSION_LEVEL || lvl[b][a] < CONFESSION_LEVEL) return 'none';
    const p = specialChance(a, b);
    if (p <= 0) return 'none';
    if (rng() * 100 >= p) return 'none';
    eventsToday += 1;
    setTypePair(a, b, TYPE.LOVER);
    log.push({ t: +gs.toFixed(1), type: 'special', event: 'confession', a, b, p });
    return 'confession';
  }

  /** Lot d'événements ambiants (FUN_0056b660) — `minutes` de jeu écoulées. */
  function runAmbient(minutes = ambAcc, tier = null) {
    const pairs = (n * (n - 1)) / 2;
    const count = driftCount(minutes, pairs);
    const tierNow = tier != null ? tier : tierOfDays((gs - lastBatchGs) / daySeconds);
    for (let k = 0; k < count; k++) {
      const a = Math.floor(rng() * n);
      let b = Math.floor(rng() * (n - 1));
      if (b >= a) b += 1;
      if (n < 2) break;
      const t = typ[a][b];
      if (t === TYPE.MARRIED) continue;                 // FUN_007e12e8 (type 4 → 0)
      const roll = Math.floor(rng() * 8);
      const delta = driftDelta(t, roll, tierNow);
      if (delta !== 0) addLevel(a, b, delta);
      log.push({ t: +gs.toFixed(1), type: 'drift', a, b, dirT: t, roll, delta, tier: tierNow });
    }
    lastBatchGs = gs;
    ambAcc = 0;
    return count;
  }

  /** Horloge : avance le temps de jeu ; lot ambiant quand dû.
   *  En jeu continu, on « flushe » dès que le débit ROM (1 événement par
   *  `floor(3000÷paires)` minutes de jeu) autorise au moins 1 événement. */
  function update(dtReal) {
    const before = gs;
    gs += dtReal * timeScale;
    ambAcc += (gs - before) / 60;
    const day = gameDay();
    if (day !== lastDay) { lastDay = day; eventsToday = 0; }
    const pairs = (n * (n - 1)) / 2;
    if (pairs > 0) {
      const divisor = pairs >= DRIFT_PAIRS_CAP ? 1 : Math.floor(DRIFT_PAIRS_CAP / pairs);
      if (ambAcc >= Math.max(AMBIENT_EVERY_MIN, divisor)) runAmbient();
    }
  }

  return {
    update, runAmbient,
    bankFor, onTalk, applyEvent, addLevel, setType, setTypePair,
    level, type, relation, specialChance, rollSpecial, bucketOf,
    names,
    get time() { return gs; },
    get day() { return gameDay(); },
    get eventsToday() { return eventsToday; },
    log,

    /** Lecture brute (tests / debug). */
    snapshot() {
      const out = [];
      for (let a = 0; a < n; a++) {
        for (let b = 0; b < n; b++) {
          if (a === b) continue;
          out.push({ a, b, level: lvl[a][b], type: typ[a][b] });
        }
      }
      return out;
    },

    /** Crochets de test (aucun usage en jeu). */
    _test: {
      driftDelta,
      driftCount,
      tierOfDays,
      setTime(v) { gs = v; ambAcc = 0; lastBatchGs = v; },
      setTimeScale(v) { timeScale = v; },
      addMinutes(v) { ambAcc += v; },
      setLevel(a, b, v) { lvl[a][b] = clampLevel(v); },
      setType(a, b, t) { typ[a][b] = t; },
      setTalk(a, b, t) { lastTalk[a][b] = t; },
      setEventsToday(v) { eventsToday = v; },
      setBirthday(i, day) { bday[i] = day; },
      setBdayYear(i, y) { bdayYear[i] = y; },
      gameDay,
      gameYear,
      birthday(i) { return bday[i]; },
    },
  };
}
