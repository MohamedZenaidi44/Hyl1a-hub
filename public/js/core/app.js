document.addEventListener('DOMContentLoaded', () => {
  // Les modules ES6 (firebase.js, auth.js) s'exécutent APRÈS les scripts defer.
  // On attend l'event firebase-ready avant d'initAuth pour éviter le crash silencieux.
  // Initialize audio (preload MP3/WAV files from Son/ folder)
  if (typeof AudioManager !== 'undefined') {
    AudioManager.init();
  }

  initEnvironment();
  initAppTriggers();
  // initFocusNavigation();   // Legacy console-style tile focus
  initClockWidget();
  initMusicBar();          // Initialize song controls
  // Attendre que Firebase soit initialisé (module ES6) avant de lancer auth
  if (window.FirebaseAuth) {
    initAuth();
  } else {
    window.addEventListener('firebase-ready', () => initAuth(), { once: true });
  }
  if (typeof initMiiPlaza === 'function') initMiiPlaza(); // Initialize Mii background characters
  initCompanion();        // Initialize virtual companion

  // Auto-play music on first user interaction (browser requires user gesture)
  function autoPlayOnce() {
    if (typeof AudioManager !== 'undefined' && !AudioManager.isPlayingMusic && !AudioManager.isExternalMusicPlaying) {
      AudioManager.playNextMusic();
      // Update visualizer display
      if (window.updateVisualizerDisplay) window.updateVisualizerDisplay();
    }
    document.removeEventListener('click', autoPlayOnce);
    document.removeEventListener('keydown', autoPlayOnce);
  }

  // Try aggressive immediate autoplay (might be blocked by browser policy)
  setTimeout(() => {
    if (typeof AudioManager !== 'undefined' && !AudioManager.isPlayingMusic) {
      try {
        AudioManager.playNextMusic();
        if (window.updateVisualizerDisplay) window.updateVisualizerDisplay();
        document.removeEventListener('click', autoPlayOnce);
        document.removeEventListener('keydown', autoPlayOnce);
      } catch (e) { /* Blocked by browser */ }
    }
  }, 1000);

  // Fallback: start on first interaction if blocked
  document.addEventListener('click', autoPlayOnce);
  document.addEventListener('keydown', autoPlayOnce);
});

/* ============================================================
   FOCUS NAVIGATION SYSTEM
   Console-style spatial navigation with arrow keys & mouse hover.
   ============================================================ */
