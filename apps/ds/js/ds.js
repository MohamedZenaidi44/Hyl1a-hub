/**
 * ds.js — apps/ds/js/ds.js
 * Écran de sélection Nintendo DS — menu XMB partagé (public/js/core/emulatorXmb.js).
 */

import { createEmulatorXmb, destroyEmulatorXmb } from '/public/js/core/emulatorXmb.js';

const ROM_BASE = 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev';

const DS_GAMES = [
  { name: 'Mario Kart DS', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/0201 - Mario Kart DS (Europe) (En,Fr,De,Es,It).nds', cover: '/public/assets/ds/covers/mario-kart-ds.jpg',
    description: "Le karting de la DS : 32 circuits dont les rétros de la série, le mode Missions, le multijoueur local jusqu'à huit et son fameux mode Bataille." },
  { name: 'Pokémon Version Noire', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/Pokemon - Version Noire (France) (NDSi Enhanced).zip', cover: '/public/assets/ds/covers/pokemon-version-noire.jpg',
    description: "Cap sur Unys ! 156 nouveaux Pokémon, quatre saisons qui transforment les paysages, la Team Plasma et la connexion infrarouge entre versions." },
  { name: 'Pokémon Platine', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/Pokemon%20-%20Version%20Platine%20(France).nds', cover: '/public/assets/ds/covers/pokemon-platine.jpg',
    description: "L'aventure de Sinnoh enrichie : le Monde Distorsion de Giratina, de nouveaux lieux, la Team Galaxie et la Zone de Combat pour les dresseurs aguerris." },
  { name: 'Pokémon HeartGold', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/Pokemon%20-%20Version%20Or%20HeartGold%20(France).nds', cover: '/public/assets/ds/covers/pokemon-heartgold.jpg',
    description: "Le remake culte de Pokémon Or : Johto, la Tour Cendrée, le Pokéwalker et une seconde région, Kanto, avec ses seize badges." },
  { name: 'Super Mario 64 DS', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/Super Mario 64 DS (Europe) (En,Fr,De,Es,It).nds', cover: '/public/assets/ds/covers/super-mario-64-ds.jpg',
    description: "Le chef-d'œuvre 3D de la Nintendo 64 revisité : Yoshi, Luigi et Wario rejoignent Mario pour 150 étoiles, avec 30 étoiles bonus et des mini-jeux." },
  { name: 'New Super Mario Bros.', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/0479 - New Super Mario Bros. (Europe) (En,Fr,De,Es,It).nds', cover: '/public/assets/ds/covers/new-super-mario-bros.jpg',
    description: "Le grand retour de la plateforme 2D : huit mondes, les champignons Mini et Méga, et le mode Mario vs Luigi à deux joueurs." },
  { name: 'Frogger - Helmet Chaos', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/0322 - Frogger - Helmet Chaos (Europe) (En,Fr,De,Es,It).nds', cover: '/public/assets/ds/covers/frogger-helmet-chaos.jpg',
    description: "Frogger retraverse routes et rivières dans un jeu de plateforme 3D débridé, face à une armée de crapauds menée par l'ignoble Slick." },
  { name: 'Tetris DS', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/0413 - Tetris DS (Europe) (En,Fr,De,Es,It).nds', cover: '/public/assets/ds/covers/tetris-ds.jpg',
    description: "Le classique revisité aux couleurs de Nintendo : dix modes de jeu, du mode Standard au mode Push, jusqu'à quatre joueurs en réseau." },
  { name: 'TrackMania DS', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/2924 - TrackMania DS (Europe) (En,Fr,De,Es,It).nds', cover: '/public/assets/ds/covers/trackmania-ds.jpg',
    description: "Des courses chronométrées déjantées : plus de 170 circuits, un éditeur de pistes complet, des voitures à débloquer et le mode Plateforme." },
  { name: 'WarioWare - Do It Yourself', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/WarioWare - Do It Yourself (Europe) (En,Fr,De,Es,It).nds', cover: '/public/assets/ds/covers/warioware-do-it-yourself.jpg',
    description: "Dans l'atelier de Wario, créez vos propres micro-jeux : dessinez, composez, partagez-les ; la folie WarioWare version artistique." },
  { name: 'Dragon Quest V - La Fiancée Céleste', file: `${ROM_BASE}/ds/dragon-quest-v-fr.zip`, cover: '/public/assets/ds/covers/dragon-quest-v.png',
    description: "L'épisode culte de la trilogie Zenithia : trois générations, un mariage à choisir, des monstres à recruter et une histoire bouleversante." },
  { name: 'Dragon Quest VI - Le Royaume des Songes', file: `${ROM_BASE}/ds/dragon-quest-vi-fr.zip`, cover: '/public/assets/ds/covers/dragon-quest-vi.png',
    description: "Le volet le plus vaste de la saga : deux mondes parallèles, des dizaines de classes de personnages et une quête infinie." },
  { name: 'Final Fantasy III', file: `${ROM_BASE}/ds/final-fantasy-iii-fr.zip`, cover: '/public/assets/ds/covers/final-fantasy-iii.png',
    description: "Jamais sorti en Europe à l'époque, enfin en 3D sur DS : quatre orphelins, les cristaux et le légendaire système des Jobs." },
  { name: 'Final Fantasy IV', file: `${ROM_BASE}/ds/final-fantasy-iv-fr.zip`, cover: '/public/assets/ds/covers/final-fantasy-iv.png',
    description: "Le chef-d'œuvre narratif de la série : la rédemption du chevalier noir Cecil, l'ATB et des personnages inoubliables." },
  { name: 'Inazuma Eleven', file: `${ROM_BASE}/ds/inazuma-eleven-fr.zip`, cover: '/public/assets/ds/covers/inazuma-eleven.png',
    description: "Football et RPG réunis : recrute plus de 1000 joueurs, apprends des super-tirs et mène le collège Raimon au sommet." },
  { name: 'Inazuma Eleven 2 - Tempête de Glace', file: `${ROM_BASE}/ds/inazuma-eleven-2-blizzard-fr.zip`, cover: '/public/assets/ds/covers/inazuma-eleven-2-blizzard.png',
    description: "Suite directe : l'équipe de Mark affronte les extraterrestres d'Aliea. Version Blizzard avec ses recrues exclusives." },
  { name: 'Mario & Luigi - Voyage au Centre de Bowser', file: `${ROM_BASE}/ds/mario-luigi-bowser-fr.zip`, cover: '/public/assets/ds/covers/mario-luigi-bowser.png',
    description: "Bowser avale un champignon spécial et part sauver Peach malgré lui — le duo fraternel au sommet de son art." },
  { name: 'Pokémon Donjon Mystère - Équipe de Secours Bleue', file: `${ROM_BASE}/ds/pokemon-donjon-mystere-bleue-fr.zip`, cover: '/public/assets/ds/covers/pokemon-donjon-mystere-bleue.png',
    description: "Réveillé en Pokémon sans aucun souvenir : forme ton équipe de secours et explore des donjons générés aléatoirement." },
  { name: "Pokémon Donjon Mystère - Explorateurs de l'Ombre", file: `${ROM_BASE}/ds/pokemon-donjon-mystere-ombre-fr.zip`, cover: '/public/assets/ds/covers/pokemon-donjon-mystere-ombre.png',
    description: "Les Explorateurs côté obscur : donjons, trésors et guilde de Wigglytuff — relie tes sauvegardes avec Temps ou Ciel pour tout débloquer." },
  { name: 'Pokémon Donjon Mystère - Explorateurs du Ciel', file: `${ROM_BASE}/ds/pokemon-donjon-mystere-ciel-fr.zip`, cover: '/public/assets/ds/covers/pokemon-donjon-mystere-ciel.png',
    description: "La version définitive des Explorateurs : nouveaux donjons, nouvelles énigmes et l'épisode bonus Au-delà du Temps." },
  { name: 'Pokémon Donjon Mystère - Explorateurs du Temps', file: `${ROM_BASE}/ds/pokemon-donjon-mystere-temps-fr.zip`, cover: '/public/assets/ds/covers/pokemon-donjon-mystere-temps.png',
    description: "L'aventure fondatrice : voyage dans le temps pour empêcher la paralysie du monde Pokémon." },
];

