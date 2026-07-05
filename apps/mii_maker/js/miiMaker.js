let miiMusic = null;
let mainMusicWasPlaying = false;
let originalVideoSrc = null;

function startMiiMusic() {
  if (miiMusic) return; // Already playing
  miiMusic = new Audio('public/assets/audio/Mii Maker.mp3');
  miiMusic.volume = 0.3;
  miiMusic.loop = true;

  if (typeof AudioManager !== 'undefined') {
    AudioManager.isExternalMusicPlaying = true;
    if (AudioManager.isPlayingMusic) {
      mainMusicWasPlaying = true;
      AudioManager.fadeOut(300).then(() => {
        if (miiMusic) miiMusic.play().catch(() => { });
      });
    } else {
      mainMusicWasPlaying = false;
      miiMusic.play().catch(() => { });
    }
  } else {
    mainMusicWasPlaying = false;
    miiMusic.play().catch(() => { });
  }

  // Set Mii Maker background video
  const bgVideo = document.getElementById('bg-video');
  if (bgVideo) {
    // The <video> tag uses a <source> child, so bgVideo.src may be empty.
    // Read from <source> child or hardcode the known default as fallback.
    if (!originalVideoSrc) {
      const sourceChild = bgVideo.querySelector('source');
      originalVideoSrc = (sourceChild && sourceChild.getAttribute('src'))
        || 'public/assets/icons/video/menuBC.mp4';
    }
    bgVideo.src = 'public/assets/icons/video/miimakerBC.mp4';
    bgVideo.muted = true;
    bgVideo.autoplay = true;
    bgVideo.setAttribute('playsinline', '');
    bgVideo.load();
    bgVideo.style.opacity = '1';
    bgVideo.play().then(() => {
        console.log("Mii Maker video background started successfully.");
    }).catch(e => {
        console.warn('Video play deferred or failed, trying interaction trigger:', e);
        const oncePlay = () => {
            bgVideo.play();
            document.removeEventListener('click', oncePlay);
        };
        document.addEventListener('click', oncePlay);
    });
  }
}

function stopMiiMusic() {
  console.log("Stopping Mii Maker background music and video...");
  if (typeof AudioManager !== 'undefined') {
    AudioManager.isExternalMusicPlaying = false;
  }
  if (miiMusic) {
    miiMusic.pause();
    miiMusic.currentTime = 0;
    miiMusic = null;
  }

  // Restore background video
  const bgVideo = document.getElementById('bg-video');
  if (bgVideo && originalVideoSrc) {
    bgVideo.src = originalVideoSrc;
    bgVideo.load();
    bgVideo.play().catch(() => {});
    originalVideoSrc = null;
  }

  // Restore main music if it was playing before
  if (mainMusicWasPlaying && typeof AudioManager !== 'undefined' && AudioManager.currentMusicAudio) {
    AudioManager.fadeIn(800);
  }
}

// Ensure cleanup is accessible
window.stopMiiMusic = stopMiiMusic;

function playMiiSFX(name) {
  const sfx = new Audio(`/assets/audio/${name}.m4a`);
  sfx.preload = "auto";
  sfx.volume = 0.5;
  sfx.play().catch(err => console.error(`Failed to play SFX: ${name}`, err));
}

// Mii Maker Implementation – Redesigned to match datkat21/mii-creator style

const loadScript = url => new Promise((resolve) => {
  if (document.querySelector(`script[src="${url}"]`)) return resolve();
  const s = document.createElement('script');
  s.src = url;
  s.onload = resolve;
  document.head.appendChild(s);
});

// Preload Mii Maker background video as soon as this module loads,
// so it's already buffered when the user opens Mii Maker (no delay).
(function preloadMiiVideo() {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'video';
  link.href = 'public/assets/icons/video/miimakerBC.mp4';
  document.head.appendChild(link);
})();

export default async function renderMiiMaker(container) {
  // Load heavy dependencies instantly only when Mii Maker is opened
  try {
    const miiModule = await import('./mii.js');
    window.Mii = miiModule.default || miiModule.Mii;
  } catch (e) {
    console.error("Failed to load mii.js module:", e);
  }
  await loadScript('apps/mii_maker/js/avatar.js');

  if (document.querySelector('.mii-fullscreen-container > .mii-topbar')) {
    console.warn("Mii Maker is already open.");
    return;
  }
  if (typeof AudioManager !== 'undefined') AudioManager.isExternalMusicPlaying = true;
  // Clean up any lingering login welcome messages
  const oldWelcome = document.getElementById('login-welcome-msg');
  if (oldWelcome) oldWelcome.remove();

  // Start Music immediately (wait for launch SFX)
  if (typeof AudioManager !== 'undefined' && AudioManager.activeLaunchSFX) {
    const launchSFX = AudioManager.activeLaunchSFX;
    if (!launchSFX.paused && !launchSFX.ended) {
      launchSFX.addEventListener('ended', () => {
        startMiiMusic();
      }, { once: true });
    } else {
      startMiiMusic();
    }
  } else {
    startMiiMusic();
  }

  // Show gender selection first
  renderGenderSelection(container);
}

// --- Asset Colors ---
// --- Asset Colors (Aligned with standard Mii binary IDs) ---
const SKINS = ['#f9c9b1', '#ebb88a', '#d29665', '#986a44', '#714022', '#3d251d'];
const HAIRS = ['#080808', '#301810', '#502818', '#603018', '#805038', '#a07040', '#c09058', '#e8c898'];
const EYES_COLORS = ['#080808', '#202020', '#402010', '#604020', '#3050a0', '#408040'];
const SHIRTS = [
  '#ff3030', // 0: Red
  '#ff8030', // 1: Orange
  '#ffee30', // 2: Yellow
  '#b0ee30', // 3: Lime
  '#30a030', // 4: Green
  '#3050ee', // 5: Blue
  '#30b0ee', // 6: Cyan
  '#ff70a0', // 7: Pink
  '#9030ee', // 8: Purple
  '#704020', // 9: Brown
  '#ffffff', // 10: White
  '#111111'  // 11: Black
];

