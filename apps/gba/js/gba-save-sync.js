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

  // Clé IndexedDB : nom du fichier ROM extrait de l'URL
  const romFileName = romUrl.split('/').pop(); // ex: Pokemon%20-%20Version%20Emeraude%20(France).gba
  const srmFileName = romFileName.replace(/\.[^.]+$/, '.srm'); // .gba → .srm
  const idbKey      = `/data/saves/mGBA/${srmFileName}`;

  let lastSaveHash = null;

  /* ── Lire la SRAM depuis IndexedDB ── */
  function readSaveFromIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('/data/saves');
      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const db   = e.target.result;
        const tx   = db.transaction('FILE_DATA', 'readonly');
        const store = tx.objectStore('FILE_DATA');
        const get  = store.get(idbKey);
        get.onsuccess = () => resolve(get.result || null);
        get.onerror   = () => reject(get.error);
      };
    });
  }

  /* ── Écrire la SRAM dans IndexedDB ── */
  function writeSaveToIDB(data) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('/data/saves');
      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const db    = e.target.result;
        const tx    = db.transaction('FILE_DATA', 'readwrite');
        const store = tx.objectStore('FILE_DATA');
        const put   = store.put(data, idbKey);
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
      const buffer = await res.arrayBuffer();
      await writeSaveToIDB(buffer);
      lastSaveHash = bufferToHex(buffer);
      console.log(`[SaveSync] ✅ Save chargée depuis R2 (${buffer.byteLength} octets)`);
    } catch (e) {
      console.error('[SaveSync] Erreur téléchargement:', e);
    }
  }

  /* ── Uploader save vers R2 si changée ── */
  async function uploadSaveIfChanged(user) {
    try {
      const data = await readSaveFromIDB();
      if (!data) return;
      const buffer  = data instanceof ArrayBuffer ? data : data.buffer || data;
      const hexHash = bufferToHex(buffer);
      if (hexHash === lastSaveHash) return;

      const token = await user.getIdToken();
      const res   = await fetch(`${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: buffer
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      lastSaveHash = hexHash;
      console.log(`[SaveSync] ☁️  Save uploadée sur R2`);
    } catch (e) {
      console.error('[SaveSync] Erreur upload:', e);
    }
  }

  /* ── Hash rapide pour détecter les changements ── */
  function bufferToHex(buffer) {
    const bytes = new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer.buffer || buffer);
    let sum = 0;
    for (let i = 0; i < bytes.length; i++) sum = (sum + bytes[i] * (i + 1)) & 0xFFFFFFFF;
    return sum.toString(16) + '_' + bytes.length;
  }

  /* ── Démarrer ── */
  async function startSync() {
    waitForAuth(async (user) => {
      // Attendre que l'émulateur soit prêt avant d'injecter
      await new Promise(r => setTimeout(r, 3000));
      await downloadAndInjectSave(user);

      setInterval(() => uploadSaveIfChanged(user), 30_000);
      window.addEventListener('beforeunload', () => uploadSaveIfChanged(user));
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'FORCE_SAVE_SYNC') uploadSaveIfChanged(user);
      });
    });
  }

  startSync();

  window.GbaSaveSync = {
    forceUpload: () => {
      const auth = window.parent?.FirebaseAuth || window.FirebaseAuth;
      if (auth?.currentUser) uploadSaveIfChanged(auth.currentUser);
    }
  };

})();