// Expose globally
window.DS_GAMES = DS_GAMES;

let dsPlaytimes = {};
let currentDsEmuStartTime = 0;
let currentDsGameName = null;
const dsXmbState = { index: 0 };

export default async function renderDs(container) {
  if (window.SaveManager) {
    dsPlaytimes = await window.SaveManager.loadPlaytimes('ds');
  } else if (window.Auth?.currentUser && window.Firestore) {
    try {
      const uid = window.Auth.currentUser.uid;
      const docRef = window.Firestore.doc(window.FirebaseDB, 'users', uid);
      const docSnap = await window.Firestore.getDoc(docRef);
      if (docSnap.exists() && docSnap.data().ds_playtimes) {
        dsPlaytimes = docSnap.data().ds_playtimes;
      }
    } catch (e) {
      console.error('Error loading DS playtimes:', e);
    }
  }
  renderDsMenu(container);
}

function renderDsMenu(container) {
  createEmulatorXmb(container, {
    appId: 'ds',
    wrapperClass: 'ds-menu-wrapper',
    games: DS_GAMES,
    state: dsXmbState,
    titlebar: 'Émulateur DS',
    wallpaper: 'public/assets/emulators/NDS.jpeg',
    wallpaperFallback: '#14161c',
    emuIframeMatch: 'ds_player.html',
    getPlaytimes: () => dsPlaytimes,
    launch: (game) => launchDsEmulator(container, game),
    close: () => {
      if (window.AppRegistry?.['ds']?.close) window.AppRegistry['ds'].close();
    },
  });
}

