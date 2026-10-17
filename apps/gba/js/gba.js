/**
 * gba.js — apps/gba/js/gba.js
 *
 * Écran de sélection GBA — inspiré de la XMB (PSP) et des interfaces
 * modernes façon PS5 / Steam Big Picture (structure IISU), mais avec
 * une identité graphique propre :
 *   - colonne verticale de jaquettes empilées, une seule mise en avant
 *   - fond transparent : le fond d'écran de l'accueil (bg-video) reste
 *     visible derrière l'interface, pas de panneaux blancs/opaques
 *   - panneau d'info à droite : titre, description, temps de jeu,
 *     bouton Jouer, aperçu du jeu
 *
 * NOTE: cette interface est volontairement neuve — elle ne réutilise
 * pas les classes/styles de l'ancienne version "Frutiger Aero".
 */

const GBA_GAMES = [
  {
    name: 'Kirby & the Amazing Mirror',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Kirby%20%26%20the%20Amazing%20Mirror%20(Europe)%20(En%2CFr%2CDe%2CEs%2CIt).zip',
    cover: 'public/assets/gba/covers/Kirby-The-Amazing-Mirror.jpg',
    description: "Kirby explore le Miroir Fractal, divisé en quatre parties par le maléfique Miroir Sombre. Aidé par ses trois clones, il parcourt un vaste monde ouvert non linéaire pour retrouver les morceaux du miroir et affronter Meta Knight.",
    screenshots: [
      'public/assets/gba/screenshots/Kirby-A/images 3.jpg',
      'public/assets/gba/screenshots/Kirby-A/images 1.jpg',
      'public/assets/gba/screenshots/Kirby-A/image 2.jpg',
    ],  
  },
  {
    name: 'Zelda - The Minish Cap',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Legend%20of%20Zelda%2C%20The%20-%20The%20Minish%20Cap%20(Europe)%20(En%2CFr%2CDe%2CEs%2CIt).zip',
    cover: 'public/assets/gba/covers/zelda-minish.webp',
    description: "Grâce au chapeau vivant Ezlo, Link peut rétrécir jusqu'à la taille d'un Minish. Il forge la Lame Quatre pour se dédoubler en quatre héros et sauver la princesse Zelda, changée en pierre par le sorcier Vaati.",
    screenshots: [
      'public/assets/gba/screenshots/Zelda-Minish-Cap/image 3.webp',
      'public/assets/gba/screenshots/Zelda-Minish-Cap/image 1.jpg',
      'public/assets/gba/screenshots/Zelda-Minish-Cap/image 2.jpg',
    ],
  },
  {
    name: 'Pokémon Version Émeraude',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Pokemon%20-%20Version%20Emeraude%20(France).gba',
    cover: 'public/assets/gba/covers/pokemon-emeraude.webp',
    description: "Dans la région de Hoenn, devenez Champion de la Ligue Pokémon tout en déjouant les plans rivaux de la Team Aqua et de la Team Magma, décidées à réveiller les titans légendaires Kyogre et Groudon.",
    screenshots: [
      'public/assets/gba/screenshots/pokemon-emeraude/1.png',
      'public/assets/gba/screenshots/pokemon-emeraude/2.png',
      'public/assets/gba/screenshots/pokemon-emeraude/3.png',
    ],
  },
  {
    name: 'Castlevania - Aria of Sorrow',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Castlevania%20-%20Aria%20of%20Sorrow.zip',
    cover: 'public/assets/gba/covers/castlevania-aria-of-sorrow.jpg',
    description: "En l'an 2035, Soma Cruz se retrouve piégé dans un château hanté apparu lors d'une éclipse solaire. Doté du pouvoir d'absorber les âmes des monstres qu'il vainc, il explore un vaste labyrinthe gothique pour percer le mystère de son propre destin.",
    screenshots: [
      'public/assets/gba/screenshots/castlevania-aria-of-sorrow/1.jpg',
      'public/assets/gba/screenshots/castlevania-aria-of-sorrow/2.jpg',
      'public/assets/gba/screenshots/castlevania-aria-of-sorrow/3.jpg',
    ],
  },
  {
    name: 'Final Fantasy VI Advance',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Final%20Fantasy%20VI%20Advance.zip',
    cover: 'public/assets/gba/covers/final-fantasy-vi-advance.jpg',
    description: "Dans un monde ravagé par la magie et la machine, un groupe de rebelles s'oppose à l'Empire Gestahlien et au bouffon démoniaque Kefka. Cette version Advance ajoute de nouveaux donjons, objets et l'Arène des Dragons.",
    screenshots: [
      'public/assets/gba/screenshots/final-fantasy-vi-advance/1.jpg',
      'public/assets/gba/screenshots/final-fantasy-vi-advance/2.jpg',
      'public/assets/gba/screenshots/final-fantasy-vi-advance/3.jpg',
    ],
  },
  {
    name: 'Fire Emblem',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Fire%20Emblem.zip',
    cover: 'public/assets/gba/covers/fire-emblem.jpg',
    description: "Premier épisode occidental de la saga, ce tactical-RPG suit le prince Eliwood dans une guerre tragique à travers le continent d'Elibe. Chaque unité perdue au combat disparaît définitivement, imposant prudence et stratégie.",
    screenshots: [
      'public/assets/gba/screenshots/fire-emblem/1.jpg',
      'public/assets/gba/screenshots/fire-emblem/2.jpg',
      'public/assets/gba/screenshots/fire-emblem/3.jpg',
    ],
  },
  {
    name: "Golden Sun - L'Âge Perdu",
    file: "https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Golden%20Sun%20-%20L'Age%20Perdu.zip",
    cover: 'public/assets/gba/covers/golden-sun-lage-perdu.jpg',
    description: "Suite directe de Golden Sun, Félix et ses compagnons poursuivent leur quête pour allumer les Phares Elémentaires, tandis qu'Isaac et son groupe tentent de les en empêcher pour sauver le monde de Weyard.",
    screenshots: [
      'public/assets/gba/screenshots/golden-sun-lage-perdu/1.jpg',
      'public/assets/gba/screenshots/golden-sun-lage-perdu/2.jpg',
      'public/assets/gba/screenshots/golden-sun-lage-perdu/3.jpg',
    ],
  },
  {
    name: 'Metroid Fusion',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Metroid%20Fusion.zip',
    cover: 'public/assets/gba/covers/metroid-fusion.jpg',
    description: "Infectée par le parasite X, Samus Aran doit composer avec une IA de bord autoritaire et un doppelgänger appelé SA-X, aussi puissant qu'elle, qui rôde dans les couloirs de la station BSL.",
    screenshots: [
      'public/assets/gba/screenshots/metroid-fusion/1.jpg',
      'public/assets/gba/screenshots/metroid-fusion/2.jpg',
      'public/assets/gba/screenshots/metroid-fusion/3.jpg',
    ],
  },
  {
    name: 'Pokémon Version Rouge Feu',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Pokemon%20-%20Version%20Rouge%20Feu%20(France).gba',
    cover: 'public/assets/gba/covers/pokemon-rouge-feu.jpg',
    description: "Remake du tout premier jeu Pokémon, votre aventure débute à Bourg Palette. Explorez la région de Kanto, affrontez les huit Champions d'Arène et la Ligue Pokémon, tout en déjouant les plans de la Team Rocket.",
    screenshots: [
      'public/assets/gba/screenshots/pokemon-rouge-feu/1.jpg',
      'public/assets/gba/screenshots/pokemon-rouge-feu/2.jpg',
      'public/assets/gba/screenshots/pokemon-rouge-feu/3.jpg',
    ],
  },
  {
    name: 'Pokémon Donjon Mystère - Équipe de Secours Rouge',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Pokemon%20Donjon%20Mystre%20%20Equipe%20de%20Secours%20Rouge.zip',
    cover: 'public/assets/gba/covers/pokemon-donjon-mystere.jpg',
    description: "Transformé en Pokémon suite à un mystérieux évènement, vous fondez avec un compagnon une équipe de secours chargée d'explorer des donjons générés aléatoirement pour venir en aide aux Pokémon en détresse.",
    screenshots: [
      'public/assets/gba/screenshots/pokemon-donjon-mystere/1.jpg',
      'public/assets/gba/screenshots/pokemon-donjon-mystere/2.jpg',
      'public/assets/gba/screenshots/pokemon-donjon-mystere/3.jpg',
    ],
  },
];

