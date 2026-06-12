/**
 * gba.js  —  apps/gba/js/gba.js
 *
 * Menu carousel façon DS pour la sélection des ROMs GBA,
 * + lancement de l'iframe gba_player.html avec toolbar Save/Load par slots.
 */

/* ── ROM library ──────────────────────────────────────────────────────────── */
const ROM_LIBRARY = [
  { label: 'Pokémon FireRed',          file: 'https://your-storage.com/roms/gba/firered.gba', cover: '' },
  { label: 'Pokémon Émeraude',         file: 'https://your-storage.com/roms/gba/emerald.gba', cover: '' },
  { label: 'Mario Kart Super Circuit', file: 'https://your-storage.com/roms/gba/mksc.gba',    cover: '' },
];

window.GBA_GAMES = ROM_LIBRARY;

/* ── Constants ────────────────────────────────────────────────────────────── */
const PLATFORM     = 'gba';
const PLAYER_PAGE  = 'apps/gba/gba_player.html';
const SAVE_TIMEOUT = 6000;

/* ── Module state ─────────────────────────────────────────────────────────── */
let currentSlot          = 1;
let currentGameName      = '';
let iframeEl              = null;
let pendingSaveResolve    = null;
let pendingSaveTimer      = null;
let currentGbaCoverIndex  = 0;

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ENTRY POINT                                                              */
/* ══════════════════════════════════════════════════════════════════════════ */
export default function init(container) {
  if (ROM_LIBRARY.length === 1) {
    launchRom(container, ROM_LIBRARY[0].file, ROM_LIBRARY[0].label);
  } else {
    renderGbaMenu(container);
  }
  window.addEventListener('message', onIframeMessage);
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  CAROUSEL MENU (style DS)                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderGbaMenu(container) {
  if (!document.getElementById('gba-simple-cover-styles')) {
    const style = document.createElement('style');
    style.id = 'gba-simple-cover-styles';
    style.textContent = `
      .gba-menu-wrapper {
        display: flex; flex-direction: column; width: 100%; height: 100%; font-family: 'Inter', sans-serif;
        background: transparent; color: #fff; overflow: hidden; position: relative;
        animation: gbaFadeIn 0.3s ease-out;
      }
      @keyframes gbaFadeIn {
        from { opacity: 0; transform: scale(1.02); }
        to { opacity: 1; transform: scale(1); }
      }

      .gba-covers-row {
        flex: 1; display: flex; align-items: center; justify-content: flex-start;
        padding: 0 50vw;
        overflow-x: hidden; scroll-behavior: smooth; gap: 40px;
      }

      .gba-cover-item {
        flex-shrink: 0; width: 220px; height: 220px; border-radius: 8px; cursor: pointer;
        position: relative; transition: all 0.3s cubic-bezier(0.2, 1, 0.3, 1);
        filter: brightness(0.5) grayscale(0.8);
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      }

      .gba-cover-item.active {
        filter: brightness(1) grayscale(0);
        transform: scale(1.15) translateY(-10px);
        box-shadow: 0 0 40px rgba(167,139,250,0.6), 0 20px 40px rgba(0,0,0,0.8);
        z-index: 10;
        border: 2px solid rgba(255,255,255,0.8);
      }

      .gba-cover-img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; display: block; }

      .gba-fallback {
        width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #4c1d95, #1a1a2e); border-radius: 6px; text-align: center; padding: 15px;
      }

      .gba-info-panel {
        height: 160px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
        padding-bottom: 30px; gap: 12px; z-index: 1000;
        background: linear-gradient(to top, rgba(0,0,0,0.95), transparent); border-top: 1px solid rgba(255,255,255,0.1);
      }

      .gba-title { font-size: 34px; font-weight: 900; color: white; text-shadow: 0 4px 15px rgba(0,0,0,1); margin: 0; }
      .gba-subtitle { font-size: 15px; color: #a78bfa; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; }

      .gba-controls { display: flex; gap: 25px; margin-top: 15px; position: relative; z-index: 1001; }
      .gba-btn {
        display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3);
        border-radius: 40px; padding: 10px 25px; font-size: 16px; color: #fff; font-weight: 800; cursor: pointer; transition: all 0.2s;
      }
      .gba-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.05); border-color: #fff; }
      .gba-btn.primary {
        background: #7c3aed; color: #fff; border: none;
        box-shadow: 0 0 20px rgba(124,58,237,0.4);
        width: 240px; justify-content: center;
      }
      .gba-btn.primary:hover { background: #9b5cf6; transform: scale(1.1); box-shadow: 0 0 30px rgba(124,58,237,0.7); }
      .gba-btn b { background: #fff; color: #000; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 13px; }

      .gba-arrow {
        position: absolute; top: calc(50% - 80px); transform: translateY(-50%); z-index: 1000; width: 80px; height: 120px;
        border-radius: 18px; border: 2px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.7);
        color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; box-shadow: 0 10px 40px rgba(0,0,0,0.6); outline: none;
      }
      .gba-arrow:hover { background: rgba(0,0,0,0.9); transform: translateY(-50%) scale(1.1); border-color: #a78bfa; }
      .gba-arrow:active { transform: translateY(-50%) scale(0.95); }

      #gba-btn-prev { left: 40px; }
      #gba-btn-next { right: 40px; }
      .gba-arrow svg { width: 45px; height: 45px; opacity: 1; stroke: #a78bfa; }
      .gba-arrow:hover svg { stroke: #fff; }
    `;
    document.head.appendChild(style);
  }

  if (currentGbaCoverIndex < 0) currentGbaCoverIndex = 0;
  if (currentGbaCoverIndex >= ROM_LIBRARY.length) currentGbaCoverIndex = ROM_LIBRARY.length - 1;

  let coversHtml = '';
  ROM_LIBRARY.forEach((rom, index) => {
    const isFallback = !rom.cover;
    const content = isFallback
      ? `<div class="gba-fallback">
           <span style="font-size: 40px;">🎮</span>
           <span style="font-size: 12px; opacity: 0.7; margin-top: 5px;">GBA</span>
           <span style="font-weight: bold; margin-top: 10px; font-size: 16px;">${rom.label}</span>
         </div>`
      : `<img src="${rom.cover}" class="gba-cover-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
         <div class="gba-fallback" style="display:none;">
           <span style="font-size: 40px;">🎮</span>
           <span style="font-weight: bold; margin-top: 10px; font-size: 16px;">${rom.label}</span>
         </div>`;

    coversHtml += `
      <div class="gba-cover-item" id="gba-item-${index}" data-index="${index}">
        ${content}
      </div>
    `;
  });

  const html = `
    <div class="gba-menu-wrapper" tabindex="-1">
      <button id="gba-btn-prev" class="gba-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button id="gba-btn-next" class="gba-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="gba-covers-row" id="gba-scroll-row">
        ${coversHtml}
      </div>
      <div class="gba-info-panel">
        <h2 class="gba-title" id="gba-ui-title">...</h2>
        <div class="gba-subtitle">Game Boy Advance</div>
        <div class="gba-controls">
           <button class="gba-btn primary" id="gba-launch-btn"><b>A</b> JOUER</button>
           <button class="gba-btn" id="gba-quit-btn"><b>B</b> QUITTER</button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  const wrapper = container.querySelector('.gba-menu-wrapper');
  wrapper.focus();

  if (ROM_LIBRARY.length > 0) {
    updateGbaCarousel(container);

    const items = container.querySelectorAll('.gba-cover-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.getAttribute('data-index'), 10);
        if (currentGbaCoverIndex === index) {
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          startRom(container, ROM_LIBRARY[currentGbaCoverIndex]);
        } else {
          currentGbaCoverIndex = index;
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          updateGbaCarousel(container);
        }
      });
    });

    container.querySelector('#gba-launch-btn').addEventListener('click', () => {
      if (typeof AudioManager !== 'undefined') AudioManager.playClick();
      startRom(container, ROM_LIBRARY[currentGbaCoverIndex]);
    });

    container.querySelector('#gba-btn-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentGbaCoverIndex > 0) {
        currentGbaCoverIndex--;
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        updateGbaCarousel(container);
      }
    });

    container.querySelector('#gba-btn-next').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentGbaCoverIndex < ROM_LIBRARY.length - 1) {
        currentGbaCoverIndex++;
        if (typeof AudioManager !== 'undefined') AudioManager.playClick();
        updateGbaCarousel(container);
      }
    });

    const keyHandler = (e) => {
      const menuWrapper = document.querySelector('.gba-menu-wrapper');
      if (!menuWrapper) {
        window.removeEventListener('keydown', keyHandler, true);
        return;
      }
      const emuActive = document.getElementById('gba-emu-iframe');
      if (emuActive) return;

      const keys = ['ArrowRight', 'ArrowLeft', 'Enter', 'b', 'Escape'];
      if (keys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'ArrowRight') {
          if (currentGbaCoverIndex < ROM_LIBRARY.length - 1) {
            currentGbaCoverIndex++;
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            updateGbaCarousel(container);
          }
        }
        else if (e.key === 'ArrowLeft') {
          if (currentGbaCoverIndex > 0) {
            currentGbaCoverIndex--;
            if (typeof AudioManager !== 'undefined') AudioManager.playClick();
            updateGbaCarousel(container);
          }
        }
        else if (e.key === 'Enter') {
          if (typeof AudioManager !== 'undefined') AudioManager.playClick();
          startRom(container, ROM_LIBRARY[currentGbaCoverIndex]);
        }
        else if (e.key === 'b' || e.key === 'Escape') {
          container.querySelector('#gba-quit-btn').click();
        }
      }
    };

    if (window._gbaKeyHandler) window.removeEventListener('keydown', window._gbaKeyHandler, true);
    window._gbaKeyHandler = keyHandler;
    window.addEventListener('keydown', keyHandler, true);
  }

  container.querySelector('#gba-quit-btn').addEventListener('click', () => {
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    if (window._gbaKeyHandler) {
      window.removeEventListener('keydown', window._gbaKeyHandler, true);
      window._gbaKeyHandler = null;
    }
    if (window.AppRegistry?.gba?.close) window.AppRegistry.gba.close();
  });
}

function updateGbaCarousel(container) {
  const row = container.querySelector('#gba-scroll-row');
  const items = container.querySelectorAll('.gba-cover-item');
  const titleEl = container.querySelector('#gba-ui-title');

  if (!row || !items.length) return;

  const rom = ROM_LIBRARY[currentGbaCoverIndex];
  if (titleEl) titleEl.textContent = rom.label;

  items.forEach((item, index) => {
    if (index === currentGbaCoverIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const activeItem = items[currentGbaCoverIndex];
  if (activeItem) {
    const itemWidth = 220;
    const gap = 40;
    const targetScroll = (currentGbaCoverIndex * (itemWidth + gap)) + (itemWidth / 2);
    row.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  START ROM  (depuis le carousel)                                          */
/* ══════════════════════════════════════════════════════════════════════════ */
function startRom(container, rom) {
  if (window._gbaKeyHandler) {
    window.removeEventListener('keydown', window._gbaKeyHandler, true);
    window._gbaKeyHandler = null;
  }
  if (typeof AudioManager !== 'undefined' && AudioManager.appBgm) {
    AudioManager.appBgm.pause();
    AudioManager.appBgm.currentTime = 0;
    AudioManager.appBgm = null;
  }
  launchRom(container, rom.file, rom.label);
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  LAUNCH ROM                                                               */
/* ══════════════════════════════════════════════════════════════════════════ */
function launchRom(container, romUrl, romName) {
  currentGameName = romName;

  container.innerHTML = '';
  container.style.cssText = `
    display: flex; flex-direction: column;
    width: 100%; height: 100%;
    background: #0a0a0a; color: #e0e0e0;
    font-family: 'Inter', sans-serif; overflow: hidden;
    animation: gbaFadeIn 0.3s ease-out;
  `;

  // ── Bouton retour ────────────────────────────────────────────────────────
  const backBtn = mkEl('div', { id: 'gba-back-btn' });
  backBtn.innerHTML = `<span style="background:white;color:black;border-radius:50%;width:20px;height:20px;text-align:center;line-height:20px;font-size:13px;display:inline-block;">B</span> Quitter`;
  Object.assign(backBtn.style, {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: '40px', padding: '6px 18px', color: '#fff',
    cursor: 'pointer', fontWeight: '700', transition: '0.2s',
    width: 'fit-content',
  });
  backBtn.addEventListener('mouseover', () => backBtn.style.background = 'rgba(255,255,255,0.2)');
  backBtn.addEventListener('mouseout', () => backBtn.style.background = 'rgba(255,255,255,0.1)');
  backBtn.addEventListener('click', () => {
    if (typeof AudioManager !== 'undefined') AudioManager.playClick();
    if (ROM_LIBRARY.length === 1) {
      if (window.AppRegistry?.gba?.close) window.AppRegistry.gba.close();
    } else {
      renderGbaMenu(container);
    }
  });

  const titleEl = mkEl('h3', {}, romName);
  Object.assign(titleEl.style, {
    margin: '0', color: 'white', fontSize: '18px',
    fontWeight: '400', letterSpacing: '1px', flex: '1', textAlign: 'center',
  });

  const topBar = mkEl('div');
  Object.assign(topBar.style, {
    padding: '10px 20px', background: 'rgba(20,20,20,0.95)',
    backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center',
    gap: '12px', borderBottom: '2px solid rgba(255,255,255,0.08)',
    zIndex: '100', flexWrap: 'wrap',
  });
  topBar.append(backBtn, titleEl);

  // ── Wrapper iframe ───────────────────────────────────────────────────────
  const iframeWrap = mkEl('div');
  Object.assign(iframeWrap.style, {
    flex: '1', width: '100%', overflow: 'hidden', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(circle,#222,#000)',
  });

  const hash = `#rom=${encodeURIComponent(romUrl)}&name=${encodeURIComponent(romName)}`;
  iframeEl = mkEl('iframe');
  iframeEl.id  = 'gba-emu-iframe';
  iframeEl.src = PLAYER_PAGE + hash;
  iframeEl.dataset.gameName = romName;
  Object.assign(iframeEl.style, {
    width: '100%', height: '100%', border: 'none', display: 'block', maxWidth: '1280px',
  });
  iframeEl.setAttribute('allow', 'autoplay; fullscreen');
  iframeEl.setAttribute('allowfullscreen', 'true');

  iframeWrap.appendChild(iframeEl);

  // ── Toolbar Save/Load ────────────────────────────────────────────────────
  const toolbar = buildToolbar();

  container.appendChild(topBar);
  container.appendChild(iframeWrap);
  container.appendChild(toolbar);

  refreshSlotLabels();

  // Focus auto de l'iframe
  iframeEl.onload = () => {
    setTimeout(() => {
      iframeEl.focus();
      if (iframeEl.contentWindow) iframeEl.contentWindow.focus();
    }, 500);
  };
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  TOOLBAR                                                                  */
/* ══════════════════════════════════════════════════════════════════════════ */
function buildToolbar() {
  const bar = mkEl('div');
  Object.assign(bar.style, {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 16px', background: '#111827',
    borderTop: '1px solid #2d2d3d', flexWrap: 'wrap',
    flexShrink: '0',
  });

  const slotLabel = mkEl('span', {}, 'Slot :');
  Object.assign(slotLabel.style, { color: '#ccc', fontSize: '13px' });

  const slotSelect = mkEl('select');
  slotSelect.id = 'emu-slot-select';
  Object.assign(slotSelect.style, {
    background: '#1e1e2e', color: '#e0e0e0', border: '1px solid #444',
    borderRadius: '6px', padding: '4px 8px', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: '13px',
  });
  [1, 2, 3].forEach(n => {
    const opt = mkEl('option', { value: n }, `Slot ${n} — vide`);
    slotSelect.appendChild(opt);
  });
  slotSelect.value = currentSlot;
  slotSelect.addEventListener('change', () => {
    currentSlot = parseInt(slotSelect.value, 10);
  });

  const saveBtn = mkEl('button', { id: 'emu-save-btn' }, '💾 Save');
  styleBtn(saveBtn, '#7c3aed');
  saveBtn.addEventListener('click', handleSave);

  const loadBtn = mkEl('button', { id: 'emu-load-btn' }, '📂 Load');
  styleBtn(loadBtn, '#0e7490');
  loadBtn.addEventListener('click', handleLoad);

  bar.append(slotLabel, slotSelect, saveBtn, loadBtn);
  return bar;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SAVE FLOW                                                                */
/* ══════════════════════════════════════════════════════════════════════════ */
async function handleSave() {
  if (!window.SaveManager) { showToast('❌ SaveManager introuvable', 'error'); return; }

  const btn = document.getElementById('emu-save-btn');
  setLoading(btn, true);

  try {
    const stateArray = await requestStateFromIframe();
    const blob = new Blob([new Uint8Array(stateArray)], { type: 'application/octet-stream' });
    const label = `Slot ${currentSlot} – ${new Date().toLocaleString()}`;

    await window.SaveManager.saveState(PLATFORM, currentGameName, blob, currentSlot, label);
    await refreshSlotLabels();
    showToast(`💾 Slot ${currentSlot} sauvegardé !`, 'success');
  } catch (err) {
    console.error('[gba.js] Save failed:', err);
    showToast(`❌ Échec : ${err.message}`, 'error');
  } finally {
    setLoading(btn, false);
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  LOAD FLOW                                                                */
/* ══════════════════════════════════════════════════════════════════════════ */
async function handleLoad() {
  if (!window.SaveManager) { showToast('❌ SaveManager introuvable', 'error'); return; }

  const btn = document.getElementById('emu-load-btn');
  setLoading(btn, true);

  try {
    const uint8 = await window.SaveManager.loadState(PLATFORM, currentGameName, currentSlot);
    sendToIframe({ type: 'LOAD_SAVE_STATE', state: Array.from(uint8) });
    showToast(`📂 Slot ${currentSlot} chargé !`, 'success');
  } catch (err) {
    console.error('[gba.js] Load failed:', err);
    showToast(`❌ Échec : ${err.message}`, 'error');
  } finally {
    setLoading(btn, false);
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  iframe COMMUNICATION                                                     */
/* ══════════════════════════════════════════════════════════════════════════ */
function requestStateFromIframe() {
  return new Promise((resolve, reject) => {
    if (pendingSaveResolve) {
      clearTimeout(pendingSaveTimer);
      pendingSaveResolve = null;
    }
    pendingSaveResolve = resolve;
    pendingSaveTimer = setTimeout(() => {
      pendingSaveResolve = null;
      reject(new Error("L'iframe n'a pas répondu dans les délais."));
    }, SAVE_TIMEOUT);
    sendToIframe({ type: 'TRIGGER_SAVE' });
  });
}

function onIframeMessage(event) {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SAVE_STATE_RESPONSE' && pendingSaveResolve && data.state) {
    clearTimeout(pendingSaveTimer);
    const cb = pendingSaveResolve;
    pendingSaveResolve = null;
    cb(data.state);
  }
}

function sendToIframe(msg) {
  if (!iframeEl?.contentWindow) {
    console.warn('[gba.js] iframe non prête.');
    return;
  }
  iframeEl.contentWindow.postMessage(msg, '*');
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SLOT LABELS                                                              */
/* ══════════════════════════════════════════════════════════════════════════ */
async function refreshSlotLabels() {
  const select = document.getElementById('emu-slot-select');
  if (!select || !window.SaveManager || !currentGameName) return;
  try {
    const meta = await window.SaveManager.getSlotsMeta(PLATFORM, currentGameName);
    Array.from(select.options).forEach(opt => {
      const n    = parseInt(opt.value, 10);
      const slot = meta[`slot_${n}`];
      if (slot?.date) {
        const d = new Date(slot.date);
        opt.text = `Slot ${n} — ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        opt.text = `Slot ${n} — vide`;
      }
    });
  } catch (e) {
    console.warn('[gba.js] Impossible de charger les métadonnées des slots :', e);
  }
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  TOAST                                                                    */
/* ══════════════════════════════════════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  document.getElementById('gba-toast')?.remove();
  const t = mkEl('div', { id: 'gba-toast' }, msg);
  Object.assign(t.style, {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    background: type === 'error' ? '#7f1d1d' : '#14532d',
    color: '#fff', padding: '10px 22px', borderRadius: '8px',
    fontFamily: 'monospace', fontSize: '14px', zIndex: '9999',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)', pointerEvents: 'none',
    transition: 'opacity 0.4s ease', opacity: '1',
  });
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3000);
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  DOM helpers                                                              */
/* ══════════════════════════════════════════════════════════════════════════ */
function mkEl(tag, props = {}, text) {
  const el = document.createElement(tag);
  Object.assign(el, props);
  if (text !== undefined) el.textContent = text;
  return el;
}

function styleBtn(btn, bg) {
  Object.assign(btn.style, {
    background: bg, color: '#fff', border: 'none',
    borderRadius: '6px', padding: '6px 14px', cursor: 'pointer',
    fontFamily: 'monospace', fontSize: '13px', fontWeight: '600',
    transition: 'opacity 0.2s',
  });
  btn.addEventListener('mouseenter', () => (btn.style.opacity = '0.85'));
  btn.addEventListener('mouseleave', () => (btn.style.opacity = '1'));
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled     = loading;
  btn.style.opacity = loading ? '0.5' : '1';
  btn.style.cursor  = loading ? 'wait' : 'pointer';
}
