const DS_GAMES = [
  { name: 'Mario Kart DS', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/0201 - Mario Kart DS (Europe) (En,Fr,De,Es,It).nds', cover: '' },
  { name: 'Pokémon Version Noire', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/Pokemon - Version Noire (France) (NDSi Enhanced).zip', cover: '/public/assets/icons/pokemon_black.png' },
  { name: 'Pokémon Platine', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/Pokemon%20-%20Version%20Platine%20(France).nds', cover: '/public/assets/icons/pokemon_platinum.png' },
  { name: 'Pokémon HeartGold', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/Pokemon%20-%20Version%20Or%20HeartGold%20(France).nds', cover: '/public/assets/icons/pokemon_heartgold.png' },
  { name: 'Super Mario 64 DS', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/Super Mario 64 DS (Europe) (En,Fr,De,Es,It).nds', cover: '' },
  { name: 'New Super Mario Bros.', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/0479 - New Super Mario Bros. (Europe) (En,Fr,De,Es,It).nds', cover: '' },
  { name: 'Frogger - Helmet Chaos', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/0322 - Frogger - Helmet Chaos (Europe) (En,Fr,De,Es,It).nds', cover: '' },
  { name: 'Tetris DS', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/0413 - Tetris DS (Europe) (En,Fr,De,Es,It).nds', cover: '' },
  { name: 'TrackMania DS', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/2924 - TrackMania DS (Europe) (En,Fr,De,Es,It).nds', cover: '' },
  { name: 'WarioWare - Do It Yourself', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/ds/WarioWare - Do It Yourself (Europe) (En,Fr,De,Es,It).nds', cover: '' },
];

// Expose globally
window.DS_GAMES = DS_GAMES;

let dsPlaytimes = {};
let currentDsEmuStartTime = 0;
let currentDsGameName = null;
let currentDsCoverIndex = 0;

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
  if (!document.getElementById('ds-simple-cover-styles')) {
    const style = document.createElement('style');
    style.id = 'ds-simple-cover-styles';
    style.textContent = `
      .ds-menu-wrapper {
        display: flex; flex-direction: column; width: 100%; height: 100%; font-family: 'Inter', sans-serif;
        background: transparent; color: #fff; overflow: hidden; position: relative;
        animation: dsFadeIn 0.3s ease-out;
      }
      @keyframes dsFadeIn {
        from { opacity: 0; transform: scale(1.02); }
        to { opacity: 1; transform: scale(1); }
      }
      
      .ds-covers-row {
        flex: 1; display: flex; align-items: center; justify-content: flex-start;
        padding: 0 50vw;
        overflow-x: hidden; scroll-behavior: smooth; gap: 40px;
      }
      
      .ds-cover-item {
        flex-shrink: 0; width: 220px; height: 320px; border-radius: 8px; cursor: pointer;
        position: relative; transition: all 0.3s cubic-bezier(0.2, 1, 0.3, 1);
        filter: brightness(0.5) grayscale(0.8);
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      }
      
      .ds-cover-item.active {
        filter: brightness(1) grayscale(0);
        transform: scale(1.15) translateY(-10px);
        box-shadow: 0 0 40px rgba(90,180,255,0.6), 0 20px 40px rgba(0,0,0,0.8);
        z-index: 10;
        border: 2px solid rgba(255,255,255,0.8);
      }
      
      .ds-cover-img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block; }
      
      .ds-fallback {
        width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #3a2b71, #1a1a2e); border-radius: 6px; text-align: center; padding: 15px;
      }
      
      .ds-info-panel {
        height: 160px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; 
        padding-bottom: 30px; gap: 12px; z-index: 1000;
        background: linear-gradient(to top, rgba(0,0,0,0.95), transparent); border-top: 1px solid rgba(255,255,255,0.1);
      }
      
      .ds-title { font-size: 34px; font-weight: 900; color: white; text-shadow: 0 4px 15px rgba(0,0,0,1); margin: 0; }
      .ds-playtime { font-size: 15px; color: #7ec4ff; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; }
      
      .ds-controls { display: flex; gap: 25px; margin-top: 15px; position: relative; z-index: 1001; }
      .ds-btn {
        display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3);
        border-radius: 40px; padding: 10px 25px; font-size: 16px; color: #fff; font-weight: 800; cursor: pointer; transition: all 0.2s;
      }
      .ds-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.05); border-color: #fff; }
      .ds-btn.primary { 
        background: #0096ff; color: #fff; border: none; 
        box-shadow: 0 0 20px rgba(0, 150, 255, 0.4);
        width: 240px; justify-content: center;
      }
      .ds-btn.primary:hover { background: #3ab1ff; transform: scale(1.1); box-shadow: 0 0 30px rgba(0, 150, 255, 0.7); }
      .ds-btn b { background: #fff; color: #000; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 13px; }

      .ds-arrow {
        position: absolute; top: calc(50% - 80px); transform: translateY(-50%); z-index: 1000; width: 80px; height: 120px;
        border-radius: 18px; border: 2px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.7);
        color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; box-shadow: 0 10px 40px rgba(0,0,0,0.6); outline: none;
      }
      .ds-arrow:hover { background: rgba(0,0,0,0.9); transform: translateY(-50%) scale(1.1); border-color: #7ec4ff; }
      .ds-arrow:active { transform: translateY(-50%) scale(0.95); }
      
      #ds-btn-prev { left: 40px; }
      #ds-btn-next { right: 40px; }
      .ds-arrow svg { width: 45px; height: 45px; opacity: 1; stroke: #7ec4ff; }
      .ds-arrow:hover svg { stroke: #fff; }
    `;
    document.head.appendChild(style);
  }

  // Enforce limits
  if (currentDsCoverIndex < 0) currentDsCoverIndex = 0;
  if (currentDsCoverIndex >= DS_GAMES.length) currentDsCoverIndex = DS_GAMES.length - 1;

  let coversHtml = '';
  DS_GAMES.forEach((game, index) => {
    const isFallback = !game.cover;
    const content = isFallback
      ? `<div class="ds-fallback">
           <span style="font-size: 40px;">🎮</span>
           <span style="font-size: 12px; opacity: 0.7; margin-top: 5px;">DS</span>
           <span style="font-weight: bold; margin-top: 10px; font-size: 16px;">${game.name}</span>
         </div>`
      : `<img src="${game.cover}" class="ds-cover-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
         <div class="ds-fallback" style="display:none;">
           <span style="font-size: 40px;">🎮</span>
           <span style="font-weight: bold; margin-top: 10px; font-size: 16px;">${game.name}</span>
         </div>`;

    coversHtml += `
      <div class="ds-cover-item" id="ds-item-${index}" data-index="${index}">
        ${content}
      </div>
    `;
  });

  const html = `
    <div class="ds-menu-wrapper" tabindex="-1">
      <button id="ds-btn-prev" class="ds-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button id="ds-btn-next" class="ds-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="ds-covers-row" id="ds-scroll-row">
        ${coversHtml}
      </div>
      <div class="ds-info-panel">
        <h2 class="ds-title" id="ds-ui-title">...</h2>
        <div class="ds-playtime" id="ds-ui-playtime">...</div>
        <div class="ds-controls">
           <button class="ds-btn primary" id="ds-launch-btn"><b>A</b> JOUER</button>
           <button class="ds-btn" id="ds-quit-btn"><b>B</b> QUITTER</button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  
  const wrapper = container.querySelector('.ds-menu-wrapper');
  wrapper.focus();

  if (DS_GAMES.length > 0) {
    updateDsCarousel(container);

    const items = container.querySelectorAll('.ds-cover-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-index'), 10);
        if (currentDsCoverIndex === index) {
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          launchDsEmulator(container, DS_GAMES[currentDsCoverIndex]);
        } else {
          currentDsCoverIndex = index;
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          updateDsCarousel(container);
        }
      });
    });

    container.querySelector('#ds-launch-btn').addEventListener('click', () => {
      if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      launchDsEmulator(container, DS_GAMES[currentDsCoverIndex]);
    });

    container.querySelector('#ds-btn-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentDsCoverIndex > 0) {
        currentDsCoverIndex--;
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        updateDsCarousel(container);
      }
    });

    container.querySelector('#ds-btn-next').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentDsCoverIndex < DS_GAMES.length - 1) {
        currentDsCoverIndex++;
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        updateDsCarousel(container);
      }
    });

    // Scoped Key Handler
    const keyHandler = (e) => {
      const menuWrapper = document.querySelector('.ds-menu-wrapper');
      if (!menuWrapper) {
        window.removeEventListener('keydown', keyHandler, true);
        return;
      }
      const emuActive = document.querySelector('iframe[src*="ds_player.html"]');
      if (emuActive) return;

      const keys = ['ArrowRight', 'ArrowLeft', 'Enter', 'b', 'Escape'];
      if (keys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.key === 'ArrowRight') {
          if (currentDsCoverIndex < DS_GAMES.length - 1) {
            currentDsCoverIndex++;
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            updateDsCarousel(container);
          }
        }
        else if (e.key === 'ArrowLeft') {
          if (currentDsCoverIndex > 0) {
            currentDsCoverIndex--;
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            updateDsCarousel(container);
          }
        }
        else if (e.key === 'Enter') {
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          launchDsEmulator(container, DS_GAMES[currentDsCoverIndex]);
        }
        else if (e.key === 'b' || e.key === 'Escape') {
          container.querySelector('#ds-quit-btn').click();
        }
      }
    };

    if (window._dsKeyHandler) window.removeEventListener('keydown', window._dsKeyHandler, true);
    window._dsKeyHandler = keyHandler;
    window.addEventListener('keydown', keyHandler, true);
  }

  container.querySelector('#ds-quit-btn').addEventListener('click', () => {
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    if (window._dsKeyHandler) {
      window.removeEventListener('keydown', window._dsKeyHandler, true);
      window._dsKeyHandler = null;
    }
    if (window.AppRegistry['ds'] && window.AppRegistry['ds'].close) {
      window.AppRegistry['ds'].close();
    }
  });
}

function updateDsCarousel(container) {
  const row = container.querySelector('#ds-scroll-row');
  const items = container.querySelectorAll('.ds-cover-item');
  const titleEl = container.querySelector('#ds-ui-title');
  const playtimeEl = container.querySelector('#ds-ui-playtime');

  if (!row || !items.length) return;

  const game = DS_GAMES[currentDsCoverIndex];
  if (titleEl) titleEl.textContent = game.name;
  if (playtimeEl) {
    const mins = dsPlaytimes[game.name] || 0;
    if (mins === 0) {
      playtimeEl.textContent = `Temps de jeu : Vierge`;
    } else {
      const h = Math.floor(mins / 60);
      const m = Math.floor(mins % 60);
      playtimeEl.textContent = `Temps de jeu : ${h > 0 ? h + 'h ' : ''}${m}m`;
    }
  }

  items.forEach((item, index) => {
    if (index === currentDsCoverIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const activeItem = items[currentDsCoverIndex];
  if (activeItem) {
    const itemWidth = 220;
    const gap = 40;
    const targetScroll = (currentDsCoverIndex * (itemWidth + gap)) + (itemWidth / 2);
    row.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }
}

function launchDsEmulator(container, game) {
  const romUrl = encodeURIComponent(game.file);
  const gameName = encodeURIComponent(game.name);
  
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
    <div style="display:flex;flex-direction:column;width:100%;height:100%;background:#000;overflow:hidden;animation:dsFadeIn 0.3s ease-out;">
      <div class="emu-toolbar" style="padding:10px 20px;background:rgba(20,20,20,0.95);backdrop-filter:blur(10px);display:flex;align-items:center;gap:12px;border-bottom:2px solid rgba(255,255,255,0.08);z-index:100;flex-wrap:wrap;">
        <div id="ds-back-btn" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);border-radius:40px;padding:6px 18px;color:white;cursor:pointer;font-weight:700;transition:0.2s;">
          <span style="background:white;color:black;border-radius:50%;width:20px;height:20px;text-align:center;line-height:20px;font-size:13px;">B</span> Quitter
        </div>
        <h3 style="margin:0;color:white;font-size:18px;font-weight:400;letter-spacing:1px;flex:1;text-align:center;">${game.name}</h3>
      </div>
      <div style="flex:1;position:relative;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,#222,#000);">
        <iframe id="ds-emu-iframe" src="/apps/ds/ds_player.html#rom=${romUrl}&name=${gameName}&core=desmume" style="border:none;width:100%;height:100%;max-width:1280px;" allow="autoplay; fullscreen"></iframe>
      </div>
    </div>
  `;

  const dsEmuIframe = container.querySelector('#ds-emu-iframe');
  if (window.SaveManager) {
    window.SaveManager.injectSaveUI(container, 'ds', game.name, dsEmuIframe);
  }

  const backBtn = container.querySelector('#ds-back-btn');
  backBtn.addEventListener('mouseover', () => backBtn.style.background = 'rgba(255,255,255,0.2)');
  backBtn.addEventListener('mouseout', () => backBtn.style.background = 'rgba(255,255,255,0.1)');
  backBtn.addEventListener('click', async () => {
    if (!window.confirm("Voulez-vous vraiment quitter ce jeu ?\\n\\n⚠️ Assurez-vous d'avoir sauvegardé via le menu de l'émulateur (Save State) ou vous perdrez votre progression récente !")) {
       return;
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