// Exposé globalement — utilisé par gbaTurbo.js, ne pas renommer.
window.GBA_GAMES = GBA_GAMES;

/* ── État du module ───────────────────────────────────────────────── */
let gbaPlaytimes         = {};
let currentGbaEmuStartTime = 0;
let currentGbaGameName     = null;
let gxmbIndex               = 0;
let gxmbSlideIndex          = 0;
let gxmbSlideTimer          = null;
let gxmbGames               = GBA_GAMES; // liste affichée (filtrée par la recherche ou non)
let gxmbSearchQuery         = '';
let gxmbClockTimer          = null;

/* Normalise une chaîne pour une recherche insensible à la casse et aux accents */
function gxmbNormalize(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();
}

/* Géométrie de la pile de jaquettes (colonne gauche) */
const GXMB_GAP        = 268;  // écart vertical entre le centre de deux jaquettes
const GXMB_MAX_DIST   = 2;    // au-delà, la jaquette est masquée (peu d'éléments visibles)
const GXMB_CURVE      = 18;   // intensité de la courbe (arc) — px de décalage horizontal par cran

export default async function renderGba(container) {
  if (window.SaveManager) {
    gbaPlaytimes = await window.SaveManager.loadPlaytimes('gba');
  } else if (window.Auth?.currentUser && window.Firestore) {
    try {
      const uid    = window.Auth.currentUser.uid;
      const docRef = window.Firestore.doc(window.FirebaseDB, 'users', uid);
      const docSnap = await window.Firestore.getDoc(docRef);
      if (docSnap.exists() && docSnap.data().gba_playtimes) {
        gbaPlaytimes = docSnap.data().gba_playtimes;
      }
    } catch (e) {
      console.error('Error loading GBA playtimes:', e);
    }
  }
  gxmbIndex = 0;
  renderGbaMenu(container);
}