function initFocusNavigation() {
  const tiles = Array.from(document.querySelectorAll('.grid-tile'));
  const glowEl = document.getElementById('focus-glow');
  const mainContainer = document.getElementById('main-container');

  if (!tiles.length) return;

  // Pastel glow colours keyed to tile index (cycles through hues)
  const glowColors = [
    'rgba(79,172,254,0.55)',   // blue
    'rgba(255,154,86,0.50)',   // orange
    'rgba(106,218,228,0.50)',  // teal
    'rgba(196,113,237,0.50)',  // purple
    'rgba(67,233,123,0.45)',   // green
    'rgba(255,117,140,0.50)',  // pink
    'rgba(163,140,209,0.50)',  // lavender
    'rgba(255,211,100,0.45)',  // yellow
  ];

  // BG accent hues matching glow colours
  const bgAccentHues = [210, 25, 188, 280, 140, 340, 255, 45];

  window.setGlobalHueFromIndex = (index) => {
    const hue = bgAccentHues[index % bgAccentHues.length];
    document.documentElement.style.setProperty('--bg-accent-h', hue);

    // Also update tile glow variables for visualizer/carousel sync
    const glowColorsSolid = ['#4facfe', '#ff9a56', '#6adae4', '#c471ed', '#43e97b', '#ff758c', '#a38cd1', '#ffd364'];
    const glowColorsSoft = [
      'rgba(79,172,254,0.4)', 'rgba(255,154,86,0.4)', 'rgba(106,218,228,0.4)',
      'rgba(196,113,237,0.4)', 'rgba(67,233,123,0.4)', 'rgba(255,117,140,0.4)',
      'rgba(163,140,209,0.4)', 'rgba(255,211,100,0.4)'
    ];
    document.documentElement.style.setProperty('--tile-glow', glowColorsSoft[index % glowColorsSoft.length]);
    document.documentElement.style.setProperty('--tile-glow-solid', glowColorsSolid[index % glowColorsSolid.length]);
  };

  function setFocus(index, source) {
    if (index < 0 || index >= tiles.length) return;

    // Remove old focused state
    tiles[focusedIndex]?.classList.remove('tile-focused');

    focusedIndex = index;
    const tile = tiles[focusedIndex];
    tile.classList.add('tile-focused');

    // Move glow behind the tile
    if (glowEl && mainContainer) {
      const containerRect = mainContainer.getBoundingClientRect();
      const tileRect = tile.getBoundingClientRect();

      const cx = tileRect.left - containerRect.left + tileRect.width / 2;
      const cy = tileRect.top - containerRect.top + tileRect.height / 2;

      const color = glowColors[focusedIndex % glowColors.length];
      glowEl.style.background = `radial-gradient(circle, ${color} 0%, rgba(255,255,255,0) 70%)`;
      // Hardware-accelerated movement to prevent layout thrashing
      glowEl.style.left = '0';
      glowEl.style.top = '0';
      glowEl.style.transform = `translate(${cx - 130}px, ${cy - 130}px)`;
      glowEl.style.opacity = '1';
    }

    // Shift body background accent hue
    const hue = bgAccentHues[focusedIndex % bgAccentHues.length];
    document.documentElement.style.setProperty('--bg-accent-h', hue);

    // Update dynamic title if it exists
    const dynamicTitle = document.getElementById('dynamic-title-pill');
    const title = tile.getAttribute('data-title');
    if (dynamicTitle && title && source === 'keyboard') {
      dynamicTitle.textContent = title;
    }
  }

  /* ── Spatial navigation helpers ── */
  function getCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function findNext(currentIndex, direction) {
    const current = getCenter(tiles[currentIndex]);
    let bestIndex = -1;
    let bestScore = Infinity;

    tiles.forEach((tile, i) => {
      if (i === currentIndex) return;
      const c = getCenter(tile);
      const dx = c.x - current.x;
      const dy = c.y - current.y;

      let primary, cross;
      if (direction === 'right') { primary = dx; cross = Math.abs(dy); }
      if (direction === 'left') { primary = -dx; cross = Math.abs(dy); }
      if (direction === 'down') { primary = dy; cross = Math.abs(dx); }
      if (direction === 'up') { primary = -dy; cross = Math.abs(dx); }

      if (primary <= 0) return;  // Wrong direction

      const score = primary + cross * 1.6;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    });

    return bestIndex;
  }

  /* ── Keyboard handler ── */
  document.addEventListener('keydown', (e) => {
    // BLOCK INTERACTION IF LOGIN OVERLAY IS VISIBLE
    if (document.getElementById('auth-overlay').style.display !== 'none') return;
    if (document.body.classList.contains('app-open-active')) return;
    if (document.querySelector('.mii-fullscreen-container')) return;

    const dirMap = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' };
    const dir = dirMap[e.key];
    if (dir) {
      e.preventDefault();
      const next = findNext(focusedIndex, dir);
      if (next !== -1) setFocus(next, 'keyboard');
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement !== tiles[focusedIndex]) {
      e.preventDefault();
      tiles[focusedIndex]?.click();
    }
  });

  /* ── Mouse hover transfers focus ── */
  tiles.forEach((tile, i) => {
    tile.addEventListener('mouseenter', () => setFocus(i, 'mouse'));
  });

  // Set initial focus
  // setFocus(0, 'init');
}


function initMusicBar() {
  // Legacy music bar logic disabled. Handled by CircularVisualizer.
}

function initClockWidget() {
  const timeEl = document.getElementById('top-time');
  const dateEl = document.getElementById('top-date');
  if (!timeEl || !dateEl) return;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function updateClock() {
    const now = new Date();

    // 24h Format with AM/PM (matching mockup quirk: 14:38 PM)
    const hours24 = now.getHours();
    const hours = hours24.toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    
    // Some implementations just use 12h for AM/PM, but let's stick to the 24h as in mockup if strictly requested, 
    // or standard 12h. I'll use 24h + ampm exactly like mockup shows "14:38 PM"
    timeEl.innerHTML = `${hours}:${minutes} <span class="am-pm">${ampm}</span>`;

    // Date as Weekday, Mon DD
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dayNum = now.getDate();
    dateEl.textContent = `${dayName}, ${monthName} ${dayNum}`;
  }

  updateClock();
  setInterval(updateClock, 1000);
}



