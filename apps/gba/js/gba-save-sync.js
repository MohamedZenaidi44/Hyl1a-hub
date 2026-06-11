/**
 * gba-save-sync.js — apps/gba/js/gba-save-sync.js
 * Sync SRAM (IndexedDB /data/saves) → Cloudflare R2 via Worker
 */
(function () {

  const WORKER_URL = "https://gba-saves.mohzn44.workers.dev";

  const hash     = location.hash.slice(1);
  const params   = new URLSearchParams(hash);
  const romUrl   = decodeURIComponent(params.get('rom') || '');
  const gameName = params.get('name') || 'Unknown Game';

  // Clé IndexedDB
  const romFileName = romUrl.split('/').pop();
  const srmFileName = romFileName.replace(/\.[^.]+$/, '.srm');
  const idbKey      = `/data/saves/mGBA/${srmFileName}`;

  let lastSaveHash = null;

  /* ── Lire la SRAM depuis IndexedDB ── */
  function readSaveFromIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('/data/saves');
      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const db    = e.target.result;
        const tx    = db.transaction('FILE_DATA', 'readonly');
        const store = tx.objectStore('FILE_DATA');
        const get   = store.get(idbKey);
        get.onsuccess = () => resolve(get.result || null);
        get.onerror   = () => reject(get.error);
      };
    });
  }

  /* ── Écrire la SRAM dans IndexedDB ── */
  function writeSaveToIDB(contents) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('/data/saves');
      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const db    = e.target.result;
        const tx    = db.transaction('FILE_DATA', 'readwrite');
        const store = tx.objectStore('FILE_DATA');
        const obj   = {
          timestamp: new Date(),
          mode: 33206,
          contents: new Int8Array(contents)
        };
        const put = store.put(obj, idbKey);
        put.onsuccess = () => resolve();
        put.onerror   = () => reject(put.error);
      };
    });
  }

  /* ── Attendre Firebase Auth ── */
  function waitForAuth(cb) {
    let tries = 0;
    const check = setInterval(() => {
      tries++;
      const auth = window.parent?.FirebaseAuth || window.FirebaseAuth;
      const user = auth?.currentUser;
      if (user) { clearInterval(check); cb(user); }
      else if (tries >= 40) {
        clearInterval(check);
        console.warn('[SaveSync] Non connecté — saves locales uniquement.');
      }
    }, 300);
  }

  /* ── Hash rapide pour détecter les changements ── */
  function hashArray(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum = (sum + (arr[i] & 0xFF) * (i + 1)) & 0xFFFFFFFF;
    return sum.toString(16) + '_' + arr.length;
  }

  /* ── Télécharger save depuis R2 → injecter dans IndexedDB ── */
  async function downloadAndInjectSave(user) {
    try {
      const token = await user.getIdToken();
      const res   = await fetch(`${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 404) {
        console.log('[SaveSync] Aucune save cloud — nouvelle partie.');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer   = await res.arrayBuffer();
      await writeSaveToIDB(buffer);
      lastSaveHash = hashArray(new Uint8Array(buffer));
      console.log(`[SaveSync] ✅ Save chargée depuis R2 (${buffer.byteLength} octets)`);
    } catch (e) {
      console.error('[SaveSync] Erreur téléchargement:', e);
    }
  }

  /* ── Uploader save vers R2 si changée ── */
  async function uploadSaveIfChanged(user) {
    try {
      const obj = await readSaveFromIDB();
      if (!obj || !obj.contents) return;

      const contents = obj.contents; // Int8Array
      const hash     = hashArray(contents);
      if (hash === lastSaveHash) return;

      const token = await user.getIdToken();
      const res   = await fetch(`${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: contents.buffer
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      lastSaveHash = hash;
      console.log(`[SaveSync] ☁️  Save uploadée sur R2 (${contents.byteLength} octets)`);
    } catch (e) {
      console.error('[SaveSync] Erreur upload:', e);
    }
  }

  /* ── Démarrer ── */
  async function startSync() {
    waitForAuth(async (user) => {
      // Attendre que l'émulateur soit prêt
      await new Promise(r => setTimeout(r, 3000));

      // Forcer EmulatorJS à écrire la SRAM dans IndexedDB toutes les 10s
      waitForEmulator(() => {
        window.EJS_emulator.startSaveInterval(10000);
        console.log('[SaveSync] Save interval démarré (10s)');
      });

      // Télécharger la save cloud au démarrage
      await downloadAndInjectSave(user);

      // Sync toutes les 30s
      setInterval(() => uploadSaveIfChanged(user), 30_000);

      // Sync à la fermeture
      window.addEventListener('beforeunload', () => uploadSaveIfChanged(user));

      // Sync forcée depuis le parent (bouton Quitter)
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'FORCE_SAVE_SYNC') uploadSaveIfChanged(user);
      });
    });
  }

  function waitForEmulator(cb, retries = 40) {
    if (window.EJS_emulator) { cb(); return; }
    if (retries <= 0) { console.warn('[SaveSync] Émulateur non prêt.'); return; }
    setTimeout(() => waitForEmulator(cb, retries - 1), 500);
  }

  startSync();

  window.GbaSaveSync = {
    forceUpload: () => {
      const auth = window.parent?.FirebaseAuth || window.FirebaseAuth;
      if (auth?.currentUser) uploadSaveIfChanged(auth.currentUser);
    }
  };

})();