/* ════════════════════════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════════════════════════ */
function injectGxmbStyles() {
  if (document.getElementById('gxmb-styles')) return;
  const style = document.createElement('style');
  style.id = 'gxmb-styles';
  style.textContent = `
    /* ── Racine : fond TRANSPARENT, le bg-video de l'accueil reste visible ── */
    .gxmb-root {
      position: relative; width: 100%; height: 100%; overflow: hidden;
      display: flex; flex-direction: row; align-items: stretch;
      background: transparent;
      font-family: var(--font-main, 'Nunito', 'Inter', sans-serif);
      color: #fff;
      animation: gxmbIn .45s cubic-bezier(.22,1,.36,1);
    }
    @keyframes gxmbIn { from { opacity: 0; } to { opacity: 1; } }

    /* Voile discret pour la lisibilité du texte, dégradé vers la gauche
       uniquement — le reste du fond d'écran reste visible tel quel. */
    .gxmb-scrim {
      position: absolute; inset: 0; pointer-events: none; z-index: 0;
      background:
        radial-gradient(1100px 700px at 0% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.28) 40%, rgba(0,0,0,0) 72%),
        linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 82%, rgba(0,0,0,0.30) 100%);
    }

    /* ── Bandeau supérieur : trois zones (recherche | bannière | horloge+retour) ── */
    .gxmb-topbar {
      position: absolute; top: 0; left: 0; right: 0; z-index: 6;
      display: flex; align-items: center; gap: 18px;
      padding: 28px 40px 0 44px; pointer-events: none;
    }
    .gxmb-search-zone {
      pointer-events: auto; flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px;
    }
    .gxmb-exit {
      pointer-events: auto; display: flex; align-items: center; gap: 8px; cursor: pointer;
      user-select: none; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      border-radius: 40px; padding: 7px 16px 7px 8px; font-size: 12px; font-weight: 800;
      letter-spacing: 0.5px; color: rgba(255,255,255,0.85); transition: all .2s ease;
    }
    .gxmb-exit:hover { background: rgba(255,255,255,0.16); }
    .gxmb-exit b {
      width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.9); color: #111;
      display: flex; align-items: center; justify-content: center; font-size: 10px;
    }

    /* ── Barre de recherche : ancrée le plus à gauche, un peu plus grande ── */
    .gxmb-search {
      pointer-events: auto; display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.09); border: 1px solid rgba(255,255,255,0.18);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      border-radius: 44px; padding: 11px 20px; width: 280px;
      transition: width .25s ease, background .2s ease, border-color .2s ease;
    }
    .gxmb-search:focus-within {
      width: 360px; background: rgba(255,255,255,0.15);
      border-color: color-mix(in srgb, var(--theme-accent, #fff) 55%, transparent);
    }
    .gxmb-search svg { width: 17px; height: 17px; flex: 0 0 auto; stroke: rgba(255,255,255,0.65); }
    .gxmb-search input {
      flex: 1; min-width: 0; background: transparent; border: none; outline: none;
      color: #fff; font-size: 14.5px; font-weight: 700; font-family: inherit;
    }
    .gxmb-search input::placeholder { color: rgba(255,255,255,0.45); font-weight: 600; }
    .gxmb-search-clear {
      flex: 0 0 auto; display: none; align-items: center; justify-content: center;
      width: 18px; height: 18px; border-radius: 50%; cursor: pointer;
      color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.1);
      font-size: 12px; line-height: 1;
    }
    .gxmb-search-clear:hover { background: rgba(255,255,255,0.2); color: #fff; }
    .gxmb-search.has-query .gxmb-search-clear { display: flex; }
    .gxmb-search-zone .gxmb-count {
      padding-left: 22px; font-size: 11px; font-weight: 800; letter-spacing: 1.2px;
      color: rgba(255,255,255,0.4); text-transform: uppercase;
    }

    /* ── Bannière centrale défilante, façon accueil ── */
    .gxmb-banner-wrap {
      pointer-events: none; flex: 1; min-width: 0; align-self: flex-start;
      display: flex; justify-content: center;
    }
    .gxmb-banner {
      max-width: min(820px, 100%); width: 100%; overflow: hidden;
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      border-radius: 44px; padding: 16px 0;
      -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%);
              mask-image: linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%);
    }
    .gxmb-banner-track {
      display: flex; width: max-content; white-space: nowrap;
      animation: gxmb-marquee 26s linear infinite;
    }
    .gxmb-banner-text {
      font-size: 17px; font-weight: 700; letter-spacing: 0.3px;
      color: rgba(255,255,255,0.85); text-shadow: 0 2px 8px rgba(0,0,0,0.4);
      padding-right: 56px;
    }
    @keyframes gxmb-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

    /* ── Zone droite : horloge + retour ── */
    .gxmb-topright {
      pointer-events: auto; flex: 0 0 auto; display: flex; align-items: center; gap: 16px;
    }
    .gxmb-clock {
      display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1;
    }
    .gxmb-clock-time {
      font-size: 48px; font-weight: 900; color: #fff; text-shadow: 0 2px 14px rgba(0,0,0,0.6);
      letter-spacing: 0.5px;
    }
    .gxmb-clock-time .am-pm { font-size: 16px; font-weight: 800; opacity: 0.7; margin-left: 4px; }
    .gxmb-clock-date {
      font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
      color: rgba(255,255,255,0.55);
    }

    /* ── Colonne gauche : pile verticale de jaquettes ── */
    .gxmb-stage {
      position: relative; z-index: 2; flex: 0 0 470px;
      display: flex; align-items: center; justify-content: center;
      padding-left: 56px;
    }
    .gxmb-track { position: relative; width: 100%; height: 100%; }

    .gxmb-item {
      position: absolute; top: 50%; left: 40px;
      width: 174px; height: 244px;
      transform: translate(0, -50%);
      transition: transform .55s cubic-bezier(.22,1,.36,1),
                  opacity .5s ease, filter .5s ease;
      will-change: transform, opacity;
      cursor: pointer;
    }
    /* Contour dégradé rose→violet animé, derrière chaque jaquette */
    .gxmb-item::before {
      content: '';
      position: absolute; inset: -5px; z-index: -1;
      border-radius: 19px;
      background: linear-gradient(125deg, #ff53d6, #b34bff, #6a5cff, #ff53d6);
      background-size: 300% 300%;
      animation: gxmb-border-flow 6s ease-in-out infinite;
      opacity: 0.85;
      transition: opacity .5s ease;
    }
    .gxmb-item.is-active::before { opacity: 1; }
    @keyframes gxmb-border-flow {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .gxmb-cover {
      width: 100%; height: 100%; border-radius: 14px; overflow: hidden; position: relative;
      box-shadow: 0 18px 40px rgba(0,0,0,0.45);
      transition: box-shadow .5s ease;
    }
    .gxmb-item.is-active .gxmb-cover {
      box-shadow: 0 24px 50px rgba(0,0,0,0.55);
    }
    .gxmb-cover img {
      width: 100%; height: 100%; object-fit: cover; display: block;
    }
    .gxmb-cover .gxmb-fallback {
      width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 8px; text-align: center; padding: 10px;
      background: linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03));
      border: 1px solid rgba(255,255,255,0.12);
    }
    .gxmb-fallback .gxmb-fallback-glyph { font-size: 28px; opacity: 0.8; }
    .gxmb-fallback .gxmb-fallback-name {
      font-size: 12px; font-weight: 800; line-height: 1.3; color: rgba(255,255,255,0.85);
    }

    /* Chevrons discrets, visibles seulement s'il y a plus d'items */
    .gxmb-nav {
      position: absolute; left: 40px; width: 174px; z-index: 3;
      display: flex; align-items: center; justify-content: center; height: 34px;
      color: rgba(255,255,255,0.45); cursor: pointer; opacity: 0; transition: opacity .25s ease, color .2s ease;
      pointer-events: none;
    }
    .gxmb-nav.is-visible { opacity: 1; pointer-events: auto; }
    .gxmb-nav:hover { color: rgba(255,255,255,0.9); }
    .gxmb-nav svg { width: 20px; height: 20px; stroke: currentColor; }
    .gxmb-nav-up   { top: 4%; }
    .gxmb-nav-down { bottom: 4%; }

    /* ── Panneau d'information (droite) ── */
    .gxmb-panel {
      position: relative; z-index: 2; flex: 1; min-width: 0;
      display: flex; flex-direction: row; align-items: center;
      gap: clamp(28px, 5vw, 80px);
      padding: 0 clamp(24px, 5vw, 72px) 0 clamp(24px, 4vw, 56px);
      padding-top: clamp(24px, 5vh, 56px); /* descend légèrement le contenu par rapport au centre pur */
    }
    .gxmb-info-text { flex: 1; min-width: 0; max-width: 480px; display: flex; flex-direction: column; gap: 16px; }

    .gxmb-eyebrow {
      font-size: 12px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase;
      color: rgba(255,255,255,0.55); text-shadow: 0 2px 6px rgba(0,0,0,0.5);
    }
    .gxmb-title {
      margin: 0; font-size: clamp(32px, 3.8vw, 50px); font-weight: 900; line-height: 1.06;
      letter-spacing: -0.01em; color: #fff; text-shadow: 0 4px 22px rgba(0,0,0,0.55);
    }
    .gxmb-desc {
      margin: 0; font-size: clamp(16px, 1.5vw, 19px); line-height: 1.65; font-weight: 600;
      color: rgba(255,255,255,0.82); text-shadow: 0 2px 10px rgba(0,0,0,0.5);
      display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;
    }
    .gxmb-meta {
      display: inline-flex; align-items: center; gap: 7px;
      font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;
      color: rgba(255,255,255,0.6); text-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }
    .gxmb-meta .dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.4); }

    .gxmb-play {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      border: none; cursor: pointer; border-radius: 40px; padding: 16px 32px 16px 24px;
      font-size: 15px; font-weight: 800; letter-spacing: 0.5px;
      background: color-mix(in srgb, var(--theme-accent, #fff) 92%, transparent);
      color: #0a0a0a;
      box-shadow: 0 10px 26px color-mix(in srgb, var(--theme-accent, #fff) 35%, transparent);
      transition: transform .18s cubic-bezier(.25,1.5,.5,1), box-shadow .2s ease;
    }
    .gxmb-play:hover { transform: scale(1.03); }
    .gxmb-play:active { transform: scale(0.98); }
    .gxmb-play svg { width: 16px; height: 16px; fill: currentColor; }

    /* ── Aperçu (droite du panneau, centré verticalement, agrandi) ── */
    .gxmb-preview { flex-shrink: 0; width: min(860px, 56vw); display: flex; flex-direction: column; gap: 18px; }
    .gxmb-preview-frame {
      position: relative; z-index: 0; width: 100%; aspect-ratio: 3 / 2; border-radius: 18px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    }
    /* Même contour dégradé animé que les jaquettes */
    .gxmb-preview-frame::before {
      content: '';
      position: absolute; inset: -5px; z-index: -1;
      border-radius: 23px;
      background: linear-gradient(125deg, #ff53d6, #b34bff, #6a5cff, #ff53d6);
      background-size: 300% 300%;
      animation: gxmb-border-flow 6s ease-in-out infinite;
    }
    .gxmb-preview-inner {
      position: relative; width: 100%; height: 100%; border-radius: 18px; overflow: hidden;
      background: rgba(255,255,255,0.05);
    }
    .gxmb-preview-img {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
      opacity: 0; transition: opacity .7s ease;
    }
    .gxmb-preview-img.is-active { opacity: 1; }
    .gxmb-preview-empty {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;
      color: rgba(255,255,255,0.35);
    }
    .gxmb-preview-dots { display: flex; gap: 6px; justify-content: center; }
    .gxmb-preview-dot {
      width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.28); cursor: pointer;
      transition: all .2s ease;
    }
    .gxmb-preview-dot.is-active {
      background: color-mix(in srgb, var(--theme-accent, #fff) 85%, transparent); transform: scale(1.3);
    }

    /* ── Bouton Jouer + temps de jeu, coin bas-droit de l'écran ── */
    .gxmb-corner {
      position: absolute; z-index: 6;
      right: clamp(24px, 5vw, 72px); bottom: clamp(28px, 6vh, 64px);
      display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
    }

    /* Petit fondu du panneau texte au changement de jeu */
    .gxmb-info-text, .gxmb-preview, .gxmb-corner { transition: opacity .22s ease; }
    .gxmb-info-text.is-swapping, .gxmb-preview.is-swapping, .gxmb-corner.is-swapping { opacity: 0; }

    @media (max-width: 900px) {
      .gxmb-panel { flex-direction: column; align-items: flex-start; justify-content: center; gap: 20px; }
      .gxmb-preview { width: min(460px, 80vw); }
      .gxmb-stage { flex-basis: 280px; padding-left: 30px; }
      .gxmb-item { width: 132px; height: 186px; left: 20px; }
      .gxmb-nav { left: 20px; width: 132px; }
      .gxmb-corner {
        position: static; align-items: flex-start; margin: 12px clamp(24px, 4vw, 56px) 24px;
      }
      .gxmb-topbar { padding: 18px 20px 0 24px; gap: 10px; }
      .gxmb-banner-wrap { display: none; } /* pas assez de place en dessous de 900px */
      .gxmb-search { width: 160px; padding: 8px 14px; }
      .gxmb-search:focus-within { width: 200px; }
      .gxmb-clock-time { font-size: 16px; }
      .gxmb-clock-date { display: none; }
    }

    /* ══════════ iiSU / Wii U — surcouche v2 ══════════ */
    .gxmb-root {
      --gxmb-accent: var(--accent, #4aa3ff);
      --gxmb-accent-glow: var(--accent-glow, rgba(74,163,255,.35));
      --gxmb-glass: var(--panel-bg, rgba(255,255,255,.12));
      --gxmb-glass-border: var(--panel-border, rgba(255,255,255,.20));
      --gxmb-text: var(--panel-text, #ffffff);
      --gxmb-text-muted: var(--panel-text-muted, rgba(255,255,255,.6));
      --gxmb-ease: cubic-bezier(.22,1,.36,1);
    }

    /* Scrim adapté au thème clair / sombre */
    body.theme-white .gxmb-scrim {
      background:
        radial-gradient(1100px 720px at 0% 50%, rgba(255,255,255,.74) 0%, rgba(255,255,255,.44) 42%, rgba(255,255,255,0) 74%),
        linear-gradient(180deg, rgba(255,255,255,.46) 0%, rgba(255,255,255,0) 22%, rgba(255,255,255,0) 78%, rgba(255,255,255,.46) 100%);
    }
    body.theme-white .gxmb-root { color: #12203a; }

    /* Bandeau titre Wii U centré */
    .gxmb-titlebar { flex: 1; min-width: 0; display: flex; justify-content: center; align-items: center; pointer-events: none; }
    .gxmb-titlebar-text {
      font-size: clamp(13px, 1.4vw, 19px); font-weight: 900; letter-spacing: 3px; text-transform: uppercase;
      color: var(--gxmb-text); text-shadow: 0 2px 12px rgba(0,0,0,.45);
      padding: 9px 26px; border-radius: 40px;
      background: var(--gxmb-glass); border: 1px solid var(--gxmb-glass-border);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    }
    body.theme-white .gxmb-titlebar-text { text-shadow: 0 1px 6px rgba(255,255,255,.6); }

    /* Verre : recherche, retour, horloge */
    .gxmb-search, .gxmb-exit { background: var(--gxmb-glass) !important; border-color: var(--gxmb-glass-border) !important; }
    .gxmb-search:focus-within { border-color: var(--gxmb-accent) !important; box-shadow: 0 0 0 3px var(--gxmb-accent-glow); }
    .gxmb-search input { color: var(--gxmb-text) !important; }
    .gxmb-search svg { stroke: var(--gxmb-text-muted) !important; }
    .gxmb-search input::placeholder { color: var(--gxmb-text-muted) !important; }
    .gxmb-exit { color: var(--gxmb-text) !important; }
    .gxmb-count { color: var(--gxmb-text-muted) !important; }
    .gxmb-clock-time { color: var(--gxmb-text) !important; }
    body.theme-white .gxmb-clock-time { text-shadow: 0 2px 10px rgba(255,255,255,.6); }

    /* Jaquettes : contour accent animé (visible seulement quand actif) + reflet */
    .gxmb-item::before {
      background: linear-gradient(125deg, var(--gxmb-accent), color-mix(in srgb, var(--gxmb-accent) 55%, #fff), var(--gxmb-accent)) !important;
      background-size: 300% 300% !important; opacity: 0 !important;
    }
    .gxmb-item.is-active::before { opacity: 1 !important; }
    .gxmb-cover { border-radius: 16px !important; box-shadow: 0 16px 40px rgba(0,0,0,.5) !important; }
    .gxmb-item.is-active .gxmb-cover { box-shadow: 0 24px 60px rgba(0,0,0,.55), 0 0 42px var(--gxmb-accent-glow) !important; }
    .gxmb-cover::after {
      content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: linear-gradient(180deg, rgba(255,255,255,0) 55%, rgba(255,255,255,.12) 100%);
    }

    /* Aperçu : contour accent animé */
    .gxmb-preview-frame::before {
      background: linear-gradient(125deg, var(--gxmb-accent), color-mix(in srgb, var(--gxmb-accent) 55%, #fff), var(--gxmb-accent)) !important;
      background-size: 300% 300% !important;
    }

    /* Accent du thème */
    .gxmb-play { background: var(--gxmb-accent) !important; color: #fff !important; box-shadow: 0 12px 30px var(--gxmb-accent-glow) !important; }
    .gxmb-preview-dot.is-active { background: var(--gxmb-accent) !important; }

    /* Textes adaptés au thème clair */
    body.theme-white .gxmb-title { color: #0e1a30; text-shadow: 0 4px 20px rgba(255,255,255,.5) !important; }
    body.theme-white .gxmb-desc { color: rgba(20,35,60,.82); text-shadow: none !important; }
    body.theme-white .gxmb-eyebrow { color: rgba(20,35,60,.55); text-shadow: none !important; }
    body.theme-white .gxmb-meta { color: rgba(20,35,60,.6); text-shadow: none !important; }
    body.theme-white .gxmb-item-count { color: rgba(20,35,60,.6); }

    /* Parallaxe douce */
    .gxmb-stage, .gxmb-panel { transition: transform .35s var(--gxmb-ease); will-change: transform; }
    .gxmb-root.is-parallax .gxmb-stage { transform: translateY(var(--gxmb-px, 0px)); }
    .gxmb-root.is-parallax .gxmb-panel { transform: translateY(calc(var(--gxmb-px, 0px) * -.35)); }

    @media (prefers-reduced-motion: reduce) {
      .gxmb-item::before, .gxmb-preview-frame::before, .gxmb-banner-track { animation: none !important; }
      .gxmb-root, .gxmb-item, .gxmb-stage, .gxmb-panel { transition: none !important; }
    }

    @media (max-width: 640px) {
      .gxmb-titlebar { display: none; }
      .gxmb-stage { flex-basis: 200px; padding-left: 16px; }
      .gxmb-item { width: 108px; height: 152px; left: 12px; }
      .gxmb-nav { left: 12px; width: 108px; }
      .gxmb-title { font-size: 26px !important; }
      .gxmb-preview { width: min(360px, 78vw) !important; }
    }
  `;
  document.head.appendChild(style);
}

