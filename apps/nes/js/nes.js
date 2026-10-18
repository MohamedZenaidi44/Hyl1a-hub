/**
 * nes.js — apps/nes/js/nes.js
 * Écran de sélection NES — menu XMB partagé (public/js/core/emulatorXmb.js).
 */

import { createEmulatorXmb, destroyEmulatorXmb } from '/public/js/core/emulatorXmb.js';

const NES_GAMES = [
  { name: 'Super Mario Bros. 25th Anniversary', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/nes/25th Anniversary Super Mario Bros. (Europe) (Promo, Virtual Console).zip', cover: '/public/assets/nes/covers/super-mario-bros-25th.jpg',
    description: "L'édition anniversaire des 25 ans du jeu qui a sauvé le jeu vidéo : huit mondes, les champignons, les tuyaux… et la princesse à sauver, en version Virtual Console." },
];

// Expose globally
window.NES_GAMES = NES_GAMES;

let nesPlaytimes = {};
let currentNesEmuStartTime = 0;
let currentNesGameName = null;
const nesXmbState = { index: 0 };

export default async function renderNes(container) {
  if (window.Auth && window.Auth.currentUser && window.Firestore) {
    try {
      const uid = window.Auth.currentUser.uid;
      const docRef = window.Firestore.doc(window.FirebaseDB, "users", uid);
      const docSnap = await window.Firestore.getDoc(docRef);
      if (docSnap.exists() && docSnap.data().nes_playtimes) {
        nesPlaytimes = docSnap.data().nes_playtimes;
      }
    } catch (e) {
      console.error("Error loading NES playtimes:", e);
    }
  }
  renderNesMenu(container);
}

function renderNesMenu(container) {
  createEmulatorXmb(container, {
    appId: 'nes',
    wrapperClass: 'nes-menu-wrapper',
    games: NES_GAMES,
    state: nesXmbState,
    titlebar: 'Émulateur NES',
    wallpaper: 'public/assets/emulators/NES.jpeg',
    wallpaperFallback: '#14161c',
    emuIframeMatch: 'nes_player.html',
    getPlaytimes: () => nesPlaytimes,
    launch: (game) => launchNesEmulator(container, game),
    close: () => {
      if (window.AppRegistry?.['nes']?.close) window.AppRegistry['nes'].close();
    },
  });
}

function launchNesEmulator(container, game) {
  const romUrl = encodeURIComponent(game.file);
  const gameName = encodeURIComponent(game.name);

  destroyEmulatorXmb();
  document.getElementById('bg-video')?.pause();

  currentNesEmuStartTime = Date.now();
  currentNesGameName = game.name;

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
    <div id="nes-play-root" style="position: absolute; inset: 0; width: 100%; height: 100%; background: #000; overflow: hidden;">
      <iframe id="nes-emu-iframe" src="/apps/nes/nes_player.html#rom=${romUrl}&name=${gameName}&core=fceumm" style="position: absolute; inset: 0; width: 100%; height: 100%; border: none; background: #000;" allow="autoplay; fullscreen"></iframe>
      <div id="nes-bar" style="position: absolute; top: 14px; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 40px; background: rgba(12,10,22,.72); border: 1px solid rgba(255,255,255,.14); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 14px 34px rgba(0,0,0,.55); transition: opacity .3s ease; opacity: 0; pointer-events: none;">
        <div id="nes-back-btn" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.10); border: none; border-radius: 40px; padding: 7px 16px 7px 8px; color: white; cursor: pointer; font-weight: 800; font-size: 12px; transition: 0.2s;">
          <span style="background: white; color: black; border-radius: 50%; width: 18px; height: 18px; text-align: center; line-height: 18px; font-size: 10px; font-weight: 900;">B</span> Quitter
        </div>
        <span style="color: rgba(255,255,255,.88); font-weight: 800; font-size: 13px; max-width: 40vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${game.name}</span>
        <button id="nes-fs-btn" title="Plein écran" style="width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.10); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
      </div>
    </div>
  `;

  const backBtn = container.querySelector('#nes-back-btn');
  backBtn.addEventListener('mouseover', () => backBtn.style.background = 'rgba(255,255,255,0.2)');
  backBtn.addEventListener('mouseout', () => backBtn.style.background = 'rgba(255,255,255,0.1)');
  backBtn.addEventListener('click', async () => {
    if (!window.confirm("Voulez-vous vraiment quitter ce jeu ?\n\nVotre progression sera sauvegardée automatiquement.")) {
       return;
    }

    const nesEmuIframe = container.querySelector('#nes-emu-iframe');
    if (nesEmuIframe?.contentWindow) {
      nesEmuIframe.contentWindow.postMessage({ type: 'FORCE_SAVE_SYNC' }, '*');
      await new Promise(r => setTimeout(r, 800));
    }

    if (typeof AudioManager !== 'undefined') {
      AudioManager.playClick();
      AudioManager.playAppLaunchTransition(null, 'gbaBgm');
    }

    const elapsedMs = Date.now() - currentNesEmuStartTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const minsToAdd = Math.max(1, elapsedMinutes);

    nesPlaytimes[currentNesGameName] = (nesPlaytimes[currentNesGameName] || 0) + minsToAdd;

    if (window.Auth && window.Auth.currentUser && window.Firestore) {
      const uid = window.Auth.currentUser.uid;
      const docRef = window.Firestore.doc(window.FirebaseDB, "users", uid);
      window.Firestore.setDoc(docRef, { nes_playtimes: nesPlaytimes }, { merge: true })
        .catch(e => console.error("Error saving playtime:", e));
    }

    renderNesMenu(container);
  });

  const nesPlayRoot = container.querySelector('#nes-play-root');
  const nesBar = container.querySelector('#nes-bar');
  let nesBarTimer = null;
  const showNesBar = () => {
    if (!nesBar) return;
    nesBar.style.opacity = '1';
    nesBar.style.pointerEvents = 'auto';
    clearTimeout(nesBarTimer);
    nesBarTimer = setTimeout(() => { nesBar.style.opacity = '0'; nesBar.style.pointerEvents = 'none'; }, 3200);
  };
  nesPlayRoot?.addEventListener('pointermove', showNesBar);
  showNesBar();

  /* La barre doit aussi réagir quand la souris est au-dessus de l'iframe (jeu plein écran) */
  const nesIframeEl = container.querySelector('#nes-emu-iframe');
  const attachNesBarListeners = (doc) => {
    if (!doc) return;
    doc.addEventListener('pointermove', showNesBar, { capture: true, passive: true });
    doc.addEventListener('mousemove', showNesBar, { capture: true, passive: true });
  };
  nesIframeEl?.addEventListener('load', () => {
    try { attachNesBarListeners(nesIframeEl.contentDocument); } catch (e) { /* ignore */ }
  });
  container.querySelector('#nes-fs-btn')?.addEventListener('click', () => {
    if (document.fullscreenElement) { document.exitFullscreen?.(); }
    else if (nesPlayRoot?.requestFullscreen) { nesPlayRoot.requestFullscreen().catch(() => {}); }
  });

  // Focus the iframe automatically so keyboard works immediately
  const emuIframe = container.querySelector('#nes-emu-iframe');
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
