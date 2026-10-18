/**
 * Menu d'accueil — grille de chaînes façon Wii.
 * Inspiré du Wii Menu (Nintendo Wii) et du « WiiSU Mode » d'iiSU.
 *
 * Une catégorie = une page du menu (onglets en haut).
 * Axe horizontal ← / → : naviguer dans la rangée ; aux bords, changer de page.
 * Axe vertical   ↑ / ↓ : changer de page (catégorie).
 * Entrée / Espace      : lancer la chaîne sélectionnée.
 *
 * Le lancement des apps réutilise window.handleAppLaunch() défini dans app.js.
 */

(function () {
  'use strict';

  /* ── Actions personnalisées (non présentes dans AppRegistry) ── */
  const ACTIONS = {
    bio:      () => { window.open('https://web2-rho-one.vercel.app/', '_blank', 'noopener'); },
    profile:  () => { if (window.SocialSystem) window.SocialSystem.openOverlay('profile'); },
    friends:  () => { if (window.SocialSystem) window.SocialSystem.openFriendsView(); },
    global:   () => { if (window.SocialSystem) window.SocialSystem.openGlobalView(); },
    messages: () => { if (window.SocialSystem) window.SocialSystem.openMessagesView(); },
    logout:   () => { if (window.Auth) window.Auth.logout(); }
  };

  /* ── Icônes (SVG dans public/assets/icons/xmb/) ── */
  const ICON_DIR = '/public/assets/icons/xmb/';

  /* ── Structure du menu ──
     app       : id dans AppRegistry (app.js) → lancé via handleAppLaunch
     action    : clé de ACTIONS
     img       : icône image (webp/png) affichée sur la tuile
     imgDark   : variante thème sombre de la tuile (bascule par CSS)
     boxart    : visuel du grand carré (carte hero), plein cadre
     boxartDark: variante thème sombre de la box art
     hero      : visuel du rectangle de descriptions (plein cadre)
     icon      : icône SVG monochrome (nom de fichier, excluant .svg)
  */
  const CATEGORIES = [
    {
      id: 'users', label: 'Utilisateur', icon: 'users',
      items: [
        { action: 'bio',  title: 'Hyl1a Bio',  img: 'public/assets/icons/bobaboy.webp',
          boxart: 'public/assets/menu/boxart/bio.webp',
          hero: 'public/assets/menu/hero/bio.webp',
          desc: "Hylia Plaza est mon hub de jeux dans le navigateur, inspiré d'iiSU : GBA, DS, NES et N64 jouables directement sur le web avec compte, Mii et sauvegardes. Clique sur Ouvrir pour visiter mon site bio — mes projets sont sur github.com/MohamedZenaidi44." },
        { action: 'profile', title: 'Mon Profil', icon: 'circle-user',
          boxart: 'public/assets/menu/boxart/profile.webp',
          hero: 'public/assets/menu/hero/profile.webp',
          desc: 'Consulte et personnalise ton profil Hylia Plaza.' }
      ]
    },
    {
      id: 'games', label: 'Jeux', icon: 'gamepad-2',
      items: [
        { app: 'gba', title: 'GBA',
          img: 'public/assets/menu/icon/gba-l.webp',
          imgDark: 'public/assets/menu/icon/gba-d.webp',
          boxart: 'public/assets/menu/icon/gba-l.webp',
          boxartDark: 'public/assets/menu/icon/gba-d.webp',
          hero: 'public/assets/menu/hero/gba.webp',
          desc: 'Joue à tes jeux Game Boy Advance directement depuis ton navigateur.' },
        { app: 'ds',  title: 'DS',
          img: 'public/assets/menu/icon/nds-l.webp',
          imgDark: 'public/assets/menu/icon/nds-d.webp',
          boxart: 'public/assets/menu/icon/nds-l.webp',
          boxartDark: 'public/assets/menu/icon/nds-d.webp',
          hero: 'public/assets/menu/hero/ds.webp',
          desc: 'Joue à tes jeux Nintendo DS directement depuis ton navigateur.' },
        { app: 'nes', title: 'NES',
          img: 'public/assets/menu/icon/nes-l.webp',
          imgDark: 'public/assets/menu/icon/nes-d.webp',
          boxart: 'public/assets/menu/icon/nes-l.webp',
          boxartDark: 'public/assets/menu/icon/nes-d.webp',
          hero: 'public/assets/menu/hero/nes.webp',
          desc: 'Joue à tes jeux NES directement depuis ton navigateur.' },
        { app: 'n64', title: 'N64',
          img: 'public/assets/menu/icon/n64-l.webp',
          imgDark: 'public/assets/menu/icon/n64-d.webp',
          boxart: 'public/assets/menu/icon/n64-l.webp',
          boxartDark: 'public/assets/menu/icon/n64-d.webp',
          hero: 'public/assets/menu/hero/n64.webp',
          desc: 'Joue à tes jeux Nintendo 64 directement depuis ton navigateur.' },
        { app: 'arcade', title: 'Hall of Fame', icon: 'trophy',
          boxart: 'public/assets/menu/boxart/arcade.webp',
          hero: 'public/assets/menu/hero/arcade.webp',
          desc: 'Découvre le mur des champions de Hylia Plaza.' }
      ]
    },
    {
      id: 'mii', label: 'Mii', icon: 'user-round',
      items: [
        { app: 'miiMaker',   title: 'Mii Maker',   img: 'public/assets/icons/app/mii.webp',
          boxart: 'public/assets/menu/boxart/miimaker.webp',
          hero: 'public/assets/menu/hero/miimaker.webp',
          desc: 'Crée et personnalise ton propre Mii, ton avatar sur Hylia Plaza.' },
        { app: 'miiPlaza', title: 'Plaza', img: 'public/assets/icons/app/miiplazac.webp',
          boxart: 'public/assets/menu/boxart/plaza.webp',
          hero: 'public/assets/menu/hero/plaza.webp',
          desc: 'Une place vivante où tes Mii marchent, discutent et interagissent.' },
        { app: 'miiManager', title: 'Mii Manager', img: 'public/assets/icons/app/warning.webp',
          boxart: 'public/assets/menu/boxart/miimanager.webp',
          hero: 'public/assets/menu/hero/miimanager.webp',
          desc: 'Outil de gestion des Mii. (Réservé à l\'administration)' }
      ]
    },
    {
      id: 'network', label: 'Réseau', icon: 'globe',
      items: [
        { action: 'global',   title: 'Chat Général', icon: 'users',
          boxart: 'public/assets/menu/boxart/global.webp',
          hero: 'public/assets/menu/hero/global.webp',
          desc: 'Discute avec toute la communauté Hylia Plaza en direct.' },
        { action: 'friends',  title: 'Amis',        icon: 'circle-user',
          boxart: 'public/assets/menu/boxart/friends.webp',
          hero: 'public/assets/menu/hero/friends.webp',
          desc: 'Retrouve tes amis en ligne.' },
        { action: 'messages', title: 'Messages',    icon: 'mail',
          boxart: 'public/assets/menu/boxart/messages.webp',
          hero: 'public/assets/menu/hero/messages.webp',
          desc: 'Consulte tes messages privés.' },
        { app: 'guestbook',   title: 'Town Board',  icon: 'notebook-pen',
          boxart: 'public/assets/menu/boxart/guestbook.webp',
          hero: 'public/assets/menu/hero/guestbook.webp',
          desc: 'Laisse un message public sur le tableau de la ville.' },
        { app: 'notes',       title: 'Notes',       icon: 'notebook-pen',
          boxart: 'public/assets/menu/boxart/notes.webp',
          hero: 'public/assets/menu/hero/notes.webp',
          desc: 'Tes notes personnelles, sauvegardées sur ton compte.' }
      ]
    },
    {
      id: 'media', label: 'Media', icon: 'music',
      items: [
        { app: 'music',   title: 'Radio',    icon: 'radio',
          boxart: 'public/assets/menu/boxart/radio.webp',
          hero: 'public/assets/menu/hero/radio.webp',
          desc: 'Écoute la radio de Hylia Plaza.' },
        { app: 'gallery', title: 'Galerie',  icon: 'image',
          boxart: 'public/assets/menu/boxart/gallery.webp',
          hero: 'public/assets/menu/hero/gallery.webp',
          desc: 'Retrouve tes captures d\'écran. (Bientôt disponible)' },
        { app: 'browser', title: 'Navigateur', icon: 'globe',
          boxart: 'public/assets/menu/boxart/browser.webp',
          hero: 'public/assets/menu/hero/browser.webp',
          desc: 'Navigue sur le web directement depuis Hylia Plaza.' }
      ]
    },
    {
      id: 'themes', label: 'Thèmes', icon: 'palette',
      items: [
        { app: 'themes', title: 'Personnaliser', icon: 'palette',
          boxart: 'public/assets/menu/boxart/themes.webp',
          hero: 'public/assets/menu/hero/themes.webp',
          desc: 'Personnalise le fond d\'écran de ton hub parmi une sélection de thèmes.' }
      ]
    },
    {
      id: 'settings', label: 'Paramètres', icon: 'settings',
      items: [
        { action: 'logout', title: 'Déconnexion', icon: 'power',
          boxart: 'public/assets/menu/boxart/logout.webp',
          hero: 'public/assets/menu/hero/logout.webp',
          desc: 'Quitter ta session Hylia Plaza.' }
      ]
    }
  ];

  const root = {
    cat: 0,
    item: 0,
    els: {},
    built: false,

    init() {
      const container = document.getElementById('main-container');
      if (!container) return;

      container.innerHTML = '';

      // Scène — grille 100vh : barre haute / onglets / hero / rangée / barre basse
      const stage = document.createElement('div');
      stage.className = 'wii-menu';

      // Barre haute : profil (gauche), bandeau (centre), horloge + bouton (droite)
      const topbar = document.createElement('header');
      topbar.className = 'wii-topbar';

      // Onglets de catégories
      const tabs = document.createElement('nav');
      tabs.className = 'wii-tabs';
      tabs.setAttribute('role', 'tablist');
      tabs.setAttribute('aria-label', 'Catégories du menu');

      // Hero : carte de la chaîne sélectionnée + titre / description / bouton Ouvrir
      const hero = document.createElement('section');
      hero.className = 'wii-hero';
      const heroCard = document.createElement('div');
      heroCard.className = 'wii-hero-card';
      heroCard.setAttribute('aria-hidden', 'true');
      hero.appendChild(heroCard);

      // Panneau d'info
      const info = document.createElement('div');
      info.className = 'wii-info';
      info.setAttribute('aria-live', 'polite');
      info.innerHTML = '<div class="wii-info-title"></div><p class="wii-info-desc"></p>';

      // Bouton d'ouverture de la chaîne sélectionnée
      const launchBtn = document.createElement('button');
      launchBtn.type = 'button';
      launchBtn.className = 'wii-launch-btn';
      launchBtn.textContent = 'Ouvrir';
      launchBtn.addEventListener('click', () => {
        if (this._locked()) return;
        this.launch();
      });
      info.appendChild(launchBtn);

      hero.appendChild(info);

      // Rangée de chaînes (défilement horizontal si nécessaire)
      const frame = document.createElement('div');
      frame.className = 'wii-channels-frame';
      frame.id = 'wii-channels-panel';
      frame.setAttribute('role', 'tabpanel');
      const grid = document.createElement('div');
      grid.className = 'wii-channels';
      frame.appendChild(grid);

      // Barre basse : lecteur musique (centre) + aide clavier (droite)
      const bottom = document.createElement('footer');
      bottom.className = 'wii-bottom';

      // Indice clavier
      const hint = document.createElement('div');
      hint.className = 'wii-hint';
      hint.innerHTML = '<span><span class="kbd">←</span><span class="kbd">→</span>Choix / page</span>' +
                       '<span><span class="kbd">↑</span><span class="kbd">↓</span>Page</span>' +
                       '<span><span class="kbd">↵</span>Ouvrir</span>';

      // HUD existant → grille (écouteurs et état suivent les nœuds déplacés)
      const moveIn = (parent, id) => {
        const el = document.getElementById(id);
        if (el && parent) parent.appendChild(el);
        return el;
      };
      const musicBar = moveIn(bottom, 'music-bar-container');
      const visualizer = document.getElementById('modern-visualizer-container');
      if (visualizer && musicBar) musicBar.insertBefore(visualizer, musicBar.firstChild);
      moveIn(topbar, 'user-panel');
      moveIn(topbar, 'marquee-bar');
      moveIn(topbar, 'clock-panel');
      moveIn(topbar, 'btn-changelog-toggle');
      bottom.appendChild(hint);

      stage.appendChild(topbar);
      stage.appendChild(tabs);
      stage.appendChild(hero);
      stage.appendChild(frame);
      stage.appendChild(bottom);
      container.appendChild(stage);

      this.els.stage = stage;
      this.els.topbar = topbar;
      this.els.tabs = tabs;
      this.els.frame = frame;
      this.els.grid = grid;
      this.els.heroCard = heroCard;
      this.els.info = info;
      this.els.infoTitle = info.querySelector('.wii-info-title');
      this.els.infoDesc = info.querySelector('.wii-info-desc');

      this._buildTabs();
      this._bindInputs();

      this.cat = 0;
      this.item = 0;
      this.selectCategory(0, true);
      this.built = true;

      // Le visualiseur vit désormais dans la barre de musique : recalculer sa taille
      if (typeof ModernVisualizer !== 'undefined' && ModernVisualizer.resize) {
        requestAnimationFrame(() => ModernVisualizer.resize());
      }
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
          art = it.imgDark
            ? '<img class="wii-channel-art art-light" src="' + it.img + '" alt="">' +
              '<img class="wii-channel-art art-dark" src="' + it.imgDark + '" alt="">'
            : '<img class="wii-channel-art" src="' + it.img + '" alt="">';
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

    /* La sélection reste visible quand la rangée défile horizontalement */
    _ensureVisible(el) {
      const frame = this.els.frame;
      if (!el || !frame) return;
      if (frame.scrollWidth > frame.clientWidth + 1) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    },

    updateInfo() {
      const it = this._currentItem();
      if (!it) return;
      this.els.infoTitle.textContent = it.title;
      this.els.infoDesc.textContent = it.desc || '';
      this._updateHero(it);
      this._updateInfoBg(it);
    },

    /* La carte du hero affiche l'illustration de la chaîne sélectionnée
       (box art « is-cover » plein cadre si disponible, sinon icône) */
    _updateHero(it) {
      const card = this.els.heroCard;
      if (!card || !it) return;
      let art;
      if (it.boxart) {
        card.classList.add('has-cover');
        art = it.boxartDark
          ? '<img class="wii-hero-art is-cover art-light" src="' + it.boxart + '" alt="">' +
            '<img class="wii-hero-art is-cover art-dark" src="' + it.boxartDark + '" alt="">'
          : '<img class="wii-hero-art is-cover" src="' + it.boxart + '" alt="">';
      } else {
        card.classList.remove('has-cover');
        art = it.img
          ? '<img class="wii-hero-art" src="' + it.img + '" alt="">'
          : '<span class="wii-hero-art is-mask" style="--wii-icon:url(\'' +
            ICON_DIR + (it.icon || 'square') + '.svg\')"></span>';
      }
      card.innerHTML = art;
    },

    /* Le rectangle de descriptions reçoit le visuel « hero » plein cadre */
    _updateInfoBg(it) {
      const info = this.els.info;
      if (!info) return;
      let bg = info.querySelector('.wii-info-bg');
      if (it.hero) {
        if (!bg) {
          bg = document.createElement('img');
          bg.className = 'wii-info-bg';
          bg.alt = '';
          info.insertBefore(bg, info.firstChild);
        }
        if (bg.getAttribute('src') !== it.hero) bg.src = it.hero;
        info.classList.add('has-hero');
      } else {
        info.classList.remove('has-hero');
      }
    },

    _pulseInfo() {
      const info = this.els.info;
      info.classList.remove('wii-info-in');
      void info.offsetWidth;
      info.classList.add('wii-info-in');
    },

    /* ── Navigation dans la rangée ; aux bords, changement de page ── */
    move(dx, dy) {
      const count = CATEGORIES[this.cat].items.length;
      if (!count) return;

      // Rangée unique : ↑/↓ changent de page (catégorie)
      if (dy !== 0) {
        this.moveCat(dy);
        return;
      }

      if (dx !== 0) {
        const idx = this.item + dx;
        if (idx < 0 || idx >= count) {
          // Bord gauche/droit : on change de page (comme sur le Wii Menu)
          this.moveCat(dx);
          return;
        }
        this.selectItem(idx);
        this._focusCurrent();
        this._click();
      }
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