/* ════════════════════════════════════════════════════════════════════
   RENDU
   ════════════════════════════════════════════════════════════════════ */
function buildGxmbItemsHtml(games) {
  let itemsHtml = '';
  games.forEach((game, i) => {
    const inner = game.cover
      ? `<img src="${game.cover}" alt="${game.name}"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
         <div class="gxmb-fallback" style="display:none;">
           <span class="gxmb-fallback-glyph">🎮</span>
           <span class="gxmb-fallback-name">${game.name}</span>
         </div>`
      : `<div class="gxmb-fallback">
           <span class="gxmb-fallback-glyph">🎮</span>
           <span class="gxmb-fallback-name">${game.name}</span>
         </div>`;
    itemsHtml += `
      <div class="gxmb-item" data-index="${i}">
        <div class="gxmb-cover">${inner}</div>
      </div>`;
  });
  return itemsHtml;
}

/* (Ré)attache le clic sur chaque jaquette du track courant */
function bindGxmbItemClicks(container) {
  container.querySelectorAll('.gxmb-item').forEach((item) => {
    item.addEventListener('click', () => {
      const i = parseInt(item.getAttribute('data-index'), 10);
      if (i === gxmbIndex) {
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        launchGbaEmulator(container, gxmbGames[gxmbIndex]);
      } else {
        setGxmbIndex(container, i);
      }
    });
  });
}