// --- Category Definitions ---
const CATEGORIES = [
  { id: 'face', icon: 'public/assets/icons/caté/visageI.webp', label: 'Face' },
  { id: 'hair', icon: 'public/assets/icons/caté/cheveuxI.webp', label: 'Hair' },
  { id: 'eyebrows', icon: 'public/assets/icons/caté/brow.webp', label: 'Brows' },
  { id: 'eyes', icon: 'public/assets/icons/caté/oeilI.webp', label: 'Eyes' },
  { id: 'nose', icon: 'public/assets/icons/caté/nezI.webp', label: 'Nose' },
  { id: 'mouth', icon: 'public/assets/icons/caté/boucheI.webp', label: 'Mouth' },
  { id: 'glasses', icon: 'public/assets/icons/caté/accsI.webp', label: 'Glasses' },
  { id: 'body', icon: 'public/assets/icons/caté/gars.webp', label: 'Body' },
  { id: 'profile', icon: '📝', label: 'Profile' },
];

// --- Hair / Eye / Brow / Mouth / Nose style data (ALL valid values) ---
// Helper to generate style arrays from a range
function makeStyles(max) {
  const arr = [];
  for (let i = 0; i <= max; i++) arr.push({ v: i, n: 'Style ' + i });
  return arr;
}
const HAIR_STYLES = makeStyles(131);
const EYE_STYLES = makeStyles(59);
const BROW_STYLES = makeStyles(23);
const MOUTH_STYLES = makeStyles(35);
const NOSE_STYLES = makeStyles(17);
const GLASSES_STYLES = [{ v: 0, n: 'None' }].concat(makeStyles(8).slice(1));
const FACE_STYLES = makeStyles(11);

let miiInstance = null;
let currentGLBModel = null;
let questProgress = {
  face: false, hair: false, eyebrows: false, eyes: false,
  nose: false, mouth: false, body: false, profile: false
};
let isQuestActive = false;

/**
 * Render the gender selection screen
 */
function renderGenderSelection(container) {
  container.innerHTML = `
    <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: transparent; backdrop-filter: blur(20px); color: #005a22; border-radius: 20px; overflow: hidden; position: relative; font-family: 'Outfit', sans-serif;">
      <h2 style="font-size: 32px; margin-bottom: 40px; text-shadow: 0 4px 10px rgba(0,0,0,0.5); animation: fadeInDown 0.8s ease-out;">Choisissez le genre</h2>
      <div style="display: flex; gap: 40px; animation: fadeInUp 0.8s ease-out;">
        <button id="select-male" style="background: #b3dbff; border: 4px solid #7ec4ff; border-radius: 30px; padding: 30px; cursor: pointer; transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28); display: flex; flex-direction: column; align-items: center; gap: 15px;">
          <img src="public/assets/icons/caté/gars.webp" style="width: 120px; height: 120px; object-fit: contain; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.3));">
          <span style="font-size: 20px; font-weight: 800; color: #004a99;">Homme</span>
        </button>
        <button id="select-female" style="background: #ffcce0; border: 4px solid #ffb6c1; border-radius: 30px; padding: 30px; cursor: pointer; transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28); display: flex; flex-direction: column; align-items: center; gap: 15px;">
          <img src="public/assets/icons/caté/meuf.webp" style="width: 120px; height: 120px; object-fit: contain; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.3));">
          <span style="font-size: 20px; font-weight: 800; color: #990044;">Femme</span>
        </button>
      </div>
      <style>
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        #select-male:hover { transform: scale(1.1); background: rgba(126, 196, 255, 0.2); box-shadow: 0 0 30px rgba(126, 196, 255, 0.4); }
        #select-female:hover { transform: scale(1.1); background: rgba(255, 126, 179, 0.2); box-shadow: 0 0 30px rgba(255, 126, 179, 0.4); }
      </style>
    </div>
  `;

  container.querySelector('#select-male').addEventListener('click', () => initMiiMaker(container, 0));
  container.querySelector('#select-female').addEventListener('click', () => initMiiMaker(container, 1));
}

