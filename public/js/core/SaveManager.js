/**
 * SaveManager.js
 * Centralised cloud-save module for Hyl1a-hub.
 * Saves binary state blobs to Firebase Storage and keeps lightweight
 * metadata (date, label, URL) in Firestore.
 *
 * Globals expected on window:
 *   window.FirebaseDB       – Firestore instance
 *   window.FirebaseStorage  – Storage instance
 *   window.Auth.currentUser.uid
 *   window.Firestore        – { doc, setDoc, getDoc, updateDoc, ... }
 *   window.StorageAPI       – { ref, uploadBytes, getDownloadURL }
 */

const SaveManager = (() => {
  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                    */
  /* ------------------------------------------------------------------ */

  function _uid() {
    const user = window.Auth?.currentUser;
    if (!user?.uid) throw new Error("SaveManager: user not authenticated.");
    return user.uid;
  }

  /**
   * Storage path: saves/{uid}/{platform}/{gameName}/slot_{n}.sav
   */
  function _storagePath(uid, platform, gameName, slot) {
    const safe = gameName.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
    return `saves/${uid}/${platform}/${safe}/slot_${slot}.sav`;
  }

  /**
   * Firestore doc ID: saves/{uid}_{platform}_{gameName}
   */
  function _firestoreDocId(uid, platform, gameName) {
    const safe = gameName.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
    return `saves/${uid}_${platform}_${safe}`;
  }

  function _now() {
    return new Date().toISOString();
  }

  /* ------------------------------------------------------------------ */
  /*  saveState                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Upload a save-state blob to Firebase Storage and record its metadata
   * in Firestore.
   *
   * @param {string}           platform  – e.g. "gba", "ds", "nes", "n64"
   * @param {string}           gameName  – human-readable ROM name
   * @param {Uint8Array|Blob}  stateBlob – raw binary data from EmulatorJS
   * @param {1|2|3}            slot      – save slot number
   * @param {string}           [label]   – optional display label
   * @returns {Promise<{url: string, date: string}>}
   */
  async function saveState(platform, gameName, stateBlob, slot, label = "") {
    const uid = _uid();

    // Normalise to Blob for uploadBytes
    const blob =
      stateBlob instanceof Blob
        ? stateBlob
        : new Blob([stateBlob], { type: "application/octet-stream" });

    // 1. Upload to Storage
    const path = _storagePath(uid, platform, gameName, slot);
    const storageRef = window.StorageAPI.ref(window.FirebaseStorage, path);
    await window.StorageAPI.uploadBytes(storageRef, blob);
    const url = await window.StorageAPI.getDownloadURL(storageRef);

    // 2. Write metadata to Firestore
    const docId = _firestoreDocId(uid, platform, gameName);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);

    const slotKey = `slot_${slot}`;
    const meta = {
      [slotKey]: {
        date: _now(),
        label: label || `Slot ${slot}`,
        url,
      },
    };

    // merge: keep other slots intact
    await window.Firestore.setDoc(docRef, meta, { merge: true });

    console.log(`[SaveManager] Saved ${platform}/${gameName} → slot ${slot}`);
    return { url, date: meta[slotKey].date };
  }

  /* ------------------------------------------------------------------ */
  /*  loadState                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Download a save-state blob from Firebase Storage.
   *
   * @param {string} platform
   * @param {string} gameName
   * @param {1|2|3}  slot
   * @returns {Promise<Uint8Array>} raw binary data
   */
  async function loadState(platform, gameName, slot) {
    const uid = _uid();

    // 1. Fetch URL from Firestore metadata (preferred – avoids re-signing)
    const docId = _firestoreDocId(uid, platform, gameName);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);
    const snap = await window.Firestore.getDoc(docRef);

    let url;
    if (snap.exists()) {
      const slotMeta = snap.data()[`slot_${slot}`];
      if (slotMeta?.url) url = slotMeta.url;
    }

    // Fall back: re-derive Storage URL
    if (!url) {
      const path = _storagePath(uid, platform, gameName, slot);
      const storageRef = window.StorageAPI.ref(window.FirebaseStorage, path);
      url = await window.StorageAPI.getDownloadURL(storageRef);
    }

    // 2. Download raw bytes
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`SaveManager: fetch failed – ${response.status}`);
    const buffer = await response.arrayBuffer();

    console.log(`[SaveManager] Loaded ${platform}/${gameName} ← slot ${slot}`);
    return new Uint8Array(buffer);
  }

  /* ------------------------------------------------------------------ */
  /*  getSlotsMeta                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Return metadata for all three slots of a given game.
   *
   * @param {string} platform
   * @param {string} gameName
   * @returns {Promise<{ slot_1: object|null, slot_2: object|null, slot_3: object|null }>}
   */
  async function getSlotsMeta(platform, gameName) {
    const uid = _uid();
    const docId = _firestoreDocId(uid, platform, gameName);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);
    const snap = await window.Firestore.getDoc(docRef);

    const empty = { slot_1: null, slot_2: null, slot_3: null };
    if (!snap.exists()) return empty;

    const data = snap.data();
    return {
      slot_1: data.slot_1 ?? null,
      slot_2: data.slot_2 ?? null,
      slot_3: data.slot_3 ?? null,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Playtime tracking                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Collection path for playtime: playtimes/{uid}_{platform}
   * Document structure: { games: { [gameName]: { totalMinutes, sessions: [...] } } }
   */
  function _playtimeDocId(uid, platform) {
    return `playtimes/${uid}_${platform}`;
  }

  /**
   * Load all playtime data for a given platform.
   *
   * @param {string} platform
   * @returns {Promise<{ [gameName]: { totalMinutes: number, sessions: object[] } }>}
   */
  async function loadPlaytimes(platform) {
    const uid = _uid();
    const docId = _playtimeDocId(uid, platform);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);
    const snap = await window.Firestore.getDoc(docRef);
    return snap.exists() ? snap.data().games ?? {} : {};
  }

  /**
   * Add a play session for a game.
   *
   * @param {string} platform
   * @param {string} gameName
   * @param {number} minutes  – duration of this session
   * @param {string} [map]    – current map/area if known
   * @returns {Promise<void>}
   */
  async function addPlaytime(platform, gameName, minutes, map = "") {
    const uid = _uid();
    const docId = _playtimeDocId(uid, platform);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);

    const snap = await window.Firestore.getDoc(docRef);
    const all = snap.exists() ? snap.data().games ?? {} : {};

    const prev = all[gameName] ?? { totalMinutes: 0, sessions: [] };
    const session = { date: _now(), minutes, ...(map ? { map } : {}) };

    all[gameName] = {
      totalMinutes: prev.totalMinutes + minutes,
      sessions: [...prev.sessions, session].slice(-100), // keep last 100 sessions
    };

    await window.Firestore.setDoc(
      docRef,
      { games: all },
      { merge: true }
    );

    console.log(
      `[SaveManager] Playtime +${minutes}m for ${platform}/${gameName}`
    );
  }

  /* ------------------------------------------------------------------ */
  /*  injectSaveUI                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Injecte un panneau Save/Load par-dessus l'iframe de l'émulateur.
   * Appelé depuis gba.js après le lancement de l'émulateur.
   *
   * @param {HTMLElement} container  – le conteneur parent (div du jeu)
   * @param {string}      platform   – "gba", "ds", etc.
   * @param {string}      gameName   – nom du jeu
   * @param {HTMLIFrameElement} iframe – l'iframe EmulatorJS
   */
  function injectSaveUI(container, platform, gameName, iframe) {

    /* ── Styles ── */
    if (!document.getElementById('save-ui-styles')) {
      const style = document.createElement('style');
      style.id = 'save-ui-styles';
      style.textContent = `
        #save-ui-panel {
          position: absolute; bottom: 60px; right: 20px; z-index: 999;
          display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
        }
        #save-ui-toggle {
          background: rgba(124,58,237,0.9); border: 2px solid rgba(255,255,255,0.3);
          border-radius: 40px; padding: 8px 18px; color: #fff; font-weight: 800;
          font-size: 14px; cursor: pointer; transition: all 0.2s; letter-spacing: 1px;
          backdrop-filter: blur(8px);
        }
        #save-ui-toggle:hover { background: rgba(157,95,245,0.95); transform: scale(1.05); }
        #save-ui-slots {
          display: none; flex-direction: column; gap: 6px;
          background: rgba(10,10,20,0.92); border: 1px solid rgba(255,255,255,0.15);
          border-radius: 12px; padding: 12px; backdrop-filter: blur(12px); min-width: 220px;
        }
        #save-ui-slots.open { display: flex; }
        .save-slot-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; padding: 6px 4px; border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .save-slot-row:last-child { border-bottom: none; }
        .save-slot-label { color: #c4b5fd; font-size: 13px; font-weight: 700; flex: 1; }
        .save-slot-date  { color: #888; font-size: 11px; flex: 1; text-align: center; }
        .save-slot-btn {
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          border-radius: 20px; padding: 4px 12px; color: #fff; font-size: 12px;
          font-weight: 700; cursor: pointer; transition: all 0.15s;
        }
        .save-slot-btn:hover { background: rgba(255,255,255,0.25); }
        .save-slot-btn.save-btn { border-color: #7c3aed; color: #c4b5fd; }
        .save-slot-btn.save-btn:hover { background: rgba(124,58,237,0.4); }
        .save-slot-btn.load-btn { border-color: #10b981; color: #6ee7b7; }
        .save-slot-btn.load-btn:hover { background: rgba(16,185,129,0.3); }
        .save-ui-status {
          font-size: 11px; color: #a78bfa; text-align: center;
          padding: 4px 0 0; min-height: 16px;
        }
      `;
      document.head.appendChild(style);
    }

    /* ── DOM ── */
    const panel = document.createElement('div');
    panel.id = 'save-ui-panel';
    panel.innerHTML = `
      <button id="save-ui-toggle">💾 SAVES</button>
      <div id="save-ui-slots">
        ${[1, 2, 3].map(n => `
          <div class="save-slot-row" id="slot-row-${n}">
            <span class="save-slot-label">Slot ${n}</span>
            <span class="save-slot-date" id="slot-date-${n}">—</span>
            <button class="save-slot-btn save-btn" data-slot="${n}" data-action="save">SAVE</button>
            <button class="save-slot-btn load-btn" data-slot="${n}" data-action="load">LOAD</button>
          </div>
        `).join('')}
        <div class="save-ui-status" id="save-ui-status"></div>
      </div>
    `;

    // On insère dans le conteneur parent de l'iframe (position:relative déjà là)
    const emuWrapper = container.querySelector('div[style*="position:relative"]') || container;
    emuWrapper.style.position = 'relative';
    emuWrapper.appendChild(panel);

    /* ── Toggle ── */
    const toggle   = panel.querySelector('#save-ui-toggle');
    const slotsDiv = panel.querySelector('#save-ui-slots');
    toggle.addEventListener('click', () => slotsDiv.classList.toggle('open'));

    /* ── Charger les métadonnées des slots ── */
    async function refreshSlotsMeta() {
      try {
        const meta = await getSlotsMeta(platform, gameName);
        [1, 2, 3].forEach(n => {
          const slotData = meta[`slot_${n}`];
          const dateEl   = panel.querySelector(`#slot-date-${n}`);
          if (dateEl) {
            dateEl.textContent = slotData?.date
              ? new Date(slotData.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
              : '—';
          }
        });
      } catch (e) { /* pas connecté ou aucune save */ }
    }
    refreshSlotsMeta();

    /* ── Statut temporaire ── */
    function setStatus(msg, isError = false) {
      const el = panel.querySelector('#save-ui-status');
      if (!el) return;
      el.textContent = msg;
      el.style.color = isError ? '#f87171' : '#a78bfa';
      setTimeout(() => { el.textContent = ''; }, 3000);
    }

    /* ── Boutons Save / Load ── */
    panel.querySelectorAll('.save-slot-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const slot   = parseInt(btn.dataset.slot);
        const action = btn.dataset.action;

        if (action === 'save') {
          setStatus('Sauvegarde en cours…');
          // Demander le state à l'iframe via postMessage
          const timeout = 5000;
          const statePromise = new Promise((resolve, reject) => {
            const handler = (e) => {
              if (e.data?.type === 'SAVE_STATE_RESPONSE' && e.data.gameName === gameName) {
                window.removeEventListener('message', handler);
                resolve(new Uint8Array(e.data.state));
              }
            };
            window.addEventListener('message', handler);
            setTimeout(() => { window.removeEventListener('message', handler); reject(new Error('timeout')); }, timeout);
          });
          iframe.contentWindow.postMessage({ type: 'TRIGGER_SAVE' }, '*');
          try {
            const stateData = await statePromise;
            await saveState(platform, gameName, stateData, slot);
            setStatus(`✅ Slot ${slot} sauvegardé !`);
            refreshSlotsMeta();
          } catch (e) {
            console.error(e);
            setStatus(`❌ Erreur sauvegarde`, true);
          }

        } else if (action === 'load') {
          setStatus('Chargement…');
          try {
            const stateData = await loadState(platform, gameName, slot);
            iframe.contentWindow.postMessage({ type: 'LOAD_SAVE_STATE', state: Array.from(stateData) }, '*');
            setStatus(`✅ Slot ${slot} chargé !`);
          } catch (e) {
            console.error(e);
            setStatus(`❌ Aucune save dans ce slot`, true);
          }
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                          */
  /* ------------------------------------------------------------------ */

  return {
    saveState,
    loadState,
    getSlotsMeta,
    loadPlaytimes,
    addPlaytime,
    injectSaveUI,
  };
})();

// Make available globally (for gba.js / other platform scripts)
window.SaveManager = SaveManager;
