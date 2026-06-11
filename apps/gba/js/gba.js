/**
 * gba.js  —  apps/gba/js/gba.js
 *
 * Chargé en lazy-import par app.js via :
 *   _lazy(container, '../../../apps/gba/js/gba.js')
 *
 * Reécrit pour correspondre à la qualité du module DS :
 * - Carrousel animé avec covers
 * - Suivi du temps de jeu
 * - Gestion des saves via SaveManager.injectSaveUI
 * - Focus automatique sur l'iframe
 * - Protection avant de quitter
 */

const GBA_GAMES = [
  {
    name: 'Kirby & the Amazing Mirror',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Kirby%20%26%20the%20Amazing%20Mirror%20(Europe)%20(En%2CFr%2CDe%2CEs%2CIt).zip',
    cover: 'https://www.mobygames.com/images/covers/l/81577-kirby-the-amazing-mirror-game-boy-advance-front-cover.jpg',
  },
  {
    name: 'Zelda - The Minish Cap',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Legend%20of%20Zelda%2C%20The%20-%20The%20Minish%20Cap%20(Europe)%20(En%2CFr%2CDe%2CEs%2CIt).zip',
    cover: 'https://www.mobygames.com/images/covers/l/49348-the-legend-of-zelda-the-minish-cap-game-boy-advance-front-cover.jpg',
  },
  {
    name: 'Pokémon Version Émeraude',
    file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/gba/Pokemon%20-%20Version%20Emeraude%20(France).gba',
    cover: 'https://www.mobygames.com/images/covers/l/53348-pokemon-emerald-version-game-boy-advance-front-cover.jpg',
  },
];

window.GBA_GAMES = GBA_GAMES;

let gbaPlaytimes      = {};
let currentGbaEmuStartTime = 0;
let currentGbaGameName = null;
let currentGbaCoverIndex = 0;

export default async function renderGba(container) {
  if (window.SaveManager) {
    gbaPlaytimes = await window.SaveManager.loadPlaytimes('gba');
  } else if (window.Auth?.currentUser && window.Firestore) {
    try {
      const uid = window.Auth.currentUser.uid;
      const docRef = window.Firestore.doc(window.FirebaseDB, 'users', uid);
      const docSnap = await window.Firestore.getDoc(docRef);
      if (docSnap.exists() && docSnap.data().gba_playtimes) {
        gbaPlaytimes = docSnap.data().gba_playtimes;
      }
    } catch (e) {
      console.error('Error loading GBA playtimes:', e);
    }
  }
  renderGbaMenu(container);
}