function initEnvironment() {
  // initGifGrid(); // Disabled: user request to remove gifs
}

// function initGifGrid() { ... } removed as per user request

function initAppTriggers() {

  // ── Helpers ──────────────────────────────────────────────────────────────
  // WIP placeholder
  const _wip = (c) => {
    c.innerHTML = `<div style="display:flex;height:100%;align-items:center;justify-content:center;
      color:#888;font-size:18px;font-weight:600;text-align:center;padding:20px;">
      Cette application est en cours de création, à suivre…</div>`;
  };

  // Lazy import avec spinner — aucun JS d'émulateur chargé avant que l'utilisateur ouvre l'app
  const _lazy = async (c, path) => {
    c.innerHTML = `<div style="display:flex;height:100%;align-items:center;justify-content:center;
      flex-direction:column;gap:12px;color:#aaa;">
      <div style="width:36px;height:36px;border:3px solid rgba(255,255,255,0.15);
        border-top-color:#7ec4ff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
      Chargement…</div>`;
    try {
      const mod = await import(path);
      if (typeof mod.default === 'function') mod.default(c);
    } catch (e) {
      c.innerHTML = `<div style="padding:20px;color:#f88;">Erreur de chargement :<br>${e.message}</div>`;
      console.error('[AppRegistry] Import failed:', path, e);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  window.AppRegistry = {
    'gallery':    { title: 'Memory Gallery',        render: (c) => _wip(c) },
    'music':      { title: '📻 Radio Station',       render: (c) => _lazy(c, '../apps/music.js') },
    'arcade':     { title: '👾 Hall of Fame Arcade', render: (c) => _lazy(c, '../apps/hallOfFame.js') },
    'guestbook':  { title: '📝 Digital Town Board',  render: (c) => _lazy(c, '../apps/guestbook.js') },
    'notes':      { title: '📓 Personal Notes',      render: (c) => _lazy(c, '../apps/notes.js') },
    'hallOfFame': { title: '👾 Hall of Fame Arcade', render: (c) => _lazy(c, '../apps/hallOfFame.js') },
    'miiMaker':   { title: '👤 Mii Maker',           render: (c) => _lazy(c, '../../../apps/mii_maker/js/miiMaker.js') },
    'miiPlaza':   { title: 'Mii Plaza',              render: (c) => _wip(c) },
    'browser':    { title: 'Internet Browser',       render: (c) => _wip(c) },
    'gba':        { title: '🎮 Émulateur GBA',       render: (c) => _lazy(c, '../../../apps/gba/js/gba.js') },
    'gbaTurbo':   { title: '🚀 GBA Turbo',           render: (c) => _lazy(c, '../apps/gbaTurbo.js') },
    'ds':         { title: '🎮 Émulateur DS',        render: (c) => _lazy(c, '../../../apps/ds/js/ds.js') },
    'nes':        { title: '🎮 Émulateur NES',       render: (c) => _lazy(c, '../../../apps/nes/js/nes.js') },
    'n64':        { title: '🎮 Émulateur N64',       render: (c) => _lazy(c, '../../../apps/n64/js/n64.js') },
    'miiManager': { title: '⚠️ Mii Manager',         render: (c) => _lazy(c, '../apps/miiManager.js') },
    'themes':     { title: 'Thèmes & Couleurs',      render: (c) => _wip(c) },
    'bio': {
      title: '👤 À propos de Hyl1a',
      render: (container) => {
        container.innerHTML = `
        <div class="bio-window">
          <div class="bio-header">
            <img src="public/assets/icons/bobaboy.webp" class="bio-avatar">
            <div class="bio-title-group">
              <h1>Hyl1a</h1>
              <p>Developer • 20 years old</p>
            </div>
          </div>
          <div class="bio-content">
            <p>J'ai voulu créer un projet similaire à <strong>IISU</strong> mais sur navigateur pour pouvoir jouer directement sur le web avec une gestion fluide de sauvegarde et de compte.</p>
            <div class="bio-socials">
              <div class="social-item"><i class="fas fa-envelope"></i> mohznpro@gmail.com</div>
              <div class="social-item"><i class="fab fa-discord"></i> hyl1a_</div>
              <a href="https://discord.gg/ww4A6BAz" target="_blank" class="social-btn discord-server">Join my Discord</a>
            </div>
            <div class="bio-projects">
              <h3>Mes autres projets</h3>
              <a href="https://hyl1a.github.io/Hyl1a-web/" target="_blank" class="project-card">
                <div class="project-info">
                  <strong>Hyl1a Web</strong>
                  <span>Frutiger Aero aesthetic website</span>
                </div>
                <i class="fas fa-external-link-alt"></i>
              </a>
            </div>
          </div>
        </div>`;
      }
    }
  };

  const dynamicTitle = document.getElementById('dynamic-title-pill');

  const allTiles = document.querySelectorAll('.grid-tile');
  allTiles.forEach(tile => {
    tile.addEventListener('mouseenter', () => {
      if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      const title = tile.getAttribute('data-title');
      if (title && dynamicTitle) {
        dynamicTitle.textContent = title;
      }
    });
    tile.addEventListener('mouseleave', () => {
      if (dynamicTitle) {
        dynamicTitle.textContent = 'Hylia Plaza';
      }
    });
  });

  const triggers = document.querySelectorAll('.app-trigger');
  triggers.forEach(trigger => {
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      }
    });
  });
}

