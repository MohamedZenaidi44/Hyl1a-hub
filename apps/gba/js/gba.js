/**
 * gba.js  —  apps/gba/js/gba.js
 *
 * Chargé en lazy-import par app.js via :
 *   _lazy(container, '../../../apps/gba/js/gba.js')
 *
 * app.js appelle  mod.default(container)  avec le fsContainer déjà dans le DOM.
 * Ce module :
 *   1. Crée un sélecteur de ROMs
 *   2. Crée l'iframe gba_player.html avec le bon hash
 *   3. Injecte la toolbar Save / Load
 *   4. Gère la communication postMessage avec l'iframe
 *   5. Délègue upload/download à window.SaveManager
 */

/* ── ROM library ──────────────────────────────────────────────────────────── */
// Ajoute tes ROMs ici : { label, url }
// Les URLs peuvent être des liens directs (archive.org, ton propre storage, etc.)
const ROM_LIBRARY = [
  // Exemples — remplace par tes vraies URLs
  { label: 'Pokémon FireRed',   url: 'https://your-storage.com/roms/gba/firered.gba' },
  { label: 'Pokémon Émeraude',  url: 'https://your-storage.com/roms/gba/emerald.gba' },
  { label: 'Mario Kart Super Circuit', url: 'https://your-storage.com/roms/gba/mksc.gba' },
];

/* ── Constants ────────────────────────────────────────────────────────────── */
const PLATFORM     = 'gba';
const PLAYER_PAGE  = 'apps/gba/gba_player.html';   // chemin relatif depuis index.html
const SAVE_TIMEOUT = 6000;

/* ── Module state ─────────────────────────────────────────────────────────── */
let currentSlot        = 1;
let currentGameName    = '';
let iframeEl           = null;
let pendingSaveResolve = null;
let pendingSaveTimer   = null;

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ENTRY POINT — appelé par app.js                                          */
/* ══════════════════════════════════════════════════════════════════════════ */
export default function init(container) {
  container.style.cssText = `
    display: flex; flex-direction: column;
    width: 100%; height: 100%;
    background: #0a0a0a; color: #e0e0e0;
    font-family: monospace; overflow: hidden;
  `;

  // ── Bouton retour ────────────────────────────────────────────────────────
  const backBtn = mkEl('button', {}, '← Retour');
  Object.assign(backBtn.style, {
    position: 'absolute', top: '12px', left: '12px', zIndex: '100',
    background: 'rgba(0,0,0,0.5)', border: '1px solid #444',
    color: '#ccc', borderRadius: '8px', padding: '6px 14px',
    cursor: 'pointer', fontFamily: 'monospace', fontSize: '13px',
  });
  backBtn.addEventListener('click', () => {
    // Cherche la fonction close enregistrée par app.js
    if (window.AppRegistry?.gba?.close) window.AppRegistry.gba.close();
  });
  container.appendChild(backBtn);

  // ── Si une seule ROM → lancer directement, sinon afficher le sélecteur ──
  if (ROM_LIBRARY.length === 1) {
    launchRom(container, ROM_LIBRARY[0].url, ROM_LIBRARY[0].label);
  } else {
    renderRomPicker(container);
  }

  // ── Écoute les messages de l'iframe ─────────────────────────────────────
  window.addEventListener('message', onIframeMessage);
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ROM PICKER                                                               */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderRomPicker(container) {
  const picker = mkEl('div');
  Object.assign(picker.style, {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '14px',
    width: '100%', height: '100%', padding: '20px',
  });

  const title = mkEl('h2', {}, '🎮 Choisissez une ROM GBA');
  Object.assign(title.style, { marginBottom: '8px', fontSize: '20px', color: '#a78bfa' });
  picker.appendChild(title);

  ROM_LIBRARY.forEach(rom => {
    const btn = mkEl('button', {}, rom.label);
    Object.assign(btn.style, {
      background: '#1e1e2e', border: '1px solid #4c1d95',
      color: '#e0e0e0', borderRadius: '10px',
      padding: '12px 28px', cursor: 'pointer',
      fontFamily: 'monospace', fontSize: '15px',
      width: '320px', textAlign: 'left',
      transition: 'background 0.2s',
    });
    btn.addEventListener('mouseenter', () => (btn.style.background = '#2e2e4e'));
    btn.addEventListener('mouseleave', () => (btn.style.background = '#1e1e2e'));
    btn.addEventListener('click', () => {
      picker.remove();
      launchRom(container, rom.url, rom.label);
    });
    picker.appendChild(btn);
  });

  container.appendChild(picker);
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  LAUNCH ROM                                                               */
/* ══════════════════════════════════════════════════════════════════════════ */
function launchRom(container, romUrl, romName) {
  currentGameName = romName;

  // ── Wrapper iframe ───────────────────────────────────────────────────────
  const iframeWrap = mkEl('div');
  Object.assign(iframeWrap.style, {
    flex: '1', width: '100%', overflow: 'hidden', position: 'relative',
  });

  const hash = `#rom=${encodeURIComponent(romUrl)}&name=${encodeURIComponent(romName)}`;
  iframeEl = mkEl('iframe');
  iframeEl.id  = 'gba-emu-iframe';
  iframeEl.src = PLAYER_PAGE + hash;
  iframeEl.dataset.gameName = romName;
  Object.assign(iframeEl.style, {
    width: '100%', height: '100%', border: 'none', display: 'block',
  });
  // Permissions nécessaires pour EmulatorJS
  iframeEl.setAttribute('allow', 'autoplay; fullscreen');
  iframeEl.setAttribute('allowfullscreen', 'true');

  iframeWrap.appendChild(iframeEl);

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = buildToolbar();

  container.appendChild(iframeWrap);
  container.appendChild(toolbar);

  // Charge les labels des slots depuis Firestore
  refreshSlotLabels();
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

  // Slot selector
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

  // Save button
  const saveBtn = mkEl('button', { id: 'emu-save-btn' }, '💾 Save');
  styleBtn(saveBtn, '#7c3aed');
  saveBtn.addEventListener('click', handleSave);

  // Load button
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
