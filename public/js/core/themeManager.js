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
      hudTintCompanionHover: 'rgba(255, 255, 255, 0.62)',
      // ── Variables iiSU ──
      gridBg: 'rgba(255, 255, 255, 0.55)',
      gridBorder: 'rgba(255, 255, 255, 0.60)',
      gridInnerHighlight: 'rgba(255, 255, 255, 0.90)',
      tileBg: 'rgba(255, 255, 255, 0.72)',
      tileBorder: 'rgba(200, 215, 230, 0.60)',
      tileShadow: '0 6px 20px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
      tileGloss: 'linear-gradient(to bottom, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0) 100%)',
      tileHoverRing: 'rgba(0, 150, 255, 0.35)',
      tileHoverBorder: 'rgba(0, 150, 255, 0.40)',
      tileInnerHighlight: 'rgba(255,255,255,0.95)',
      tileLabelColor: 'rgba(20, 30, 50, 0.92)',
      tileLabelShadow: '0 1px 3px rgba(255,255,255,0.8)',
      tileLabelBg: 'linear-gradient(to top, rgba(255,255,255,0.75) 0%, transparent 100%)',
      tilePlaceholderColor: 'rgba(80, 100, 130, 0.35)',
      tileEmptyBg: 'rgba(200, 210, 220, 0.25)',
      tileEmptyBorder: 'rgba(150, 170, 190, 0.30)',
      tileIconFilter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))',
      panelBg: 'rgba(255, 255, 255, 0.70)',
      panelBorder: 'rgba(200, 215, 230, 0.55)',
      panelText: 'rgba(20, 30, 50, 0.92)',
      panelTextMuted: 'rgba(60, 80, 110, 0.65)',
      entryBg: 'rgba(255, 255, 255, 0.50)',
      accent: 'rgba(0, 140, 255, 0.90)',
      accentDark: 'rgba(0, 80, 200, 0.90)',
      accentGlow: 'rgba(0, 140, 255, 0.30)',
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
      hudTintCompanionHover: 'rgba(30, 30, 30, 0.92)',
      // ── Variables iiSU ──
      gridBg: 'rgba(10, 12, 18, 0.72)',
      gridBorder: 'rgba(255, 255, 255, 0.08)',
      gridInnerHighlight: 'rgba(255, 255, 255, 0.06)',
      tileBg: 'rgba(28, 32, 44, 0.80)',
      tileBorder: 'rgba(255, 255, 255, 0.10)',
      tileShadow: '0 8px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
      tileGloss: 'linear-gradient(to bottom, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0) 100%)',
      tileHoverRing: 'rgba(255, 255, 255, 0.20)',
      tileHoverBorder: 'rgba(255, 255, 255, 0.30)',
      tileInnerHighlight: 'rgba(255,255,255,0.08)',
      tileLabelColor: 'rgba(255, 255, 255, 0.90)',
      tileLabelShadow: '0 1px 4px rgba(0,0,0,0.90)',
      tileLabelBg: 'linear-gradient(to top, rgba(0,0,0,0.70) 0%, transparent 100%)',
      tilePlaceholderColor: 'rgba(255, 255, 255, 0.12)',
      tileEmptyBg: 'rgba(255, 255, 255, 0.03)',
      tileEmptyBorder: 'rgba(255, 255, 255, 0.08)',
      tileIconFilter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.70))',
      panelBg: 'rgba(16, 20, 30, 0.82)',
      panelBorder: 'rgba(255, 255, 255, 0.08)',
      panelText: 'rgba(235, 240, 255, 0.92)',
      panelTextMuted: 'rgba(160, 175, 200, 0.65)',
      entryBg: 'rgba(255, 255, 255, 0.06)',
      accent: 'rgba(0, 200, 255, 0.90)',
      accentDark: 'rgba(0, 120, 210, 0.90)',
      accentGlow: 'rgba(0, 200, 255, 0.35)',
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
    localStorage.setItem('nostalgia-theme', themeId);

    // Classe body pour les surcharges CSS texte/couleur
    document.body.classList.remove('theme-white', 'theme-black');
    document.body.classList.add('theme-' + themeId);

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

    // ── Variables iiSU — système cohérent inter-composants ──
    root.setProperty('--grid-bg', theme.gridBg);
    root.setProperty('--grid-border', theme.gridBorder);
    root.setProperty('--grid-inner-highlight', theme.gridInnerHighlight);
    root.setProperty('--tile-bg', theme.tileBg);
    root.setProperty('--tile-border', theme.tileBorder);
    root.setProperty('--tile-shadow', theme.tileShadow);
    root.setProperty('--tile-gloss', theme.tileGloss);
    root.setProperty('--tile-hover-ring', theme.tileHoverRing);
    root.setProperty('--tile-hover-border', theme.tileHoverBorder);
    root.setProperty('--tile-inner-highlight', theme.tileInnerHighlight);
    root.setProperty('--tile-label-color', theme.tileLabelColor);
    root.setProperty('--tile-label-shadow', theme.tileLabelShadow);
    root.setProperty('--tile-label-bg', theme.tileLabelBg);
    root.setProperty('--tile-placeholder-color', theme.tilePlaceholderColor);
    root.setProperty('--tile-empty-bg', theme.tileEmptyBg);
    root.setProperty('--tile-empty-border', theme.tileEmptyBorder);
    root.setProperty('--tile-icon-filter', theme.tileIconFilter);
    root.setProperty('--panel-bg', theme.panelBg);
    root.setProperty('--panel-border', theme.panelBorder);
    root.setProperty('--panel-text', theme.panelText);
    root.setProperty('--panel-text-muted', theme.panelTextMuted);
    root.setProperty('--entry-bg', theme.entryBg);
    root.setProperty('--accent', theme.accent);
    root.setProperty('--accent-dark', theme.accentDark);
    root.setProperty('--accent-glow', theme.accentGlow);

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

    // Event listeners — themes
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
  // Nettoyage des clés du Mode Économie (fonctionnalité retirée)
  localStorage.removeItem('hylia-eco-mode');
  localStorage.removeItem('hylia-eco-mode-manual');
  document.body.classList.remove('eco-mode');
});