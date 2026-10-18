/**
 * n64.js — apps/n64/js/n64.js
 * Écran de sélection Nintendo 64 — menu XMB partagé (public/js/core/emulatorXmb.js).
 */

import { createEmulatorXmb, destroyEmulatorXmb } from '/public/js/core/emulatorXmb.js';

const ROM_BASE = 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev';

const N64_GAMES = [
  { name: 'Super Mario 64', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/n64/Super Mario 64 (Europe) (En,Fr,De).n64', cover: '/public/assets/n64/covers/super-mario-64.jpg',
    description: "L'aventure 3D fondatrice : explorez le château de Peach, sautez dans les tableaux des quinze mondes et récoltez 120 étoiles pour affronter Bowser." },
  { name: 'Mario Kart 64', file: `${ROM_BASE}/n64/mario-kart-64-europe.zip`, cover: '/public/assets/n64/covers/mario-kart-64.png',
    description: "Le kart de légende : quatre joueurs en écran partagé, la Route Arc-en-ciel et des souvenirs infinis." },
  { name: 'The Legend of Zelda - Ocarina of Time', file: `${ROM_BASE}/n64/zelda-ocarina-of-time-europe.zip`, cover: '/public/assets/n64/covers/zelda-ocarina-of-time.png',
    description: "Le sommet absolu : Hyrule, l'Ocarina du temps, la Master Sword — l'aventure qui a défini la 3D." },
  { name: "The Legend of Zelda - Majora's Mask", file: `${ROM_BASE}/n64/zelda-majoras-mask-europe.zip`, cover: '/public/assets/n64/covers/zelda-majoras-mask.png',
    description: "Trois jours avant la fin du monde : le Zelda le plus sombre, ses masques et son cycle infernal devenu légendaire." },
  { name: 'Banjo-Kazooie', file: `${ROM_BASE}/n64/banjo-kazooie-europe.zip`, cover: '/public/assets/n64/covers/banjo-kazooie.png',
    description: "Le duo ours-oiseau de Rare : neuf mondes colorés, des tonnes de collectibles et l'humour décalé de la sorcière Gruntilda." },
  { name: 'Banjo-Tooie', file: `${ROM_BASE}/n64/banjo-tooie-europe.zip`, cover: '/public/assets/n64/covers/banjo-tooie.png',
    description: "La suite en plus grand : mondes interconnectés, transformations multiples et le mode multijoueur à quatre." },
  { name: 'Paper Mario', file: `${ROM_BASE}/n64/paper-mario-europe.zip`, cover: '/public/assets/n64/covers/paper-mario.png',
    description: "Mario en papier : un RPG malin mêlant timing d'action, partenaires attachants et badinage avec Peach." },
  { name: 'Kirby 64 - The Crystal Shards', file: `${ROM_BASE}/n64/kirby-64-the-crystal-shards-europe.zip`, cover: '/public/assets/n64/covers/kirby-64-the-crystal-shards.png',
    description: "Kirby en 2.5D : combine deux pouvoirs de copie et parcours le monde des cristaux pour reformer l'Étoile de Cristal." },
  { name: 'Pokémon Snap', file: `${ROM_BASE}/n64/pokemon-snap-europe.zip`, cover: '/public/assets/n64/covers/pokemon-snap.png',
    description: "Photographie les Pokémon dans leur habitat : 63 espèces, des poses rares et des tonnes d'astuces à trouver." },
  { name: 'Pokémon Stadium', file: `${ROM_BASE}/n64/pokemon-stadium-europe.zip`, cover: '/public/assets/n64/covers/pokemon-stadium.png',
    description: "Combats 3D au Stade : importe tes Pokémon de cartouches Game Boy, les Coupes et les mini-jeux cultes." },
];

// Expose globally
window.N64_GAMES = N64_GAMES;

let n64Playtimes = {};
let currentN64EmuStartTime = 0;
let currentN64GameName = null;
const n64XmbState = { index: 0 };

export default async function renderN64(container) {
  if (window.Auth && window.Auth.currentUser && window.Firestore) {
    try {
      const uid = window.Auth.currentUser.uid;
      const docRef = window.Firestore.doc(window.FirebaseDB, "users", uid);
      const docSnap = await window.Firestore.getDoc(docRef);
      if (docSnap.exists() && docSnap.data().n64_playtimes) {
        n64Playtimes = docSnap.data().n64_playtimes;
      }
    } catch (e) {
      console.error("Error loading N64 playtimes:", e);
    }
  }
  renderN64Menu(container);
}

function renderN64Menu(container) {
  createEmulatorXmb(container, {
    appId: 'n64',
    wrapperClass: 'n64-menu-wrapper',
    games: N64_GAMES,
    state: n64XmbState,
    titlebar: 'Émulateur N64',
    wallpaper: 'public/assets/emulators/N64.png',
    wallpaperFallback: '#14161c',
    emuIframeMatch: 'n64_player.html',
    getPlaytimes: () => n64Playtimes,
    launch: (game) => launchN64Emulator(container, game),
    close: () => {
      if (window.AppRegistry?.['n64']?.close) window.AppRegistry['n64'].close();
    },
  });
}

