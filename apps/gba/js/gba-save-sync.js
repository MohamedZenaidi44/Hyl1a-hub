/**
 * gba-save-sync.js — v4 (gameManager.loadSave approach)
 *
 * CHANGEMENT CLÉ vs v3 :
 *   - On abandonne l'injection IDB en amont (trop fragile, mGBA l'ignore).
 *   - On utilise window.EJS_onGameStart + gameManager.loadSave(uint8Array)
 *     appelé APRÈS que le core mGBA a démarré — c'est l'API officielle
 *     utilisée par ROMM (projet de référence EmulatorJS).
 *   - loader.js est chargé immédiatement, sans attendre de signal.
 *   - L'upload reste basé sur polling + saveUpdate + beforeunload.
 *
 * Structure R2 :
 *   saves/<uid>/<gameName>.sav
 */
(function () {
  if (window.__gbaSaveSyncStarted) return;
  window.__gbaSaveSyncStarted = true;

  console.log('[SaveSync] v4 — gameManager.loadSave approach');

  /* ── CONFIG ─────────────────────────────────────────────────────────── */
  const WORKER_URL       = 'https://gba-saves.mohzn44.workers.dev';
  const POLL_INTERVAL_MS = 3000;
  const FORCED_UPLOAD_MS = 30_000;
  const GRACE_PERIOD_MS  = 8000; // ignorer les saves dans les 8s après chargement

  const hash     = location.hash.slice(1);
  const params   = new URLSearchParams(hash);
  const gameName = params.get('name') || 'Unknown Game';

  /* ── ÉTAT ────────────────────────────────────────────────────────────── */
  let cachedToken      = null;
  let lastSaveHash     = null;
  let lastContents     = null;
  let loadedAt         = null; // timestamp du loadSave réussi
  let pollIntervalId   = null;
  let forcedIntervalId = null;
  let syncReady        = false; // true une fois que loadSave a été appelé

  /* ── HASH ────────────────────────────────────────────────────────────── */
  function hashArray(arr) {
    let h = 0;
    for (let i = 0; i < arr.length; i++) {
      h = (Math.imul(31, h) + arr[i]) | 0;
    }
    return (h >>> 0).toString(16) + '_' + arr.length;
  }

  function isBlankSave(arr) {
    if (!arr || arr.length === 0) return true;
    const first = arr[0];
    if (first !== 0xFF && first !== 0x00) return false;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] !== first) return false;
    }
    return true;
  }

  /* ── AUTH ────────────────────────────────────────────────────────────── */
  function getAuth() {
    return window.parent?.FirebaseAuth || window.parent?.auth ||
           window.FirebaseAuth || window.auth || null;
  }

  function waitForAuth(cb) {
    const auth = getAuth();
    if (auth?.currentUser) { cb(auth.currentUser); return; }
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const u = getAuth()?.currentUser;
      if (u) { clearInterval(t); cb(u); }
      else if (tries >= 50) { clearInterval(t); console.warn('[SaveSync] Non connecté.'); }
    }, 300);
  }

  /* ── DOWNLOAD + INJECT via gameManager.loadSave ──────────────────────── */
  async function downloadAndLoadSave(user) {
    try {
      const token = await user.getIdToken();
      cachedToken = token;

      const url = `${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`;
      console.log(`[SaveSync] GET ${url}`);

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`[SaveSync] ← HTTP ${res.status}`);

      if (res.status === 404) {
        console.log('[SaveSync] Aucune save cloud — nouvelle partie.');
        lastSaveHash = null;
        lastContents = null;
        loadedAt = Date.now();
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = await res.arrayBuffer();
      const uint8  = new Uint8Array(buffer);
      console.log(`[SaveSync] ← ${buffer.byteLength} octets reçus`);

      // ── MÉTHODE OFFICIELLE EmulatorJS ──
      let loaded = false;

      if (window.EJS_emulator?.gameManager?.loadSaveFiles) {
        try {
          const savePath = window.EJS_emulator.gameManager.getSaveFilePath?.();
          console.log('[SaveSync] savePath =', savePath);

          if (savePath) {
            // 1. Écrire le fichier dans le FS virtuel Emscripten
            window.EJS_emulator.gameManager.writeFile(savePath, uint8);
            console.log('[SaveSync] writeFile OK');
            // 2. Demander à RetroArch de recharger les saves depuis le FS
            window.EJS_emulator.gameManager.loadSaveFiles();
          } else {
            window.EJS_emulator.gameManager.loadSaveFiles(uint8);
          }
          console.log('[SaveSync] ✅ gameManager.loadSaveFiles() appelé');
          loaded = true;
        } catch (e) {
          console.error('[SaveSync] loadSaveFiles error:', e);
        }
      }

      if (!loaded && window.EJS_emulator?.gameManager?.loadSave) {
        window.EJS_emulator.gameManager.loadSave(uint8);
        console.log('[SaveSync] ✅ gameManager.loadSave() fallback');
        loaded = true;
      }

      if (!loaded) {
        console.warn('[SaveSync] Aucune API dispo — fallback IDB');
        await writeSaveToIDB(uint8);
      }

      lastContents = uint8;
      lastSaveHash = hashArray(uint8);
      loadedAt     = Date.now();
      console.log(`[SaveSync] ✅ Save chargée (hash=${lastSaveHash})`);

    } catch (e) {
      console.error('[SaveSync] Erreur download:', e);
      loadedAt = Date.now(); // on marque quand même pour le grace period
    }
  }

  /* ── UPLOAD ──────────────────────────────────────────────────────────── */
  async function getToken(user) {
    if (cachedToken) return cachedToken;
    const t = await user.getIdToken();
    cachedToken = t;
    return t;
  }

  async function readCurrentSave() {
    // Flush RAM WASM → IDB avant de lire
    try {
      if (window.EJS_emulator?.gameManager?.saveSaveFiles) {
        window.EJS_emulator.gameManager.saveSaveFiles();
      }
    } catch (e) {}

    // Lire depuis gameManager si dispo
    try {
      if (window.EJS_emulator?.gameManager?.getSaveFile) {
        const data = window.EJS_emulator.gameManager.getSaveFile();
        if (data) return data instanceof Uint8Array ? data : new Uint8Array(data);
      }
    } catch (e) {}

    // Fallback IDB
    return await readSaveFromIDB();
  }

  async function writeSaveToIDB(uint8) {
    try {
      const romUrl      = params.get('rom') || '';
      const romFileName = romUrl.split('/').pop();
      const srmFileName = romFileName.replace(/\.[^.]+$/, '.srm');
      const idbKey      = `/data/saves/mGBA/${srmFileName}`;

      await new Promise((resolve, reject) => {
        const req = indexedDB.open('/data/saves');
        req.onerror   = () => reject(req.error);
        req.onsuccess = (e) => {
          const db  = e.target.result;
          const tx  = db.transaction('FILE_DATA', 'readwrite');
          const obj = { timestamp: new Date(), mode: 33206, contents: uint8 };
          const put = tx.objectStore('FILE_DATA').put(obj, idbKey);
          put.onsuccess = () => resolve();
          put.onerror   = () => reject(put.error);
        };
      });
      console.log('[SaveSync] ✅ Fallback IDB écrit');
    } catch (e) {
      console.error('[SaveSync] Erreur writeSaveToIDB:', e);
    }
  }

  async function readSaveFromIDB() {
    try {
      const romUrl     = params.get('rom') || '';
      const romFileName = romUrl.split('/').pop();
      const srmFileName = romFileName.replace(/\.[^.]+$/, '.srm');
      const idbKey      = `/data/saves/mGBA/${srmFileName}`;

      return await new Promise((resolve, reject) => {
        const req = indexedDB.open('/data/saves');
        req.onerror   = () => reject(req.error);
        req.onsuccess = (e) => {
          const db  = e.target.result;
          const tx  = db.transaction('FILE_DATA', 'readonly');
          const get = tx.objectStore('FILE_DATA').get(idbKey);
          get.onsuccess = () => {
            const r = get.result;
            resolve(r?.contents ? new Uint8Array(r.contents) : null);
          };
          get.onerror = () => reject(get.error);
        };
      });
    } catch (e) {
      return null;
    }
  }

  async function uploadSaveIfChanged(user) {
    if (!syncReady) return;

    // Grace period : ignorer les saves trop tôt après le chargement
    if (loadedAt && Date.now() - loadedAt < GRACE_PERIOD_MS) return;

    const contents = await readCurrentSave();
    if (!contents || contents.byteLength === 0) return;

    const hash = hashArray(contents);
    if (hash === lastSaveHash) return; // rien de nouveau

    // Ne jamais écraser une vraie save par une SRAM vierge
    if (isBlankSave(contents) && lastSaveHash !== null) {
      console.warn('[SaveSync] SRAM vierge détectée — upload bloqué');
      return;
    }

    try {
      const token = await getToken(user);
      const res = await fetch(`${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: contents.buffer
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      lastSaveHash = hash;
      lastContents = contents;
      console.log(`[SaveSync] ☁️ Upload OK (${contents.byteLength}o, hash=${hash})`);
    } catch (e) {
      console.error('[SaveSync] Erreur upload:', e);
    }
  }

  function attemptUnloadUpload() {
    if (!cachedToken || !lastContents) return;
    if (isBlankSave(lastContents) && lastSaveHash !== null) return;
    fetch(`${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`, {
      method: 'PUT',
      keepalive: true,
      headers: {
        'Authorization': `Bearer ${cachedToken}`,
        'Content-Type': 'application/octet-stream'
      },
      body: lastContents.buffer
    }).catch(() => {});
  }

  /* ── POLLING ─────────────────────────────────────────────────────────── */
  function startPolling(user) {
    pollIntervalId = setInterval(() => {
      uploadSaveIfChanged(user).catch(console.error);
    }, POLL_INTERVAL_MS);

    forcedIntervalId = setInterval(async () => {
      if (!syncReady || !cachedToken || !lastContents) return;
      if (loadedAt && Date.now() - loadedAt < GRACE_PERIOD_MS) return;
      const contents = await readCurrentSave();
      if (!contents) return;
      if (isBlankSave(contents) && lastSaveHash !== null) return;
      try {
        const token = await getToken(user);
        const res = await fetch(`${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
          body: contents.buffer
        });
        if (res.ok) {
          lastSaveHash = hashArray(contents);
          lastContents = contents;
          console.log('[SaveSync] ☁️ Forced upload OK');
        }
      } catch (e) { console.error('[SaveSync] Forced upload error:', e); }
    }, FORCED_UPLOAD_MS);
  }

  /* ── MAIN ────────────────────────────────────────────────────────────── */
  function startSync(user) {
    // EJS_onGameStart : appelé par EmulatorJS quand le core est prêt
    // C'est ici qu'on charge la save — API officielle ROMM
    window.EJS_onGameStart = function () {
      console.log('[SaveSync] EJS_onGameStart — chargement save...');
      // Debug : inspecter les méthodes disponibles sur gameManager
      const gm = window.EJS_emulator?.gameManager;
      if (gm) {
        console.log('[SaveSync] gameManager methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(gm)).filter(k => k !== 'constructor'));
      } else {
        console.warn('[SaveSync] gameManager indisponible');
      }
      setTimeout(async () => {
        await downloadAndLoadSave(user);
        syncReady = true;

        // Activer saveUpdate pour upload immédiat à chaque save in-game
        try {
          window.EJS_emulator.enableSaveUpdateEvent?.();
          window.EJS_emulator.startSaveInterval?.(10000);
          window.EJS_emulator.on?.('saveUpdate', () => {
            if (loadedAt && Date.now() - loadedAt < GRACE_PERIOD_MS) return;
            console.log('[SaveSync] saveUpdate → upload');
            uploadSaveIfChanged(user);
          });
        } catch (e) {
          console.warn('[SaveSync] saveUpdate non disponible:', e);
        }

        startPolling(user);
      }, 10); // 10ms comme ROMM
    };

    window.addEventListener('beforeunload', attemptUnloadUpload);

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'FORCE_SAVE_SYNC') {
        uploadSaveIfChanged(user);
      }
    });

    // Surveiller changement de compte
    const auth = getAuth();
    if (auth?.onAuthStateChanged) {
      let knownUid = user.uid;
      auth.onAuthStateChanged((u) => {
        if (!u || u.uid === knownUid) return;
        console.warn('[SaveSync] Changement de compte — arrêt sync');
        clearInterval(pollIntervalId);
        clearInterval(forcedIntervalId);
      });
    }

    // Signal gba_player.html : loader.js peut démarrer maintenant
    // (dans v4 on ne bloque plus — on signale immédiatement)
    window.__gbaSaveSyncConfirmed = true;
    if (typeof window.__gbaSaveReady === 'function') {
      window.__gbaSaveReady();
    } else {
      window.__gbaSaveReadyAlready = true;
    }
  }

  // API debug
  window.GbaSaveSync = {
    forceUpload: () => {
      const u = getAuth()?.currentUser;
      if (u) uploadSaveIfChanged(u);
    },
    status: () => ({
      syncReady, lastSaveHash, loadedAt,
      gracePeriodActive: loadedAt && Date.now() - loadedAt < GRACE_PERIOD_MS
    })
  };

  waitForAuth(startSync);
})();
