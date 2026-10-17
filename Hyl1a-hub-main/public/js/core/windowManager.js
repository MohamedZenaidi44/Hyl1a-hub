/**
 * WindowManager — optimized version
 * Fixes: memory leaks on close, drag offset bug, z-index cap,
 * touch drag support, event listener cleanup.
 */
const WindowManager = {
  windows: {},
  zIndexCounter: 100,
  _dragListeners: {}, // track per-window drag listeners for cleanup

  openWindow: function (appId, title, contentRenderFn) {
    if (typeof AudioManager !== 'undefined') AudioManager.playWindowOpen();

    // Already open → focus + bounce
    if (this.windows[appId]) {
      this.focusWindow(appId);
      const win = this.windows[appId];
      win.classList.remove('anim-pop');
      void win.offsetWidth;
      win.classList.add('anim-pop');
      return;
    }

    const layer = document.getElementById('window-layer');
    const win = document.createElement('div');
    win.className = 'app-window';
    win.id = `window-${appId}`;

    // Cap z-index to avoid overflow issues after many opens/closes
    if (this.zIndexCounter > 9000) this.zIndexCounter = 200;
    this.zIndexCounter++;
    win.style.zIndex = this.zIndexCounter;

    layer.appendChild(win);
    this.windows[appId] = win;

    win.innerHTML = `
      <div class="window-body glossy-panel open anim-window-open">
        <div class="window-header bar-glint">
          <span class="window-title">${title}</span>
          <button class="window-close-btn" aria-label="Fermer">✕</button>
        </div>
        <div class="window-content" id="content-${appId}"></div>
      </div>
    `;

    const winBody = win.querySelector('.window-body');
    const contentArea = win.querySelector(`#content-${appId}`);

    // Staggered position so windows don't stack exactly — centré sur l'écran
    const offset = ((Object.keys(this.windows).length - 1) * 24) % 120;
    win.style.left = '50%';
    win.style.top  = '50%';
    win.style.transform = `translate(calc(-50% + ${offset}px), calc(-50% + ${offset}px))`;

    // Render app content (lazy — only now)
    if (contentRenderFn) {
      try {
        contentRenderFn(contentArea);
      } catch (e) {
        contentArea.innerHTML = `<div style="padding:20px;color:#f66;">Erreur de chargement : ${e.message}</div>`;
        console.error(`[WindowManager] Error rendering ${appId}:`, e);
      }
    }

    // Focus on click anywhere in window
    const onFocus = () => this.focusWindow(appId);
    win.addEventListener('mousedown', onFocus);

    // Prevent wheel from bubbling to carousel
    win.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });

    // Close button
    const closeBtn = winBody.querySelector('.window-close-btn');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeWindow(appId);
    });

    // Draggable
    this._setupDraggable(win, winBody.querySelector('.window-header'), appId);

    this.focusWindow(appId);
  },

  closeWindow: function (appId) {
    if (typeof AudioManager !== 'undefined') AudioManager.playWindowClose();

    const win = this.windows[appId];
    if (!win) return;

    const winBody = win.querySelector('.window-body');
    winBody.classList.remove('anim-window-open');
    winBody.classList.add('anim-window-close');

    if (window.restoreCoverflow) window.restoreCoverflow();

    // Cleanup drag listeners
    if (this._dragListeners[appId]) {
      const { onMove, onUp } = this._dragListeners[appId];
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      delete this._dragListeners[appId];
    }

    setTimeout(() => {
      if (win.parentNode) win.parentNode.removeChild(win);
      delete this.windows[appId];
    }, 300);
  },

  focusWindow: function (appId) {
    const win = this.windows[appId];
    if (!win) return;

    if (this.zIndexCounter > 9000) this.zIndexCounter = 200;
    this.zIndexCounter++;
    win.style.zIndex = this.zIndexCounter;

    // Active class: only on focused window
    Object.values(this.windows).forEach(w => {
      w.querySelector('.window-body')?.classList.remove('active');
    });
    win.querySelector('.window-body')?.classList.add('active');
  },

  _setupDraggable: function (winElement, handleElement, appId) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    const getPos = () => {
      const rect = winElement.getBoundingClientRect();
      return {
        left: rect.left,
        top:  rect.top,
      };
    };

    const onStart = (clientX, clientY) => {
      isDragging = true;
      startX = clientX;
      startY = clientY;
      const pos = getPos();
      startLeft = pos.left;
      startTop  = pos.top;
      // Passer en positionnement absolu px pour le drag
      winElement.style.transform = 'none';
      winElement.style.left = `${startLeft}px`;
      winElement.style.top  = `${startTop}px`;
      winElement.style.transition = 'none';
      this.focusWindow(appId);
    };

    const onMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startX;
      const dy = clientY - startY;

      // Clamp to viewport so window can't fully escape
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const ww = winElement.offsetWidth;
      const wh = winElement.offsetHeight;

      const newLeft = Math.min(Math.max(startLeft + dx, -ww + 60), vw - 60);
      const newTop  = Math.min(Math.max(startTop  + dy, 0), vh - 40);

      winElement.style.left = `${newLeft}px`;
      winElement.style.top  = `${newTop}px`;
    };

    const onUp = () => {
      if (!isDragging) return;
      isDragging = false;
      winElement.style.transition = 'box-shadow 0.3s ease';
    };

    handleElement.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      onStart(e.clientX, e.clientY);
    });
    handleElement.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      if (t) onStart(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);

    // Store refs for cleanup on close
    this._dragListeners[appId] = { onMove, onUp };
  }
};