function launchN64Emulator(container, game) {
  const romUrl = encodeURIComponent(game.file);
  const gameName = encodeURIComponent(game.name);

  destroyEmulatorXmb();
  document.getElementById('bg-video')?.pause();

  currentN64EmuStartTime = Date.now();
  currentN64GameName = game.name;

  // Stop background music to avoid overlap
  if (typeof AudioManager !== 'undefined') {
    AudioManager.pauseMusic();
    if (AudioManager.appBgm) {
      AudioManager.appBgm.pause();
      AudioManager.appBgm.currentTime = 0;
      AudioManager.appBgm = null;
    }
  }

  container.innerHTML = `
    <div id="n64-play-root" style="position: absolute; inset: 0; width: 100%; height: 100%; background: #000; overflow: hidden;">
      <iframe id="n64-emu-iframe" src="/apps/n64/n64_player.html#rom=${romUrl}&name=${gameName}&core=mupen64plus_next" style="position: absolute; inset: 0; width: 100%; height: 100%; border: none; background: #000;" allow="autoplay; fullscreen"></iframe>
      <div id="n64-bar" style="position: absolute; top: 14px; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 40px; background: rgba(12,10,22,.72); border: 1px solid rgba(255,255,255,.14); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 14px 34px rgba(0,0,0,.55); transition: opacity .3s ease; opacity: 0; pointer-events: none;">
        <div id="n64-back-btn" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.10); border: none; border-radius: 40px; padding: 7px 16px 7px 8px; color: white; cursor: pointer; font-weight: 800; font-size: 12px; transition: 0.2s;">
          <span style="background: white; color: black; border-radius: 50%; width: 18px; height: 18px; text-align: center; line-height: 18px; font-size: 10px; font-weight: 900;">B</span> Quitter
        </div>
        <span style="color: rgba(255,255,255,.88); font-weight: 800; font-size: 13px; max-width: 40vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${game.name}</span>
        <button id="n64-fs-btn" title="Plein écran" style="width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.10); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
      </div>
    </div>
  `;

  const backBtn = container.querySelector('#n64-back-btn');
  backBtn.addEventListener('mouseover', () => backBtn.style.background = 'rgba(255,255,255,0.2)');
  backBtn.addEventListener('mouseout', () => backBtn.style.background = 'rgba(255,255,255,0.1)');
  backBtn.addEventListener('click', async () => {
    if (!window.confirm("Voulez-vous vraiment quitter ce jeu ?\n\nVotre progression sera sauvegardée automatiquement.")) {
       return;
    }

    const n64EmuIframe = container.querySelector('#n64-emu-iframe');
    if (n64EmuIframe?.contentWindow) {
      n64EmuIframe.contentWindow.postMessage({ type: 'FORCE_SAVE_SYNC' }, '*');
      await new Promise(r => setTimeout(r, 800));
    }

    if (typeof AudioManager !== 'undefined') {
      AudioManager.playClick();
      AudioManager.playAppLaunchTransition(null, 'gbaBgm');
    }

    const elapsedMs = Date.now() - currentN64EmuStartTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const minsToAdd = Math.max(1, elapsedMinutes);

    n64Playtimes[currentN64GameName] = (n64Playtimes[currentN64GameName] || 0) + minsToAdd;

    if (window.Auth && window.Auth.currentUser && window.Firestore) {
      const uid = window.Auth.currentUser.uid;
      const docRef = window.Firestore.doc(window.FirebaseDB, "users", uid);
      window.Firestore.setDoc(docRef, { n64_playtimes: n64Playtimes }, { merge: true })
        .catch(e => console.error("Error saving playtime:", e));
    }

    renderN64Menu(container);
  });

  const n64PlayRoot = container.querySelector('#n64-play-root');
  const n64Bar = container.querySelector('#n64-bar');
  let n64BarTimer = null;
  const showN64Bar = () => {
    if (!n64Bar) return;
    n64Bar.style.opacity = '1';
    n64Bar.style.pointerEvents = 'auto';
    clearTimeout(n64BarTimer);
    n64BarTimer = setTimeout(() => { n64Bar.style.opacity = '0'; n64Bar.style.pointerEvents = 'none'; }, 3200);
  };
  n64PlayRoot?.addEventListener('pointermove', showN64Bar);
  showN64Bar();

  /* La barre doit aussi réagir quand la souris est au-dessus de l'iframe (jeu plein écran) */
  const n64IframeEl = container.querySelector('#n64-emu-iframe');
  const attachN64BarListeners = (doc) => {
    if (!doc) return;
    doc.addEventListener('pointermove', showN64Bar, { capture: true, passive: true });
    doc.addEventListener('mousemove', showN64Bar, { capture: true, passive: true });
  };
  n64IframeEl?.addEventListener('load', () => {
    try { attachN64BarListeners(n64IframeEl.contentDocument); } catch (e) { /* ignore */ }
  });
  container.querySelector('#n64-fs-btn')?.addEventListener('click', () => {
    if (document.fullscreenElement) { document.exitFullscreen?.(); }
    else if (n64PlayRoot?.requestFullscreen) { n64PlayRoot.requestFullscreen().catch(() => {}); }
  });

  // Focus the iframe automatically so keyboard works immediately
  const emuIframe = container.querySelector('#n64-emu-iframe');
  if (emuIframe) {
    const focusEmu = () => {
      if (document.activeElement !== emuIframe) {
        emuIframe.focus();
        if (emuIframe.contentWindow) emuIframe.contentWindow.focus();
      }
    };

    emuIframe.onload = () => {
      setTimeout(focusEmu, 500);
      const focusInterval = setInterval(() => {
        if (!document.querySelector('iframe')) {
            clearInterval(focusInterval);
            return;
        }
        if (document.activeElement === document.body) {
            focusEmu();
        }
      }, 2000);
    };
  }
}
