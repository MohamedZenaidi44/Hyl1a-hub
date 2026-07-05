/**
 * Grid Page Manager — 3DS style
 * Flèches = changer de PAGE
 * Maintenir appuyé = mode réorganisation + choix de layout
 */

const CarouselManager = {
  currentPage: 0,
  tilesPerPage: 10,
  totalPages: 2,

  init: function () {
    this.allTiles = Array.from(document.querySelectorAll('.grid-tile:not(.webm-tile)'));
    if (this.allTiles.length === 0) return;
    this.totalPages = Math.ceil(this.allTiles.length / this.tilesPerPage);
    this.setupInputs();
    this.showPage(0, true);
  },

  setupInputs: function () {
    const btnPrev = document.getElementById('carousel-nav-prev');
    const btnNext = document.getElementById('carousel-nav-next');
    if (btnPrev) {
      btnPrev.addEventListener('click', (e) => {
        if (document.getElementById('auth-overlay')?.style.display !== 'none') return;
        e.stopPropagation();
        this.prevPage();
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', (e) => {
        if (document.getElementById('auth-overlay')?.style.display !== 'none') return;
        e.stopPropagation();
        this.nextPage();
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (document.getElementById('auth-overlay')?.style.display !== 'none') return;
      if (document.body.classList.contains('app-open-active')) return;
      if (document.querySelector('.mii-fullscreen-container')) return;
      if (document.body.classList.contains('social-active')) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape' && TileReorder.active) { TileReorder.exitReorderMode(); return; }
      if (TileReorder.active) return;
      if (e.key === 'ArrowRight') { this.nextPage(); if (typeof AudioManager !== 'undefined') AudioManager.playClick(); }
      else if (e.key === 'ArrowLeft') { this.prevPage(); if (typeof AudioManager !== 'undefined') AudioManager.playClick(); }
    });

    window.addEventListener('wheel', (e) => {
      if (document.getElementById('auth-overlay')?.style.display !== 'none') return;
      if (document.body.classList.contains('app-open-active')) return;
      if (document.querySelector('.mii-fullscreen-container')) return;
      if (TileReorder.active) return;
      const socialOverlay = document.getElementById('social-overlay');
      if (socialOverlay && !socialOverlay.classList.contains('hidden')) return;
      if (Math.abs(e.deltaY) < 10) return;
      if (e.deltaY > 0) this.nextPage(); else this.prevPage();
    }, { passive: true });

    this.allTiles.forEach((tile) => {
      tile.addEventListener('click', (e) => {
        if (document.getElementById('auth-overlay')?.style.display !== 'none') return;
        if (TileReorder.active) return;
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        if (window.handleAppLaunch) window.handleAppLaunch(tile);
      });
      tile.addEventListener('mouseenter', () => {
        if (document.getElementById('auth-overlay')?.style.display !== 'none') return;
        if (TileReorder.active) return;
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        this.updateDescriptionBox(tile);
      });
    });
  },

  nextPage: function () { this.showPage((this.currentPage + 1) % this.totalPages); },
  prevPage: function () { this.showPage((this.currentPage - 1 + this.totalPages) % this.totalPages); },

  showPage: function (pageIndex, force = false) {
    if (this.currentPage === pageIndex && !force) return;
    this.currentPage = pageIndex;
    const start = pageIndex * this.tilesPerPage;
    const end = start + this.tilesPerPage;

    this.allTiles.forEach((tile, i) => {
      const onPage = (i >= start && i < end);
      tile.style.display = onPage ? '' : 'none';
      if (onPage) {
        tile.style.animation = 'none';
        void tile.offsetWidth;
        tile.style.animation = '';
        tile.style.animationDelay = ((i - start) * 55) + 'ms';
      }
    });

    document.querySelectorAll('#grid-pagination .page-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === pageIndex);
    });

    const firstTile = this.allTiles[start];
    if (firstTile) this.updateDescriptionBox(firstTile);
    if (window.setGlobalHueFromIndex) window.setGlobalHueFromIndex(start);
  },

  updateDescriptionBox: function (tile) {
    const title = tile.getAttribute('data-title');
    const description = tile.getAttribute('data-description');
    const panel = document.getElementById('app-preview-panel');
    const nameEl = document.getElementById('preview-app-name');
    const descEl = document.getElementById('preview-app-desc');
    const imgEl = document.getElementById('preview-image');
    const placeholderEl = document.getElementById('preview-image-placeholder');
    const openBtn = document.getElementById('preview-open-btn');
    if (!panel) return;

    panel.classList.remove('visible');
    setTimeout(() => {
      if (nameEl) nameEl.textContent = title || '';
      if (descEl) descEl.textContent = description || '';
      const previewSrc = tile.getAttribute('data-preview') || tile.querySelector('.tile-bg-img')?.getAttribute('src') || '';
      if (imgEl) { imgEl.src = previewSrc; imgEl.style.display = previewSrc ? 'block' : 'none'; }
      if (placeholderEl) placeholderEl.style.display = previewSrc ? 'none' : 'flex';
      if (openBtn) openBtn.onclick = () => { if (window.handleAppLaunch) window.handleAppLaunch(tile); };
      if (title) panel.classList.add('visible');
    }, 140);

    const titlePill = document.getElementById('floating-title-pill');
    if (titlePill) { titlePill.classList.add('hidden'); titlePill.style.opacity = '0'; }
  },

  refreshTiles: function () {
    this.allTiles = Array.from(document.querySelectorAll('.grid-tile:not(.webm-tile)'));
    this.totalPages = Math.ceil(this.allTiles.length / this.tilesPerPage);
    this.showPage(this.currentPage, true);
  },

  applyLayout: function (cols, rows) {
    const grid = document.getElementById('app-grid');
    if (!grid) return;
    const tileW = 140, tileH = 130, gap = 8;
    grid.style.gridTemplateColumns = `repeat(${cols}, ${tileW}px)`;
    grid.style.gridTemplateRows = `repeat(${rows}, ${tileH}px)`;
    this.tilesPerPage = cols * rows;
    this.totalPages = Math.ceil(this.allTiles.length / this.tilesPerPage);
    // Màj dots pagination
    const dotsEl = document.getElementById('grid-pagination');
    if (dotsEl) {
      dotsEl.innerHTML = '';
      for (let i = 0; i < this.totalPages; i++) {
        const dot = document.createElement('span');
        dot.className = 'page-dot' + (i === 0 ? ' active' : '');
        dotsEl.appendChild(dot);
      }
    }
    this.showPage(0, true);
    localStorage.setItem('gridLayout', JSON.stringify({ cols, rows }));
  },

  loadSavedLayout: function () {
    const saved = localStorage.getItem('gridLayout');
    if (!saved) return;
    try {
      const { cols, rows } = JSON.parse(saved);
      this.applyLayout(cols, rows);
    } catch {}
  }
};