function launchDsEmulator(container, game) {
  const romUrl = encodeURIComponent(game.file);
  const gameName = encodeURIComponent(game.name);

  destroyEmulatorXmb();
  document.getElementById('bg-video')?.pause();

  currentDsEmuStartTime = Date.now();
  currentDsGameName = game.name;

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
    <div id="ds-play-root" style="position: absolute; inset: 0; width: 100%; height: 100%; background: #000; overflow: hidden;">
      <iframe id="ds-emu-iframe" src="/apps/ds/ds_player.html#rom=${romUrl}&name=${gameName}&core=desmume" style="position: absolute; inset: 0; width: 100%; height: 100%; border: none; background: #000;" allow="autoplay; fullscreen"></iframe>
      <div id="ds-bar" style="position: absolute; top: 14px; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 40px; background: rgba(12,10,22,.72); border: 1px solid rgba(255,255,255,.14); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 14px 34px rgba(0,0,0,.55); transition: opacity .3s ease; opacity: 0; pointer-events: none;">
        <div id="ds-back-btn" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.10); border: none; border-radius: 40px; padding: 7px 16px 7px 8px; color: white; cursor: pointer; font-weight: 800; font-size: 12px; transition: 0.2s;">
          <span style="background: white; color: black; border-radius: 50%; width: 18px; height: 18px; text-align: center; line-height: 18px; font-size: 10px; font-weight: 900;">B</span> Quitter
        </div>
        <span style="color: rgba(255,255,255,.88); font-weight: 800; font-size: 13px; max-width: 40vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${game.name}</span>
        <button id="ds-fs-btn" title="Plein écran" style="width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,.10); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
      </div>
    </div>
  `;

  const dsEmuIframe = container.querySelector('#ds-emu-iframe');

  const backBtn = container.querySelector('#ds-back-btn');
  backBtn.addEventListener('mouseover', () => backBtn.style.background = 'rgba(255,255,255,0.2)');
  backBtn.addEventListener('mouseout', () => backBtn.style.background = 'rgba(255,255,255,0.1)');
  backBtn.addEventListener('click', async () => {
    if (!window.confirm("Voulez-vous vraiment quitter ce jeu ?\n\nVotre progression sera sauvegardée automatiquement.")) {
       return;
    }

    if (dsEmuIframe?.contentWindow) {
      dsEmuIframe.contentWindow.postMessage({ type: 'FORCE_SAVE_SYNC' }, '*');
      await new Promise(r => setTimeout(r, 800));
    }

    if (typeof AudioManager !== 'undefined') {
      AudioManager.playClick();
      AudioManager.playAppLaunchTransition(null, 'gbaBgm');
    }

    const elapsedMs = Date.now() - currentDsEmuStartTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    if (window.SaveManager) {
      await window.SaveManager.addPlaytime('ds', currentDsGameName, elapsedMinutes, dsPlaytimes);
    } else if (window.Auth?.currentUser && window.Firestore) {
      dsPlaytimes[currentDsGameName] = (dsPlaytimes[currentDsGameName] || 0) + Math.max(1, elapsedMinutes);
      const uid = window.Auth.currentUser.uid;
      const docRef = window.Firestore.doc(window.FirebaseDB, 'users', uid);
      window.Firestore.setDoc(docRef, { ds_playtimes: dsPlaytimes }, { merge: true })
        .catch(e => console.error('Error saving playtime:', e));
    }

    renderDsMenu(container);
  });

  const dsPlayRoot = container.querySelector('#ds-play-root');
  const dsBar = container.querySelector('#ds-bar');
  let dsBarTimer = null;
  const showDsBar = () => {
    if (!dsBar) return;
    dsBar.style.opacity = '1';
    dsBar.style.pointerEvents = 'auto';
    clearTimeout(dsBarTimer);
    dsBarTimer = setTimeout(() => { dsBar.style.opacity = '0'; dsBar.style.pointerEvents = 'none'; }, 3200);
  };
  dsPlayRoot?.addEventListener('pointermove', showDsBar);
  showDsBar();

  /* La barre doit aussi réagir quand la souris est au-dessus de l'iframe (jeu plein écran) */
  const attachDsBarListeners = (doc) => {
    if (!doc) return;
    doc.addEventListener('pointermove', showDsBar, { capture: true, passive: true });
    doc.addEventListener('mousemove', showDsBar, { capture: true, passive: true });
  };
  dsEmuIframe?.addEventListener('load', () => {
    try { attachDsBarListeners(dsEmuIframe.contentDocument); } catch (e) { /* ignore */ }
  });
  container.querySelector('#ds-fs-btn')?.addEventListener('click', () => {
    if (document.fullscreenElement) { document.exitFullscreen?.(); }
    else if (dsPlayRoot?.requestFullscreen) { dsPlayRoot.requestFullscreen().catch(() => {}); }
  });

  // Focus the iframe automatically so keyboard works immediately
  const emuIframe = container.querySelector('#ds-emu-iframe');
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
