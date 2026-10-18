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
 *   - **Relations** : moteur `relations.js` — règles ROM authentiques
 *     (niveaux 0..200 par sens, types ami/amoureux, événements ±40,
 *     dérive ambiante quotidienne, banques de dialogue First/Usual/Unusual/
 *     Birthday, confession à (niveau/2)²/100). La lecture « affinité » des
 *     intentions est dérivée du niveau (0..1 = 0..200).
 *   - Les intentions **découlent des besoins** : fatigué → banc ; envie de
 *     compagnie → va voir son meilleur ami ; ennui → contemple un point
 *     d'intérêt (fontaine, kiosque…) ; sinon flânerie, souvent vers un POI.
 *   - **Mini-IA locale étendue** (0 réseau, comme Nintendo) : pensées
 *     visibles (bulles texte de décision : « je vais voir Léa »), mémoire
 *     par Mii (10 souvenirs cités dans les dialogues), plans à moyen terme
 *     (devenir ami / se réconcilier — suivis, célébrés, abandonnés à
 *     l'expiration), répliques contextuelles (souvenir partagé, plan,
 *     moment de la journée) et rythme du jour (matin / après-midi / soir /
 *     nuit depuis l'heure locale réelle).
 *
 * Interactions : meet → greet → talk → outcome → part (phases ci-dessous).
 * Les Mii scriptés (`mii.scripted = true`) sont pilotés par le directeur.
 * Pendant la conversation, ils échangent de VRAIES répliques (bulles texte)
 * organisées en SCÈNES (question → réponse → relance ; un seul locuteur à la
 * fois) d'après la banque ROM (First/Usual/Unusual/Birthday/Chat), puis
 * l'issue (discussion / fou rire / dispute / danse / confession). Un registre
 * anti-répétition garantit que deux conversations simultanées ne rejouent
 * jamais la même scène (cf. `pickScene`/`pickFresh`).
 * Toutes les décisions et interactions sont journalisées dans `log`.
 */

import { makeBubble } from './emotes.js';
import { createRelations, EVENT_DELTA } from './relations.js';

const INTERACT_RADIUS = 2.4;   // distance de croisement pour déclencher
const TALK_DIST = 1.35;        // distance face à face pendant la conversation
const MIN_SEP = 0.75;          // distance minimale entre deux Mii (anti-collage)
const TALK_MIN = 3.5;          // durée de conversation (s)
const TALK_MAX = 7.5;
const COOLDOWN_MIN = 16;       // cooldown par Mii après interaction (s)
const COOLDOWN_MAX = 38;
const SCENE_HOLD = 40;         // s — une scène ne peut pas revenir avant ce délai
const LINE_HOLD = 30;          // s — idem pour une ligne seule (salutation, réponse)
const MEET_TIMEOUT = 14;       // s — rencontre qui n'aboutit pas → abandon propre
const WANDER_MIN = 4;          // temps entre deux errances (s)
const WANDER_MAX = 11;
const SIT_MIN = 12;            // durée assise (s)
const SIT_MAX = 26;
const BOUNDS = 17;             // rayon d'errance dans la place
const ENERGY_SIT = 0.30;       // seuil de fatigue → banc
const SOCIAL_SEEK = 0.38;      // seuil de solitude → va voir un ami
const FUN_POI = 0.32;          // seuil d'ennui → point d'intérêt
const THOUGHT_MIN = 12;        // s — anti-spam des pensées (une toutes les 12-26 s)
const THOUGHT_MAX = 26;
const PLAN_BOND_T = 300;       // s — durée de vie d'un plan « devenir ami »
const PLAN_RECON_T = 240;      // s — durée de vie d'un plan « se réconcilier »
const CTX_CHANCE = 0.4;        // proba qu'une conversation cite le contexte réel

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ── Scènes de dialogue (bulles texte) ──
 * Le contenu suit la banque de dialogue tirée par le moteur ROM :
 * First (première fois), Usual (habituel), Unusual (rare), Birthday, Chat.
 * Une scène = une suite ORDONNÉE de 2-4 répliques : la 2e répond à la 1re,
 * la 3e rebondit — la parole alterne, un seul locuteur à la fois.
 * {me} / {other} = prénoms des deux participants.
 * Anti-répétition : une scène (ou une ligne seule : salutation, réponse)
 * déjà vue récemment est écartée — deux groupes ne rejouent jamais la même
 * scène au même moment (registre `sceneStamp`/`lineStamp`, cf. pickScene). */

const SCENES = {
  first: [
    ['On se présente ? Moi c\u2019est {me} !',
     'Enchanté ! {other}, ravi de te rencontrer.',
     'Cool ! On va bien s\u2019entendre, je le sens.'],
    ['Hé ! On ne se connaît pas encore, je crois !',
     'Non, jamais vus ! Moi c\u2019est {other}.',
     'Et moi {me}. Enchanté alors !'],
    ['Première conversation ! Faut que ce soit mémorable, alors.',
     'Je retiendrai, promis ! Moi c\u2019est {other}.',
     'Moi c\u2019est {me}. Sympa de te connaître !'],
  ],
  usual: [
    ['Il fait super bon sur la place aujourd\u2019hui, non ?',
     'Carrément ! Parfait pour se balader.',
     'Et la fontaine brille bien, regarde.'],
    ['Quoi de neuf, {other} ?',
     'Oh, rien de spécial. Et toi ?',
     'Pareil, tranquille. La belle vie, quoi.'],
    ['Tu viens souvent ici, {other} ?',
     'Oui ! C\u2019est mon coin préféré.',
     'Je te comprends, on y est trop bien.'],
    ['J\u2019ai bien dormi sur mon banc, ce matin. Ne juge pas.',
     'Aucun jugement. Il est confortable au moins ?',
     'Étonnamment, oui ! Rien à voir avec un lit.'],
    ['Tu as vu la fontaine ? Elle brille, c\u2019est joli.',
     'Oui ! J\u2019aime la regarder, ça me calme.',
     'Pareil. On a de la chance d\u2019être ici.'],
  ],
  unusual: [
    ['J\u2019ai rêvé que j\u2019étais un chapeau. Bizarre, non ?',
     'Un chapeau ?! Tu portais qui, alors ?',
     'Personne. J\u2019étais un chapeau libre. C\u2019était génial.'],
    ['Parfois je parle aux nuages. Ils répondent jamais.',
     'Faut leur laisser le temps. Les nuages sont lents.',
     'Oh. J\u2019avais jamais vu ça comme ça.'],
    ['Et si on dansait la prochaine fois qu\u2019il pleut ?',
     'Danser sous la pluie ? Carrément oui !',
     'Hé hé. Je savais que tu dirais ça.'],
    ['Je crois que j\u2019ai vu un poisson voler. Sérieux.',
     '\u2026Voler ? Comme un oiseau ?',
     'Exactement comme un oiseau. La place est dingue.'],
  ],
  birthday: [
    ['Une bougie, deux bougies\u2026 ça en fait beaucoup !',
     'Hé ! Moins fort, les années passent vite !',
     'Ah ah ! Joyeux anniversaire quand même !'],
    ['Eh oui, tu fais un vœu ?',
     'Oui ! Que la fête dure encore et encore !',
     'Ça, c\u2019est un vœu que j\u2019approuve !'],
  ],
  chat: [
    ['Alors, quoi de neuf ?',
     'Pas grand-chose. Toi, raconte !',
     'Moi non plus. Mais discuter ici, c\u2019est déjà cool.'],
    ['Tu as l\u2019air en forme aujourd\u2019hui !',
     'Merci ! Toi aussi, tu rayonnes !',
     'On se fait une petite balade, plus tard ?'],
    ['Je pensais justement à toi, tiens.',
     'À moi ? Qu\u2019est-ce que je faisais dans ta tête ?',
     'Rien de fou. Juste\u2026 tu es sympa, voilà.'],
    ['La place est animée aujourd\u2019hui, hein ?',
     'Grave ! J\u2019adore quand il y a du monde.',
     'Pareil. Faut en profiter !'],
  ],
};

/** Scènes CONTEXTUELLES (mini-IA) : elles citent la situation réelle —
 *  plan en cours, souvenir partagé, moment de la journée. Même forme que
 *  SCENES ({me}/{other}, suites ordonnées, anti-répétition) ; choisies par
 *  `pickSceneFor` (~40 %) avant de retomber sur la banque ROM. */
const CTX_SCENES = {
  planBond: [
    ['Tu sais, {other}, je suis content d\u2019être tombé sur toi.',
     'Ah oui ? Ça me fait plaisir à entendre !',
     'Voilà. Fallait que je te le dise, c\u2019est tout.'],
    ['Je te considère comme un vrai ami, {other}, tu sais ça ?',
     'Sérieux ? Moi c\u2019est pareil, tu es quelqu\u2019un de bien.',
     'Alors on va s\u2019entendre longtemps, tous les deux !'],
  ],
  planRecon: [
    ['Écoute, {other}\u2026 je suis désolé pour l\u2019autre fois.',
     'C\u2019est oublié ! J\u2019étais de mauvaise humeur, moi aussi.',
     'Cool. On repart sur de bonnes bases, alors !'],
    ['Je voulais m\u2019excuser pour l\u2019autre jour, {other}.',
     'Pas de souci. Ça arrive à tout le monde.',
     'Merci. Ça me fait du bien de te le dire.'],
  ],
  memLaugh: [
    ['On a bien rigolé la dernière fois, hein !',
     'HA HA ! J\u2019y repense encore !',
     'Faudra remettre ça très vite, alors.'],
    ['Je repense à notre fou rire de l\u2019autre jour\u2026',
     'Arrête, j\u2019en ris encore rien qu\u2019à y penser !',
     'C\u2019est bon signe, ça. À très vite !'],
  ],
  memArgue: [
    ['Au fait\u2026 c\u2019est oublié, l\u2019autre fois. Vraiment.',
     'Merci. Moi aussi j\u2019étais tendu, tu sais.',
     'Cool ! Entre nous, c\u2019est bien mieux comme ça.'],
    ['J\u2019espère qu\u2019on s\u2019est tout dit, l\u2019autre jour\u2026',
     'Oui, oui. C\u2019est du passé, tout ça.',
     'Parfait. Alors soyons amis, comme avant.'],
  ],
  memDance: [
    ['Ta danse de la dernière fois\u2026 cultissime !',
     'Hé ! J\u2019ai mon style, que veux-tu.',
     'Remets ça quand tu veux, alors !'],
    ['On redanse bientôt ? J\u2019ai encore des moves à montrer.',
     'Ah ah ! Avec plaisir, mais doucement alors.',
     'Marché conclu ! La prochaine est pour nous deux.'],
  ],
  phaseMorning: [
    ['Quelle belle matinée sur la place, hein !',
     'Parfait pour une petite balade matinale.',
     'Et le soleil est déjà là. Bonne journée !'],
    ['Bien dormi ? Moi j\u2019adore les matins ici.',
     'Pareil ! C\u2019est calme et lumineux.',
     'La place au réveil, rien de mieux.'],
    ['Le matin, la fontaine brille encore plus, non ?',
     'J\u2019allais le dire ! C\u2019est le meilleur moment.',
     'On est bien d\u2019accord. Bonne matinée !'],
  ],
  phaseAfternoon: [
    ['L\u2019après-midi est douce, aujourd\u2019hui, non ?',
     'Carrément. Idéal pour prendre son temps.',
     'On a bien choisi notre journée, je te dis.'],
    ['Il fait bon sur la place à cette heure-ci.',
     'C\u2019est mon moment préféré de la journée.',
     'Je note, je note. On se retrouve ici alors !'],
    ['L\u2019après-midi, la place est toujours animée. J\u2019adore.',
     'Avec tout ce monde, oui ! Ça vit.',
     'Vivement la prochaine balade ensemble !'],
  ],
  phaseEvening: [
    ['Belle soirée, non ? Les lampadaires s\u2019allument.',
     'C\u2019est vrai que la place est jolie le soir.',
     'On a bien fait de venir traîner par ici.'],
    ['Le ciel est magnifique, ce soir, tu trouves pas ?',
     'Si ! On dirait un tableau.',
     'Faut savourer, ça dure jamais assez.'],
    ['Bonsoir ! Tu restes un peu ce soir ?',
     'Oui, je me promène encore un peu.',
     'Cool, on en profite ensemble alors !'],
  ],
  phaseNight: [
    ['Il fait calme, la nuit, sur la place\u2026',
     'Presque trop calme, hi hi.',
     'J\u2019aime bien traîner ici tard, moi aussi.'],
    ['Tu n\u2019arrives pas à dormir non plus, on dirait ?',
     'Jamais avant minuit, c\u2019est plus fort que moi.',
     'Bienvenue au club des couche-tard !'],
    ['La place la nuit, c\u2019est un autre monde, non ?',
     'Les lampadaires, le silence\u2026 c\u2019est magique.',
     'Promis, on se refait une promenade nocturne !'],
  ],
};

/** Pensées (mini-IA) : bulles texte montrant l'intention en cours —
 *  purement visuelles, jamais pendant une interaction. {other} = cible. */
const THOUGHTS = {
  seat: ['Je suis un peu fatigué\u2026 un banc, tiens.',
         'Une petite pause assise, ça me ferait du bien.',
         'Mes jambes me réclament une halte.'],
  seek: ['Tiens, j\u2019irais bien voir {other} !',
         'Je me demande ce que devient {other}\u2026',
         'Ça fait longtemps que je n\u2019ai pas vu {other}.'],
  seekBond: ['Je veux devenir ami avec {other} !',
             'J\u2019espère que {other} et moi, on va bien s\u2019entendre\u2026',
             'Allez, je vais voir {other} pour discuter !'],
  seekRecon: ['Il faut que je me réconcilie avec {other}\u2026',
              'Je ne veux pas rester fâché avec {other}.',
              'Cette dispute avec {other} me trotte dans la tête\u2026'],
  poi: ['Cette fontaine est si jolie\u2026',
        'Un petit tour du côté du kiosque, tiens.',
        'J\u2019aime bien regarder les arbres, moi.'],
  strollMorning: ['Quelle belle matinée sur la place !',
                  'Le soleil du matin, rien de mieux.',
                  'La journée commence bien, ici.'],
  strollAfternoon: ['Où vais-je bien pouvoir flâner\u2026',
                    'Une petite balade tranquille.',
                    'J\u2019adore l\u2019ambiance de cette place.'],
  strollEvening: ['Belle soirée sur la place\u2026',
                  'Les lampadaires s\u2019allument doucement.',
                  'Un dernier tour avant la nuit, tiens.'],
  strollNight: ['La place est si calme la nuit\u2026',
                'Je devrais dormir, mais tant pis.',
                'Quelques pas de plus sous les lampadaires.'],
  memDance: ['Notre danse de l\u2019autre fois\u2026 j\u2019y pense encore !',
             'Il faudra redanser bientôt, tiens.'],
  memLaugh: ['On a bien rigolé, l\u2019autre fois\u2026',
             'HA ! J\u2019y repense encore, c\u2019était trop drôle.'],
};

/** Salutations (une seule bulle, avant la scène). */
const GREET_LINES = ['Salut !', 'Coucou !', 'Hé, salut !', 'Tiens, bonjour !'];
const FIRST_GREET = ['Hé ! Je crois qu\u2019on ne s\u2019est jamais parlé, non ?',
                     'Salut ! On ne se connaît pas encore, je crois !'];
const BIRTHDAY_GREET = ['Joyeux anniversaire, {other} !!', 'Bon anniversaire, {other} !!'];
/** Salutations contextuelles (mini-IA) : ajoutées au pool selon le moment. */
const GREET_CTX = {
  morning: ['Bien dormi ?', 'Quelle belle matinée, hein !'],
  evening: ['Belle soirée, non ?', 'Bonsoir bonsoir !'],
  night: ['Oh, un autre couche-tard !', 'Qui vit la nuit\u2026'],
};

/** Répliques de fin d'interaction : [ce que dit `a`, réponse de `b`]. */
const OUTCOME_LINES = {
  chat: [['J\u2019adore discuter avec toi !'], ['Moi aussi ! \u00c0 la prochaine !']],
  laugh: [['HA HA HA ! J\u2019en peux plus !'], ['Arrête ! Je vais pleurer de rire !']],
  argue: [['Pfff ! N\u2019importe quoi, ce que tu dis\u2026'], ['Tu exagères, l\u00e0 !']],
  dance: [['Allez, on danse ! C\u2019est trop drôle !'], ['Bon\u2026 d\u2019accord, mais doucement !']],
};
/** Durées des phases d'issue (s) — la parole de `b` arrive à mi-durée. */
const OUTCOME_DUR = { chat: 3.2, laugh: 3.6, argue: 4.4, dance: 4.2 };

/** Remplace {me}/{other} dans une réplique par les prénoms des Mii. */
function fillLine(text, from, to) {
  return text.replace(/\{me\}/g, from.name).replace(/\{other\}/g, to.name);
}

/** Côté où poser la queue de la bulle : à l'OPPOSÉ de l'interlocuteur. */
function bubbleSide(m, other) {
  const vx = other.group.position.x - m.group.position.x;
  const vz = other.group.position.z - m.group.position.z;
  const ry = m.group.rotation.y;
  const lx = Math.cos(ry) * vx - Math.sin(ry) * vz;
  return lx > 0 ? -1 : 1;
}

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
 * @param {{world:{poi:Object}, miis:import('./mii.js').MiiEntity[], seed?:number}} opts
 */
export function createSocial({ world, miis, seed = 20261017, now = null }) {
  const seats = (world.poi && world.poi.seats) || [];
  const log = [];          // {t, type, ...} — décisions, interactions et poses
  const pairs = [];        // interactions en cours
  const bubbles = new Map();
  let t = 0;
  let nowFn = now || (() => new Date());
  let forcedCtx = null;    // hook de test : force la prochaine scène contextuelle

  /** Rythme du jour (mini-IA) : heure locale réelle — même source que
   *  l'horloge du HUD. Matin 5-12, après-midi 12-18, soir 18-22, nuit 22-5. */
  function dayPhase() {
    const h = nowFn().getHours();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'afternoon';
    if (h >= 18 && h < 22) return 'evening';
    return 'night';
  }

  /* ── Registre anti-répétition ──
   * `sceneStamp` : dernière utilisation d'une scène (par référence).
   * `lineStamp` : dernière utilisation d'une ligne seule (salutation, réponse).
   * Deux conversations simultanées ne peuvent pas tirer la même scène/ligne :
   * on écarte ce qui a servi dans la fenêtre, sinon on prend le plus OLD. */
  const sceneStamp = new Map();
  const lineStamp = new Map();

  function pickSceneFrom(list) {
    const fresh = list.filter((s) => t - (sceneStamp.get(s) || -1e9) > SCENE_HOLD);
    const pool = fresh.length ? fresh : list;
    let best = pool[0], bd = Infinity;
    for (const s of pool) {
      const d = t - (sceneStamp.get(s) || -1e9);
      if (d < bd) { bd = d; best = s; }
    }
    sceneStamp.set(best, t);
    return best;
  }

  function pickScene(bank) {
    return pickSceneFrom(SCENES[bank] || SCENES.usual);
  }

  /** Pools contextuels disponibles pour cette paire, par priorité :
   *  plan personnel en cours > souvenir partagé > moment de la journée. */
  function contextPool(p) {
    const { a, b } = p;
    const pools = [];
    const planKind = (self, other) => {
      const pl = self._soc.plan;
      return pl && pl.target === other ? pl.kind : null;
    };
    const k1 = planKind(a, b) || planKind(b, a);
    if (k1 === 'reconcile') pools.push(CTX_SCENES.planRecon);
    else if (k1 === 'bond') pools.push(CTX_SCENES.planBond);
    const lastOf = (self, other) => {
      const mem = self._soc.memory;
      for (let i = mem.length - 1; i >= 0; i--) {
        if (mem[i].with === other.name && mem[i].kind !== 'plan') return mem[i].kind;
      }
      return null;
    };
    const mk = lastOf(a, b) || lastOf(b, a);
    if (mk === 'laugh') pools.push(CTX_SCENES.memLaugh);
    else if (mk === 'dance') pools.push(CTX_SCENES.memDance);
    else if (mk === 'argue') pools.push(CTX_SCENES.memArgue);
    const ph = dayPhase();
    if (ph === 'morning') pools.push(CTX_SCENES.phaseMorning);
    else if (ph === 'evening') pools.push(CTX_SCENES.phaseEvening);
    else if (ph === 'night') pools.push(CTX_SCENES.phaseNight);
    else pools.push(CTX_SCENES.phaseAfternoon);
    return pools;
  }

  /** Scène de conversation : ~40 % de chance de citer un contexte réel
   *  (plan, souvenir, moment de la journée), sinon banque ROM classique. */
  function pickSceneFor(p) {
    const kind = forcedCtx;
    forcedCtx = null;
    if (kind || Math.random() < CTX_CHANCE) {
      let pools = contextPool(p);
      if (kind === 'plan') pools = pools.filter((l) => l === CTX_SCENES.planBond || l === CTX_SCENES.planRecon);
      else if (kind === 'mem') pools = pools.filter((l) => l === CTX_SCENES.memLaugh || l === CTX_SCENES.memDance || l === CTX_SCENES.memArgue);
      else if (kind === 'phase') pools = pools.filter((l) => l === CTX_SCENES.phaseMorning || l === CTX_SCENES.phaseAfternoon || l === CTX_SCENES.phaseEvening || l === CTX_SCENES.phaseNight);
      if (pools.length) return pickSceneFrom([].concat(...pools));
    }
    return pickScene(p.bank);
  }

  function pickFresh(lines) {
    const fresh = lines.filter((l) => t - (lineStamp.get(l) || -1e9) > LINE_HOLD);
    const pool = fresh.length ? fresh : lines;
    let best = pool[0], bd = Infinity;
    for (const l of pool) {
      const d = t - (lineStamp.get(l) || -1e9);
      if (d < bd) { bd = d; best = l; }
    }
    lineStamp.set(best, t);
    return best;
  }

  /* ── Mini-IA : mémoire, pensées et plans ── */

  /** Ajoute un souvenir à un Mii (10 max — les plus vieux s'effacent). */
  function pushMemory(m, entry) {
    const mem = m._soc.memory;
    mem.push({ t: +t.toFixed(1), ...entry });
    if (mem.length > 10) mem.shift();
  }

  /** Affiche une « pensée » dans la bulle d'un Mii (intention visible).
   *  Jamais pendant une interaction ; anti-spam sauf `priority` (jalons
   *  de plan, qui passent outre le cooldown). */
  function showThought(m, text, seconds = 2.4, priority = false) {
    const s = m._soc;
    if (m.busy || !s) return false;
    if (!priority && (s.thoughtLeft > 0 || s.thoughtCd > 0)) return false;
    bubbles.get(m).showText(text, seconds, 1);
    s.thoughtLeft = seconds;
    s.thoughtCd = THOUGHT_MIN + Math.random() * (THOUGHT_MAX - THOUGHT_MIN);
    log.push({ t: +t.toFixed(2), type: 'thought', name: m.name, text });
    return true;
  }

  /* ── Moteur de relations (règles ROM) ──
   * timeScale 60 : 1 s réelle = 1 min de jeu — la dérive ambiante (formule
   * ROM : floor(minutes ÷ floor(3000÷paires)), cap 500) reste observable
   * avec 6 Mii (≈ 1 événement / 3,3 min réelles). */
  const idxOf = new Map();
  for (let i = 0; i < miis.length; i++) idxOf.set(miis[i], i);
  const relations = createRelations({ names: miis.map((m) => m.name), seed, timeScale: 60 });

  /* ── Points d'intérêt (contemplation) : gros objets du décor ── */
  const POI_OBS = ((world.poi && world.poi.obstacles) || [])
    .filter((o) => o.r >= 1.5)
    .map((o) => ({ o, type: o.r >= 4 ? 'fountain' : 'spot' }));
  const BIG_OBS = POI_OBS.map((it) => it.o);

  /** Vrai si le trajet direct entre deux Mii ne traverse pas un gros obstacle. */
  function clearPath(a, b) {
    const ax = a.group.position.x, az = a.group.position.z;
    const dx2 = b.group.position.x - ax, dz2 = b.group.position.z - az;
    const L2 = dx2 * dx2 + dz2 * dz2;
    for (let i = 0; i < BIG_OBS.length; i++) {
      const o = BIG_OBS[i];
      let tt = L2 > 1e-6 ? ((o.x - ax) * dx2 + (o.z - az) * dz2) / L2 : 0;
      tt = Math.max(0, Math.min(1, tt));
      const dd = Math.hypot(o.x - (ax + dx2 * tt), o.z - (az + dz2 * tt));
      if (dd < o.r - 0.1) return false;
    }
    return true;
  }

  /** Point de rendez-vous à `dist` de `b`, côté `a`, garanti hors obstacles
   *  (tourne autour de b par pas de 0,5 rad si le côté direct est occupé). */
  function meetPoint(a, b, dist) {
    const bx = b.group.position.x, bz = b.group.position.z;
    const ang0 = Math.atan2(a.group.position.x - bx, a.group.position.z - bz);
    const obs = (world.poi && world.poi.obstacles) || [];
    for (let k = 0; k < 9; k++) {
      const step = Math.ceil(k / 2) * 0.5 * (k % 2 ? -1 : 1);
      const ang = ang0 + step;
      const x = bx + Math.sin(ang) * dist;
      const z = bz + Math.cos(ang) * dist;
      let ok = true;
      for (let i = 0; i < obs.length; i++) {
        const o = obs[i];
        if (Math.hypot(x - o.x, z - o.z) < o.r + 0.5) { ok = false; break; }
      }
      if (ok) return { x, z };
    }
    return null;
  }

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

  /* ── Affinité (0..1) dérivée du niveau de relation (0..200, deux sens) ──
   * Elle ne fait que pondérer les intentions (qui va voir qui, envie de
   * parler au croisement) — les VALEURS de relation restent celles du moteur. */
  const getAff = (a, b) => {
    const ia = idxOf.get(a), ib = idxOf.get(b);
    if (ia == null || ib == null) return 0;
    return (relations.level(ia, ib) + relations.level(ib, ia)) / (2 * 200);
  };

  /* ── Init : personnalité, besoins, bulles ── */
  for (const m of miis) {
    const b = makeBubble();
    // La position exacte est recalculée à chaque frame (sommet de tête) ;
    // ici seulement une valeur de départ saine.
    b.sprite.position.set(0, (m.height || 1.9) + 0.2, 0);
    m.group.add(b.sprite);
    bubbles.set(m, b);
    m.busy = false;
    m._soc = {
      cooldown: 4 + Math.random() * 10,
      wander: 1.5 + Math.random() * 4,
      goingSeat: null,
      seatStage: false,
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
      memory: [],    // souvenirs (mini-IA) : {t, kind, with, val}
      plan: null,    // plan à moyen terme : {kind, target, until, prog}
      thoughtLeft: 0,                          // pensée affichée (s)
      thoughtCd: 4 + Math.random() * 8,        // anti-spam des pensées
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
    let k;
    if ((r -= chat) <= 0) k = 'chat';
    else if ((r -= laugh) <= 0) k = 'laugh';
    else if ((r -= dance) <= 0) k = 'dance';
    else k = 'argue';
    // Mini-IA : un plan « se réconcilier » interdit la dispute entre les
    // deux concernés — la prochaine interaction sera forcément douce.
    const pr = a._soc.plan, pr2 = b._soc.plan;
    if (k === 'argue' && ((pr && pr.kind === 'reconcile' && pr.target === b)
        || (pr2 && pr2.kind === 'reconcile' && pr2.target === a))) k = 'chat';
    return k;
  }

  function startPair(a, b, kind = kindFor(a, b)) {
    // Garde-fou : un Mii déjà engagé (busy) ne peut JAMAIS entrer dans une
    // seconde interaction — la boucle de croisement peut proposer plusieurs
    // partenaires à la suite, ce test ferme la porte net. Un Mii assis est
    // exclu aussi (il resterait sur son banc pendant l'échange).
    if (a === b || a.busy || b.busy || a.state === 'sit' || b.state === 'sit') return false;
    a.busy = b.busy = true;
    a.scripted = b.scripted = true;
    a._soc.thoughtLeft = 0;   // la bulle de pensée cède la place au dialogue
    b._soc.thoughtLeft = 0;
    // Banque de dialogue du Mii approché (règles ROM : First/Birthday/…).
    const bank = relations.bankFor(idxOf.get(b), idxOf.get(a));
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
    const pa = meetPoint(a, b, TALK_DIST);
    if (!pa) {
      // Aucune place libre autour de b : on abandonne sans interaction.
      a.busy = b.busy = false; a.scripted = b.scripted = false;
      a._soc.cooldown = Math.max(a._soc.cooldown, 6);
      b._soc.cooldown = Math.max(b._soc.cooldown, 6);
      return false;
    }
    a.walkTo(pa.x, pa.z);
    b.halt();                       // b attend sur place…
    b.faceTo(pa.x, pa.z);           // …en regardant a approcher.
    pairs.push({ a, b, ia: idxOf.get(a), ib: idxOf.get(b),
                 kind, bank, phase: 'meet', t: 0, pa, pb,
                 speaker: a, swapIn: 1.6, talkLeft: 0, scene: null, lineIdx: 0 });
    return true;
  }

  /** Démarre une réplique : le locuteur parle (animation + bulle texte),
   *  l'écouteur réagit sobrement (un signe de tête). Une seule voix par
   *  paire : l'écouteur n'a jamais de bulle de dialogue. */
  function startSpeaker(p) {
    const listener = p.speaker === p.a ? p.b : p.a;
    p.speaker.playAnim('podtalk', { once: false });
    listener.playAnim(pick(['podwaitf', 'podnod']), { once: true });
    const raw = (p.scene && p.scene[p.lineIdx]) || '\u2026';
    const text = fillLine(raw, p.speaker, listener);
    // Durée calée sur la LONGUEUR de la réplique : le temps de la lire.
    const dur = Math.max(1.8, Math.min(3.4, 1.3 + text.length / 18));
    p.swapIn = dur;
    bubbles.get(listener).hide();
    // +0,9 s de marge : la bulle ne « saute » jamais entre deux répliques
    // (l'issue remplace la dernière proprement).
    bubbles.get(p.speaker).showText(text, dur + 0.9, bubbleSide(p.speaker, listener));
  }

  /** Réplique suivante de la scène, ou scène suivante si le temps reste,
   *  sinon on laisse expirer `talkLeft` (fin douce avant l'issue). */
  function advanceLine(p) {
    const other = p.speaker === p.a ? p.b : p.a;
    if (p.lineIdx + 1 < (p.scene ? p.scene.length : 0)) {
      p.lineIdx++;
      p.speaker = other;
      startSpeaker(p);
    } else if (p.talkLeft > 2.0) {
      p.speaker = other;
      p.scene = pickSceneFor(p);
      p.lineIdx = 0;
      startSpeaker(p);
    } else {
      p.swapIn = 60;                       // plus de nouvelle réplique…
      p.talkLeft = Math.min(p.talkLeft, 1.4);  // …on écourte proprement
    }
  }

  function startOutcome(p) {
    const { a, b } = p;
    const dur = OUTCOME_DUR[p.kind] || 3.2;
    const say = OUTCOME_LINES[p.kind] || OUTCOME_LINES.chat;
    // `a` parle, `b` réagit (émotion), puis `b` répond à mi-parcours.
    bubbles.get(a).showText(fillLine(pickFresh(say[0]), a, b), dur * 0.5, bubbleSide(a, b));
    if (p.kind === 'chat') {
      a.playAnim('podnod', { once: true });
      b.playAnim('podwave', { once: true });
      bubbles.get(b).show('heart', dur * 0.5, bubbleSide(b, a));
    } else if (p.kind === 'laugh') {
      a.playAnim('podlaugh', { once: true });
      b.playAnim('podlaugh', { once: true });
      bubbles.get(b).show('note', dur * 0.5, bubbleSide(b, a));
    } else if (p.kind === 'argue') {
      a.playAnim('podangry', { once: false });
      b.playAnim('podangry', { once: false });
      bubbles.get(b).show('angry', dur * 0.5, bubbleSide(b, a));
    } else { // dance
      a.playAnim('poddance', { once: false });
      b.playAnim('poddance2', { once: false });
      bubbles.get(b).show('note', dur * 0.5, bubbleSide(b, a));
    }
  }

  function endPair(p) {
    const { a, b } = p;
    p.phase = 'done';
    a.busy = b.busy = false;
    a.scripted = b.scripted = false;
    // Événement ±40 dans les deux sens (deltas des callbacks ROM, FUN_0056b570).
    const ia = idxOf.get(a), ib = idxOf.get(b);
    const before = { ab: relations.level(ia, ib), ba: relations.level(ib, ia) };
    const delta = p.kind === 'argue' ? -EVENT_DELTA : EVENT_DELTA;
    relations.applyEvent(ia, ib, delta);
    // Événement spécial (FUN_007c48f0) : confession si très amis (≥ 119).
    let ev = 'none';
    if (p.kind !== 'argue') {
      ev = relations.rollSpecial(ia, ib);
      if (ev === 'confession') {
        a.playAnim('wave', { once: true });
        b.playAnim('wave', { once: true });
        bubbles.get(a).show('heart', 1.4);
        bubbles.get(b).show('heart', 2.8);
        // Déclaration en deux temps (bulles texte), comme dans le jeu.
        setTimeoutSafe(() => {
          if (!a.busy) bubbles.get(a).showText('Je\u2026 je t\u2019aime bien. Beaucoup.', 2.8, bubbleSide(a, b));
        }, 1300);
        setTimeoutSafe(() => {
          if (!b.busy) bubbles.get(b).showText('\u2026Moi aussi, figure-toi !', 2.6, bubbleSide(b, a));
        }, 3000);
      }
    }
    const after = { ab: relations.level(ia, ib), ba: relations.level(ib, ia) };
    for (const m of [a, b]) {
      m._soc.needs.social = Math.min(1, m._soc.needs.social + 0.45);
      if (p.kind === 'dance') m._soc.needs.fun = Math.min(1, m._soc.needs.fun + 0.35);
      else if (p.kind !== 'argue') m._soc.needs.fun = Math.min(1, m._soc.needs.fun + 0.15);
    }
    // Mini-IA : souvenirs partagés + suivi des plans de chacun.
    for (const [self, other] of [[a, b], [b, a]]) {
      const s0 = self._soc;
      pushMemory(self, { kind: p.kind, with: other.name });
      const pl = s0.plan;
      if (pl && pl.target === other && p.kind !== 'argue') {
        pl.prog += 1;
        if (pl.kind === 'reconcile' || pl.prog >= 2) {
          s0.plan = null;
          pushMemory(self, { kind: 'plan', with: other.name, val: pl.kind });
          log.push({ t: +t.toFixed(2), type: 'plan', name: self.name, what: pl.kind,
                     target: other.name, action: 'done' });
          const doneText = pl.kind === 'reconcile'
            ? 'Voilà, on s\u2019est réconciliés ! Trop cool.'
            : 'Youpi, je sens qu\u2019on devient de vrais amis !';
          setTimeoutSafe(() => showThought(self, doneText, 2.8, true), 1400);
        }
      }
      if (!s0.plan && p.kind === 'argue' && Math.random() < 0.35) {
        // On rumine la dispute → plan « se réconcilier ».
        s0.plan = { kind: 'reconcile', target: other, until: t + PLAN_RECON_T, prog: 0 };
        log.push({ t: +t.toFixed(2), type: 'plan', name: self.name, what: 'reconcile',
                   target: other.name, action: 'new' });
      } else if (!s0.plan && p.kind !== 'argue' && Math.random() < 0.22 && getAff(self, other) < 0.85) {
        // Bonne entente → envie de devenir (encore) plus proche.
        s0.plan = { kind: 'bond', target: other, until: t + PLAN_BOND_T, prog: 0 };
        log.push({ t: +t.toFixed(2), type: 'plan', name: self.name, what: 'bond',
                   target: other.name, action: 'new' });
      }
    }
    a._soc.cooldown = COOLDOWN_MIN + Math.random() * (COOLDOWN_MAX - COOLDOWN_MIN);
    b._soc.cooldown = a._soc.cooldown;
    const pa = randPoint(world, a), pb = randPoint(world, b);
    setTimeoutSafe(() => { if (!a.busy) a.walkTo(pa.x, pa.z); }, 500);
    setTimeoutSafe(() => { if (!b.busy) b.walkTo(pb.x, pb.z); }, 650);
    log.push({ t: +t.toFixed(2), type: 'interaction', kind: p.kind, bank: p.bank,
               a: a.name, b: b.name, lvBefore: before, lvAfter: after, delta, event: ev });
  }

  /** Abandonne une rencontre sans interaction (trajet impossible). */
  function endPairAbort(p) {
    const { a, b } = p;
    p.phase = 'done';
    a.busy = b.busy = false;
    a.scripted = b.scripted = false;
    a._soc.cooldown = Math.max(a._soc.cooldown, 8);
    b._soc.cooldown = Math.max(b._soc.cooldown, 8);
    const pa = randPoint(world, a), pb = randPoint(world, b);
    setTimeoutSafe(() => { if (!a.busy) a.walkTo(pa.x, pa.z); }, 400);
    setTimeoutSafe(() => { if (!b.busy) b.walkTo(pb.x, pb.z); }, 500);
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
      // On attend que `a` ait rejoint la position face à face. En cas de
      // blocage : relance du trajet, puis abandon propre (jamais de
      // conversation à distance ni de Mii qui racle un obstacle).
      const da = Math.hypot(a.group.position.x - p.pa.x, a.group.position.z - p.pa.z);
      const db = Math.hypot(b.group.position.x - p.pb.x, b.group.position.z - p.pb.z);
      const arrivedA = a.state !== 'walk' || da < 0.15;
      const arrivedB = b.state !== 'walk' || db < 0.15;
      // Chien de garde : une rencontre qui n'aboutit pas (trajet impossible)
      // libère les deux Mii — ils ne restent JAMAIS bloqués en 'meet'.
      if (p.t > MEET_TIMEOUT) { endPairAbort(p); return; }
      if (!arrivedA && p.t > 1.2) {
        p.rwIn = (p.rwIn || 0) - dt;
        if (p.rwIn <= 0) {
          p.rwIn = 1.2;
          const mp = meetPoint(a, b, TALK_DIST);
          if (mp) { p.pa = mp; a.walkTo(mp.x, mp.z); }
        }
      }
      if (arrivedA && arrivedB) {
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
        b.playAnim('podnod', { once: true });
        // La salutation (bulle texte, jamais dupliquée entre deux groupes)
        // suit la banque ROM tirée pour la paire.
        if (p.bank === 'birthday') {
          bubbles.get(a).showText(fillLine(pickFresh(BIRTHDAY_GREET), a, b), 1.5, bubbleSide(a, b));
          bubbles.get(b).show('heart', 1.6, bubbleSide(b, a));
        } else if (p.bank === 'first') {
          bubbles.get(a).showText(fillLine(pickFresh(FIRST_GREET), a, b), 1.5, bubbleSide(a, b));
        } else {
          // Mini-IA : le pool de salutations s'enrichit du moment de la journée.
          const pool = GREET_LINES.concat(GREET_CTX[dayPhase()] || []);
          bubbles.get(a).showText(fillLine(pickFresh(pool), a, b), 1.4, bubbleSide(a, b));
        }
      } else if (p.t > 10) {
        // Impossible de se rejoindre : abandon (pas de conversation de loin).
        endPairAbort(p);
      }
    } else if (p.phase === 'meet' || p.phase === 'greet' || p.phase === 'talk' || p.phase === 'outcome') {
      // Garde l'espace face à face à toutes les phases (jamais collés) —
      // séparation plus rapide s'ils sont très proches. Pendant talk/outcome
      // (poses animées), la correction est minimale : ils ne « glissent » plus.
      const calm = p.phase === 'talk' || p.phase === 'outcome';
      const minSep = calm ? 1.12 : 1.15;
      let sx = a.group.position.x - b.group.position.x;
      let sz = a.group.position.z - b.group.position.z;
      const sd = Math.hypot(sx, sz);
      if (sd < minSep && sd > 1e-3) {
        const rate = sd < (calm ? 0.75 : 0.8) ? (calm ? 1.2 : 2.2) : (calm ? 0.35 : 0.9);
        const k = Math.min(rate * dt, (minSep - sd) / 2);
        a.group.position.x += (sx / sd) * k; a.group.position.z += (sz / sd) * k;
        b.group.position.x -= (sx / sd) * k; b.group.position.z -= (sz / sd) * k;
      }
    }
    if (p.phase === 'greet') {
      if (p.t > 1.3) {
        p.phase = 'talk'; p.t = 0;
        p.talkLeft = TALK_MIN + Math.random() * (TALK_MAX - TALK_MIN);
        p.speaker = Math.random() < 0.5 ? a : b;
        // Une scène = échange ordonné (question → réponse → relance) :
        // qui commence est fixé, chaque réplique dépend de la précédente.
        // Mini-IA : la scène peut citer le contexte (plan, souvenir, moment).
        p.scene = pickSceneFor(p);
        p.lineIdx = 0;
        startSpeaker(p);
        // La conversation est « enregistrée » (timestamps des deux sens) :
        // prochaine rencontre → Usual/Unusual avec bucket de récence.
        relations.onTalk(idxOf.get(a), idxOf.get(b), p.bank);
      }
    } else if (p.phase === 'talk') {
      p.talkLeft -= dt;
      // De temps en temps, l'ÉCOUTEUR ponctue (petit signe) — la parole
      // elle-même est faite de vraies répliques (bulles texte, ci-dessus).
      const talkRate = 0.10 + 0.15 * ((a._soc.pers.speech + b._soc.pers.speech) / 6);
      if (Math.random() < dt * talkRate) {
        const li = p.speaker === p.a ? p.b : p.a;
        bubbles.get(li).show(pick(['note', 'quest', 'heart']), 1.2, bubbleSide(li, p.speaker));
      }
      p.swapIn -= dt;
      if (p.swapIn <= 0) advanceLine(p);
      if (p.talkLeft <= 0) {
        p.phase = 'outcome'; p.t = 0;
        startOutcome(p);
      }
    } else if (p.phase === 'outcome') {
      const dur = OUTCOME_DUR[p.kind] || 3.2;
      // Réponse de `b` (bulle texte) à mi-parcours — `a` vient de parler.
      if (!p.bReply && p.t > dur * 0.5) {
        p.bReply = true;
        const say = OUTCOME_LINES[p.kind] || OUTCOME_LINES.chat;
        // 0,45×dur : la réponse se termine AVANT la fin de l'issue — jamais
        // de bulle qui « traîne » après la conversation (fantôme).
        bubbles.get(b).showText(fillLine(pickFresh(say[1]), b, a), dur * 0.45, bubbleSide(b, a));
      }
      if (p.kind === 'argue' && p.t > dur * 0.4 && !p.sadDone) {
        p.sadDone = true;
        a.playAnim('podsad', { once: true });   // regret
        b.playAnim('podpout', { once: true });  // bouderie
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
        const seat = m.seat;
        if (seat) seat.occupied = false;
        m.scripted = false;
        // Sortie de banc en douceur : le banc reste ignoré tant que le Mii est
        // dans son cercle (sinon il serait « poussé » hors du banc en un seul
        // frame — saut de ~0,75 u visible).
        m._escapeBench = seat ? seat.benchIdx : null;
        // Évite de traverser le banc en se levant : on ré-échantillonne la
        // destination si le trajet passe par le banc.
        const bo = seat ? (m.obstacles || []).find((o) => o.benchIdx === seat.benchIdx) : null;
        let p = randPoint(world, m);
        if (bo) {
          for (let k = 0; k < 3; k++) {
            const ddx = p.x - m.group.position.x, ddz = p.z - m.group.position.z;
            const L2 = ddx * ddx + ddz * ddz;
            let tt = L2 > 1e-6 ? ((bo.x - m.group.position.x) * ddx + (bo.z - m.group.position.z) * ddz) / L2 : 0;
            tt = Math.max(0, Math.min(1, tt));
            const dd = Math.hypot(bo.x - (m.group.position.x + ddx * tt), bo.z - (m.group.position.z + ddz * tt));
            if (dd > bo.r + 0.35) break;
            p = randPoint(world, m);
          }
        }
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

    // Étape de contournement vers un banc : arrivé devant, on entre droit.
    if (s.seatStage && s.goingSeat && m.state === 'idle') {
      s.seatStage = false;
      m._ignoreBench = s.goingSeat.benchIdx;
      m.walkTo(s.goingSeat.x, s.goingSeat.z);
      return;
    }

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
      // Détection de blocage : déplacement trop faible sur 0,6 s, OU cible
      // jamais rapprochée sur 3 s (un Mii qui rampe ou tourne en rond dans
      // une poche de deux bancs « bouge » assez pour tromper le 1er critère).
      const unstuck = () => {
        if (s.goingSeat) {
          const rdx = s.goingSeat.x - m.group.position.x;
          const rdz = s.goingSeat.z - m.group.position.z;
          if (rdx * rdx + rdz * rdz < 1.44) {
            if (!s.seatStage) {
              // Bloqué près du banc : on contourne par le DEVANT (côté vers
              // lequel le Mii assis regarde) puis on entre droit sur le banc.
              s.seatStage = true;
              m._ignoreBench = s.goingSeat.benchIdx;
              m.walkTo(s.goingSeat.x + Math.sin(s.goingSeat.yaw) * 1.0,
                       s.goingSeat.z + Math.cos(s.goingSeat.yaw) * 1.0);
              s.lx = m.group.position.x; s.lz = m.group.position.z;
              return;
            }
            // Toujours bloqué devant : on s'assoit quand même.
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
          s.goingSeat.occupied = false; s.goingSeat = null; m._ignoreBench = null; s.seatStage = false;
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
      };
      s.mvT = (s.mvT || 0) + dt;
      if (s.lx == null) { s.lx = m.group.position.x; s.lz = m.group.position.z; }
      if (s.mvT >= 0.6) {
        const moved = Math.hypot(m.group.position.x - s.lx, m.group.position.z - s.lz);
        s.mvT = 0; s.lx = m.group.position.x; s.lz = m.group.position.z;
        // Seuil généreux : un Mii qui « rampe » (coincé dans une poche entre
        // deux cercles de banc) avance de ~0,15 u/s — bien plus lent qu'une
        // marche normale (1,15 u/s) — et doit déclencher le reroutage.
        if (moved < 0.16) { unstuck(); return; }
      }
      // Fenêtre 3 s, basée sur le déplacement RÉEL (indépendante des re-ciblages
      // des seekers) : un Mii en marche qui parcourt moins de 1,2 u en 3 s
      // (0,4 u/s) avec une cible lointaine est coincé → reroutage.
      s.prT = (s.prT || 0) + dt;
      if (s.prX == null) { s.prX = m.group.position.x; s.prZ = m.group.position.z; }
      if (s.prT >= 3) {
        const disp = Math.hypot(m.group.position.x - s.prX, m.group.position.z - s.prZ);
        s.prT = 0; s.prX = m.group.position.x; s.prZ = m.group.position.z;
        const far = Math.hypot(m.target.x - m.group.position.x, m.target.y - m.group.position.z);
        if (disp < 1.2 && far > 1.0) { unstuck(); return; }
      }
      return;
    }

    // idle → nouvelle intention (dictée par les besoins).
    s.wander -= dt;
    if (s.wander > 0) return;
    s.wander = WANDER_MIN + Math.random() * (WANDER_MAX - WANDER_MIN);
    const n = s.needs;

    // Plan à moyen terme arrivé à échéance ? (mini-IA — on l'abandonne.)
    if (s.plan && t > s.plan.until) {
      log.push({ t: +t.toFixed(2), type: 'plan', name: m.name, what: s.plan.kind,
                 target: s.plan.target.name, action: 'expire' });
      s.plan = null;
    }

    // Intentions motivées par les besoins, choisies par urgence (pondéré) :
    // fatigue → banc ; compagnie → meilleur ami ; ennui → contemplation.
    // Plus varié qu'une priorité stricte (les Mii font moins la queue au banc).
    const opts = [];
    if (n.energy < ENERGY_SIT && s.cooldown <= 0) {
      // La nuit, les bancs attirent un peu plus (rythme du jour).
      const night = dayPhase() === 'night' ? 0.15 : 0;
      opts.push({ w: (ENERGY_SIT - n.energy) / ENERGY_SIT + 0.1 + night, kind: 'seat' });
    }
    if (n.social < SOCIAL_SEEK && s.cooldown <= 0) {
      opts.push({ w: (SOCIAL_SEEK - n.social) / SOCIAL_SEEK, kind: 'seek' });
    }
    if (n.fun < FUN_POI) {
      opts.push({ w: (FUN_POI - n.fun) / FUN_POI, kind: 'poi' });
    }
    let want = 'stroll';
    if (opts.length) {
      const sum = opts.reduce((a2, o2) => a2 + o2.w, 0);
      let r = Math.random() * sum;
      for (const o2 of opts) { r -= o2.w; if (r <= 0) { want = o2.kind; break; } }
    }

    if (want === 'seat') {
      const seat = freeSeat();
      if (seat) {
        seat.occupied = true;
        s.goingSeat = seat;
        m._ignoreBench = seat.benchIdx; // laisse le Mii approcher de SON banc
        m.walkTo(seat.x, seat.z);
        log.push({ t: +t.toFixed(2), type: 'intent', what: 'seat', name: m.name,
                   energy: +n.energy.toFixed(2) });
        showThought(m, pick(THOUGHTS.seat));
        return;
      }
      want = 'stroll';
    }

    if (want === 'seek') {
      const friend = bestFriend(m);
      if (friend) {
        s.focus = friend;
        s.focusT = 0;
        const mp = meetPoint(m, friend, 1.6);
        if (mp) {
          m.walkTo(mp.x, mp.z);
          log.push({ t: +t.toFixed(2), type: 'intent', what: 'seek', name: m.name,
                     target: friend.name, aff: +getAff(m, friend).toFixed(2) });
          // Pensée d'intention (mini-IA) — colourée par un éventuel plan.
          const pl = s.plan;
          const tt = (pl && pl.kind === 'bond' && pl.target === friend) ? THOUGHTS.seekBond
            : (pl && pl.kind === 'reconcile' && pl.target === friend) ? THOUGHTS.seekRecon
            : THOUGHTS.seek;
          showThought(m, fillLine(pick(tt), m, friend));
          return;
        }
      }
      want = 'stroll';
    }

    if (want === 'poi') {
      const poi = poiSpotFor(m);
      if (poi) {
        s.poi = poi;
        m.walkTo(poi.x, poi.z);
        log.push({ t: +t.toFixed(2), type: 'intent', what: 'poi', name: m.name, poi: poi.type });
        showThought(m, pick(THOUGHTS.poi));
        return;
      }
    }

    // Sinon : flânerie (souvent vers un point d'intérêt, parfois un point
    // libre) — jamais à moins de 1,5 u (sinon arrivée instantanée → Mii
    // « planté » qui enchaîne des micro-flâneries).
    const px0 = m.group.position.x, pz0 = m.group.position.z;
    let tp = Math.random() < 0.55 ? poiSpotFor(m) : null;
    for (let k = 0; k < 3 && tp && Math.hypot(tp.x - px0, tp.z - pz0) < 1.5; k++) tp = poiSpotFor(m);
    if (!tp || Math.hypot(tp.x - px0, tp.z - pz0) < 1.5) {
      tp = randPoint(world, m);
      for (let k = 0; k < 3 && Math.hypot(tp.x - px0, tp.z - pz0) < 1.5; k++) tp = randPoint(world, m);
    }
    // Pensée de flânerie (mini-IA) : moment de la journée, ou souvenir joyeux.
    const ph = dayPhase();
    let tpl = THOUGHTS.strollAfternoon;
    if (ph === 'morning') tpl = THOUGHTS.strollMorning;
    else if (ph === 'evening') tpl = THOUGHTS.strollEvening;
    else if (ph === 'night') tpl = THOUGHTS.strollNight;
    const good = s.memory.filter((e) => e.with && (e.kind === 'dance' || e.kind === 'laugh'));
    if (good.length && Math.random() < 0.4) {
      tpl = pick(good).kind === 'dance' ? THOUGHTS.memDance : THOUGHTS.memLaugh;
    }
    showThought(m, pick(tpl));
    m.walkTo(tp.x, tp.z);
  }

  /* ── Boucle principale ── */

  function update(dt) {
    t += dt;
    runPending(dt);
    relations.update(dt);   // horloge de jeu + dérive ambiante (formule ROM)

    // Facteur de lisibilité des bulles selon la distance caméra (le zoom de
    // la place va de ~28 u à ~37 u) : grossit un peu en vue éloignée,
    // rétrécit un peu en vue rapprochée — borné, jamais énorme.
    let readK = 1;
    if (world.camera) {
      const ctl = world.controls;
      const tx = ctl && ctl.target ? ctl.target.x : 0;
      const ty = ctl && ctl.target ? ctl.target.y : 0;
      const tz = ctl && ctl.target ? ctl.target.z : 0;
      const cd = Math.hypot(world.camera.position.x - tx,
                            world.camera.position.y - ty,
                            world.camera.position.z - tz);
      readK = Math.max(0.85, Math.min(1.3, cd / 28));
    }

    // Rythme du jour (mini-IA) : la nuit on se fatigue plus vite et on a
    // moins envie de socialiser ; le matin, la vie sociale reprend.
    const ph = dayPhase();
    const energyMul = ph === 'night' ? 1.25 : 1;
    const socialMul = ph === 'night' ? 0.75 : (ph === 'morning' ? 1.15 : 1);

    for (const m of miis) {
      // Bulle ancrée au sommet RÉEL de la tête (le nametag suit déjà la
      // même mesure) : la pointe de la queue touche le haut du crâne.
      const bub = bubbles.get(m);
      const topY = (m.label && m.label.position.y > 0.5)
        ? m.label.position.y - 0.12
        : (m.height || 1.9) + 0.18;
      bub.sprite.position.set(0, topY + 0.02, 0);
      bub.setReadScale(readK);
      bub.update(dt);
      if (m._soc.cooldown > 0) m._soc.cooldown -= dt;
      if (m._soc.thoughtLeft > 0) m._soc.thoughtLeft -= dt;
      if (m._soc.thoughtCd > 0) m._soc.thoughtCd -= dt;
      // Besoins : l'énergie baisse en marchant et remonte assis ; le social
      // baisse avec le temps (restauré en interaction) ; l'amusement baisse.
      const s = m._soc, n = s.needs;
      if (m.state === 'sit') {
        n.energy = Math.min(1, n.energy + dt * 0.022);
      } else if (!m.busy && !m.scripted) {
        const walkMul = m.state === 'walk' ? 1.6 : 0.7;
        n.energy = Math.max(0, n.energy - dt * (0.0016 + 0.0011 * s.pers.energy) * walkMul * energyMul);
        n.social = Math.max(0, n.social - dt * (0.0035 + 0.002 * s.pers.speech) * socialMul);
        n.fun = Math.max(0, n.fun - dt * 0.0055);
      } else {
        n.energy = Math.max(0, n.energy - dt * 0.001);
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
          // Séparation progressive (jamais de téléport d'un seul frame) : un
          // promeneur qui frôle un Mii assis glisse doucement à l'écart.
          const push = Math.min(MIN_SEP - d, 2.6 * dt);
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
        if (!clearPath(a, b)) continue;   // pas de discussion à travers la fontaine
        if (Math.random() < dt * (0.35 + 1.5 * getAff(a, b))) {
          startPair(a, b);
          // `a` est désormais engagé : inutile de tester d'autres partenaires
          // cette frame (et interdiction d'entrer dans deux paires à la fois).
          if (a.busy) break;
        }
      }
    }
  }

  return {
    update,
    log,
    pairs,
    /** Moteur de relations ROM (niveaux, types, banques, dérive). */
    relations,
    /** Relation complète entre deux Mii (index) — lecture seule pour les tests. */
    relation(i, j) {
      const a = miis[i], b = miis[j];
      return a && b ? relations.relation(i, j) : null;
    },
    /** Banque de dialogue qui serait tirée (index) — lecture seule. */
    bankFor(i, j) {
      const a = miis[i], b = miis[j];
      return a && b ? relations.bankFor(i, j) : null;
    },
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
      return startPair(a, b, kind);
    },
    /** État des interactions en cours — lecture seule pour les tests. */
    pairInfo() {
      return pairs.map((p) => {
        const ba = bubbles.get(p.a), bb = bubbles.get(p.b);
        return {
          ia: p.ia, ib: p.ib, phase: p.phase, t: +p.t.toFixed(2),
          kind: p.kind, bank: p.bank,
          aText: ba && ba.sprite.visible ? ba.text : '',
          bText: bb && bb.sprite.visible ? bb.text : '',
          aMode: ba ? ba.mode : '', bMode: bb ? bb.mode : '',
        };
      });
    },
    /** État de la bulle d'un Mii (index) — lecture seule pour les tests. */
    bubbleState(i) {
      const m = miis[i];
      if (!m) return null;
      const b = bubbles.get(m);
      if (!b) return null;
      return {
        visible: b.sprite.visible,
        // Vrai si la bulle visible est une PENSÉE (mini-IA) et non un dialogue.
        thought: !!(m._soc && m._soc.thoughtLeft > 0 && b.sprite.visible && b.mode === 'text'),
        mode: b.mode,
        text: b.text,
        w: +b.sprite.scale.x.toFixed(3),
        y: +b.sprite.position.y.toFixed(2),
        anchorOk: b.sprite.parent === m.group,
      };
    },
    /** État de l'étiquette (nom) d'un Mii (index) — lecture seule tests. */
    tagState(i) {
      const m = miis[i];
      if (!m) return null;
      return {
        y: +(m.group.position.y + m.label.position.y).toFixed(2),
        height: +(m.height || 0).toFixed(2),
        parentOk: m.label.parent === m.group,
      };
    },
    /** Rythme du jour déduit de l'heure locale (matin/après-midi/soir/nuit). */
    phase: dayPhase,
    /** Mini-IA d'un Mii (index) — lecture seule pour les tests. */
    brain(i) {
      const m = miis[i];
      if (!m) return null;
      const s = m._soc;
      const b = bubbles.get(m);
      return {
        phase: dayPhase(),
        thought: (s.thoughtLeft > 0 && b && b.mode === 'text') ? (b.text || '') : '',
        memory: s.memory.map((e) => ({ ...e })),
        plan: s.plan ? { kind: s.plan.kind, target: s.plan.target.name,
                         left: +(s.plan.until - t).toFixed(1), prog: s.plan.prog } : null,
      };
    },
    /** Hooks de test (horloge du jour, plans, scènes forcées). */
    _test: {
      setNow(fn) { nowFn = fn || (() => new Date()); },
      setPlan(i, kind, j, dur = 300) {
        const m = miis[i], o = miis[j];
        if (!m || !o) return false;
        m._soc.plan = { kind, target: o, until: t + dur, prog: 0 };
        return true;
      },
      clearPlan(i) { const m = miis[i]; if (m) m._soc.plan = null; },
      readyThought(i) {
        const m = miis[i];
        if (m) { m._soc.thoughtCd = 0; m._soc.thoughtLeft = 0; }
      },
      /** Force la prochaine scène contextuelle : 'plan' | 'mem' | 'phase'. */
      forceContext(kind) { forcedCtx = kind; },
      /** Pools bruts (test des répliques contextuelles). */
      pools: { thoughts: THOUGHTS, scenes: CTX_SCENES, greets: GREET_CTX },
    },
  };
}
