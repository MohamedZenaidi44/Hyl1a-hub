/**
 * gba.js — apps/gba/js/gba.js
 *
 * Écran de sélection GBA — visuel XMB partagé (voir emulatorXmb.js) :
 *   - pile verticale de jaquettes empilées, une seule mise en avant
 *   - panneau d'info à droite : titre, description, temps de jeu,
 *     bouton Jouer, aperçu du jeu
 *   - wallpaper GBA.png propre à la console
 *
 * Le menu lui-même est fourni par public/js/core/emulatorXmb.js
 * (partagé avec les émulateurs DS, N64 et NES).
 */

import { createEmulatorXmb, destroyEmulatorXmb } from '/public/js/core/emulatorXmb.js';

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

/* ── État du module ───────────────────────────────────────────────── */
let gbaPlaytimes           = {};
let currentGbaEmuStartTime = 0;
let currentGbaGameName     = null;
const gbaXmbState          = { index: 0 };

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
  gbaXmbState.index = 0;
  renderGbaMenu(container);
}

/* ════════════════════════════════════════════════════════════════════
   MENU (fourni par le module partagé XMB)
   ════════════════════════════════════════════════════════════════════ */
function renderGbaMenu(container) {
  createEmulatorXmb(container, {
    appId: 'gba',
    wrapperClass: '',
    games: GBA_GAMES,
    state: gbaXmbState,
    titlebar: 'Émulateur GBA',
    wallpaper: 'public/assets/emulators/GBA.png',
    wallpaperFallback: '#07080b',
    emuIframeMatch: 'gba_player.html',
    getPlaytimes: () => gbaPlaytimes,
    launch: (game) => launchGbaEmulator(container, game),
    close: () => {
      if (window.AppRegistry?.['gba']?.close) window.AppRegistry['gba'].close();
    },
  });
}

/* ════════════════════════════════════════════════════════════════════
   LECTEUR GBA (jeu plein écran)
   ════════════════════════════════════════════════════════════════════ */
function injectGbaConsoleStyles() {
  if (document.getElementById('gba-player-styles')) return;
  const style = document.createElement('style');
  style.id = 'gba-player-styles';
  style.textContent = `
    .gba-play-root {
      position: absolute; inset: 0; width: 100%; height: 100%;
      background: #000;
      overflow: hidden; font-family: var(--font-main, 'Nunito', 'Inter', system-ui, sans-serif);
      animation: gbaRootIn .45s cubic-bezier(.22,1,.36,1);
    }
    @keyframes gbaRootIn { from { opacity: 0; } to { opacity: 1; } }
    .gba-play-root:fullscreen { background: #000; }

    /* Jeu plein écran — le peu de fond restant est noir pur */
    .gba-stage { position: absolute; inset: 0; background: #000; display: flex; align-items: center; justify-content: center; }
    .gba-stage iframe { width: min(100vw, 150vh); aspect-ratio: 3 / 2; border: 0; background: #000; }

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
    }
    @media (prefers-reduced-motion: reduce) {
      .gba-play-root, .gba-bar { animation: none !important; transition: none !important; }
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

  destroyEmulatorXmb();
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

      <div class="gba-stage">
        <iframe id="gba-emu-iframe" title="${game.name}" src="apps/gba/gba_player.html#rom=${romUrl}&name=${gameName}&core=mgba" allow="autoplay; fullscreen; gamepad"></iframe>
      </div>
    </div>
  `;

  const gbaEmuIframe = container.querySelector('#gba-emu-iframe');

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

  /* La barre doit aussi réagir quand la souris est au-dessus de l'iframe (jeu plein écran) */
  const attachGbaBarListeners = (doc) => {
    if (!doc) return;
    doc.addEventListener('pointermove', showGbaBar, { capture: true, passive: true });
    doc.addEventListener('mousemove', showGbaBar, { capture: true, passive: true });
  };
  gbaEmuIframe?.addEventListener('load', () => {
    try { attachGbaBarListeners(gbaEmuIframe.contentDocument); } catch (e) { /* ignore */ }
  });

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
    let xmbFocusInterval = null;
    gbaEmuIframe.onload = () => {
      setTimeout(focusEmu, 500);
      if (xmbFocusInterval) clearInterval(xmbFocusInterval);
      xmbFocusInterval = setInterval(() => {
        // S'arrête si cette iframe précise n'est plus dans le DOM
        if (!gbaEmuIframe.isConnected) {
          clearInterval(xmbFocusInterval);
          xmbFocusInterval = null;
          return;
        }
        if (document.activeElement === document.body) focusEmu();
      }, 2000);
    };
    // Nettoyage à la fermeture de l'app : stocké sur l'iframe pour y accéder depuis close()
    gbaEmuIframe._clearFocus = () => {
      if (xmbFocusInterval) { clearInterval(xmbFocusInterval); xmbFocusInterval = null; }
    };
  }
}