function renderGbaMenu(container) {
  injectGxmbStyles();

  // Réinitialise la recherche à chaque (ré)ouverture du menu
  gxmbGames = GBA_GAMES;
  gxmbSearchQuery = '';

  if (gxmbIndex < 0) gxmbIndex = 0;
  if (gxmbIndex >= gxmbGames.length) gxmbIndex = gxmbGames.length - 1;

  const itemsHtml = buildGxmbItemsHtml(gxmbGames);

  container.innerHTML = `
    <div class="gxmb-root" tabindex="-1">
      <div class="gxmb-scrim"></div>

      <div class="gxmb-topbar">
        <div class="gxmb-search-zone">
          <div class="gxmb-search" id="gxmb-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="gxmb-search-input" placeholder="Rechercher un jeu…" autocomplete="off" spellcheck="false" />
            <div class="gxmb-search-clear" id="gxmb-search-clear">✕</div>
          </div>
          <div class="gxmb-count" id="gxmb-count"></div>
        </div>

        <div class="gxmb-titlebar"><span class="gxmb-titlebar-text">Émulateur GBA</span></div>

        <div class="gxmb-topright">
          <div class="gxmb-clock" id="gxmb-clock">
            <div class="gxmb-clock-time" id="gxmb-clock-time">--:--</div>
            <div class="gxmb-clock-date" id="gxmb-clock-date"></div>
          </div>
          <div class="gxmb-exit" id="gxmb-exit"><b>B</b> Retour</div>
        </div>
      </div>

      <div class="gxmb-stage">
        <div class="gxmb-nav gxmb-nav-up" id="gxmb-nav-up">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4"><polyline points="18 15 12 9 6 15"/></svg>
        </div>
        <div class="gxmb-track" id="gxmb-track">${itemsHtml}</div>
        <div class="gxmb-nav gxmb-nav-down" id="gxmb-nav-down">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      <div class="gxmb-panel">
        <div class="gxmb-info-text" id="gxmb-info-text">
          <div class="gxmb-eyebrow" id="gxmb-eyebrow"></div>
          <h1 class="gxmb-title" id="gxmb-title"></h1>
          <p class="gxmb-desc" id="gxmb-desc"></p>
        </div>
        <div class="gxmb-preview" id="gxmb-preview">
          <div class="gxmb-preview-frame" id="gxmb-preview-frame">
            <div class="gxmb-preview-inner" id="gxmb-preview-inner">
              <div class="gxmb-preview-empty" id="gxmb-preview-empty">Aperçu à venir</div>
            </div>
          </div>
          <div class="gxmb-preview-dots" id="gxmb-preview-dots"></div>
        </div>
      </div>

      <div class="gxmb-corner" id="gxmb-corner">
        <button class="gxmb-play" id="gxmb-play">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          Jouer
        </button>
        <div class="gxmb-meta" id="gxmb-meta"></div>
      </div>
    </div>
  `;

  const root = container.querySelector('.gxmb-root');
  root.focus();

  /* Parallaxe douce au survol (désactivée si reduced-motion) */
  if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('is-parallax');
    let gxmbParallaxRaf = null;
    let gxmbParallaxY = 0;
    root.addEventListener('pointermove', (e) => {
      gxmbParallaxY = (e.clientY / window.innerHeight - 0.5) * -16;
      if (gxmbParallaxRaf) return;
      gxmbParallaxRaf = requestAnimationFrame(() => {
        root.style.setProperty('--gxmb-px', gxmbParallaxY.toFixed(2) + 'px');
        gxmbParallaxRaf = null;
      });
    });
  }

  // Le fond reste visible derrière ce menu (transparent) : on s'assure qu'il tourne.
  document.getElementById('bg-video')?.play().catch(() => {});

  if (gxmbGames.length === 0) return;

  /* Molette de la souris = naviguer dans la pile (légèrement plus réactive) */
  let gxmbWheelLock = false;
  root.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (gxmbWheelLock || Math.abs(e.deltaY) < 4) return;
    if (e.deltaY > 0 && gxmbIndex < gxmbGames.length - 1) {
      gxmbWheelLock = true;
      setGxmbIndex(container, gxmbIndex + 1);
      setTimeout(() => { gxmbWheelLock = false; }, 260);
    } else if (e.deltaY < 0 && gxmbIndex > 0) {
      gxmbWheelLock = true;
      setGxmbIndex(container, gxmbIndex - 1);
      setTimeout(() => { gxmbWheelLock = false; }, 260);
    }
  }, { passive: false });

  /* Sélection au clic sur une jaquette */
  bindGxmbItemClicks(container);

  /* Recherche : filtre la liste par nom (insensible casse/accents) */
  const searchWrap  = container.querySelector('#gxmb-search');
  const searchInput = container.querySelector('#gxmb-search-input');
  const searchClear = container.querySelector('#gxmb-search-clear');
  searchInput.addEventListener('input', () => applyGxmbSearch(container, searchInput.value));
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    applyGxmbSearch(container, '');
    searchInput.focus();
  });
  // Ne pas laisser les flèches/Entrée taper dans le champ déclencher la navigation clavier globale
  searchInput.addEventListener('keydown', (e) => e.stopPropagation());

  container.querySelector('#gxmb-play').addEventListener('click', () => {
    if (!gxmbGames.length) return;
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    launchGbaEmulator(container, gxmbGames[gxmbIndex]);
  });

  container.querySelector('#gxmb-nav-up').addEventListener('click', (e) => {
    e.stopPropagation();
    if (gxmbIndex > 0) setGxmbIndex(container, gxmbIndex - 1);
  });
  container.querySelector('#gxmb-nav-down').addEventListener('click', (e) => {
    e.stopPropagation();
    if (gxmbIndex < gxmbGames.length - 1) setGxmbIndex(container, gxmbIndex + 1);
  });

  container.querySelector('#gxmb-exit').addEventListener('click', () => {
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    teardownGxmbKeys();
    if (gxmbSlideTimer) { clearInterval(gxmbSlideTimer); gxmbSlideTimer = null; }
    if (gxmbClockTimer) { clearInterval(gxmbClockTimer); gxmbClockTimer = null; }
    if (window.AppRegistry?.['gba']?.close) window.AppRegistry['gba'].close();
  });

  /* Clavier : flèches, Entrée, B / Échap */
  const keyHandler = (e) => {
    const rootEl = document.querySelector('.gxmb-root');
    if (!rootEl) { window.removeEventListener('keydown', keyHandler, true); return; }
    if (document.querySelector('iframe[src*="gba_player.html"]')) return;

    // Le champ de recherche gère lui-même son clavier (frappe, Entrée...)
    if (e.target && e.target.id === 'gxmb-search-input') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }

    if (!['ArrowUp', 'ArrowDown', 'Enter', 'b', 'Escape'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();

    if (e.key === 'ArrowDown' && gxmbIndex < gxmbGames.length - 1) {
      setGxmbIndex(container, gxmbIndex + 1);
    } else if (e.key === 'ArrowUp' && gxmbIndex > 0) {
      setGxmbIndex(container, gxmbIndex - 1);
    } else if (e.key === 'Enter') {
      if (!gxmbGames.length) return;
      if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      launchGbaEmulator(container, gxmbGames[gxmbIndex]);
    } else if (e.key === 'b' || e.key === 'Escape') {
      container.querySelector('#gxmb-exit')?.click();
    }
  };
  teardownGxmbKeys();
  window._gxmbKeyHandler = keyHandler;
  window.addEventListener('keydown', keyHandler, true);

  layoutGxmbStack(container, false);
  updateGxmbInfo(container);
  initGxmbClock(container);
}

function teardownGxmbKeys() {
  if (window._gxmbKeyHandler) {
    window.removeEventListener('keydown', window._gxmbKeyHandler, true);
    window._gxmbKeyHandler = null;
  }
}

/* Horloge du topbar — autonome, ne dépend pas du widget de l'accueil */
function initGxmbClock(container) {
  if (gxmbClockTimer) { clearInterval(gxmbClockTimer); gxmbClockTimer = null; }

  const timeEl = container.querySelector('#gxmb-clock-time');
  const dateEl = container.querySelector('#gxmb-clock-date');
  if (!timeEl || !dateEl) return;

  const days   = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  const tick = () => {
    if (!document.body.contains(timeEl)) { clearInterval(gxmbClockTimer); gxmbClockTimer = null; return; }
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    timeEl.textContent = `${h}:${m}`;
    dateEl.textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
  };

  tick();
  gxmbClockTimer = setInterval(tick, 1000);
}

function setGxmbIndex(container, i) {
  if (i === gxmbIndex) return;
  gxmbIndex = i;
  if (typeof AudioManager !== 'undefined') AudioManager.playClick();
  layoutGxmbStack(container, true);
  updateGxmbInfo(container);
}

