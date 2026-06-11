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

  const romFileName = romUrl.split('/').pop();
  const srmFileName = romFileName.replace(/\.[^.]+$/, '.srm');
  const idbKey      = `/data/saves/mGBA/${srmFileName}`;

  // null = jamais uploadé, on forcera toujours le premier upload
  let lastSaveHash = null;
  let cloudSaveHash = null; // hash de ce qu'on a téléchargé depuis R2

  function readSaveFromIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('/data/saves');
      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const db    = e.target.result;
        const tx    = db.transaction('FILE_DATA', 'readonly');
        const get   = tx.objectStore('FILE_DATA').get(idbKey);
        get.onsuccess = () => resolve(get.result || null);
        get.onerror   = () => reject(get.error);
      };
    });
  }

  function writeSaveToIDB(contents) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('/data/saves');
      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const db    = e.target.result;
        const tx    = db.transaction('FILE_DATA', 'readwrite');
        const obj   = { timestamp: new Date(), mode: 33206, contents: new Int8Array(contents) };
        const put   = tx.objectStore('FILE_DATA').put(obj, idbKey);
        put.onsuccess = () => resolve();
        put.onerror   = () => reject(put.error);
      };
    });
  }

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

  function hashArray(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum = (sum + (arr[i] & 0xFF) * (i + 1)) & 0xFFFFFFFF;
    return sum.toString(16) + '_' + arr.length;
  }

  async function downloadAndInjectSave(user) {
    try {
      const token = await user.getIdToken();
      const res   = await fetch(`${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 404) {
        console.log('[SaveSync] Aucune save cloud — nouvelle partie.');
        cloudSaveHash = null;
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      await writeSaveToIDB(buffer);
      cloudSaveHash = hashArray(new Uint8Array(buffer));
      lastSaveHash  = cloudSaveHash; // on vient de sync, pas besoin de re-upload
      console.log(`[SaveSync] ✅ Save chargée depuis R2 (${buffer.byteLength} octets)`);
    } catch (e) {
      console.error('[SaveSync] Erreur téléchargement:', e);
    }
  }

  async function uploadSaveIfChanged(user) {
    try {
      const obj = await readSaveFromIDB();
      if (!obj?.contents) return;

      const contents = obj.contents;
      const hash     = hashArray(contents);

      // Upload si différent du dernier upload ET différent de ce qu'on a téléchargé
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

  function waitForEmulator(cb, retries = 60) {
    if (window.EJS_emulator) { cb(); return; }
    if (retries <= 0) { console.warn('[SaveSync] Émulateur non prêt.'); return; }
    setTimeout(() => waitForEmulator(cb, retries - 1), 500);
  }

  async function startSync() {
    waitForAuth(async (user) => {

      // Démarrer le save interval dès que l'émulateur est prêt
      waitForEmulator(() => {
        window.EJS_emulator.startSaveInterval(10000);
        console.log('[SaveSync] Save interval démarré (10s)');
      });

      // Attendre un peu que l'émulateur charge
      await new Promise(r => setTimeout(r, 4000));

      // Télécharger la save cloud
      await downloadAndInjectSave(user);

      // Sync toutes les 30s
      setInterval(() => uploadSaveIfChanged(user), 30_000);

      // Sync à la fermeture
      window.addEventListener('beforeunload', () => uploadSaveIfChanged(user));

      // Sync forcée depuis gba.js (bouton Quitter)
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
