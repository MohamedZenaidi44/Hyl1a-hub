const N64_GAMES = [
  { name: 'Super Mario 64', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/n64/Super Mario 64 (Europe) (En,Fr,De).n64', cover: '' },
  // Add more N64 ROMs here, e.g.:
  // { name: 'Game Name', file: 'https://pub-045046eb23854c6e897afff1193bf9bf.r2.dev/rom/n64/filename.z64', cover: '/public/assets/icons/cover.webp' },
];

// Expose globally
window.N64_GAMES = N64_GAMES;

let n64Playtimes = {};
let currentN64EmuStartTime = 0;
let currentN64GameName = null;
let currentN64CoverIndex = 0;

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
  if (!document.getElementById('n64-simple-cover-styles')) {
    const style = document.createElement('style');
    style.id = 'n64-simple-cover-styles';
    style.textContent = `
      .n64-menu-wrapper {
        display: flex; flex-direction: column; width: 100%; height: 100%; font-family: 'Inter', sans-serif;
        background: transparent; color: #fff; overflow: hidden; position: relative;
        animation: n64FadeIn 0.3s ease-out;
      }
      @keyframes n64FadeIn {
        from { opacity: 0; transform: scale(1.02); }
        to { opacity: 1; transform: scale(1); }
      }
      
      .n64-covers-row {
        flex: 1; display: flex; align-items: center; justify-content: flex-start;
        padding: 0 50vw;
        overflow-x: hidden; scroll-behavior: smooth; gap: 40px;
      }
      
      .n64-cover-item {
        flex-shrink: 0; width: 220px; height: 320px; border-radius: 8px; cursor: pointer;
        position: relative; transition: all 0.3s cubic-bezier(0.2, 1, 0.3, 1);
        filter: brightness(0.5) grayscale(0.8);
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      }
      
      .n64-cover-item.active {
        filter: brightness(1) grayscale(0);
        transform: scale(1.15) translateY(-10px);
        box-shadow: 0 0 40px rgba(90,180,255,0.6), 0 20px 40px rgba(0,0,0,0.8);
        z-index: 10;
        border: 2px solid rgba(255,255,255,0.8);
      }
      
      .n64-cover-img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block; }
      
      .n64-fallback {
        width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #3a2b71, #1a1a2e); border-radius: 6px; text-align: center; padding: 15px;
      }
      
      .n64-info-panel {
        height: 160px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; 
        padding-bottom: 30px; gap: 12px; z-index: 1000;
        background: linear-gradient(to top, rgba(0,0,0,0.95), transparent); border-top: 1px solid rgba(255,255,255,0.1);
      }
      
      .n64-title { font-size: 34px; font-weight: 900; color: white; text-shadow: 0 4px 15px rgba(0,0,0,1); margin: 0; }
      .n64-playtime { font-size: 15px; color: #7ec4ff; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; }
      
      .n64-controls { display: flex; gap: 25px; margin-top: 15px; position: relative; z-index: 1001; }
      .n64-btn {
        display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3);
        border-radius: 40px; padding: 10px 25px; font-size: 16px; color: #fff; font-weight: 800; cursor: pointer; transition: all 0.2s;
      }
      .n64-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.05); border-color: #fff; }
      .n64-btn.primary { 
        background: #0096ff; color: #fff; border: none; 
        box-shadow: 0 0 20px rgba(0, 150, 255, 0.4);
        width: 240px; justify-content: center;
      }
      .n64-btn.primary:hover { background: #3ab1ff; transform: scale(1.1); box-shadow: 0 0 30px rgba(0, 150, 255, 0.7); }
      .n64-btn b { background: #fff; color: #000; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 13px; }

      .n64-arrow {
        position: absolute; top: calc(50% - 80px); transform: translateY(-50%); z-index: 1000; width: 80px; height: 120px;
        border-radius: 18px; border: 2px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.7);
        color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; box-shadow: 0 10px 40px rgba(0,0,0,0.6); outline: none;
      }
      .n64-arrow:hover { background: rgba(0,0,0,0.9); transform: translateY(-50%) scale(1.1); border-color: #7ec4ff; }
      .n64-arrow:active { transform: translateY(-50%) scale(0.95); }
      
      #n64-btn-prev { left: 40px; }
      #n64-btn-next { right: 40px; }
      .n64-arrow svg { width: 45px; height: 45px; opacity: 1; stroke: #7ec4ff; }
      .n64-arrow:hover svg { stroke: #fff; }
    `;
    document.head.appendChild(style);
  }

  // Enforce limits
  if (currentN64CoverIndex < 0) currentN64CoverIndex = 0;
  if (currentN64CoverIndex >= N64_GAMES.length) currentN64CoverIndex = N64_GAMES.length - 1;

  let coversHtml = '';
  N64_GAMES.forEach((game, index) => {
    const isFallback = !game.cover;
    const content = isFallback
      ? `<div class="n64-fallback">
           <span style="font-size: 40px;">🎮</span>
           <span style="font-size: 12px; opacity: 0.7; margin-top: 5px;">N64</span>
           <span style="font-weight: bold; margin-top: 10px; font-size: 16px;">${game.name}</span>
         </div>`
      : `<img src="${game.cover}" class="n64-cover-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
         <div class="n64-fallback" style="display:none;">
           <span style="font-size: 40px;">🎮</span>
           <span style="font-weight: bold; margin-top: 10px; font-size: 16px;">${game.name}</span>
         </div>`;

    coversHtml += `
      <div class="n64-cover-item" id="n64-item-${index}" data-index="${index}">
        ${content}
      </div>
    `;
  });

  const html = `
    <div class="n64-menu-wrapper" tabindex="-1">
      <button id="n64-btn-prev" class="n64-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button id="n64-btn-next" class="n64-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="n64-covers-row" id="n64-scroll-row">
        ${coversHtml}
      </div>
      <div class="n64-info-panel">
        <h2 class="n64-title" id="n64-ui-title">Aucun jeu</h2>
        <div class="n64-playtime" id="n64-ui-playtime">Ajoutez des ROMs N64 pour commencer</div>
        <div class="n64-controls">
           <button class="n64-btn primary" id="n64-launch-btn"><b>A</b> JOUER</button>
           <button class="n64-btn" id="n64-quit-btn"><b>B</b> QUITTER</button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  
  const wrapper = container.querySelector('.n64-menu-wrapper');
  wrapper.focus();

  if (N64_GAMES.length > 0) {
    updateN64Carousel(container);

    const items = container.querySelectorAll('.n64-cover-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-index'), 10);
        if (currentN64CoverIndex === index) {
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          launchN64Emulator(container, N64_GAMES[currentN64CoverIndex]);
        } else {
          currentN64CoverIndex = index;
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          updateN64Carousel(container);
        }
      });
    });

    container.querySelector('#n64-launch-btn').addEventListener('click', () => {
      if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      launchN64Emulator(container, N64_GAMES[currentN64CoverIndex]);
    });

    container.querySelector('#n64-btn-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentN64CoverIndex > 0) {
        currentN64CoverIndex--;
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        updateN64Carousel(container);
      }
    });

    container.querySelector('#n64-btn-next').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentN64CoverIndex < N64_GAMES.length - 1) {
        currentN64CoverIndex++;
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        updateN64Carousel(container);
      }
    });

    // Scoped Key Handler
    const keyHandler = (e) => {
      const menuWrapper = document.querySelector('.n64-menu-wrapper');
      if (!menuWrapper) {
        window.removeEventListener('keydown', keyHandler, true);
        return;
      }
      const emuActive = document.querySelector('iframe[src*="n64_player.html"]');
      if (emuActive) return;

      const keys = ['ArrowRight', 'ArrowLeft', 'Enter', 'b', 'Escape'];
      if (keys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.key === 'ArrowRight') {
          if (currentN64CoverIndex < N64_GAMES.length - 1) {
            currentN64CoverIndex++;
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            updateN64Carousel(container);
          }
        }
        else if (e.key === 'ArrowLeft') {
          if (currentN64CoverIndex > 0) {
            currentN64CoverIndex--;
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            updateN64Carousel(container);
          }
        }
        else if (e.key === 'Enter') {
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          launchN64Emulator(container, N64_GAMES[currentN64CoverIndex]);
        }
        else if (e.key === 'b' || e.key === 'Escape') {
          container.querySelector('#n64-quit-btn').click();
        }
      }
    };

    if (window._n64KeyHandler) window.removeEventListener('keydown', window._n64KeyHandler, true);
    window._n64KeyHandler = keyHandler;
    window.addEventListener('keydown', keyHandler, true);
  }

  container.querySelector('#n64-quit-btn').addEventListener('click', () => {
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    if (window._n64KeyHandler) {
      window.removeEventListener('keydown', window._n64KeyHandler, true);
      window._n64KeyHandler = null;
    }
    if (window.AppRegistry['n64'] && window.AppRegistry['n64'].close) {
      window.AppRegistry['n64'].close();
    }
  });
}

function updateN64Carousel(container) {
  const row = container.querySelector('#n64-scroll-row');
  const items = container.querySelectorAll('.n64-cover-item');
  const titleEl = container.querySelector('#n64-ui-title');
  const playtimeEl = container.querySelector('#n64-ui-playtime');

  if (!row || !items.length) return;

  const game = N64_GAMES[currentN64CoverIndex];
  if (titleEl) titleEl.textContent = game.name;
  if (playtimeEl) {
    const mins = n64Playtimes[game.name] || 0;
    if (mins === 0) {
      playtimeEl.textContent = `Temps de jeu : Vierge`;
    } else {
      const h = Math.floor(mins / 60);
      const m = Math.floor(mins % 60);
      playtimeEl.textContent = `Temps de jeu : ${h > 0 ? h + 'h ' : ''}${m}m`;
    }
  }

  items.forEach((item, index) => {
    if (index === currentN64CoverIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const activeItem = items[currentN64CoverIndex];
  if (activeItem) {
    const itemWidth = 220;
    const gap = 40;
    const targetScroll = (currentN64CoverIndex * (itemWidth + gap)) + (itemWidth / 2);
    row.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }
}

function launchN64Emulator(container, game) {
  const romUrl = encodeURIComponent(game.file);
  const gameName = encodeURIComponent(game.name);
  
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
    <div style="display: flex; flex-direction: column; width: 100%; height: 100%; background: #000; overflow: hidden; animation: n64FadeIn 0.3s ease-out;">
      <div style="padding: 12px 20px; background: rgba(30,30,30,0.9); backdrop-filter: blur(10px); display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(255,255,255,0.1); z-index: 100;">
        <div id="n64-back-btn" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 40px; padding: 6px 18px; color: white; cursor: pointer; font-weight: 700; transition: 0.2s;">
           <span style="background: white; color: black; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px; font-size: 13px;">B</span> Quitter
        </div>
        <h3 style="margin: 0; color: white; font-size: 20px; font-weight: 400; letter-spacing: 1px;">${game.name}</h3>
        <div style="width: 100px;"></div>
      </div>
      <div style="flex: 1; position: relative; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #222, #000);">
        <iframe src="/apps/n64/n64_player.html#rom=${romUrl}&name=${gameName}&core=mupen64plus_next" style="border: none; width: 100%; height: 100%; max-width: 1280px;" allow="autoplay; fullscreen"></iframe>
      </div>
    </div>
  `;

  const backBtn = container.querySelector('#n64-back-btn');
  backBtn.addEventListener('mouseover', () => backBtn.style.background = 'rgba(255,255,255,0.2)');
  backBtn.addEventListener('mouseout', () => backBtn.style.background = 'rgba(255,255,255,0.1)');
  backBtn.addEventListener('click', () => {
    if (!window.confirm("Voulez-vous vraiment quitter ce jeu ?\\n\\n⚠️ Assurez-vous d'avoir sauvegardé via le menu de l'émulateur (Save State) ou vous perdrez votre progression récente !")) {
       return;
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

  // Focus the iframe automatically so keyboard works immediately
  const emuIframe = container.querySelector('iframe');
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