/* Positionne chaque jaquette selon sa distance à l'élément sélectionné */
function layoutGxmbStack(container) {
  const items = container.querySelectorAll('.gxmb-item');
  items.forEach((item) => {
    const i = parseInt(item.getAttribute('data-index'), 10);
    const dist = i - gxmbIndex;
    const adist = Math.abs(dist);
    const isActive = dist === 0;

    item.classList.toggle('is-active', isActive);

    let scale, opacity, brightness;
    if (isActive)       { scale = 1.3;  opacity = 1;    brightness = 1;    }
    else if (adist === 1) { scale = 0.82; opacity = 0.55; brightness = 0.48; }
    else if (adist === 2) { scale = 0.68; opacity = 0.24; brightness = 0.4;  }
    else                 { scale = 0.6;  opacity = 0;    brightness = 0.4;  }

    const y = dist * GXMB_GAP;
    const x = -GXMB_CURVE * (adist * adist); // courbe quadratique : l'arc se creuse en s'éloignant du centre
    item.style.transform = `translate(${x}px, calc(-50% + ${y}px)) scale(${scale})`;
    item.style.opacity = opacity;
    item.style.filter = `brightness(${brightness})`;
    item.style.pointerEvents = adist > GXMB_MAX_DIST ? 'none' : 'auto';
    item.style.zIndex = String(100 - adist);
  });

  const upBtn = container.querySelector('#gxmb-nav-up');
  const downBtn = container.querySelector('#gxmb-nav-down');
  if (upBtn) upBtn.classList.toggle('is-visible', gxmbIndex > 0);
  if (downBtn) downBtn.classList.toggle('is-visible', gxmbIndex < gxmbGames.length - 1);

  const countEl = container.querySelector('#gxmb-count');
  if (countEl) countEl.textContent = gxmbGames.length
    ? `— ${String(gxmbIndex + 1).padStart(2, '0')} / ${String(gxmbGames.length).padStart(2, '0')}`
    : '';
}

/* Filtre la liste de jeux affichée selon le texte tapé dans la recherche */
function applyGxmbSearch(container, rawQuery) {
  gxmbSearchQuery = rawQuery;
  const searchWrap = container.querySelector('#gxmb-search');
  const q = gxmbNormalize(rawQuery);
  searchWrap?.classList.toggle('has-query', q.length > 0);

  gxmbGames = q
    ? GBA_GAMES.filter((g) => gxmbNormalize(g.name).includes(q))
    : GBA_GAMES;
  gxmbIndex = 0;

  const track = container.querySelector('#gxmb-track');
  const playBtn = container.querySelector('#gxmb-play');

  if (gxmbGames.length === 0) {
    track.innerHTML = '';
    if (playBtn) playBtn.disabled = true;
    container.querySelector('#gxmb-eyebrow').textContent = 'Sélection';
    container.querySelector('#gxmb-title').textContent = 'Aucun résultat';
    container.querySelector('#gxmb-desc').textContent = `Aucun jeu ne correspond à « ${rawQuery} ». Essaie un autre nom.`;
    container.querySelector('#gxmb-meta').innerHTML = '';
    const frame = container.querySelector('#gxmb-preview-inner');
    const dots = container.querySelector('#gxmb-preview-dots');
    if (frame) frame.innerHTML = '<div class="gxmb-preview-empty">Aperçu à venir</div>';
    if (dots) dots.innerHTML = '';
    layoutGxmbStack(container);
    return;
  }

  if (playBtn) playBtn.disabled = false;
  track.innerHTML = buildGxmbItemsHtml(gxmbGames);
  bindGxmbItemClicks(container);
  layoutGxmbStack(container);
  updateGxmbInfo(container);
}

/* Met à jour titre / description / temps de jeu / aperçu */
function updateGxmbInfo(container) {
  if (!gxmbGames.length) return;
  const game = gxmbGames[gxmbIndex];
  const textCol = container.querySelector('#gxmb-info-text');
  const previewCol = container.querySelector('#gxmb-preview');
  const cornerCol = container.querySelector('#gxmb-corner');

  const apply = () => {
    container.querySelector('#gxmb-eyebrow').textContent = 'Sélection';
    container.querySelector('#gxmb-title').textContent = game.name;
    container.querySelector('#gxmb-desc').textContent = game.description || 'Aucune description disponible.';

    const mins = gbaPlaytimes[game.name] || 0;
    const metaEl = container.querySelector('#gxmb-meta');
    if (mins === 0) {
      metaEl.innerHTML = `Temps de jeu <span class="dot"></span> Vierge`;
    } else {
      const h = Math.floor(mins / 60), m = Math.floor(mins % 60);
      metaEl.innerHTML = `Temps de jeu <span class="dot"></span> ${h > 0 ? h + 'h ' : ''}${m}m`;
    }

    renderGxmbPreview(container, game);

    textCol.classList.remove('is-swapping');
    previewCol.classList.remove('is-swapping');
    cornerCol.classList.remove('is-swapping');
  };

  textCol.classList.add('is-swapping');
  previewCol.classList.add('is-swapping');
  cornerCol.classList.add('is-swapping');
  setTimeout(apply, 120);
}

/* Aperçu : diaporama léger des screenshots (ou vide si aucun) */
function renderGxmbPreview(container, game) {
  if (gxmbSlideTimer) { clearInterval(gxmbSlideTimer); gxmbSlideTimer = null; }
  gxmbSlideIndex = 0;

  const frame = container.querySelector('#gxmb-preview-inner');
  const dotsWrap = container.querySelector('#gxmb-preview-dots');
  frame.innerHTML = '';
  dotsWrap.innerHTML = '';

  const shots = Array.isArray(game.screenshots) ? game.screenshots.filter(Boolean) : [];

  if (shots.length === 0) {
    if (game.cover) {
      const img = document.createElement('img');
      img.src = game.cover;
      img.className = 'gxmb-preview-img is-active';
      img.style.objectPosition = 'center 15%';
      img.onerror = () => {
        img.remove();
        const empty = document.createElement('div');
        empty.className = 'gxmb-preview-empty';
        empty.textContent = 'Aperçu à venir';
        frame.appendChild(empty);
      };
      frame.appendChild(img);
    } else {
      const empty = document.createElement('div');
      empty.className = 'gxmb-preview-empty';
      empty.textContent = 'Aperçu à venir';
      frame.appendChild(empty);
    }
    return;
  }

  shots.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'gxmb-preview-img' + (i === 0 ? ' is-active' : '');
    img.alt = `${game.name} — capture ${i + 1}`;
    img.onerror = () => { img.style.display = 'none'; };
    frame.appendChild(img);

    if (shots.length > 1) {
      const dot = document.createElement('div');
      dot.className = 'gxmb-preview-dot' + (i === 0 ? ' is-active' : '');
      dot.addEventListener('click', (e) => { e.stopPropagation(); goToGxmbSlide(container, i); });
      dotsWrap.appendChild(dot);
    }
  });

  if (shots.length > 1) {
    gxmbSlideTimer = setInterval(() => {
      goToGxmbSlide(container, gxmbSlideIndex + 1);
    }, 4200);
  }
}

function goToGxmbSlide(container, index) {
  const frame = container.querySelector('#gxmb-preview-inner');
  if (!frame) return;
  const imgs = frame.querySelectorAll('.gxmb-preview-img');
  const dots = container.querySelectorAll('.gxmb-preview-dot');
  if (!imgs.length) return;

  gxmbSlideIndex = ((index % imgs.length) + imgs.length) % imgs.length;
  imgs.forEach((img, i) => img.classList.toggle('is-active', i === gxmbSlideIndex));
  dots.forEach((d, i) => d.classList.toggle('is-active', i === gxmbSlideIndex));
}

/* ════════════════════════════════════════════════════════════════════
   COQUE CONSOLE GBA (habillage du lecteur)
   ════════════════════════════════════════════════════════════════════ */