async function initMiiMaker(container, gender = 0) {
  if (!window.Mii) {
    setTimeout(() => initMiiMaker(container), 100);
    return;
  }

  // Initialize Quest if forced creation
  const user = window.Auth ? window.Auth.getCurrentUser() : null;
  const hasMii = user ? await window.Auth.hasMii(user) : true;
  isQuestActive = !hasMii;

  if (isQuestActive) {
    Object.keys(questProgress).forEach(k => questProgress[k] = false);
  }

  // Build category buttons HTML
  const catBtns = CATEGORIES.map((c, i) => {
    const isImage = c.icon.includes('.webp');
    const content = isImage ? `<img src="${c.icon}" style="width:38px;height:38px;object-fit:contain;">` : `<span style="font-size:32px;line-height:1;">${c.icon}</span>`;
    return `<button class="mii-cat-btn${i === 0 ? ' active' : ''}" data-cat="${c.id}" title="${c.label}">${content}</button>`;
  }).join('');

  container.innerHTML = `
    <div class="mii-topbar">
      <div class="mii-topbar-title">Mii Maker</div>
      ${catBtns}
      <div class="mii-topbar-controls">
        <button class="mii-music-toggle" id="mii-music-toggle" title="Couper/Activer la musique" style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;border:2px solid #2a2a4a;background:#22223a;color:#7eb8ff;font-size:18px;cursor:pointer;transition:all 0.15s;">🔊</button>
        <button class="mii-close-btn" title="Close">✕</button>
      </div>
    </div>
    <div class="mii-body">
      <div id="mii-quest-log" class="mii-quest-log" style="display: none;">
        <div class="quest-log-header">Journal de Quête</div>
        <div class="quest-log-list" id="quest-list"></div>
      </div>
      <div id="quest-popup-container" style="position: absolute; top: 80px; left: 50%; transform: translateX(-50%); z-index: 2000; pointer-events: none;"></div>
      <div class="mii-canvas-area" id="mii-canvas-container" style="background: transparent;">
        <div id="mii-loading-overlay">Loading Preview...</div>
        <div id="mii-tutorial-bubble" style="display: none; position: absolute; top: 100px; left: 52.5%; transform: translateX(-50%); background: linear-gradient(to bottom, #53ee8fff 0%, #00bd48ff 100%); color: white; padding: 10px 20px; border-radius: 25px; font-weight: 800; font-size: 13px; box-shadow: 0 8px 20px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.4); z-index: 1000; animation: bounce 2s infinite; border: 3px solid white; text-shadow: 0 1px 2px rgba(0,0,0,0.2); pointer-events: none; transition: opacity 0.3s;">
          <div id="mii-tutorial-text">Bienvenue !</div>
          <div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); border-width: 12px 12px 0; border-style: solid; border-color: white transparent transparent transparent;"></div>
          <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); border-width: 9px 9px 0; border-style: solid; border-color: #00bd48ff transparent transparent transparent;"></div>
          <style>
            @keyframes bounce {
              0%, 100% { transform: translate(-50%, 0); }
              50% { transform: translate(-50%, -6px); }
            }
            @keyframes questSuccess {
              0% { transform: translate(-50%, 0) scale(1); background: #53ee8f; }
              50% { transform: translate(-50%, -20px) scale(1.2); background: #fff500; }
              100% { transform: translate(-50%, 0) scale(1); background: #53ee8f; }
            }
            @keyframes questError {
              0%, 100% { transform: translate(-50%, 0); }
              20%, 60% { transform: translate(-60%, 0); background: #ff4757; }
              40%, 80% { transform: translate(-40%, 0); background: #ff4757; }
            }
            @keyframes starPop {
              0% { transform: scale(0); opacity: 0; }
              50% { transform: scale(1.5); opacity: 1; }
              100% { transform: scale(1); opacity: 0; }
            }
            .quest-star {
              position: absolute;
              pointer-events: none;
              font-size: 24px;
              z-index: 1001;
              animation: starPop 0.8s ease-out forwards;
            }
            .mii-save-btn.disabled {
              background: #555 !important;
              opacity: 0.6;
              cursor: not-allowed !important;
              box-shadow: none !important;
              transform: none !important;
            }
            .mii-quest-log {
              width: 220px;
              background: rgba(180, 255, 220, 0.25);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border-right: 1px solid rgba(255, 255, 255, 0.2);
              padding: 20px;
              color: #005a22;
              display: flex;
              flex-direction: column;
              gap: 15px;
              animation: slideInLeft 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
            }
            @keyframes slideInLeft {
              from { opacity: 0; transform: translateX(-50px); }
              to { opacity: 1; transform: translateX(0); }
            }
            .quest-log-header {
              font-weight: 900;
              font-size: 16px;
              text-transform: uppercase;
              letter-spacing: 1px;
              border-bottom: 2px solid rgba(0, 90, 34, 0.2);
              padding-bottom: 10px;
              margin-bottom: 5px;
            }
            .quest-log-item {
              display: flex;
              align-items: center;
              gap: 12px;
              font-size: 15px;
              font-weight: 700;
              padding: 8px 0;
              transition: all 0.3s;
            }
            .quest-check {
              width: 22px;
              height: 22px;
              border: 2px solid rgba(0, 90, 34, 0.3);
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              background: rgba(255, 255, 255, 0.1);
              transition: all 0.3s;
            }
            .quest-log-item.done {
              color: #008a35;
              transform: translateX(5px);
            }
            .quest-log-item.done .quest-check {
              background: #00bd48;
              border-color: #00bd48;
              color: white;
              box-shadow: 0 0 10px rgba(0, 189, 72, 0.4);
            }
            .quest-popup {
              background: rgba(0, 90, 34, 0.85);
              color: white;
              padding: 12px 30px;
              border-radius: 40px;
              font-weight: 800;
              font-size: 18px;
              box-shadow: 0 10px 20px rgba(0,0,0,0.4);
              backdrop-filter: blur(10px);
              border: 2px solid rgba(255,255,255,0.3);
              animation: popupFade 1.5s forwards;
              white-space: nowrap;
              text-align: center;
              min-width: 200px;
            }
            @keyframes popupFade {
              0% { opacity: 0; transform: translateY(-20px) scale(0.8); }
              15% { opacity: 1; transform: translateY(0) scale(1); }
              80% { opacity: 1; transform: translateY(0) scale(1); }
              100% { opacity: 0; transform: translateY(-10px) scale(0.9); }
            }
          </style>
        </div>
      </div>
      <div class="mii-controls-area">
        <div class="mii-subtabs">
          <div class="mii-subtab active" data-sub="type">Type</div>
          <div class="mii-subtab" data-sub="color">Color</div>
          <div class="mii-subtab" data-sub="position">Position</div>
        </div>
        <div class="mii-panel-content" id="mii-panel"></div>
        <button class="mii-save-btn" id="btn-save">Save & Quit</button>
      </div>
    </div>
  `;


  // Mute/unmute toggle
  const musicToggle = container.querySelector('#mii-music-toggle');
  musicToggle.addEventListener('click', () => {
    if (miiMusic) {
      if (miiMusic.paused) {
        miiMusic.play().catch(() => { });
        musicToggle.textContent = '🔊';
      } else {
        miiMusic.pause();
        musicToggle.textContent = '🔇';
      }
    }
  });

  // Close Logic with Forced Creation Check
  const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
  const isForcedCreation = currentUser && window.Auth ? !(await window.Auth.hasMii(currentUser)) : false;

  function closeMiiMaker() {
    stopMiiMusic();
    // Restore theme background
    if (window.ThemeManager) {
      window.ThemeManager.apply(window.ThemeManager.currentTheme, false);
    }
    container.classList.add('closing');
    if (blinkTimeout) clearTimeout(blinkTimeout);
    if (miiSpeechTimeout) clearTimeout(miiSpeechTimeout);

    // Restore main container visibility
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) {
      mainContainer.style.opacity = '1';
      mainContainer.style.transform = 'scale(1)';
    }
    document.body.classList.remove('app-open-active');

    setTimeout(() => { if (container.parentNode) container.parentNode.removeChild(container); }, 300);
  }

  const closeBtn = container.querySelector('.mii-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeMiiMaker);

  // Quest check is handled inside the save button's main async handler below

  // State
  let activeCategory = 'face';
  let activeSubtab = 'type';
  let currentExpression = 'normal';
  let blinkTimeout = null;
  let miiSpeechTimeout = null;

  const MII_MESSAGES = [
    "Regarde mon nouveau look !",
    "Je me sens super bien aujourd'hui !",
    "Tu trouves que cette couleur me va ?",
    "On dirait presque mon jumeau !",
    "J'adore ma nouvelle coiffure !",
    "C'est quoi ce poulet !",
    "Tu as beaucoup de goût !",
    "Waouh, je suis stylé !",
    "Je me demande à quoi je vais ressembler...",
    "Clique sur les catégories pour m'ajuster !"
  ];

  // --- TUTORIAL / QUEST LOGIC ---
  const tutorialBubble = container.querySelector('#mii-tutorial-bubble');

  function triggerStarExplosion() {
    const bubble = container.querySelector('#mii-tutorial-bubble');
    if (!bubble) return;
    for (let i = 0; i < 8; i++) {
      const star = document.createElement('div');
      star.className = 'quest-star';
      star.innerHTML = '⭐';
      star.style.left = (Math.random() * 100) + '%';
      star.style.top = (Math.random() * 100) + '%';
      bubble.appendChild(star);
      setTimeout(() => star.remove(), 800);
    }
  }

  function updateTutorialMessage(catId) {
    const questLog = container.querySelector('#mii-quest-log');
    const questList = container.querySelector('#quest-list');
    const bubble = container.querySelector('#mii-tutorial-bubble');
    const textEl = container.querySelector('#mii-tutorial-text');
    if (!questLog || !questList) return;

    if (!isQuestActive) {
      questLog.style.display = 'none';
      if (bubble) bubble.style.display = 'none';
      return;
    }

    // Mark progression
    if (catId && questProgress.hasOwnProperty(catId) && !questProgress[catId]) {
      questProgress[catId] = true;
      triggerStarExplosion();
      if (bubble) {
        bubble.style.animation = 'questSuccess 0.6s ease-out';
        setTimeout(() => { bubble.style.animation = 'bounce 2s infinite'; }, 600);
      }
    }

    // Render Quest List if empty or needs update
    const categories = [
      { id: 'face', name: 'Visage' },
      { id: 'hair', name: 'Coiffure' },
      { id: 'eyebrows', name: 'Sourcils' },
      { id: 'eyes', name: 'Yeux' },
      { id: 'nose', name: 'Nez' },
      { id: 'mouth', name: 'Bouche' },
      { id: 'body', name: 'Taille & Couleur' },
      { id: 'profile', name: 'Profil & Nom' }
    ];

    questList.innerHTML = categories.map(c => {
      const isDone = questProgress[c.id];
      return `
        <div class="quest-log-item ${isDone ? 'done' : ''}" id="quest-item-${c.id}">
          <div class="quest-check">${isDone ? '✓' : ''}</div>
          <div class="quest-text">${c.name}</div>
        </div>
      `;
    }).join('');

    questLog.style.display = 'flex';

    // Handle bubble and save button
    const completed = Object.values(questProgress).filter(v => v).length;
    const total = Object.keys(questProgress).length;

    if (completed < total) {
      if (textEl) textEl.innerHTML = ` Quête : ${completed}/${total} étapes`;
      container.querySelector('#btn-save').classList.add('disabled');
    } else {
      if (textEl) textEl.innerHTML = ` Quête accomplie !`;
      container.querySelector('#btn-save').classList.remove('disabled');
      if (bubble) bubble.style.background = 'linear-gradient(to bottom, #ffd700, #ffa500)';
    }
  }

  // Intercept category clicks calls
  container.querySelectorAll('.mii-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.getAttribute('data-cat');
      showQuestPopup(getQuestMessage(catId));
      updateTutorialMessage(catId);
    });
  });

  function getQuestMessage(catId) {
    const msgs = {
      face: "Choisis la forme de ton visage !",
      hair: "Choisis ta coupe de cheveux !",
      eyebrows: "Ajuste tes sourcils !",
      eyes: "Choisis ton regard !",
      nose: "Choisis ton nez !",
      mouth: "Choisis ton sourire !",
      glasses: "Besoin de lunettes ?",
      body: "Ajuste ta taille et ta couleur !",
      profile: "Donne un nom à ton Mii !"
    };
    return msgs[catId] || "Personnalise ton Mii !";
  }

  function showQuestPopup(text) {
    if (!isQuestActive) return;
    const containerPopup = container.querySelector('#quest-popup-container');
    if (!containerPopup) return;
    const popup = document.createElement('div');
    popup.className = 'quest-popup';
    popup.textContent = text;
    containerPopup.innerHTML = ''; // Clear previous
    containerPopup.appendChild(popup);
    setTimeout(() => { if (popup.parentNode) popup.remove(); }, 1500);
  }

  // Initial call - mark initial category (Face) as started
  if (isQuestActive) {
    updateTutorialMessage(activeCategory);
    setTimeout(() => showQuestPopup(getQuestMessage(activeCategory)), 500);
  }

  // Start music check
  if (typeof AudioManager !== 'undefined' && AudioManager.activeLaunchSFX) {
    const launchSFX = AudioManager.activeLaunchSFX;
    if (!launchSFX.paused && !launchSFX.ended) {
      launchSFX.addEventListener('ended', () => {
        startMiiMusic();
      }, { once: true });
    } else {
      startMiiMusic();
    }
  } else {
    startMiiMusic();
  }

  // --- Profile Data & Mii Loader ---
  const currentProfile = {
    first_name: "",
    last_name: "",
    username: currentUser || "",
    birthday: "",
    bio: ""
  };

  // Default Mii (if user has none)
  let miiBase64Str = "AwEAAAAAAAAAAAAAgP9wmQAAAAAAAAAAAABNAGkAaQAAAAAAAAAAAAAAAAAAAEBAAAAhAQJoRBgmNEYUgRIXaA0AACkAUkhQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMNn";

  if (currentUser && window.Auth && window.Auth.currentUser) {
    if (isForcedCreation) {
      // New user: no Firestore load needed, keep overlay hidden
    } else {
      // Existing user: attempt to load their Mii
      const overlay = container.querySelector('#mii-loading-overlay');
      if (overlay) { overlay.textContent = "Loading your Mii..."; overlay.style.display = 'flex'; }

      try {
        const docRef = window.Firestore.doc(window.FirebaseDB, "avatars", window.Auth.currentUser.uid);
        const docSnap = await window.Firestore.getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.visual_base64) miiBase64Str = data.visual_base64;
          currentProfile.first_name = data.first_name || "";
          currentProfile.last_name = data.last_name || "";
          currentProfile.birthday = data.birthday || "";
          currentProfile.bio = data.bio || "";
        }
      } catch (e) { console.error("Could not load Mii save:", e); }

      // Hide overlay after Firestore load (the fetchMiiRender will hide it again after image loads)
      const overlay2 = container.querySelector('#mii-loading-overlay');
      if (overlay2) { overlay2.textContent = "Loading Preview..."; overlay2.style.display = 'none'; }
    }
  }

  const rawData = atob(miiBase64Str);
  const u8 = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) u8[i] = rawData.charCodeAt(i);
  miiInstance = new window.Mii(u8);
  miiInstance.gender = gender; // Set gender from selection
  miiInstance.height = 91; // Base height requested by user (0-127)
  miiInstance.mouthType = 19; // Default smile style requested by user

  // Female-specific defaults
  if (gender === 1) {
    miiInstance.hairType = 12;
    miiInstance.eyebrowType = 0;
    miiInstance.eyeType = 4;
  }

  // Category switching
  const catButtons = container.querySelectorAll('.mii-cat-btn');
  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      if (isQuestActive) updateTutorialMessage(activeCategory);
      activeSubtab = 'type';
      container.querySelectorAll('.mii-subtab').forEach(s => s.classList.remove('active'));
      container.querySelector('.mii-subtab[data-sub="type"]').classList.add('active');
      renderPanel();
    });
  });

  // Sub-tab switching
  const subtabs = container.querySelectorAll('.mii-subtab');
  subtabs.forEach(subtab => {
    subtab.addEventListener('click', () => {
      subtabs.forEach(s => s.classList.remove('active'));
      subtab.classList.add('active');
      activeSubtab = subtab.getAttribute('data-sub');
      renderPanel();
      updateTutorialMessage();
    });
  });

  const panel = container.querySelector('#mii-panel');

  // --- RENDER PANEL ---
  function renderPanel() {
    panel.innerHTML = '';
    updateTutorialMessage();

    if (activeCategory === 'profile') {
      renderProfilePanel();
      return;
    }

    if (activeSubtab === 'type') renderTypePanel();
    else if (activeSubtab === 'color') renderColorPanel();
    else if (activeSubtab === 'position') renderPositionPanel();
  }

  function renderTypePanel() {
    let items = [];
    let stateKey = '';
    switch (activeCategory) {
      case 'face': items = FACE_STYLES; stateKey = 'faceType'; break;
      case 'hair': items = HAIR_STYLES; stateKey = 'hairType'; break;
      case 'eyebrows': items = BROW_STYLES; stateKey = 'eyebrowType'; break;
      case 'eyes': items = EYE_STYLES; stateKey = 'eyeType'; break;
      case 'nose': items = NOSE_STYLES; stateKey = 'noseType'; break;
      case 'mouth': items = MOUTH_STYLES; stateKey = 'mouthType'; break;
      case 'glasses': items = GLASSES_STYLES; stateKey = 'glassesType'; break;
      case 'body': renderBodyPanel(); return;
    }

    const label = document.createElement('div');
    label.className = 'mii-section-label';
    label.textContent = activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1) + ' Style';
    panel.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'mii-style-grid';
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'mii-style-btn' + (miiInstance[stateKey] === item.v ? ' active' : '');
      btn.style.cssText = 'padding:6px;display:flex;align-items:center;justify-content:center;min-height:90px;min-width:90px;';;
      btn.title = item.n;

      const tempMii = Object.assign(Object.create(Object.getPrototypeOf(miiInstance)), miiInstance);
      tempMii[stateKey] = item.v;
      try {
        const enc = tempMii.encode();
        let b64 = btoa(String.fromCharCode(...new Uint8Array(enc.slice(0, 96))));
        const thumbUrl = `https://mii-unsecure.ariankordi.net/miis/image.png?data=${encodeURIComponent(b64)}&verifyCharInfo=0&type=face&width=128&shaderType=wiiu`;
        const img = document.createElement('img');
        img.src = thumbUrl;
        img.alt = item.n;
        img.style.cssText = 'width:72px;height:72px;object-fit:contain;border-radius:4px;';
        img.loading = 'lazy';
        btn.appendChild(img);
      } catch (e) {
        btn.textContent = item.n;
      }

      btn.addEventListener('click', () => {
        grid.querySelectorAll('.mii-style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        miiInstance[stateKey] = item.v;
        playMiiSFX('Selectwav');
        fetch3DModel();
      });
      grid.appendChild(btn);
    });
    panel.appendChild(grid);
  }

  function renderColorPanel() {
    let colors = []; let stateKey = '';
    switch (activeCategory) {
      case 'face': colors = SKINS; stateKey = 'skinColor'; break;
      case 'hair': colors = HAIRS; stateKey = 'hairColor'; break;
      case 'eyebrows': colors = HAIRS; stateKey = 'eyebrowColor'; break;
      case 'eyes': colors = EYES_COLORS; stateKey = 'eyeColor'; break;
      case 'mouth': colors = ['#de7e58', '#cc5544', '#e87070', '#d45e7e', '#c94040']; stateKey = 'mouthColor'; break;
      case 'body': colors = SHIRTS; stateKey = 'favoriteColor'; break;
      case 'glasses': colors = ['#4b4b4b', '#7d4b2d', '#cc3232', '#3246cc', '#cc8c32', '#ffffff']; stateKey = 'glassesColor'; break;
      default:
        panel.innerHTML = '<div class="mii-section-label" style="color:#666;">No colors for this category.</div>';
        return;
    }

    const label = document.createElement('div');
    label.className = 'mii-section-label';
    label.textContent = activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1) + ' Color';
    panel.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'mii-color-grid';
    colors.forEach((c, idx) => {
      const swatch = document.createElement('div');
      swatch.className = 'mii-color-swatch' + (miiInstance[stateKey] === idx ? ' active' : '');
      swatch.style.backgroundColor = c;
      swatch.addEventListener('click', () => {
        playMiiSFX('Color');
        grid.querySelectorAll('.mii-color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        miiInstance[stateKey] = idx;
        fetch3DModel();
      });
      grid.appendChild(swatch);
    });
    panel.appendChild(grid);
  }

  function renderPositionPanel() {
    const sliders = [];
    switch (activeCategory) {
      case 'eyes':
        sliders.push({ label: 'Vertical', key: 'eyeVertical', min: 0, max: 18 });
        sliders.push({ label: 'Size', key: 'eyeScale', min: 0, max: 7 });
        sliders.push({ label: 'Stretch', key: 'eyeStretch', min: 0, max: 6 });
        sliders.push({ label: 'Spacing', key: 'eyeSpacing', min: 0, max: 12 });
        sliders.push({ label: 'Rotation', key: 'eyeRotation', min: 0, max: 7 });
        break;
      case 'eyebrows':
        sliders.push({ label: 'Vertical', key: 'eyebrowVertical', min: 0, max: 18 });
        sliders.push({ label: 'Size', key: 'eyebrowScale', min: 0, max: 8 });
        sliders.push({ label: 'Stretch', key: 'eyebrowStretch', min: 0, max: 6 });
        sliders.push({ label: 'Spacing', key: 'eyebrowSpacing', min: 0, max: 12 });
        sliders.push({ label: 'Rotation', key: 'eyebrowRotation', min: 0, max: 11 });
        break;
      case 'nose':
        sliders.push({ label: 'Vertical', key: 'noseVertical', min: 0, max: 18 });
        sliders.push({ label: 'Size', key: 'noseScale', min: 0, max: 8 });
        break;
      case 'mouth':
        sliders.push({ label: 'Vertical', key: 'mouthVertical', min: 0, max: 18 });
        sliders.push({ label: 'Size', key: 'mouthScale', min: 0, max: 8 });
        sliders.push({ label: 'Stretch', key: 'mouthStretch', min: 0, max: 6 });
        break;
      default:
        panel.innerHTML = '<div class="mii-section-label" style="color:#666;">No position controls for this category.</div>';
        return;
    }
    sliders.forEach(s => {
      const group = document.createElement('div');
      group.className = 'mii-slider-group';
      const val = miiInstance[s.key] || 0;
      group.innerHTML = `
        <div class="mii-slider-label"><span>${s.label}</span><span id="val-${s.key}">${val}</span></div>
        <input type="range" class="mii-slider" min="${s.min}" max="${s.max}" value="${val}" data-key="${s.key}">
      `;
      group.querySelector('input').addEventListener('input', (e) => {
        miiInstance[s.key] = parseInt(e.target.value);
        group.querySelector(`#val-${s.key}`).textContent = e.target.value;
        playMiiSFX('Selectwav');
        fetch3DModel();
      });
      panel.appendChild(group);
    });
  }

  function renderBodyPanel() {
    const label = document.createElement('div');
    label.className = 'mii-section-label';
    label.textContent = 'Body Settings';
    panel.appendChild(label);

    const hg = document.createElement('div'); hg.className = 'mii-slider-group';
    const hv = miiInstance.height || 64;
    hg.innerHTML = `<div class="mii-slider-label"><span>Height</span><span id="val-height">${hv}</span></div>
      <input type="range" class="mii-slider" min="0" max="127" value="${hv}">`;
    hg.querySelector('input').addEventListener('input', e => {
      miiInstance.height = parseInt(e.target.value);
      hg.querySelector('#val-height').textContent = e.target.value;
      playMiiSFX('Selectwav');
      fetch3DModel();
    });
    panel.appendChild(hg);

    const bg = document.createElement('div'); bg.className = 'mii-slider-group';
    const bv = miiInstance.build || 64;
    bg.innerHTML = `<div class="mii-slider-label"><span>Build</span><span id="val-build">${bv}</span></div>
      <input type="range" class="mii-slider" min="0" max="127" value="${bv}">`;
    bg.querySelector('input').addEventListener('input', e => {
      miiInstance.build = parseInt(e.target.value);
      bg.querySelector('#val-build').textContent = e.target.value;
      playMiiSFX('Selectwav');
      fetch3DModel();
    });
    panel.appendChild(bg);

    const sl = document.createElement('div'); sl.className = 'mii-section-label'; sl.textContent = 'Shirt Color'; sl.style.marginTop = '20px'; panel.appendChild(sl);
    const grid = document.createElement('div'); grid.className = 'mii-color-grid';
    SHIRTS.forEach((c, idx) => {
      const swatch = document.createElement('div');
      swatch.className = 'mii-color-swatch' + (miiInstance.favoriteColor === idx ? ' active' : '');
      swatch.style.backgroundColor = c;
      swatch.addEventListener('click', () => {
        playMiiSFX('Color');
        grid.querySelectorAll('.mii-color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        miiInstance.favoriteColor = idx;
        fetch3DModel();
      });
      grid.appendChild(swatch);
    });
    panel.appendChild(grid);
  }

  // Profile data state is defined at top level now
  function renderProfilePanel() {
    panel.innerHTML = `
      <div class="mii-control-group"><label>First Name</label><input type="text" class="mii-input" id="inp-first" placeholder="e.g. Luigi" value="${currentProfile.first_name}"></div>
      <div class="mii-control-group"><label>Last Name</label><input type="text" class="mii-input" id="inp-last" placeholder="e.g. Mario" value="${currentProfile.last_name}"></div>
      <div class="mii-control-group"><label>Nickname (Account)</label><input type="text" class="mii-input" id="inp-nick" value="${currentProfile.username}" readonly style="background:rgba(255,255,255,0.05); color:#888;"></div>
      <div class="mii-control-group"><label>Birthday</label><input type="date" class="mii-input" id="inp-birth" value="${currentProfile.birthday}"></div>
      <div class="mii-control-group"><label>Short Bio</label><textarea class="mii-textarea" id="inp-bio" placeholder="It's-a me!">${currentProfile.bio}</textarea></div>
    `;

    // Listeners to update state in real-time
    panel.querySelector('#inp-first').addEventListener('input', e => currentProfile.first_name = e.target.value.trim());
    panel.querySelector('#inp-last').addEventListener('input', e => currentProfile.last_name = e.target.value.trim());
    panel.querySelector('#inp-birth').addEventListener('change', e => currentProfile.birthday = e.target.value);
    panel.querySelector('#inp-bio').addEventListener('input', e => currentProfile.bio = e.target.value.trim());
  }

  // Initial render
  renderPanel();

  // Base64 encoder
  function encodeMiiBase64() {
    const enc = miiInstance.encode();
    const limit = Math.min(enc.length, 96);
    let res = "";
    for (let i = 0; i < limit; i++) res += String.fromCharCode(enc[i]);
    return btoa(res);
  }

  // Profile data getter
  const getProfileData = () => ({
    ...currentProfile,
    visual_base64: encodeMiiBase64()
  });

  // Save with Forced Creation Bypass
  const saveBtn = container.querySelector('#btn-save');
  saveBtn.addEventListener('click', async () => {
    // Quest check: block save if quest is active and not all steps done
    if (isQuestActive) {
      const completed = Object.values(questProgress).filter(v => v).length;
      const total = Object.keys(questProgress).length;
      if (completed < total) {
        const bubble = container.querySelector('#mii-tutorial-bubble');
        if (bubble) {
          bubble.style.animation = 'questError 0.5s ease-out';
          setTimeout(() => { bubble.style.animation = 'bounce 2s infinite'; }, 500);
        }
        playMiiSFX('error');
        return;
      }
    }

    playMiiSFX('save');
    const data = getProfileData();
    if (!data.username) { alert("Please enter a Nickname before saving!"); return; }
    if (data.first_name) miiInstance.miiName = data.first_name;

    try {
      saveBtn.textContent = "Saving..."; saveBtn.disabled = true;
      const fbUser = window.Auth ? window.Auth.currentUser : null;

      if (!fbUser) throw new Error("User not authenticated in Firebase");

      // Save complete avatar blob in "avatars" collection using their UID
      const docRef = window.Firestore.doc(window.FirebaseDB, "avatars", fbUser.uid);
      await window.Firestore.setDoc(docRef, data, { merge: true });

      // Sync first_name to the main user profile for quick social list access
      const userRef = window.Firestore.doc(window.FirebaseDB, "users", fbUser.uid);
      await window.Firestore.updateDoc(userRef, { first_name: data.first_name || "" });

      if (typeof AudioManager !== 'undefined') AudioManager.playPop();
      saveBtn.textContent = "Saved!";

      closeMiiMaker();

      // Reload if it was the first time creating a Mii to unlock the site
      if (isForcedCreation) {
        setTimeout(() => {
          if (window.showOnboardingPresentation) {
            window.showOnboardingPresentation(miiInstance.miiName || currentProfile.username || "Joueur", () => {
              window.location.reload();
            });
          } else {
            window.location.reload();
          }
        }, 1000);
      }

    } catch (err) {
      console.error("Mii Save Error:", err);
      alert("Failed to save Mii: " + err.message);
      saveBtn.textContent = "Save & Quit"; saveBtn.disabled = false;
    }
  });

  // --- MII PREVIEW (Full body 2D render from API + arrow rotation) ---
  const canvasArea = container.querySelector('#mii-canvas-container');
  canvasArea.style.position = 'relative';

  // Make the background look like a spotlight or brighter to see the Mii clearly
  canvasArea.style.background = 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 70%)';
  canvasArea.style.borderRadius = '16px';
  canvasArea.style.boxShadow = 'inset 0 0 20px rgba(0,0,0,0.5)';
  // Ensure the container is transparent so the bg-video shows through
  canvasArea.style.backgroundColor = 'transparent';

  // Create the preview image
  const previewImg = document.createElement('img');
  previewImg.id = 'mii-preview-img';
  previewImg.classList.add('mii-anim-breathe');
  previewImg.style.cssText = 'width:105%;height:105%;object-fit:contain;display:block;margin:auto;transition:opacity 0.3s ease-in-out;user-select:none;z-index:2;filter:drop-shadow(0px 15px 20px rgba(0,0,0,0.6));opacity:1;position:relative;';
  previewImg.alt = 'Mii Preview';
  previewImg.draggable = false;
  canvasArea.appendChild(previewImg);

  // Arrow buttons
  const arrowStyle = 'position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);color:#fff;border:none;font-size:28px;width:40px;height:60px;cursor:pointer;border-radius:8px;z-index:5;transition:background 0.2s;display:flex;align-items:center;justify-content:center;';

  const leftBtn = document.createElement('button');
  leftBtn.innerHTML = '◀';
  leftBtn.style.cssText = arrowStyle + 'left:6px;';
  leftBtn.title = 'Tourner à gauche';
  leftBtn.onmouseenter = () => leftBtn.style.background = 'rgba(255,255,255,0.3)';
  leftBtn.onmouseleave = () => leftBtn.style.background = 'rgba(255,255,255,0.15)';
  canvasArea.appendChild(leftBtn);

  const rightBtn = document.createElement('button');
  rightBtn.innerHTML = '▶';
  rightBtn.style.cssText = arrowStyle + 'right:6px;';
  rightBtn.title = 'Tourner à droite';
  rightBtn.onmouseenter = () => rightBtn.style.background = 'rgba(255,255,255,0.3)';
  rightBtn.onmouseleave = () => rightBtn.style.background = 'rgba(255,255,255,0.15)';
  canvasArea.appendChild(rightBtn);

  function triggerStarEffect() {
    const count = 15;
    const colors = ['#fff700', '#ffea00', '#ffd700']; // Only yellow variations

    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.innerHTML = i % 2 === 0 ? '★' : '✨';
      star.style.position = 'absolute';
      star.style.left = '52%';
      star.style.top = '40%'; // Balanced position for face centering
      star.style.transform = 'translate(-50%, -50%)';
      star.style.color = colors[Math.floor(Math.random() * colors.length)];
      star.style.fontSize = (Math.random() * 80 + 50) + 'px'; // Larger stars
      star.style.zIndex = '0'; // Behind the Mii
      star.style.pointerEvents = 'none';
      star.style.textShadow = '0 0 15px rgba(255,255,255,1)';

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 220 + 120; // Drift further
      const driftX = Math.cos(angle) * distance;
      const driftY = Math.sin(angle) * distance;

      star.animate([
        { transform: 'translate(-50%, -50%) scale(0) rotate(0deg)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(2) rotate(180deg)', opacity: 1, offset: 0.2 },
        { transform: `translate(calc(-50% + ${driftX}px), calc(-50% + ${driftY}px)) scale(0) rotate(360deg)`, opacity: 0 }
      ], {
        duration: 800 + Math.random() * 600,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        delay: Math.random() * 100 // Slight staggered burst
      }).onfinish = () => star.remove();

      canvasArea.appendChild(star);
    }
  }

  // Rotation state
  let rotationY = 0;

  leftBtn.addEventListener('click', () => {
    playMiiSFX('Gauche');
    rotationY -= 30;
    fetchMiiRender();
  });
  rightBtn.addEventListener('click', () => {
    playMiiSFX('Droite');
    rotationY += 30;
    fetchMiiRender();
  });

  function fetchMiiRender(skipStars = false) {
    const b64 = encodeMiiBase64();
    const angle = ((rotationY % 360) + 360) % 360;
    const url = `https://mii-unsecure.ariankordi.net/miis/image.png?data=${encodeURIComponent(b64)}&verifyCharInfo=0&type=all_body&width=720&clothesColor=default&shaderType=wiiu&characterYRotate=${Math.round(angle)}&expression=${currentExpression}`;

    // Show loading overlay only if no image has been shown yet
    const overlay = container.querySelector('#mii-loading-overlay');
    if (overlay && !previewImg.src) {
      overlay.style.display = 'flex';
    }

    // Create a background image to load the new render
    const newImg = new Image();
    newImg.onload = () => {
      // Swap immediately when loaded
      previewImg.src = newImg.src;
      // Hide loading overlay
      if (overlay) overlay.style.display = 'none';

      // Fade back in quickly for a smooth transition if we were fading
      previewImg.style.opacity = '1';
      if (!skipStars) triggerStarEffect();
    };
    newImg.onerror = () => {
      console.error('Failed to load Mii preview render');
      // Hide overlay even on error so the UI isn't stuck
      if (overlay) overlay.style.display = 'none';
    };

    newImg.src = url;
  }

  // Alias for compatibility with existing code that calls fetch3DModel
  function fetch3DModel() {
    // Just trigger the render update
    fetchMiiRender();
  }

  function scheduleBlink() {
    if (blinkTimeout) clearTimeout(blinkTimeout);

    // Random interval between 2.5 and 6 seconds
    const interval = Math.random() * 3500 + 2500;

    blinkTimeout = setTimeout(() => {
      // Don't blink if we are currently updating the model from selection
      // (This is a bit hard to track perfectly, but usually fine)
      currentExpression = 'blink';
      fetchMiiRender(true);

      // Eye closed duration (faster)
      setTimeout(() => {
        currentExpression = 'normal';
        fetchMiiRender(true);
        scheduleBlink();
      }, 70);
    }, interval);
  }

  function triggerMiiSpeech() {
    let bubble = container.querySelector('#mii-speech-bubble');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.id = 'mii-speech-bubble';
      bubble.style.cssText = `
        position: absolute;
        top: 45%;
        left: 20%;
        background: white;
        color: #333;
        padding: 20px 30px;
        border-radius: 60px;
        font-weight: 800;
        font-size: 15px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
        z-index: 1000;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        pointer-events: none;
        border: 4px solid #4ffe6cff;
        transform: scale(0.8) rotate(-5deg);
        max-width: 280px;
        text-align: center;
        line-height: 1.4;
      `;
      container.querySelector('#mii-canvas-container').appendChild(bubble);
    }

    const msg = MII_MESSAGES[Math.floor(Math.random() * MII_MESSAGES.length)];
    bubble.innerHTML = `${msg}
      <!-- Tail pointing to Mii -->
      <div style="position: absolute; bottom: 25px; right: -20px; border-width: 12px 0 12px 25px; border-style: solid; border-color: transparent transparent transparent #4ffe6cff; transform: rotate(-10deg); z-index: -1;"></div>
      <div style="position: absolute; bottom: 25px; right: -12px; border-width: 9px 0 9px 18px; border-style: solid; border-color: transparent transparent transparent white; transform: rotate(-10deg); z-index: 1;"></div>`;

    // Reset styles for immediate re-reveal
    bubble.style.transition = 'none';
    bubble.style.opacity = '0';
    bubble.style.transform = 'scale(0.5) translateY(20px)';

    // Force reflow
    bubble.offsetHeight;

    bubble.style.transition = 'all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
    bubble.style.opacity = '1';
    bubble.style.transform = 'scale(1) translateY(0)';

    playMiiSFX('SE_MII_UP');

    setTimeout(() => {
      bubble.style.opacity = '0';
      bubble.style.transform = 'scale(0.8) translateY(10px)';
    }, 4500);
  }

  function scheduleMiiSpeech() {
    if (miiSpeechTimeout) clearTimeout(miiSpeechTimeout);
    const interval = Math.random() * 12000 + 15000; // 15-27 seconds
    miiSpeechTimeout = setTimeout(() => {
      triggerMiiSpeech();
      scheduleMiiSpeech();
    }, interval);
  }

  // Start behaviors
  scheduleBlink();
  scheduleMiiSpeech();

  fetch3DModel();
}