/* ============================================================
   TILE REORDER — Drag & drop + choix de layout
   ============================================================ */
const TileReorder = {
  active: false,
  draggedTile: null,
  _holdTimer: null,
  _dragOverTile: null,

  // Layouts prédéfinis : { label, cols, rows }
  LAYOUTS: [
    { label: '5 × 2', cols: 5, rows: 2 },
    { label: '4 × 3', cols: 4, rows: 3 },
    { label: '3 × 4', cols: 3, rows: 4 },
    { label: '6 × 2', cols: 6, rows: 2 },
    { label: '4 × 2', cols: 4, rows: 2 },
    { label: '3 × 3', cols: 3, rows: 3 },
  ],

  init: function () {
    this._injectStyles();
    this._injectUI();
    this._bindHoldListeners();
  },

  _injectStyles: function () {
    const style = document.createElement('style');
    style.id = 'tile-reorder-styles';
    style.textContent = `
      #app-grid.reorder-mode .grid-tile {
        animation: tile-wobble 0.35s ease-in-out infinite alternate !important;
        cursor: grab !important;
        animation-delay: 0ms !important;
      }
      @keyframes tile-wobble {
        0%   { transform: rotate(-1.5deg) scale(1.02); }
        100% { transform: rotate(1.5deg)  scale(1.02); }
      }
      #app-grid.reorder-mode .grid-tile.tile-dragging {
        opacity: 0.45;
        transform: scale(0.92) !important;
        animation: none !important;
        cursor: grabbing !important;
      }
      #app-grid.reorder-mode .grid-tile.tile-drop-target {
        outline: 3px solid rgba(0, 210, 255, 0.9);
        outline-offset: 2px;
        transform: scale(1.06) !important;
        animation: none !important;
      }

      /* Barre du bas en mode réorga */
      #reorder-bar {
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: none;
        align-items: center;
        gap: 10px;
        background: rgba(20, 20, 30, 0.82);
        backdrop-filter: blur(18px);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 40px;
        padding: 10px 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.45);
      }
      #reorder-bar.visible { display: flex; }

      /* Bouton layout */
      .layout-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        background: rgba(255,255,255,0.08);
        border: 1.5px solid rgba(255,255,255,0.15);
        border-radius: 14px;
        padding: 8px 12px;
        cursor: pointer;
        transition: background 0.18s, border-color 0.18s, transform 0.15s;
        min-width: 56px;
      }
      .layout-btn:hover {
        background: rgba(0,200,255,0.18);
        border-color: rgba(0,200,255,0.6);
        transform: scale(1.07);
      }
      .layout-btn.active-layout {
        background: rgba(0,200,255,0.28);
        border-color: rgba(0,210,255,0.9);
      }
      .layout-btn canvas {
        display: block;
      }
      .layout-btn span {
        font-size: 11px;
        font-weight: 700;
        color: rgba(255,255,255,0.75);
        white-space: nowrap;
      }

      /* Séparateur */
      .reorder-sep {
        width: 1px;
        height: 40px;
        background: rgba(255,255,255,0.15);
        margin: 0 4px;
      }

      /* Bouton Terminer */
      #reorder-exit-btn {
        padding: 10px 24px;
        background: linear-gradient(135deg, rgba(0,200,255,0.9), rgba(0,140,220,0.9));
        border: 1.5px solid rgba(0,220,255,0.6);
        border-radius: 24px;
        color: white;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0,180,255,0.4);
        transition: transform 0.18s, box-shadow 0.18s;
        white-space: nowrap;
      }
      #reorder-exit-btn:hover {
        transform: scale(1.06);
        box-shadow: 0 6px 20px rgba(0,180,255,0.6);
      }

      /* Bouton d'accès rapide mode réorga */
      #reorder-toggle-btn {
        position: fixed;
        bottom: 70%;
        left: 6%;
        transform: translateX(-50%);
        z-index: 9998;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(255,255,255,0.18);
        backdrop-filter: blur(12px);
        border: 1.5px solid rgba(255,255,255,0.3);
        color: rgba(255,255,255,0.85);
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
      }
      #reorder-toggle-btn:hover {
        background: rgba(0,200,255,0.3);
        border-color: rgba(0,210,255,0.7);
        transform: translateX(-50%) scale(1.1);
        box-shadow: 0 6px 20px rgba(0,180,255,0.4);
      }
      #reorder-toggle-btn.active {
        background: rgba(0,200,255,0.35);
        border-color: rgba(0,210,255,0.9);
      }

      /* Toast */
      #reorder-toast {
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(-80px);
        z-index: 9999;
        background: rgba(0,0,0,0.72);
        backdrop-filter: blur(12px);
        color: white;
        font-size: 13px;
        font-weight: 700;
        padding: 10px 28px;
        border-radius: 30px;
        border: 1px solid rgba(255,255,255,0.18);
        pointer-events: none;
        transition: transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.35s;
        opacity: 0;
      }
      #reorder-toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
    `;
    document.head.appendChild(style);
  },

  _makeLayoutCanvas: function (cols, rows) {
    const canvas = document.createElement('canvas');
    const S = 5, G = 2;
    canvas.width  = cols * S + (cols - 1) * G;
    canvas.height = rows * S + (rows - 1) * G;
    canvas.style.width  = canvas.width  + 'px';
    canvas.style.height = canvas.height + 'px';
    const ctx = canvas.getContext('2d');
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.roundRect(c*(S+G), r*(S+G), S, S, 1);
        ctx.fill();
      }
    }
    return canvas;
  },

  _injectUI: function () {
    // Bouton toggle rapide
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'reorder-toggle-btn';
    toggleBtn.title = 'Réorganiser / Changer le layout';
    toggleBtn.textContent = '⊞';
    toggleBtn.addEventListener('click', () => {
      if (this.active) this.exitReorderMode();
      else this.enterReorderMode();
      if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    });
    document.body.appendChild(toggleBtn);

    // Barre principale
    const bar = document.createElement('div');
    bar.id = 'reorder-bar';

    // Boutons layout
    this.LAYOUTS.forEach(({ label, cols, rows }) => {
      const btn = document.createElement('button');
      btn.className = 'layout-btn';
      btn.dataset.cols = cols;
      btn.dataset.rows = rows;
      btn.appendChild(this._makeLayoutCanvas(cols, rows));
      const span = document.createElement('span');
      span.textContent = label;
      btn.appendChild(span);
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active-layout'));
        btn.classList.add('active-layout');
        CarouselManager.applyLayout(cols, rows);
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      });
      bar.appendChild(btn);
    });

    // Séparateur
    const sep = document.createElement('div');
    sep.className = 'reorder-sep';
    bar.appendChild(sep);

    // Bouton terminer
    const exitBtn = document.createElement('button');
    exitBtn.id = 'reorder-exit-btn';
    exitBtn.textContent = '✓ Terminer';
    exitBtn.addEventListener('click', () => this.exitReorderMode());
    bar.appendChild(exitBtn);

    document.body.appendChild(bar);

    // Toast
    const toast = document.createElement('div');
    toast.id = 'reorder-toast';
    toast.textContent = '✦ Maintenir appuyé · Glisse les icônes · Choisis le layout';
    document.body.appendChild(toast);
  },

  _markActiveLayout: function () {
    const saved = localStorage.getItem('gridLayout');
    let cols = 5, rows = 2;
    if (saved) { try { ({ cols, rows } = JSON.parse(saved)); } catch {} }
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.classList.toggle('active-layout', +btn.dataset.cols === cols && +btn.dataset.rows === rows);
    });
  },

  _bindHoldListeners: function () {
    const grid = document.getElementById('app-grid');
    if (!grid) return;

    grid.addEventListener('mousedown', (e) => {
      if (document.getElementById('auth-overlay')?.style.display !== 'none') return;
      const tile = e.target.closest('.grid-tile');
      if (!tile) return;
      if (this.active) { this._startDrag(tile); return; }
      this._holdTimer = setTimeout(() => {
        this._holdTimer = null;
        this.enterReorderMode();
        this._startDrag(tile);
      }, 500);
    });

    grid.addEventListener('mousemove', () => {
      if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
    });

    document.addEventListener('mouseup', () => {
      if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
      if (this.draggedTile) this._endDrag();
    });

    grid.addEventListener('mouseover', (e) => {
      if (!this.active || !this.draggedTile) return;
      const target = e.target.closest('.grid-tile');
      if (!target || target === this.draggedTile) return;
      if (this._dragOverTile === target) return;
      if (this._dragOverTile) this._dragOverTile.classList.remove('tile-drop-target');
      this._dragOverTile = target;
      target.classList.add('tile-drop-target');
    });

    // Touch
    grid.addEventListener('touchstart', (e) => {
      if (document.getElementById('auth-overlay')?.style.display !== 'none') return;
      const tile = e.target.closest('.grid-tile');
      if (!tile) return;
      if (this.active) { this._startDrag(tile); return; }
      this._holdTimer = setTimeout(() => {
        this._holdTimer = null;
        this.enterReorderMode();
        this._startDrag(tile);
      }, 500);
    }, { passive: true });

    grid.addEventListener('touchmove', (e) => {
      if (!this.active || !this.draggedTile) return;
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const target = el?.closest('.grid-tile');
      if (!target || target === this.draggedTile) return;
      if (this._dragOverTile === target) return;
      if (this._dragOverTile) this._dragOverTile.classList.remove('tile-drop-target');
      this._dragOverTile = target;
      target.classList.add('tile-drop-target');
    }, { passive: true });

    grid.addEventListener('touchend', () => {
      if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
      if (this.draggedTile) this._endDrag();
    });
  },

  _startDrag: function (tile) {
    this.draggedTile = tile;
    tile.classList.add('tile-dragging');
  },

  _endDrag: function () {
    if (!this.draggedTile) return;
    this.draggedTile.classList.remove('tile-dragging');
    if (this._dragOverTile && this._dragOverTile !== this.draggedTile) {
      this._dragOverTile.classList.remove('tile-drop-target');
      this._swapTiles(this.draggedTile, this._dragOverTile);
    } else if (this._dragOverTile) {
      this._dragOverTile.classList.remove('tile-drop-target');
    }
    this.draggedTile = null;
    this._dragOverTile = null;
  },

  _swapTiles: function (a, b) {
    const parent = a.parentNode;
    if (!parent || parent !== b.parentNode) return;
    const aNext = a.nextSibling === b ? a : a.nextSibling;
    parent.insertBefore(a, b);
    parent.insertBefore(b, aNext);
    this._saveOrder();
    CarouselManager.refreshTiles();
    [a, b].forEach(t => {
      t.style.transition = 'transform 0.15s ease';
      t.style.transform = 'scale(1.08)';
      setTimeout(() => { t.style.transform = ''; t.style.transition = ''; }, 150);
    });
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
  },

  enterReorderMode: function () {
    if (this.active) return;
    this.active = true;
    document.getElementById('app-grid')?.classList.add('reorder-mode');
    const bar = document.getElementById('reorder-bar');
    if (bar) bar.classList.add('visible');
    this._markActiveLayout();
    document.getElementById('reorder-toggle-btn')?.classList.add('active');
    const panel = document.getElementById('app-preview-panel');
    if (panel) panel.classList.remove('visible');
    const toast = document.getElementById('reorder-toast');
    if (toast) { toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); }
  },

  exitReorderMode: function () {
    if (!this.active) return;
    this.active = false;
    if (this.draggedTile) { this.draggedTile.classList.remove('tile-dragging'); this.draggedTile = null; }
    if (this._dragOverTile) { this._dragOverTile.classList.remove('tile-drop-target'); this._dragOverTile = null; }
    document.getElementById('reorder-toggle-btn')?.classList.remove('active');
    document.getElementById('app-grid')?.classList.remove('reorder-mode');
    document.getElementById('reorder-bar')?.classList.remove('visible');
    CarouselManager.refreshTiles();
  },

  _saveOrder: function () {
    const order = Array.from(document.querySelectorAll('.grid-tile:not(.webm-tile)'))
      .map(t => t.getAttribute('data-app') || t.getAttribute('data-title') || '');
    localStorage.setItem('tileOrder', JSON.stringify(order));
  },

  loadSavedOrder: function () {
    const saved = localStorage.getItem('tileOrder');
    if (!saved) return;
    let order; try { order = JSON.parse(saved); } catch { return; }
    const grid = document.getElementById('app-grid');
    if (!grid) return;
    const tileMap = {};
    Array.from(grid.querySelectorAll('.grid-tile:not(.webm-tile)')).forEach(t => {
      tileMap[t.getAttribute('data-app') || t.getAttribute('data-title') || ''] = t;
    });
    order.forEach(key => { if (tileMap[key]) grid.appendChild(tileMap[key]); });
  }
};