function injectGbaConsoleStyles() {
  if (document.getElementById('gba-console-styles')) return;
  const style = document.createElement('style');
  style.id = 'gba-console-styles';
  style.textContent = `
    .gba-play-root {
      position: absolute; inset: 0; width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: radial-gradient(1200px 820px at 50% 38%, #1c1636 0%, #0c0a18 68%, #050410 100%);
      overflow: hidden; font-family: var(--font-main, 'Nunito', 'Inter', system-ui, sans-serif);
      animation: gbaRootIn .45s cubic-bezier(.22,1,.36,1);
    }
    @keyframes gbaRootIn { from { opacity: 0; } to { opacity: 1; } }
    .gba-play-root:fullscreen { background: #050410; }

    .gba-console {
      position: relative; width: min(94vw, 156vh); max-height: 94vh;
      aspect-ratio: 1445 / 820;
      filter: drop-shadow(0 40px 80px rgba(0,0,0,.65));
      animation: gbaRise .5s cubic-bezier(.22,1,.36,1);
    }
    @keyframes gbaRise { from { transform: translateY(26px) scale(.97); opacity: 0; } to { transform: none; opacity: 1; } }

    .gba-shell {
      position: absolute; inset: 0; border-radius: 6.5% / 11%;
      background: linear-gradient(160deg, #9a86e4 0%, #6b56bd 42%, #453485 100%);
      box-shadow: inset 0 3px 0 rgba(255,255,255,.28), inset 0 -10px 18px rgba(0,0,0,.35), 0 24px 60px rgba(0,0,0,.6);
      overflow: hidden;
    }
    .gba-shell::after {
      content: ''; position: absolute; left: 0; right: 0; top: 0; height: 42%;
      background: linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,0));
      pointer-events: none; border-radius: inherit;
    }

    .gba-row {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between;
      padding: 5% 4.5%;
    }
    .gba-side { flex: 0 0 23%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
    .gba-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; }

    /* Écran */
    .gba-screen-frame {
      width: 98%; max-width: 58vh; aspect-ratio: 3 / 2;
      border-radius: 10px; background: #0b0b14; padding: 3.4%;
      box-shadow: inset 0 0 0 2px rgba(0,0,0,.7), inset 0 8px 18px rgba(0,0,0,.6), 0 10px 26px rgba(0,0,0,.45);
      position: relative;
    }
    .gba-screen { width: 100%; height: 100%; border-radius: 5px; overflow: hidden; background: #000; position: relative; }
    .gba-screen iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }

    .gba-brand {
      margin-top: 2.6%; font-size: clamp(8px, 1.05vh, 20px); font-weight: 800; font-style: italic;
      letter-spacing: .26em; color: rgba(255,255,255,.88); text-shadow: 0 1px 2px rgba(0,0,0,.5);
    }
    .gba-startselect { margin-top: 3%; display: flex; gap: 8%; }
    .gba-ss {
      border: none; cursor: pointer; border-radius: 40px; padding: .7vh 2.2vh;
      font-size: clamp(6px, .9vh, 15px); font-weight: 800; letter-spacing: .12em; color: rgba(255,255,255,.85);
      background: linear-gradient(#3a3550, #221f33);
      box-shadow: inset 0 2px 3px rgba(255,255,255,.16), inset 0 -3px 6px rgba(0,0,0,.5), 0 3px 6px rgba(0,0,0,.5);
      transform: rotate(-18deg); transition: transform .08s, box-shadow .08s;
    }
    .gba-ss.is-press { transform: rotate(-18deg) translateY(2px); box-shadow: inset 0 2px 6px rgba(0,0,0,.6); }

    /* Croix directionnelle */
    .gba-dpad { position: relative; width: 62%; max-width: 340px; aspect-ratio: 1; }
    .gba-dpad::before, .gba-dpad::after {
      content: ''; position: absolute; background: linear-gradient(#3a3550, #1f1c30); border-radius: 12%;
      box-shadow: inset 0 2px 3px rgba(255,255,255,.14), 0 4px 8px rgba(0,0,0,.5);
    }
    .gba-dpad::before { left: 33%; top: 0; width: 34%; height: 100%; }
    .gba-dpad::after { top: 33%; left: 0; width: 100%; height: 34%; }
    .gba-dpad-key { position: absolute; width: 33.33%; height: 33.33%; }
    .gba-dpad-key:nth-child(1) { top: 0; left: 33.33%; }
    .gba-dpad-key:nth-child(2) { bottom: 0; left: 33.33%; }
    .gba-dpad-key:nth-child(3) { left: 0; top: 33.33%; }
    .gba-dpad-key:nth-child(4) { right: 0; top: 33.33%; }

    /* Boutons A / B */
    .gba-ab { position: relative; width: 74%; max-width: 400px; aspect-ratio: 1.1; }
    .gba-btn {
      position: absolute; width: 46%; aspect-ratio: 1; border-radius: 50%; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-weight: 900; color: rgba(255,255,255,.92); font-size: clamp(9px, 1.6vh, 26px);
      background: radial-gradient(circle at 35% 30%, #5a4fb0, #2c2550 72%);
      box-shadow: inset 0 3px 4px rgba(255,255,255,.25), inset 0 -5px 9px rgba(0,0,0,.5), 0 6px 12px rgba(0,0,0,.5);
      transition: transform .08s, box-shadow .08s;
    }
    .gba-btn.is-press { transform: translateY(2px); box-shadow: inset 0 2px 7px rgba(0,0,0,.6), 0 3px 6px rgba(0,0,0,.5); }
    .gba-btn.gba-a { right: 0; top: 0; }
    .gba-btn.gba-b { left: 0; bottom: 0; }

    /* Écouteur / haut-parleur */
    .gba-speaker { position: absolute; right: 10%; bottom: 14%; display: flex; flex-direction: column; gap: 5px; transform: rotate(-24deg); }
    .gba-speaker span { width: clamp(26px, 3.4vh, 60px); height: .5vh; min-height: 4px; border-radius: 6px; background: rgba(0,0,0,.32); box-shadow: inset 0 1px 1px rgba(0,0,0,.5); }

    /* Gâchettes L / R */
    .gba-shoulder {
      position: absolute; top: -3%; width: 15%; height: 8%; border: none; cursor: pointer; z-index: 2;
      background: linear-gradient(#8b7ad2, #4b3a95); color: rgba(255,255,255,.85);
      font-weight: 900; font-size: clamp(8px, 1vh, 16px);
      box-shadow: inset 0 2px 3px rgba(255,255,255,.22), 0 5px 10px rgba(0,0,0,.5);
      transition: transform .08s;
    }
    .gba-shoulder.gba-l { left: 7%; border-radius: 14px 14px 5px 5px; }
    .gba-shoulder.gba-r { right: 7%; border-radius: 14px 14px 5px 5px; }
    .gba-shoulder.is-press { transform: translateY(3px); }

    /* Barre flottante */
    .gba-bar {
      position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 30;
      display: flex; align-items: center; gap: 8px; padding: 7px 9px 7px 7px; border-radius: 40px;
      background: rgba(12,10,22,.72); border: 1px solid rgba(255,255,255,.14);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 14px 34px rgba(0,0,0,.55);
      transition: opacity .3s ease, transform .3s ease;
    }
    .gba-bar.is-hidden { opacity: 0; transform: translateX(-50%) translateY(-10px); pointer-events: none; }
    .gba-btn-pill {
      display: flex; align-items: center; gap: 8px; border: none; cursor: pointer; border-radius: 40px;
      padding: 8px 16px 8px 8px; background: rgba(255,255,255,.10); color: #fff;
      font-weight: 800; font-size: 12px; letter-spacing: .5px; transition: background .2s;
    }
    .gba-btn-pill:hover { background: rgba(255,255,255,.20); }
    .gba-key { background: #fff; color: #111; border-radius: 50%; width: 18px; height: 18px; line-height: 18px; text-align: center; font-size: 10px; font-weight: 900; }
    .gba-title { color: rgba(255,255,255,.88); font-weight: 800; font-size: 13px; max-width: 40vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 4px; }
    .gba-icon-btn {
      width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.10); border: none;
      color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s;
    }
    .gba-icon-btn:hover { background: rgba(255,255,255,.20); }
    .gba-icon-btn.is-ok { background: rgba(60,220,120,.35); }

    @media (max-width: 640px) {
      .gba-title { max-width: 34vw; font-size: 12px; }
      .gba-bar { top: 10px; gap: 6px; padding: 6px 7px 6px 6px; }
      .gba-btn-pill { padding: 7px 12px 7px 7px; font-size: 11px; }
      .gba-side { flex-basis: 24%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .gba-play-root, .gba-console, .gba-bar, .gba-btn, .gba-ss, .gba-shoulder { animation: none !important; transition: none !important; }
    }
  `;
  document.head.appendChild(style);
}

/* ════════════════════════════════════════════════════════════════════
   LANCEMENT DU JEU (émulateur)
   ════════════════════════════════════════════════════════════════════ */