window.showSplashScreen = function (callback) {
  const splash = document.getElementById('app-splash-screen');
  if (!splash) {
    if (callback) callback();
    return;
  }

  splash.classList.remove('splash-exit');
  splash.classList.add('splash-visible');

  // Wait for the pop-in + hover time (Reduced to 800ms for faster feel)
  setTimeout(() => {
    splash.classList.add('splash-exit');

    // Wait for pop-out animation
    setTimeout(() => {
      splash.classList.remove('splash-visible', 'splash-exit');
      if (callback) callback();
    }, 300); // Slightly faster pop-out
  }, 800);
};

window.handleAppLaunch = function (trigger) {
  if (document.getElementById('auth-overlay').style.display !== 'none') return;

  const appId = trigger.getAttribute('data-app');
  const appData = window.AppRegistry[appId];


  if (appData) {
    // AUDIO TRIGGER: Play sound as soon as splash appears
    if (typeof AudioManager !== 'undefined') {
      if (appId === 'miiMaker') {
        AudioManager.playAppLaunchTransition('miiLaunch');
      } else if (appId === 'gba' || appId === 'ds' || appId === 'nes' || appId === 'n64') {
        AudioManager.playAppLaunchTransition(appId === 'gba' ? 'gbaLaunch' : 'defaultLaunch', 'gbaBgm');
      } else {
        // Fallback: Play default launch sound for other apps
        if (appId !== 'themes') {
          AudioManager.playAppLaunchTransition('defaultLaunch');
        }
      }
    }

    // Show splash screen
    window.showSplashScreen(() => {
      if (appId === 'miiMaker' || appId === 'gba' || appId === 'gbaTurbo' || appId === 'miiManager' || appId === 'ds' || appId === 'nes' || appId === 'n64') {
        const bgVid = document.getElementById('bg-video');
        // Let Mii Maker handle its own video transition to avoid race conditions with pause/play
        if (bgVid && appId !== 'miiMaker' && !bgVid.paused) bgVid.pause();
        // Pause la vidéo companion pour libérer le GPU pendant l'émulateur
        const companion = document.getElementById('companion-avatar');
        if (companion) companion.pause();
        
        const fsContainer = document.createElement('div');
        fsContainer.className = 'mii-fullscreen-container';
        document.body.appendChild(fsContainer);
        document.body.classList.add('app-open-active');

        document.getElementById('main-container').style.opacity = '0';
        document.getElementById('main-container').style.transform = 'scale(0.95)';

        if (appData.render) {
          appData.render(fsContainer);
        }

        // Music logic for Mii Plaza specifically (it doesn't have its own transition sound/music in registry usually)
        if (appId === 'miiPlaza') {
          if (typeof AudioManager !== 'undefined') AudioManager.fadeIn(800);
        }

        appData.close = function () {
          fsContainer.classList.add('anim-window-close');

          if (typeof AudioManager !== 'undefined') {
            AudioManager.restoreHubAudio();
          }
          
          if (appId === 'miiMaker' && typeof window.stopMiiMusic === 'function') {
            window.stopMiiMusic();
          }

          setTimeout(() => {
            if (fsContainer.parentNode) fsContainer.parentNode.removeChild(fsContainer);
            document.body.classList.remove('app-open-active');
            document.getElementById('main-container').style.opacity = '1';
            document.getElementById('main-container').style.transform = 'scale(1)';
            
            // Resume background video seulement si aucun émulateur fenêtré ouvert
            const bgVid = document.getElementById('bg-video');
            const emuApps = ['gba', 'ds', 'nes', 'n64', 'gbaTurbo'];
            const emuStillOpen = emuApps.some(id => !!WindowManager.windows[id]);
            if (bgVid && !emuStillOpen) bgVid.play().catch(() => {});
            // Reprendre companion video
            const companion = document.getElementById('companion-avatar');
            if (companion && !emuStillOpen) companion.play().catch(() => {});
          }, 300);
        };
      } else if (appId === 'themes') {
        if (appData.render) appData.render();
        if (typeof AudioManager !== 'undefined') AudioManager.playPop();
        // Themes overlay doesn't hide background, so keep video playing
        const bgVid = document.getElementById('bg-video');
        if (bgVid) bgVid.play().catch(()=>{});
      } else {
        // Windowed apps: open window and fade hub music back in
        WindowManager.openWindow(appId, appData.title, appData.render || function (container) {
          container.innerHTML = `
            <div class="app-inner">
              <h2>${appData.title}</h2>
              <p>Welcome to ${appData.title}. This application is currently being developed!</p>
            </div>
          `;
        });

        // Pause video si un émulateur est ouvert en fenêtre, sinon reprendre
        const bgVid = document.getElementById('bg-video');
        const emuApps = ['gba', 'ds', 'nes', 'n64', 'gbaTurbo'];
        const emuOpen = emuApps.some(id => !!WindowManager.windows[id]);
        const companion = document.getElementById('companion-avatar');
        if (bgVid) {
          if (emuOpen) {
            bgVid.pause();
            if (companion) companion.pause();
          } else {
            bgVid.play().catch(() => {});
            if (companion) companion.play().catch(() => {});
          }
        }

        // Resume hub music for windowed apps
        if (typeof AudioManager !== 'undefined' && appId !== 'music') {
          AudioManager.fadeIn(800);
        }
      }
    });
  }
};

