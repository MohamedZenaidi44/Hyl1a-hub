/**
 * gba-save-sync.js — apps/gba/js/gba-save-sync.js
 * Sync SRAM in-game → Cloudflare R2 via Worker
 */
(function () {

  const WORKER_URL = "https://gba-saves.mohzn44.workers.dev";

  const hash     = location.hash.slice(1);
  const params   = new URLSearchParams(hash);
  const gameName = params.get('name') || 'Unknown Game';

  // Clé exacte qu'EmulatorJS utilise pour la SRAM
  const ejsSaveKey = `ejs-1-gba-${gameName}`;

  let lastSaveHash = null;

  function waitForAuth(cb) {
    const maxTries = 40;
    let tries = 0;
    const check = setInterval(() => {
      tries++;
      const auth = window.parent?.FirebaseAuth || window.FirebaseAuth;
      const user = auth?.currentUser;
      if (user) {
        clearInterval(check);
        cb(user);
      } else if (tries >= maxTries) {
        clearInterval(check);
        console.warn('[SaveSync] Utilisateur non connecté — saves locales uniquement.');
      }
    }, 300);
  }

  async function getToken(user) {
    return await user.getIdToken();
  }

  async function downloadAndInjectSave(user) {
    try {
      const token = await getToken(user);
      const res = await fetch(`${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 404) {
        console.log('[SaveSync] Aucune save cloud — nouvelle partie.');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      const b64    = arrayBufferToBase64(buffer);
      localStorage.setItem(ejsSaveKey, b64);
      lastSaveHash = b64;
      console.log(`[SaveSync] ✅ Save chargée depuis R2 (${buffer.byteLength} octets)`);
    } catch (e) {
      console.error('[SaveSync] Erreur téléchargement:', e);
    }
  }

  async function uploadSaveIfChanged(user) {
    const current = localStorage.getItem(ejsSaveKey);
    if (!current) return;
    if (current === lastSaveHash) return;
    try {
      const token  = await getToken(user);
      const buffer = base64ToArrayBuffer(current);
      const res    = await fetch(`${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: buffer
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      lastSaveHash = current;
      console.log(`[SaveSync] ☁️  Save uploadée sur R2 (${buffer.byteLength} octets)`);
    } catch (e) {
      console.error('[SaveSync] Erreur upload:', e);
    }
  }

  async function startSync() {
    waitForAuth(async (user) => {
      await downloadAndInjectSave(user);

      setInterval(() => uploadSaveIfChanged(user), 30_000);

      window.addEventListener('beforeunload', () => uploadSaveIfChanged(user));

      window.addEventListener('message', (event) => {
        if (event.data?.type === 'FORCE_SAVE_SYNC') uploadSaveIfChanged(user);
      });
    });
  }

  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  startSync();

  window.GbaSaveSync = {
    forceUpload: () => {
      const auth = window.parent?.FirebaseAuth || window.FirebaseAuth;
      if (auth?.currentUser) uploadSaveIfChanged(auth.currentUser);
    }
  };

})();