/* ============================================================
   TILE EDITOR
   ============================================================ */
const TileEditor = {
  currentTile: null,
  selectedGrad: null,

  open: function (tile) {
    this.currentTile = tile;
    this.selectedGrad = null;
    const modal = document.getElementById('tile-edit-modal');
    const nameInput = document.getElementById('tile-edit-name');
    if (!modal || !nameInput) return;
    nameInput.value = tile.getAttribute('data-title') || '';
    document.querySelectorAll('.edit-color-swatch').forEach(s => s.classList.remove('selected'));
    modal.style.display = 'flex';
    setTimeout(() => nameInput.focus(), 50);
  },

  save: function () {
    if (!this.currentTile) return;
    const nameInput = document.getElementById('tile-edit-name');
    const newName = nameInput.value.trim();
    if (newName) {
      this.currentTile.setAttribute('data-title', newName);
      const label = this.currentTile.querySelector('.tile-label');
      if (label) label.textContent = newName;
    }
    if (this.selectedGrad) this.currentTile.style.background = this.selectedGrad;
    const appKey = this.currentTile.getAttribute('data-app') || this.currentTile.getAttribute('data-title');
    if (appKey) {
      const saved = JSON.parse(localStorage.getItem('tileCustom') || '{}');
      saved[appKey] = { name: newName || null, grad: this.selectedGrad || null };
      localStorage.setItem('tileCustom', JSON.stringify(saved));
    }
    this.close();
  },

  close: function () {
    const modal = document.getElementById('tile-edit-modal');
    if (modal) modal.style.display = 'none';
    this.currentTile = null;
    this.selectedGrad = null;
  },

  loadSaved: function () {
    const saved = JSON.parse(localStorage.getItem('tileCustom') || '{}');
    document.querySelectorAll('.grid-tile').forEach(tile => {
      const appKey = tile.getAttribute('data-app') || tile.getAttribute('data-title');
      if (appKey && saved[appKey]) {
        if (saved[appKey].name) {
          tile.setAttribute('data-title', saved[appKey].name);
          const label = tile.querySelector('.tile-label');
          if (label) label.textContent = saved[appKey].name;
        }
        if (saved[appKey].grad) tile.style.background = saved[appKey].grad;
      }
    });
  }
};


document.addEventListener('DOMContentLoaded', () => {
  TileEditor.loadSaved();
  TileReorder.loadSavedOrder();
  TileReorder.init();
  CarouselManager.init();
  CarouselManager.loadSavedLayout();

  document.getElementById('tile-edit-save')?.addEventListener('click', () => TileEditor.save());
  document.getElementById('tile-edit-cancel')?.addEventListener('click', () => TileEditor.close());
  document.getElementById('tile-edit-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) TileEditor.close();
  });
  document.querySelectorAll('.edit-color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.edit-color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      TileEditor.selectedGrad = swatch.getAttribute('data-grad');
    });
  });
});