function initAuth() {
  const overlay = document.getElementById('auth-overlay');
  const loginBtn = document.getElementById('btn-login');
  const registerBtn = document.getElementById('btn-register');
  const logoutBtn = document.getElementById('btn-logout');
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const errorMsg = document.getElementById('auth-error');
  const topUsername = document.getElementById('top-username');

  // Check if logged in via local storage fallback (Firebase auth listener will overwrite this)
  const currentUser = Auth.getCurrentUser();
  if (currentUser) {
    overlay.style.display = 'none';
    if (topUsername) topUsername.textContent = currentUser;
  } else {
    overlay.style.display = 'flex';
    generateAuthBackground();
  }

  // Re-load current user Mii when called manually
  window.loadUserMii = () => {
    if (window.Auth) window.Auth.loadUserMii();
  };

  window.checkForcedMiiCreation = async function () {
    // Anti-duplication guard: don't trigger if a fullscreen app is already open
    if (document.querySelector('.mii-fullscreen-container')) return;

    const user = window.Auth ? window.Auth.getCurrentUser() : null;
    if (user) {
      const hasMii = await window.Auth.hasMii(user);
      if (!hasMii) {
        // Double check after small delay to be sure
        setTimeout(() => {
          if (document.querySelector('.mii-fullscreen-container')) return;
          const miiMakerTile = document.querySelector('.app-trigger[data-app="miiMaker"]');
          if (miiMakerTile) miiMakerTile.click();
        }, 800);
      }
    }
  };

  async function generateAuthBackground() {
    const bgContainer = document.getElementById('auth-bg');
    if (!bgContainer || bgContainer.children.length > 2) return;

    let avatars = [];
    if (window.Firestore && window.FirebaseDB) {
      try {
        const avatarsRef = window.Firestore.collection(window.FirebaseDB, "avatars");
        const qSnap = await window.Firestore.getDocs(avatarsRef);
        qSnap.forEach(doc => {
          const d = doc.data();
          if (d.visual_base64 && d.username) {
            avatars.push({ 
              b64: d.visual_base64, 
              username: d.username,
              bio: d.bio || d.catchphrase || "" 
            });
          }
        });
      } catch (e) {
        console.warn("Could not fetch Miis, falling back to SVGs", e);
      }
    }

    const totalMiisToGenerate = 18;
    const occupiedZones = [];

    // Fallback data if no real Miis
    const faces = [
      '<circle cx="22" cy="22" r="2" fill="#333" /><circle cx="38" cy="22" r="2" fill="#333" /><path d="M25 32 Q30 35 35 32" stroke="#333" stroke-width="2" fill="none" />',
      '<path d="M18 22 Q22 18 26 22" stroke="#333" stroke-width="2" fill="none" /><path d="M34 22 Q38 18 42 22" stroke="#333" stroke-width="2" fill="none" /><path d="M25 30 Q30 36 35 30 Z" fill="#333" />',
      '<circle cx="22" cy="20" r="3" fill="#333" /><circle cx="38" cy="20" r="3" fill="#333" /><circle cx="30" cy="32" r="4" fill="#333" />',
      '<path d="M18 22 L26 22" stroke="#333" stroke-width="2" fill="none" /><path d="M34 22 L42 22" stroke="#333" stroke-width="2" fill="none" /><circle cx="30" cy="32" r="2" fill="#333" />'
    ];

    for (let i = 0; i < totalMiisToGenerate; i++) {
      let left;
      let attempts = 0;
      do {
        left = Math.random() * 100;
        attempts++;
      } while (occupiedZones.some(z => Math.abs(z - left) < 6) && attempts < 15);
      occupiedZones.push(left);

      const miiWrapper = document.createElement('div');
      miiWrapper.className = 'auth-mii';

      const size = 0.8 + Math.random() * 2.2;
      const duration = 15 + Math.random() * 35;
      const delay = Math.random() * -80;

      miiWrapper.style.left = `${left}%`;
      miiWrapper.style.setProperty('--mii-scale', size);
      miiWrapper.style.animationDuration = `${duration}s`;
      miiWrapper.style.animationDelay = `${delay}s`;
      miiWrapper.style.zIndex = Math.floor(Math.random() * 5);

      let miiContentHtml = '';
      const miiIndex = avatars.length > 0 ? (i % avatars.length) : 0;
      let bioText = "";

      if (avatars.length > 0) {
        const realMii = avatars[miiIndex];
        const thumbUrl = `https://mii-unsecure.ariankordi.net/miis/image.png?data=${encodeURIComponent(realMii.b64)}&verifyCharInfo=0&type=face&width=128&shaderType=wiiu`;
        miiContentHtml = `<img src="${thumbUrl}" style="width: 60px; height: 60px; object-fit: cover; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.4)); border-radius: 50%;">`;
        bioText = realMii.bio || realMii.username || "Hylia Plaza User";
      } else {
        const faceIndex = i % faces.length;
        const hue = (i * 137) % 360;
        miiContentHtml = `
          <svg viewBox="0 0 60 90" width="60" height="90" style="filter: drop-shadow(0 5px 10px rgba(0,0,0,0.3));">
            <path d="M15 45 Q30 40 45 45 L40 85 Q30 90 20 85 Z" fill="hsl(${hue}, 70%, 50%)" />
            <path d="M17 46 Q30 41 43 46 L38 84 Q30 88 22 84 Z" fill="hsl(${hue}, 70%, 60%)" />
            <path d="M20 48 Q30 43 40 48 L35 80 Q30 84 25 80 Z" fill="hsl(${hue}, 70%, 75%)" />
            <circle cx="30" cy="25" r="20" fill="#e6c2a5" />
            <circle cx="28" cy="23" r="18" fill="#ffdfc4" />
            <g class="avatar-face">${faces[faceIndex]}</g>
          </svg>`;
        bioText = "Hello!";
      }

      // Add speech bubble
      miiWrapper.innerHTML = `
        <div class="auth-bubble" style="animation: popBubble 8s linear infinite ${Math.random() * 5}s;">${bioText}</div>
        ${miiContentHtml}
      `;
      bgContainer.appendChild(miiWrapper);
    }
  }

  function handleAuthResponse(res) {
    if (res.success) {
      errorMsg.style.display = 'none';
      errorMsg.style.color = '#7eff7e'; // green success
      errorMsg.textContent = res.message;

      // Start music automatically on login successfully
      if (typeof AudioManager !== 'undefined') {
        AudioManager.playNextMusic();
        if (window.updateVisualizerDisplay) window.updateVisualizerDisplay();
      }

      // Short delay for user feedback on successful registration/login
      setTimeout(() => {
        const user = Auth.getCurrentUser();
        if (user) {
          overlay.style.display = 'none';
          if (topUsername) topUsername.textContent = user;
          checkForcedMiiCreation();
        }
      }, 500);
    } else {
      errorMsg.style.color = '#ff6b6b';
      errorMsg.style.display = 'block';
      errorMsg.textContent = res.message;
    }
  }

  // Panel Toggling
  const loginPanel = document.getElementById('login-panel');
  const registerPanel = document.getElementById('register-panel');
  const toRegister = document.getElementById('toggle-to-register');
  const toLogin = document.getElementById('toggle-to-login');

  if (toRegister) {
    toRegister.addEventListener('click', () => {
      loginPanel.style.display = 'none';
      registerPanel.style.display = 'block';
      errorMsg.style.display = 'none';
    });
  }
  if (toLogin) {
    toLogin.addEventListener('click', () => {
      registerPanel.style.display = 'none';
      loginPanel.style.display = 'block';
      errorMsg.style.display = 'none';
    });
  }

  const loginSubmit = document.getElementById('btn-login-submit');
  if (loginSubmit) {
    loginSubmit.addEventListener('click', async () => {
      const u = document.getElementById('auth-login-username').value;
      const p = document.getElementById('auth-login-password').value;
      loginSubmit.disabled = true;
      loginSubmit.textContent = '...';
      const res = await Auth.login(u, p);
      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Se Connecter';
      handleAuthResponse(res);
    });
  }

  const registerSubmit = document.getElementById('btn-register-submit');
  if (registerSubmit) {
    registerSubmit.addEventListener('click', async () => {
      const u = document.getElementById('auth-reg-username').value;
      const p = document.getElementById('auth-reg-password').value;
      registerSubmit.disabled = true;
      registerSubmit.textContent = '...';
      const res = await Auth.register(u, p);
      registerSubmit.disabled = false;
      registerSubmit.textContent = 'Créer mon compte';
      handleAuthResponse(res);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (window.Auth) window.Auth.logout();
    });
  }
} // End of initAuth