function launchGbaEmulator(container, game) {
  const romUrl   = encodeURIComponent(game.file);
  const gameName = encodeURIComponent(game.name);

  if (gxmbSlideTimer) { clearInterval(gxmbSlideTimer); gxmbSlideTimer = null; }
  if (gxmbClockTimer) { clearInterval(gxmbClockTimer); gxmbClockTimer = null; }
  teardownGxmbKeys();
  document.getElementById('bg-video')?.pause();

  currentGbaEmuStartTime = Date.now();
  currentGbaGameName     = game.name;

  if (typeof AudioManager !== 'undefined') {
    AudioManager.pauseMusic();
    if (AudioManager.appBgm) {
      AudioManager.appBgm.pause();
      AudioManager.appBgm.currentTime = 0;
      AudioManager.appBgm = null;
    }
  }

  injectGbaConsoleStyles();

  container.innerHTML = `
    <div class="gba-play-root" id="gba-play-root">
      <div class="gba-bar" id="gba-bar">
        <button class="gba-btn-pill" id="gba-back-btn"><span class="gba-key">B</span> Quitter</button>
        <span class="gba-title">${game.name}</span>
        <button class="gba-icon-btn" id="gba-save-btn" title="Sauvegarder la partie">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        </button>
        <button class="gba-icon-btn" id="gba-fs-btn" title="Plein écran">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
      </div>

      <div class="gba-console">
        <div class="gba-shell">
          <button class="gba-shoulder gba-l" data-gkey="a">L</button>
          <button class="gba-shoulder gba-r" data-gkey="s">R</button>

          <div class="gba-row">
            <div class="gba-side">
              <div class="gba-dpad">
                <span class="gba-dpad-key" data-gkey="ArrowUp"></span>
                <span class="gba-dpad-key" data-gkey="ArrowDown"></span>
                <span class="gba-dpad-key" data-gkey="ArrowLeft"></span>
                <span class="gba-dpad-key" data-gkey="ArrowRight"></span>
              </div>
            </div>

            <div class="gba-center">
              <div class="gba-screen-frame">
                <div class="gba-screen">
                  <iframe id="gba-emu-iframe" title="${game.name}" src="apps/gba/gba_player.html#rom=${romUrl}&name=${gameName}&core=mgba" allow="autoplay; fullscreen; gamepad"></iframe>
                </div>
              </div>
              <div class="gba-brand">GAME BOY ADVANCE</div>
              <div class="gba-startselect">
                <button class="gba-ss" data-gkey="Shift">SELECT</button>
                <button class="gba-ss" data-gkey="Enter">START</button>
              </div>
            </div>

            <div class="gba-side">
              <div class="gba-ab">
                <button class="gba-btn gba-a" data-gkey="x">A</button>
                <button class="gba-btn gba-b" data-gkey="z">B</button>
              </div>
              <div class="gba-speaker"><span></span><span></span><span></span><span></span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const gbaEmuIframe = container.querySelector('#gba-emu-iframe');

  /* Touches physiques → clavier de l'émulateur */
  const GKEY_CODES = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, x: 88, z: 90, a: 65, s: 83, Enter: 13, Shift: 16 };
  const GKEY_CODES_STR = { ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', x: 'KeyX', z: 'KeyZ', a: 'KeyA', s: 'KeyS', Enter: 'Enter', Shift: 'ShiftLeft' };
  const sendGKey = (key, type) => {
    try {
      const win = gbaEmuIframe && gbaEmuIframe.contentWindow;
      if (!win) return;
      const ev = new KeyboardEvent(type, { key, code: GKEY_CODES_STR[key] || key, keyCode: GKEY_CODES[key] || 0, which: GKEY_CODES[key] || 0, bubbles: true });
      (win.document || win).dispatchEvent(ev);
    } catch (e) { /* ignore */ }
  };
  container.querySelectorAll('[data-gkey]').forEach((el) => {
    const key = el.getAttribute('data-gkey');
    const down = (e) => { e.preventDefault(); el.classList.add('is-press'); sendGKey(key, 'keydown'); };
    const up   = (e) => { el.classList.remove('is-press'); sendGKey(key, 'keyup'); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
  });

  /* Barre flottante auto-masquée */
  const gbaBar = container.querySelector('#gba-bar');
  let gbaBarTimer = null;
  const showGbaBar = () => {
    if (!gbaBar) return;
    gbaBar.classList.remove('is-hidden');
    clearTimeout(gbaBarTimer);
    gbaBarTimer = setTimeout(() => gbaBar.classList.add('is-hidden'), 3200);
  };
  container.querySelector('#gba-play-root')?.addEventListener('pointermove', showGbaBar);
  showGbaBar();

  /* Plein écran */
  container.querySelector('#gba-fs-btn')?.addEventListener('click', () => {
    const root = container.querySelector('#gba-play-root');
    if (document.fullscreenElement) { document.exitFullscreen?.(); }
    else if (root?.requestFullscreen) { root.requestFullscreen().catch(() => {}); }
  });

  /* Sauvegarde manuelle */
  const gbaSaveBtn = container.querySelector('#gba-save-btn');
  gbaSaveBtn?.addEventListener('click', () => {
    try { gbaEmuIframe?.contentWindow?.postMessage({ type: 'TRIGGER_SAVE' }, '*'); } catch (e) {}
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    gbaSaveBtn.classList.add('is-ok');
    setTimeout(() => gbaSaveBtn.classList.remove('is-ok'), 900);
  });

  const backBtn = container.querySelector('#gba-back-btn');
  backBtn.addEventListener('click', async () => {
    if (!window.confirm("Voulez-vous vraiment quitter ce jeu ?\n\nVotre progression sera sauvegardée automatiquement.")) return;

    if (gbaEmuIframe?.contentWindow) {
      gbaEmuIframe.contentWindow.postMessage({ type: 'FORCE_SAVE_SYNC' }, '*');
      await new Promise(r => setTimeout(r, 800));
    }

    if (typeof AudioManager !== 'undefined') {
      AudioManager.playClick();
      AudioManager.playAppLaunchTransition(null, 'gbaBgm');
    }

    const elapsedMs      = Date.now() - currentGbaEmuStartTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    if (window.SaveManager) {
      await window.SaveManager.addPlaytime('gba', currentGbaGameName, elapsedMinutes, gbaPlaytimes);
    } else if (window.Auth?.currentUser && window.Firestore) {
      gbaPlaytimes[currentGbaGameName] = (gbaPlaytimes[currentGbaGameName] || 0) + Math.max(1, elapsedMinutes);
      const uid    = window.Auth.currentUser.uid;
      const docRef = window.Firestore.doc(window.FirebaseDB, 'users', uid);
      window.Firestore.setDoc(docRef, { gba_playtimes: gbaPlaytimes }, { merge: true })
        .catch(e => console.error('Error saving GBA playtime:', e));
    }

    clearTimeout(gbaBarTimer);
    renderGbaMenu(container);
  });

  if (gbaEmuIframe) {
    const focusEmu = () => {
      if (document.activeElement !== gbaEmuIframe) {
        gbaEmuIframe.focus();
        if (gbaEmuIframe.contentWindow) gbaEmuIframe.contentWindow.focus();
      }
    };
    // Stocké dans une var accessible pour clearInterval propre à la fermeture
    let gxmbFocusInterval = null;
    gbaEmuIframe.onload = () => {
      setTimeout(focusEmu, 500);
      if (gxmbFocusInterval) clearInterval(gxmbFocusInterval);
      gxmbFocusInterval = setInterval(() => {
        // S'arrête si cette iframe précise n'est plus dans le DOM
        if (!gbaEmuIframe.isConnected) {
          clearInterval(gxmbFocusInterval);
          gxmbFocusInterval = null;
          return;
        }
        if (document.activeElement === document.body) focusEmu();
      }, 2000);
    };
    // Nettoyage à la fermeture de l'app : stocké sur l'iframe pour y accéder depuis close()
    gbaEmuIframe._clearFocus = () => {
      if (gxmbFocusInterval) { clearInterval(gxmbFocusInterval); gxmbFocusInterval = null; }
    };
  }
}

