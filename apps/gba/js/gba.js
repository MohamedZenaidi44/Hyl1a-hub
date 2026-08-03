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

/* Géométrie de la pile de jaquettes (colonne gauche) */
const GXMB_GAP        = 232;  // écart vertical entre le centre de deux jaquettes
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

    /* ── Bandeau supérieur : minimal, pas de barre pleine ── */
    .gxmb-topbar {
      position: absolute; top: 0; left: 0; right: 0; z-index: 6;
      display: flex; align-items: center; justify-content: space-between;
      padding: 30px 40px 0 44px; pointer-events: none;
    }
    .gxmb-kicker {
      display: flex; align-items: baseline; gap: 10px; pointer-events: none;
      font-size: 12px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase;
      color: rgba(255,255,255,0.75); text-shadow: 0 2px 8px rgba(0,0,0,0.6);
    }
    .gxmb-kicker span.gxmb-count { color: rgba(255,255,255,0.4); letter-spacing: 1px; }
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

    /* ── Colonne gauche : pile verticale de jaquettes ── */
    .gxmb-stage {
      position: relative; z-index: 2; flex: 0 0 420px;
      display: flex; align-items: center; justify-content: center;
      padding-left: 56px;
    }
    .gxmb-track { position: relative; width: 100%; height: 100%; }

    .gxmb-item {
      position: absolute; top: 50%; left: 40px;
      width: 148px; height: 208px;
      transform: translate(0, -50%);
      transition: transform .55s cubic-bezier(.22,1,.36,1),
                  opacity .5s ease, filter .5s ease;
      will-change: transform, opacity;
      cursor: pointer;
    }
    .gxmb-cover {
      width: 100%; height: 100%; border-radius: 14px; overflow: hidden; position: relative;
      box-shadow: 0 18px 40px rgba(0,0,0,0.45);
      transition: box-shadow .5s ease;
    }
    .gxmb-item.is-active .gxmb-cover {
      box-shadow:
        0 0 0 1.5px color-mix(in srgb, var(--theme-accent, #fff) 75%, transparent),
        0 0 34px color-mix(in srgb, var(--theme-accent, #fff) 30%, transparent),
        0 24px 50px rgba(0,0,0,0.55);
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
      position: absolute; left: 40px; width: 148px; z-index: 3;
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
      position: relative; width: 100%; aspect-ratio: 3 / 2; border-radius: 18px; overflow: hidden;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.14);
      box-shadow: 0 24px 60px rgba(0,0,0,0.5);
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
      .gxmb-stage { flex-basis: 260px; padding-left: 30px; }
      .gxmb-item { width: 116px; height: 164px; left: 20px; }
      .gxmb-nav { left: 20px; width: 116px; }
      .gxmb-corner {
        position: static; align-items: flex-start; margin: 12px clamp(24px, 4vw, 56px) 24px;
      }
    }
  `;
  document.head.appendChild(style);
}

/* ════════════════════════════════════════════════════════════════════
   RENDU
   ════════════════════════════════════════════════════════════════════ */
function renderGbaMenu(container) {
  injectGxmbStyles();

  if (gxmbIndex < 0) gxmbIndex = 0;
  if (gxmbIndex >= GBA_GAMES.length) gxmbIndex = GBA_GAMES.length - 1;

  let itemsHtml = '';
  GBA_GAMES.forEach((game, i) => {
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

  container.innerHTML = `
    <div class="gxmb-root" tabindex="-1">
      <div class="gxmb-scrim"></div>

      <div class="gxmb-topbar">
        <div class="gxmb-kicker">Game Boy Advance <span class="gxmb-count" id="gxmb-count"></span></div>
        <div class="gxmb-exit" id="gxmb-exit"><b>B</b> Retour</div>
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
            <div class="gxmb-preview-empty" id="gxmb-preview-empty">Aperçu à venir</div>
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

  // Le fond reste visible derrière ce menu (transparent) : on s'assure qu'il tourne.
  document.getElementById('bg-video')?.play().catch(() => {});

  if (GBA_GAMES.length === 0) return;

  /* Molette de la souris = naviguer dans la pile */
  let gxmbWheelLock = false;
  root.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (gxmbWheelLock || Math.abs(e.deltaY) < 4) return;
    if (e.deltaY > 0 && gxmbIndex < GBA_GAMES.length - 1) {
      gxmbWheelLock = true;
      setGxmbIndex(container, gxmbIndex + 1);
      setTimeout(() => { gxmbWheelLock = false; }, 420);
    } else if (e.deltaY < 0 && gxmbIndex > 0) {
      gxmbWheelLock = true;
      setGxmbIndex(container, gxmbIndex - 1);
      setTimeout(() => { gxmbWheelLock = false; }, 420);
    }
  }, { passive: false });

  /* Sélection au clic sur une jaquette */
  container.querySelectorAll('.gxmb-item').forEach((item) => {
    item.addEventListener('click', () => {
      const i = parseInt(item.getAttribute('data-index'), 10);
      if (i === gxmbIndex) {
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        launchGbaEmulator(container, GBA_GAMES[gxmbIndex]);
      } else {
        setGxmbIndex(container, i);
      }
    });
  });

  container.querySelector('#gxmb-play').addEventListener('click', () => {
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    launchGbaEmulator(container, GBA_GAMES[gxmbIndex]);
  });

  container.querySelector('#gxmb-nav-up').addEventListener('click', (e) => {
    e.stopPropagation();
    if (gxmbIndex > 0) setGxmbIndex(container, gxmbIndex - 1);
  });
  container.querySelector('#gxmb-nav-down').addEventListener('click', (e) => {
    e.stopPropagation();
    if (gxmbIndex < GBA_GAMES.length - 1) setGxmbIndex(container, gxmbIndex + 1);
  });

  container.querySelector('#gxmb-exit').addEventListener('click', () => {
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    teardownGxmbKeys();
    if (gxmbSlideTimer) { clearInterval(gxmbSlideTimer); gxmbSlideTimer = null; }
    if (window.AppRegistry?.['gba']?.close) window.AppRegistry['gba'].close();
  });

  /* Clavier : flèches, Entrée, B / Échap */
  const keyHandler = (e) => {
    const rootEl = document.querySelector('.gxmb-root');
    if (!rootEl) { window.removeEventListener('keydown', keyHandler, true); return; }
    if (document.querySelector('iframe[src*="gba_player.html"]')) return;

    if (!['ArrowUp', 'ArrowDown', 'Enter', 'b', 'Escape'].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();

    if (e.key === 'ArrowDown' && gxmbIndex < GBA_GAMES.length - 1) {
      setGxmbIndex(container, gxmbIndex + 1);
    } else if (e.key === 'ArrowUp' && gxmbIndex > 0) {
      setGxmbIndex(container, gxmbIndex - 1);
    } else if (e.key === 'Enter') {
      if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      launchGbaEmulator(container, GBA_GAMES[gxmbIndex]);
    } else if (e.key === 'b' || e.key === 'Escape') {
      container.querySelector('#gxmb-exit')?.click();
    }
  };
  teardownGxmbKeys();
  window._gxmbKeyHandler = keyHandler;
  window.addEventListener('keydown', keyHandler, true);

  layoutGxmbStack(container, false);
  updateGxmbInfo(container);
}

function teardownGxmbKeys() {
  if (window._gxmbKeyHandler) {
    window.removeEventListener('keydown', window._gxmbKeyHandler, true);
    window._gxmbKeyHandler = null;
  }
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
  if (downBtn) downBtn.classList.toggle('is-visible', gxmbIndex < GBA_GAMES.length - 1);

  const countEl = container.querySelector('#gxmb-count');
  if (countEl) countEl.textContent = `— ${String(gxmbIndex + 1).padStart(2, '0')} / ${String(GBA_GAMES.length).padStart(2, '0')}`;
}

/* Met à jour titre / description / temps de jeu / aperçu */
function updateGxmbInfo(container) {
  const game = GBA_GAMES[gxmbIndex];
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

  const frame = container.querySelector('#gxmb-preview-frame');
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
  const frame = container.querySelector('#gxmb-preview-frame');
  if (!frame) return;
  const imgs = frame.querySelectorAll('.gxmb-preview-img');
  const dots = container.querySelectorAll('.gxmb-preview-dot');
  if (!imgs.length) return;

  gxmbSlideIndex = ((index % imgs.length) + imgs.length) % imgs.length;
  imgs.forEach((img, i) => img.classList.toggle('is-active', i === gxmbSlideIndex));
  dots.forEach((d, i) => d.classList.toggle('is-active', i === gxmbSlideIndex));
}

/* ════════════════════════════════════════════════════════════════════
   LANCEMENT DU JEU (émulateur)
   ════════════════════════════════════════════════════════════════════ */
function launchGbaEmulator(container, game) {
  const romUrl   = encodeURIComponent(game.file);
  const gameName = encodeURIComponent(game.name);

  if (gxmbSlideTimer) { clearInterval(gxmbSlideTimer); gxmbSlideTimer = null; }
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

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;width:100%;height:100%;background:#000;overflow:hidden;">
      <div style="padding:10px 20px;background:rgba(10,10,10,0.9);backdrop-filter:blur(10px);display:flex;align-items:center;gap:12px;z-index:100;">
        <div id="gba-back-btn" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);border-radius:40px;padding:6px 16px 6px 8px;color:#fff;cursor:pointer;font-weight:800;font-size:12px;letter-spacing:0.5px;transition:0.2s;">
          <span style="background:#fff;color:#111;border-radius:50%;width:18px;height:18px;text-align:center;line-height:18px;font-size:10px;">B</span> Quitter
        </div>
        <h3 style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;font-weight:800;letter-spacing:0.5px;flex:1;text-align:center;">${game.name}</h3>
        <div style="width:96px;"></div>
      </div>
      <div style="flex:1;position:relative;display:flex;align-items:center;justify-content:center;background:#000;">
        <iframe id="gba-emu-iframe" src="apps/gba/gba_player.html#rom=${romUrl}&name=${gameName}&core=mgba" style="border:none;width:100%;height:100%;" allow="autoplay; fullscreen"></iframe>
      </div>
    </div>
  `;

  const gbaEmuIframe = container.querySelector('#gba-emu-iframe');
  const backBtn = container.querySelector('#gba-back-btn');
  backBtn.addEventListener('mouseover', () => backBtn.style.background = 'rgba(255,255,255,0.16)');
  backBtn.addEventListener('mouseout',  () => backBtn.style.background = 'rgba(255,255,255,0.08)');
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

    renderGbaMenu(container);
  });

  if (gbaEmuIframe) {
    const focusEmu = () => {
      if (document.activeElement !== gbaEmuIframe) {
        gbaEmuIframe.focus();
        if (gbaEmuIframe.contentWindow) gbaEmuIframe.contentWindow.focus();
      }
    };
    gbaEmuIframe.onload = () => {
      setTimeout(focusEmu, 500);
      const focusInterval = setInterval(() => {
        if (!document.querySelector('iframe')) { clearInterval(focusInterval); return; }
        if (document.activeElement === document.body) focusEmu();
      }, 2000);
    };
  }
}