function initCompanion() {
  const widget = document.getElementById('companion-widget');
  const bubble = document.getElementById('companion-bubble');
  const glass = document.querySelector('.companion-glass');

  if (!widget || !bubble || !glass) return;

  // Time-aware greeting
  function getTimeGreeting() {
    const h = new Date().getHours();
    if (h < 6) return "Tu devrais dormir... 😴";
    if (h < 12) return "Bonjour ! Belle matinée ☀️";
    if (h < 18) return "Bon après-midi ! 🌤️";
    if (h < 22) return "Bonne soirée ! 🌙";
    return "Il se fait tard... 🌙";
  }

  const phrases = [
    "Poyo !",
    "Tu veux jouer à quoi frro ?",
    "Hylia Plaza est trop cool ! (stp dis le)",
    "Coucou !",
    "C'est une belle journée !",
    "J'adore la musique ici !",
    "Tema, je flotte !",
    "Mii Maker est trop bien",
    "Tu as vu le nouveau thème ?",
    "Essaie l'émulateur GBA ! 🎮",
    "N'oublie pas de créer ton Mii !",
    "Ajoute des amis dans le Social !",
    "La musique est chill ici 🎵",
    "Pokémon Émeraude, c'est le GOAT",
    getTimeGreeting()
  ];

  let clickCount = 0;
  let bubbleTimeout;

  const showBubble = (text) => {
    bubble.textContent = text || phrases[Math.floor(Math.random() * phrases.length)];
    bubble.classList.add('show');

    clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => {
      bubble.classList.remove('show');
    }, 4000);
  };

  glass.addEventListener('click', () => {
    clickCount++;
    
    // Easter egg after 10 rapid clicks
    if (clickCount >= 10) {
      showBubble("Arrête de me cliquer ! 😵");
      clickCount = 0;
    } else {
      showBubble();
    }
    
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playPop();
    }
  });
  
  // Reset click counter after inactivity
  setInterval(() => { if (clickCount > 0) clickCount--; }, 3000);

  // Small random greeting on hub load
  setTimeout(() => showBubble(getTimeGreeting()), 3000);

  // Random interaction every 45-90 seconds
  setInterval(() => {
    if (Math.random() > 0.5 && document.getElementById('auth-overlay').style.display === 'none') {
      showBubble();
    }
  }, 45000 + Math.random() * 45000);
}