function renderGbaMenu(container) {
  if (!document.getElementById('gba-simple-cover-styles')) {
    const style = document.createElement('style');
    style.id = 'gba-simple-cover-styles';
    style.textContent = `
      .gba-menu-wrapper {
        display: flex; flex-direction: column; width: 100%; height: 100%; font-family: 'Inter', sans-serif;
        background: transparent; color: #fff; overflow: hidden; position: relative;
        animation: gbaFadeIn 0.3s ease-out;
      }
      @keyframes gbaFadeIn {
        from { opacity: 0; transform: scale(1.02); }
        to { opacity: 1; transform: scale(1); }
      }

      .gba-covers-row {
        flex: 1; display: flex; align-items: center; justify-content: flex-start;
        padding: 0 50vw;
        overflow-x: hidden; scroll-behavior: smooth; gap: 40px;
      }

      .gba-cover-item {
        flex-shrink: 0; width: 220px; height: 320px; border-radius: 8px; cursor: pointer;
        position: relative; transition: all 0.3s cubic-bezier(0.2, 1, 0.3, 1);
        filter: brightness(0.5) grayscale(0.8);
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      }

      .gba-cover-item.active {
        filter: brightness(1) grayscale(0);
        transform: scale(1.15) translateY(-10px);
        box-shadow: 0 0 40px rgba(124,58,237,0.6), 0 20px 40px rgba(0,0,0,0.8);
        z-index: 10;
        border: 2px solid rgba(255,255,255,0.8);
      }

      .gba-cover-img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block; }

      .gba-fallback {
        width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #3a1f6e, #1a0e38); border-radius: 6px; text-align: center; padding: 15px;
      }

      .gba-info-panel {
        height: 160px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
        padding-bottom: 30px; gap: 12px; z-index: 1000;
        background: linear-gradient(to top, rgba(0,0,0,0.95), transparent); border-top: 1px solid rgba(255,255,255,0.1);
      }

      .gba-title { font-size: 34px; font-weight: 900; color: white; text-shadow: 0 4px 15px rgba(0,0,0,1); margin: 0; }
      .gba-playtime { font-size: 15px; color: #c4b5fd; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; }

      .gba-controls { display: flex; gap: 25px; margin-top: 15px; position: relative; z-index: 1001; }
      .gba-btn {
        display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3);
        border-radius: 40px; padding: 10px 25px; font-size: 16px; color: #fff; font-weight: 800; cursor: pointer; transition: all 0.2s;
      }
      .gba-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.05); border-color: #fff; }
      .gba-btn.primary {
        background: #7c3aed; color: #fff; border: none;
        box-shadow: 0 0 20px rgba(124, 58, 237, 0.5);
        width: 240px; justify-content: center;
      }
      .gba-btn.primary:hover { background: #9d5ff5; transform: scale(1.1); box-shadow: 0 0 30px rgba(124, 58, 237, 0.8); }
      .gba-btn b { background: #fff; color: #000; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 13px; }

      .gba-arrow {
        position: absolute; top: calc(50% - 80px); transform: translateY(-50%); z-index: 1000; width: 80px; height: 120px;
        border-radius: 18px; border: 2px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.7);
        color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; box-shadow: 0 10px 40px rgba(0,0,0,0.6); outline: none;
      }
      .gba-arrow:hover { background: rgba(0,0,0,0.9); transform: translateY(-50%) scale(1.1); border-color: #c4b5fd; }
      .gba-arrow:active { transform: translateY(-50%) scale(0.95); }

      #gba-btn-prev { left: 40px; }
      #gba-btn-next { right: 40px; }
      .gba-arrow svg { width: 45px; height: 45px; opacity: 1; stroke: #c4b5fd; }
      .gba-arrow:hover svg { stroke: #fff; }
    `;
    document.head.appendChild(style);
  }

  if (currentGbaCoverIndex < 0) currentGbaCoverIndex = 0;
  if (currentGbaCoverIndex >= GBA_GAMES.length) currentGbaCoverIndex = GBA_GAMES.length - 1;

  let coversHtml = '';
  GBA_GAMES.forEach((game, index) => {
    const isFallback = !game.cover;
    const content = isFallback
      ? `<div class="gba-fallback">
           <span style="font-size: 40px;">🎮</span>
           <span style="font-size: 12px; opacity: 0.7; margin-top: 5px;">GBA</span>
           <span style="font-weight: bold; margin-top: 10px; font-size: 16px;">${game.name}</span>
         </div>`
      : `<img src="${game.cover}" class="gba-cover-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
         <div class="gba-fallback" style="display:none;">
           <span style="font-size: 40px;">🎮</span>
           <span style="font-weight: bold; margin-top: 10px; font-size: 16px;">${game.name}</span>
         </div>`;

    coversHtml += `
      <div class="gba-cover-item" id="gba-item-${index}" data-index="${index}">
        ${content}
      </div>
    `;
  });

  const html = `
    <div class="gba-menu-wrapper" tabindex="-1">
      <button id="gba-btn-prev" class="gba-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button id="gba-btn-next" class="gba-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="gba-covers-row" id="gba-scroll-row">
        ${coversHtml}
      </div>
      <div class="gba-info-panel">
        <h2 class="gba-title" id="gba-ui-title">...</h2>
        <div class="gba-playtime" id="gba-ui-playtime">...</div>
        <div class="gba-controls">
          <button class="gba-btn primary" id="gba-launch-btn"><b>A</b> JOUER</button>
          <button class="gba-btn" id="gba-quit-btn"><b>B</b> QUITTER</button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  const wrapper = container.querySelector('.gba-menu-wrapper');
  wrapper.focus();

  if (GBA_GAMES.length > 0) {
    updateGbaCarousel(container);

    const items = container.querySelectorAll('.gba-cover-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-index'), 10);
        if (currentGbaCoverIndex === index) {
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          launchGbaEmulator(container, GBA_GAMES[currentGbaCoverIndex]);
        } else {
          currentGbaCoverIndex = index;
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          updateGbaCarousel(container);
        }
      });
    });

    container.querySelector('#gba-launch-btn').addEventListener('click', () => {
      if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      launchGbaEmulator(container, GBA_GAMES[currentGbaCoverIndex]);
    });

    container.querySelector('#gba-btn-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentGbaCoverIndex > 0) {
        currentGbaCoverIndex--;
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        updateGbaCarousel(container);
      }
    });

    container.querySelector('#gba-btn-next').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentGbaCoverIndex < GBA_GAMES.length - 1) {
        currentGbaCoverIndex++;
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        updateGbaCarousel(container);
      }
    });

    const keyHandler = (e) => {
      const menuWrapper = document.querySelector('.gba-menu-wrapper');
      if (!menuWrapper) {
        window.removeEventListener('keydown', keyHandler, true);
        return;
      }
      const emuActive = document.querySelector('iframe[src*="gba_player.html"]');
      if (emuActive) return;

      const keys = ['ArrowRight', 'ArrowLeft', 'Enter', 'b', 'Escape'];
      if (keys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'ArrowRight') {
          if (currentGbaCoverIndex < GBA_GAMES.length - 1) {
            currentGbaCoverIndex++;
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            updateGbaCarousel(container);
          }
        } else if (e.key === 'ArrowLeft') {
          if (currentGbaCoverIndex > 0) {
            currentGbaCoverIndex--;
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            updateGbaCarousel(container);
          }
        } else if (e.key === 'Enter') {
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          launchGbaEmulator(container, GBA_GAMES[currentGbaCoverIndex]);
        } else if (e.key === 'b' || e.key === 'Escape') {
          container.querySelector('#gba-quit-btn').click();
        }
      }
    };

    if (window._gbaKeyHandler) window.removeEventListener('keydown', window._gbaKeyHandler, true);
    window._gbaKeyHandler = keyHandler;
    window.addEventListener('keydown', keyHandler, true);
  }

  container.querySelector('#gba-quit-btn').addEventListener('click', () => {
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    if (window._gbaKeyHandler) {
      window.removeEventListener('keydown', window._gbaKeyHandler, true);
      window._gbaKeyHandler = null;
    }
    if (window.AppRegistry?.['gba']?.close) {
      window.AppRegistry['gba'].close();
    }
  });
}

function updateGbaCarousel(container) {
  const row      = container.querySelector('#gba-scroll-row');
  const items    = container.querySelectorAll('.gba-cover-item');
  const titleEl  = container.querySelector('#gba-ui-title');
  const playtimeEl = container.querySelector('#gba-ui-playtime');

  if (!row || !items.length) return;

  const game = GBA_GAMES[currentGbaCoverIndex];
  if (titleEl) titleEl.textContent = game.name;
  if (playtimeEl) {
    const mins = gbaPlaytimes[game.name] || 0;
    if (mins === 0) {
      playtimeEl.textContent = 'Temps de jeu : Vierge';
    } else {
      const h = Math.floor(mins / 60);
      const m = Math.floor(mins % 60);
      playtimeEl.textContent = `Temps de jeu : ${h > 0 ? h + 'h ' : ''}${m}m`;
    }
  }

  items.forEach((item, index) => {
    if (index === currentGbaCoverIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const activeItem = items[currentGbaCoverIndex];
  if (activeItem) {
    const itemWidth = 220;
    const gap = 40;
    const targetScroll = (currentGbaCoverIndex * (itemWidth + gap)) + (itemWidth / 2);
    row.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }
}

function launchGbaEmulator(container, game) {
  const romUrl  = encodeURIComponent(game.file);
  const gameName = encodeURIComponent(game.name);

  currentGbaEmuStartTime = Date.now();
  currentGbaGameName = game.name;

  if (typeof AudioManager !== 'undefined') {
    AudioManager.pauseMusic();
    if (AudioManager.appBgm) {
      AudioManager.appBgm.pause();
      AudioManager.appBgm.currentTime = 0;
      AudioManager.appBgm = null;
    }
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;width:100%;height:100%;background:#000;overflow:hidden;animation:gbaFadeIn 0.3s ease-out;">
      <div class="emu-toolbar" style="padding:10px 20px;background:rgba(20,20,20,0.95);backdrop-filter:blur(10px);display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(255,255,255,0.08);z-index:100;flex-wrap:wrap;">
        <div id="gba-back-btn" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:40px;padding:6px 18px;color:white;cursor:pointer;font-weight:700;transition:0.2s;">
          <span style="background:white;color:black;border-radius:50%;width:20px;height:20px;text-align:center;line-height:20px;font-size:13px;">B</span> Quitter
        </div>
        <h3 style="margin:0;color:white;font-size:18px;font-weight:400;letter-spacing:1px;flex:1;text-align:center;">${game.name}</h3>
      </div>
      <div style="flex:1;position:relative;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,#1a0e38,#000);">
        <iframe id="gba-emu-iframe" src="/apps/gba/gba_player.html#rom=${romUrl}&name=${gameName}&core=mgba" style="border:none;width:100%;height:100%;max-width:1280px;" allow="autoplay; fullscreen"></iframe>
      </div>
    </div>
  `;

  const gbaEmuIframe = container.querySelector('#gba-emu-iframe');
  if (window.SaveManager) {
    window.SaveManager.injectSaveUI(container, 'gba', game.name, gbaEmuIframe);
  }

  const backBtn = container.querySelector('#gba-back-btn');
  backBtn.addEventListener('mouseover', () => backBtn.style.background = 'rgba(255,255,255,0.2)');
  backBtn.addEventListener('mouseout',  () => backBtn.style.background = 'rgba(255,255,255,0.1)');
  backBtn.addEventListener('click', async () => {
    if (!window.confirm("Voulez-vous vraiment quitter ce jeu ?\n\n⚠️ Assurez-vous d'avoir sauvegardé via le menu de l'émulateur (Save State) ou vous perdrez votre progression récente !")) {
      return;
    }

    // Forcer un dernier upload de la save avant de quitter
    if (gbaEmuIframe?.contentWindow) {
      gbaEmuIframe.contentWindow.postMessage({ type: 'FORCE_SAVE_SYNC' }, '*');
      await new Promise(r => setTimeout(r, 600));
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
      const uid = window.Auth.currentUser.uid;
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
