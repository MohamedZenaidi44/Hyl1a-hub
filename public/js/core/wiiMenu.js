/**
 * Menu d'accueil — grille de chaînes façon Wii.
 * Inspiré du Wii Menu (Nintendo Wii) et du « WiiSU Mode » d'iiSU.
 *
 * Une catégorie = une page du menu (onglets en haut).
 * Axe horizontal ← / → : naviguer dans la grille ; aux bords, changer de page.
 * Axe vertical   ↑ / ↓ : naviguer dans la grille.
 * Entrée / Espace      : lancer la chaîne sélectionnée.
 *
 * Le lancement des apps réutilise window.handleAppLaunch() défini dans app.js.
 */

(function () {
  'use strict';

  /* ── Actions personnalisées (non présentes dans AppRegistry) ── */
  const ACTIONS = {
    profile:  () => { if (window.SocialSystem) window.SocialSystem.openOverlay('profile'); },
    friends:  () => { if (window.SocialSystem) window.SocialSystem.openFriendsView(); },
    global:   () => { if (window.SocialSystem) window.SocialSystem.openGlobalView(); },
    messages: () => { if (window.SocialSystem) window.SocialSystem.openMessagesView(); },
    logout:   () => { if (window.Auth) window.Auth.logout(); }
  };

  /* ── Icônes (SVG dans public/assets/icons/xmb/) ── */
  const ICON_DIR = '/public/assets/icons/xmb/';

  /* ── Structure du menu ──
     app    : id dans AppRegistry (app.js) → lancé via handleAppLaunch
     action : clé de ACTIONS
     img    : icône image (webp/png)
     icon   : icône SVG monochrome (nom de fichier, excluant .svg)
  */
  const CATEGORIES = [
    {
      id: 'users', label: 'Utilisateur', icon: 'users',
      items: [
        { app: 'bio',     title: 'Hyl1a Bio',  img: 'public/assets/icons/bobaboy.webp',
          desc: "J'ai voulu créer un projet similaire à IISU, mais sur navigateur, pour jouer directement sur le web avec une gestion fluide de sauvegarde et de compte." },
        { action: 'profile', title: 'Mon Profil', icon: 'circle-user',
          desc: 'Consulte et personnalise ton profil Hylia Plaza.' }
      ]
    },
    {
      id: 'games', label: 'Jeux', icon: 'gamepad-2',
      items: [
        { app: 'gba', title: 'GBA',    img: 'public/assets/icons/app/gba.webp',
          desc: 'Joue à tes jeux Game Boy Advance directement depuis ton navigateur.' },
        { app: 'gbaTurbo', title: 'GBA Turbo', img: 'public/assets/icons/gba_turbo.webp',
          desc: 'Version turbocompressée de l\'émulateur GBA.' },
        { app: 'ds',  title: 'DS',     img: 'public/assets/icons/app/nds.webp',
          desc: 'Joue à tes jeux Nintendo DS directement depuis ton navigateur.' },
        { app: 'nes', title: 'NES',    img: 'public/assets/icons/snesx9.png',
          desc: 'Joue à tes jeux NES directement depuis ton navigateur.' },
        { app: 'n64', title: 'N64',    img: 'public/assets/icons/app/pj64.webp',
          desc: 'Joue à tes jeux Nintendo 64 directement depuis ton navigateur.' },
        { app: 'miiPlaza', title: 'Plaza', img: 'public/assets/icons/app/miiplazac.webp',
          desc: 'Une place vivante où tes Mii marchent, discutent et interagissent.' },
        { app: 'arcade', title: 'Hall of Fame', icon: 'trophy',
          desc: 'Découvre le mur des champions de Hylia Plaza.' }
      ]
    },
    {
      id: 'mii', label: 'Mii', icon: 'user-round',
      items: [
        { app: 'miiMaker',   title: 'Mii Maker',   img: 'public/assets/icons/app/mii.webp',
          desc: 'Crée et personnalise ton propre Mii, ton avatar sur Hylia Plaza.' },
        { app: 'miiManager', title: 'Mii Manager', img: 'public/assets/icons/app/warning.webp',
          desc: 'Outil de gestion des Mii. (Réservé à l\'administration)' }
      ]
    },
    {
      id: 'network', label: 'Réseau', icon: 'globe',
      items: [
        { action: 'global',   title: 'Chat Général', icon: 'users',
          desc: 'Discute avec toute la communauté Hylia Plaza en direct.' },
        { action: 'friends',  title: 'Amis',        icon: 'circle-user',
          desc: 'Retrouve tes amis en ligne.' },
        { action: 'messages', title: 'Messages',    icon: 'mail',
          desc: 'Consulte tes messages privés.' },
        { app: 'guestbook',   title: 'Town Board',  icon: 'notebook-pen',
          desc: 'Laisse un message public sur le tableau de la ville.' },
        { app: 'notes',       title: 'Notes',       icon: 'notebook-pen',
          desc: 'Tes notes personnelles, sauvegardées sur ton compte.' }
      ]
    },
    {
      id: 'media', label: 'Media', icon: 'music',
      items: [
        { app: 'music',   title: 'Radio',    icon: 'radio',
          desc: 'Écoute la radio de Hylia Plaza.' },
        { app: 'gallery', title: 'Galerie',  icon: 'image',
          desc: 'Retrouve tes captures d\'écran. (Bientôt disponible)' },
        { app: 'browser', title: 'Navigateur', icon: 'globe',
          desc: 'Navigue sur le web directement depuis Hylia Plaza.' }
      ]
    },
    {
      id: 'themes', label: 'Thèmes', icon: 'palette',
      items: [
        { app: 'themes', title: 'Personnaliser', icon: 'palette',
          desc: 'Personnalise le fond d\'écran de ton hub parmi une sélection de thèmes.' }
      ]
    },
    {
      id: 'settings', label: 'Paramètres', icon: 'settings',
      items: [
        { action: 'logout', title: 'Déconnexion', icon: 'power',
          desc: 'Quitter ta session Hylia Plaza.' }
      ]
    }
  ];

  const root = {
    cat: 0,
    item: 0,
    cols: 3,
    els: {},
    built: false,

    init() {
      const container = document.getElementById('main-container');
      if (!container) return;

      container.innerHTML = '';

      // Scène
      const stage = document.createElement('div');
      stage.className = 'wii-menu';

      // Onglets de catégories
      const tabs = document.createElement('nav');
      tabs.className = 'wii-tabs';
      tabs.setAttribute('role', 'tablist');
      tabs.setAttribute('aria-label', 'Catégories du menu');

      // Grille de chaînes
      const frame = document.createElement('div');
      frame.className = 'wii-channels-frame';
      frame.id = 'wii-channels-panel';
      frame.setAttribute('role', 'tabpanel');
      const grid = document.createElement('div');
      grid.className = 'wii-channels';
      frame.appendChild(grid);

      // Panneau d'info
      const info = document.createElement('div');
      info.className = 'wii-info';
      info.setAttribute('aria-live', 'polite');
      info.innerHTML = '<div class="wii-info-title"></div><p class="wii-info-desc"></p>';

      // Indice clavier
      const hint = document.createElement('div');
      hint.className = 'wii-hint';
      hint.innerHTML = '<span><span class="kbd">←</span><span class="kbd">→</span>Naviguer / page</span>' +
                       '<span><span class="kbd">↑</span><span class="kbd">↓</span>Choix</span>' +
                       '<span><span class="kbd">↵</span>Ouvrir</span>';

      stage.appendChild(tabs);
      stage.appendChild(frame);
      stage.appendChild(info);
      stage.appendChild(hint);
      container.appendChild(stage);

      this.els.stage = stage;
      this.els.tabs = tabs;
      this.els.frame = frame;
      this.els.grid = grid;
      this.els.info = info;
      this.els.infoTitle = info.querySelector('.wii-info-title');
      this.els.infoDesc = info.querySelector('.wii-info-desc');

      this._buildTabs();
      this._bindInputs();

      this.cat = 0;
      this.item = 0;
      this.selectCategory(0, true);
      this.built = true;

      const relayout = () => this._measureCols();
      window.addEventListener('resize', relayout);
      window.addEventListener('load', relayout);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    },

    /* ── Construction des onglets ── */
    _buildTabs() {
      CATEGORIES.forEach((c, i) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'wii-tab';
        el.setAttribute('role', 'tab');
        el.setAttribute('aria-selected', 'false');
        el.setAttribute('aria-controls', 'wii-channels-panel');
        el.innerHTML =
          '<span class="wii-tab-icon" style="--wii-icon:url(\'' + ICON_DIR + c.icon + '.svg\')"></span>' +
          '<span class="wii-tab-label"></span>';
        el.querySelector('.wii-tab-label').textContent = c.label;
        el.addEventListener('click', () => {
          if (this._locked()) return;
          this.selectCategory(i);
          this._click();
        });
        this.els.tabs.appendChild(el);
      });
    },

    /* ── Construction des chaînes de la page courante ── */
    _renderChannels() {
      const cat = CATEGORIES[this.cat];
      const wrap = this.els.grid;
      wrap.innerHTML = '';
      cat.items.forEach((it, i) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'wii-channel';
        el.dataset.index = i;

        let art;
        if (it.img) {
          art = '<img class="wii-channel-art" src="' + it.img + '" alt="">';
        } else {
          art = '<span class="wii-channel-art is-mask" style="--wii-icon:url(\'' +
                ICON_DIR + (it.icon || 'square') + '.svg\')"></span>';
        }
        el.innerHTML = '<span class="wii-channel-face">' + art + '</span>' +
                       '<span class="wii-channel-label"></span>';
        el.querySelector('.wii-channel-label').textContent = it.title;
        el.setAttribute('aria-label', it.title);

        el.addEventListener('mouseenter', () => {
          if (this._locked()) return;
          if (i !== this.item) { this.selectItem(i); this._click(); }
        });
        el.addEventListener('focus', () => {
          if (this._locked()) return;
          if (i !== this.item) this.selectItem(i, true);
        });
        el.addEventListener('click', () => {
          if (this._locked()) return;
          this.selectItem(i);
          this.launch();
        });

        wrap.appendChild(el);
      });
    },

    /* ── Sélection d'une page (catégorie) ── */
    selectCategory(i, silent) {
      this.cat = i;
      [...this.els.tabs.children].forEach((el, idx) => {
        const active = idx === i;
        el.classList.toggle('active', active);
        el.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      this.item = 0;
      this._renderChannels();
      this._measureCols();
      this.selectItem(0, true);
      if (!silent) this._pulseInfo();
    },

    /* ── Sélection d'une chaîne ── */
    selectItem(i, silent) {
      const items = this.els.grid.children;
      if (!items.length) return;
      this.item = Math.max(0, Math.min(i, items.length - 1));
      [...items].forEach((el, idx) => el.classList.toggle('selected', idx === this.item));
      this._ensureVisible(items[this.item]);
      this.updateInfo();
      if (!silent) this._pulseInfo();
    },

    /* La sélection reste visible même quand la zone défile (petites hauteurs) */
    _ensureVisible(el) {
      const frame = this.els.frame;
      if (!el || !frame) return;
      if (frame.scrollHeight > frame.clientHeight) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    },

    /* Nombre réel de colonnes (éléments sur la première ligne, dépend du responsive) */
    _measureCols() {
      const items = this.els.grid ? this.els.grid.children : null;
      if (!items || !items.length) return;
      const top = items[0].offsetTop;
      let cols = 0;
      for (let i = 0; i < items.length; i++) {
        if (items[i].offsetTop !== top) break;
        cols++;
      }
      if (cols > 0) this.cols = cols;
    },

    updateInfo() {
      const it = this._currentItem();
      if (!it) return;
      this.els.infoTitle.textContent = it.title;
      this.els.infoDesc.textContent = it.desc || '';
    },

    _pulseInfo() {
      const info = this.els.info;
      info.classList.remove('wii-info-in');
      void info.offsetWidth;
      info.classList.add('wii-info-in');
    },

    /* ── Navigation 2D dans la grille ; aux bords, changement de page ── */
    move(dx, dy) {
      const count = CATEGORIES[this.cat].items.length;
      if (!count) return;
      const cols = Math.min(this.cols, count);
      const rows = Math.ceil(count / cols);
      let idx = this.item;
      let col = idx % cols;
      let row = Math.floor(idx / cols);

      if (dx !== 0) {
        const nc = col + dx;
        if (nc < 0 || nc >= cols || row * cols + nc >= count) {
          // Bord gauche/droit : on change de page (comme sur le Wii Menu)
          this.moveCat(dx);
          return;
        }
        col = nc;
      }

      if (dy !== 0) {
        const nr = row + dy;
        if (nr < 0 || nr >= rows) return;
        idx = Math.min(nr * cols + col, count - 1);
      } else {
        idx = row * cols + col;
      }

      if (idx === this.item) {
        this._focusCurrent();
        return;
      }
      this.selectItem(idx);
      this._focusCurrent();
      this._click();
    },

    moveCat(dir) {
      const n = CATEGORIES.length;
      this.selectCategory((this.cat + dir + n) % n);
      this._focusCurrent();
      this._click();
    },

    /* Le focus clavier suit la sélection (anneau visible + Entrée/Ouvrir) */
    _focusCurrent() {
      const el = this.els.grid && this.els.grid.children[this.item];
      if (el && typeof el.focus === 'function') el.focus({ preventScroll: true });
    },

    moveItem(dir) {
      const count = CATEGORIES[this.cat].items.length;
      const next = (this.item + dir + count) % count;
      if (next === this.item) return;
      this.selectItem(next);
      this._click();
    },

    /* ── Lancement de la chaîne sélectionnée ── */
    launch() {
      const it = this._currentItem();
      if (!it) return;
      const tile = this.els.grid.children[this.item];
      if (it.app) {
        if (tile) {
          tile.setAttribute('data-app', it.app);
          tile.setAttribute('data-title', it.title);
          if (window.handleAppLaunch) window.handleAppLaunch(tile);
        }
      } else if (it.action && ACTIONS[it.action]) {
        if (typeof AudioManager !== 'undefined') AudioManager.playPop();
        ACTIONS[it.action]();
      }
    },

    _currentItem() {
      const cat = CATEGORIES[this.cat];
      return cat ? cat.items[this.item] : null;
    },

    _click() {
      if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    },

    _locked() {
      const auth = document.getElementById('auth-overlay');
      if (auth && auth.style.display !== 'none') return true;
      if (document.body.classList.contains('app-open-active')) return true;
      if (document.querySelector('.mii-fullscreen-container')) return true;
      if (document.body.classList.contains('social-active')) return true;
      const social = document.getElementById('social-overlay');
      if (social && !social.classList.contains('hidden')) return true;
      return false;
    },

    _bindInputs() {
      document.addEventListener('keydown', (e) => {
        if (!this.built) return;
        if (this._locked()) return;
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        switch (e.key) {
          case 'ArrowLeft':  e.preventDefault(); this.move(-1, 0); break;
          case 'ArrowRight': e.preventDefault(); this.move(1, 0);  break;
          case 'ArrowUp':    e.preventDefault(); this.move(0, -1); break;
          case 'ArrowDown':  e.preventDefault(); this.move(0, 1);  break;
          case 'Enter':
          case ' ': {
            // Un bouton déjà focalisé gère lui-même l'activation (clic natif),
            // sauf l'onglet déjà actif : Entrée y ouvre la chaîne sélectionnée.
            const btn = e.target && e.target.closest ? e.target.closest('button') : null;
            if (btn && btn.classList.contains('wii-tab') &&
                btn.getAttribute('aria-selected') === 'true') {
              e.preventDefault();
              this.launch();
              break;
            }
            if (btn) return;
            e.preventDefault();
            this.launch();
            break;
          }
        }
      }, { passive: false });

      window.addEventListener('wheel', (e) => {
        if (!this.built || this._locked()) return;
        if (Math.abs(e.deltaY) < 10) return;
        this.moveItem(e.deltaY > 0 ? 1 : -1);
      }, { passive: true });
    }
  };

  window.WiiMenu = root;

  document.addEventListener('DOMContentLoaded', () => {
    root.init();
  });
})();
