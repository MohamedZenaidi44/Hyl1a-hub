/**
 * Theme Manager
 * Handles switching between the two monochrome visual themes.
 * Themes: White, Black
 */

const ThemeManager = {
  themes: {
    white: {
      name: 'White',
      emoji: '☀️',
      bgGradient: 'linear-gradient(135deg, #f7f7f7 0%, #ececec 50%, #dedede 100%)',
      videoSrc: 'public/assets/icons/video/3dsW.mp4',
      previewVideo: 'public/assets/icons/video/3dsW.mp4',
      accentColor: '#101010',
      textColor: '#111111',
      audioBarsColor: '#0aa8ff',
      appGridBg: 'linear-gradient(160deg, rgba(255, 255, 255, 0.68) 0%, rgba(232, 240, 248, 0.50) 100%)',
      appGridBorder: 'rgba(255, 255, 255, 0.45)',
      pillBg: 'linear-gradient(to bottom, rgba(255,255,255,0.96), rgba(238,238,238,0.92))',
      hudTintTop: 'rgba(255, 255, 255, 0.78)',
      hudTintBottom: 'rgba(255, 255, 255, 0.28)',
      hudTintBase: 'rgba(255, 255, 255, 0.40)',
      hudTintCompanion: 'rgba(255, 255, 255, 0.48)',
      hudTintCompanionHover: 'rgba(255, 255, 255, 0.62)'
    },
    black: {
      name: 'Black',
      emoji: '🌙',
      bgGradient: 'linear-gradient(135deg, #050505 0%, #101010 50%, #1b1b1b 100%)',
      videoSrc: 'public/assets/icons/video/3dsB.mp4',
      previewVideo: 'public/assets/icons/video/3dsB.mp4',
      accentColor: '#f5f5f5',
      textColor: '#f5f5f5',
      audioBarsColor: '#f5f5f5',
      appGridBg: 'linear-gradient(160deg, rgba(30, 30, 30, 0.92) 0%, rgba(12, 12, 12, 0.96) 100%)',
      appGridBorder: 'rgba(255, 255, 255, 0.10)',
      pillBg: 'linear-gradient(to bottom, rgba(28,28,28,0.96), rgba(10,10,10,0.92))',
      hudTintTop: 'rgba(16, 16, 16, 0.86)',
      hudTintBottom: 'rgba(8, 8, 8, 0.70)',
      hudTintBase: 'rgba(12, 12, 12, 0.78)',
      hudTintCompanion: 'rgba(18, 18, 18, 0.82)',
      hudTintCompanionHover: 'rgba(30, 30, 30, 0.92)'
    }
  },

  currentTheme: 'white',

  async init() {
    // Load saved theme
    const user = window.Auth ? window.Auth.getCurrentUser() : null;
    const fbUser = window.Auth ? window.Auth.currentUser : null;
    
    if (fbUser) {
      try {
        const docRef = window.Firestore.doc(window.FirebaseDB, "settings", fbUser.uid);
        const docSnap = await window.Firestore.getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.theme_id && this.themes[data.theme_id]) {
            this.apply(data.theme_id, false); // false = don't save back
            return;
          }
        }
      } catch (e) {
        console.error("Failed to fetch theme from DB", e);
      }
    }
    
    // Fallback
    const saved = localStorage.getItem('nostalgia-theme');
    if (saved && this.themes[saved]) {
      this.apply(saved, false);
    } else {
      this.apply('white', false);
    }
  },

  async apply(themeId, saveToDb = true) {
    const theme = this.themes[themeId];
    if (!theme) return;

    this.currentTheme = themeId;
    localStorage.setItem('nostalgia-theme', themeId); // Keep as local fallback

    if (saveToDb) {
      const fbUser = window.Auth ? window.Auth.currentUser : null;
      if (fbUser) {
        try {
          await window.Firestore.setDoc(window.Firestore.doc(window.FirebaseDB, "settings", fbUser.uid), {
            theme_id: themeId
          }, { merge: true });
        } catch (e) {
          console.error("Failed to save theme to DB", e);
        }
      }
    }

    // Background video + monochrome theme variables
    const bgVideo = document.getElementById('bg-video');
    if (bgVideo) {
      if (theme.videoSrc) {
        if (!bgVideo.src.endsWith(theme.videoSrc)) {
          bgVideo.src = theme.videoSrc;
        }
        bgVideo.style.opacity = '1';
        bgVideo.play().catch(e => console.log('Video play error (needs interaction):', e));
        document.body.style.background = 'transparent'; // Let video show through
      } else {
        bgVideo.style.opacity = '0';
        setTimeout(() => { if (!bgVideo.style.opacity || bgVideo.style.opacity === '0') bgVideo.pause(); }, 500);
        document.body.style.background = theme.bgGradient; // Use fallback gradient
      }
    } else {
        document.body.style.background = theme.bgGradient;
    }

    const root = document.documentElement.style;
    root.setProperty('--theme-accent', theme.accentColor);
    root.setProperty('--audio-bars-color', theme.audioBarsColor);
    root.setProperty('--app-grid-bg', theme.appGridBg);
    root.setProperty('--app-grid-border', theme.appGridBorder);
    root.setProperty('--theme-pill-bg', theme.pillBg);
    root.setProperty('--hud-tint-top', theme.hudTintTop);
    root.setProperty('--hud-tint-bottom', theme.hudTintBottom);
    root.setProperty('--hud-tint-base', theme.hudTintBase);
    root.setProperty('--hud-tint-companion', theme.hudTintCompanion);
    root.setProperty('--hud-tint-companion-hover', theme.hudTintCompanionHover);

    // Update the title pill styling
    const pill = document.getElementById('dynamic-title-pill');
    if (pill) {
      pill.style.background = theme.pillBg;
      pill.style.color = theme.textColor;
    }

    // Mark active theme in selector if open
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.theme === themeId);
    });
  },

  openSelector() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'theme-overlay';
    overlay.innerHTML = `
      <div class="theme-modal glossy-glass">
        <h2>🎨 Choose a Theme</h2>
        <div class="theme-grid">
          ${Object.entries(this.themes).map(([id, t]) => `
            <div class="theme-option ${this.currentTheme === id ? 'active' : ''}" data-theme="${id}">
              <div class="theme-preview" style="background: ${t.bgGradient};">
                ${t.previewVideo ? `
                  <video class="theme-preview-video" src="${t.previewVideo}" muted loop autoplay playsinline preload="metadata"></video>
                ` : `<span class="theme-emoji">${t.emoji}</span>`}
              </div>
              <div class="theme-name">${t.name}</div>
            </div>
          `).join('')}
        </div>
        <button class="theme-close-btn">✕ Close</button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('visible'));

    // Event listeners
    overlay.querySelectorAll('.theme-option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (typeof AudioManager !== 'undefined') AudioManager.playPop();
        this.apply(opt.dataset.theme);
      });
    });

    overlay.querySelector('.theme-close-btn').addEventListener('click', () => {
      if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 300);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 300);
      }
    });
  }
};

// Make it global so it can be called elsewhere
window.ThemeManager = ThemeManager;

// Register the theme selector as an app
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
});