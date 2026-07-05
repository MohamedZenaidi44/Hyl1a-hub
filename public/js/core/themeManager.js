/**
 * Theme Manager
 * Handles switching between visual themes (backgrounds + color accents).
 * Themes: Default, Zelda (Link), Mario, Dragon Ball
 */

const ThemeManager = {
  themes: {
    default: {
      name: 'Default',
      emoji: '🏠',
      bgGradient: 'linear-gradient(135deg, #f0f0f0 0%, #e0e4e8 50%, #d5dce3 100%)',
      videoSrc: 'public/assets/icons/video/menuBC.mp4',
      accentColor: '#00d2ff',
      textColor: '#555',
      pillBg: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(240,240,240,0.9))'
    },
    violet: {
      name: 'Violet',
      emoji: '🔮',
      bgGradient: 'linear-gradient(135deg, #4a1c6f 0%, #2d0a4f 40%, #1a0533 70%, #6f1cba 100%)',
      videoSrc: 'public/assets/icons/video/purpleBC.mp4',
      accentColor: '#b700ffff',
      textColor: '#4a1c6f',
      pillBg: 'linear-gradient(to bottom, rgba(230,200,255,0.95), rgba(200, 150, 255, 0.9))'
    },
    mario: {
      name: 'Mario',
      emoji: '🍄',
      bgGradient: 'linear-gradient(135deg, #e52521 0%, #c41e1a 30%, #d96b4aff 60%, #ebb487ff 100%)',
      videoSrc: null,
      accentColor: '#e52521',
      textColor: '#c41e1a',
      pillBg: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,230,230,0.9))'
    },
    dragonball: {
      name: 'Dragon Ball',
      emoji: '🐉',
      bgGradient: 'linear-gradient(135deg, #2d0d35ff 0%, #9422a3ff 35%, #871fa7ff 65%, #3b0739ff 100%)',
      videoSrc: null,
      accentColor: '#b700ffff',
      textColor: '#661088ff',
      pillBg: 'linear-gradient(to bottom, rgba(241, 220, 255, 0.95), rgba(232, 140, 255, 0.9))'
    }
  },

  currentTheme: 'default',

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

    // Background Video and Color Fallback
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

    // Accent color for hover borders
    root.setProperty('--theme-accent', theme.accentColor);
    root.setProperty('--theme-tile-overlay', theme.tileOverlay);
    root.setProperty('--theme-pill-bg', theme.pillBg);

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
                <span class="theme-emoji">${t.emoji}</span>
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
