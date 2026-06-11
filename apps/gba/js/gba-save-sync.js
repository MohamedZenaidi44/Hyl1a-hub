/**
 * gba-save-sync.js
 *
 * À placer dans : apps/gba/js/gba-save-sync.js
 * À inclure dans gba_player.html AVANT la config EJS :
 *   <script src="./js/gba-save-sync.js"></script>
 *
 * Sync la SRAM (save in-game) avec Cloudflare R2 via le Worker.
 * - Au démarrage : télécharge la save cloud → injecte dans localStorage
 * - Toutes les 30s : si la save a changé → upload sur R2
 * - Au clic Quitter : force un dernier upload
 */

(function () {

  const WORKER_URL = "https://gba-saves.mohzn44.workers.dev";

  /* ── Récupérer le nom du jeu depuis l'URL hash ── */
  const hash     = location.hash.slice(1);
  const params   = new URLSearchParams(hash);
  const gameName = params.get('name') || 'Unknown Game';

  /* ── Clé localStorage qu'EmulatorJS utilise pour la SRAM ── */
  const currentUser = localStorage.getItem('nostalgia_current_user') || 'guest';
  const ejsSaveKey  = `ejs_${currentUser}_gba_${gameName}`;

  let lastSaveHash = null;
  let syncInterval = null;

  /* ── Attendre que Firebase Auth soit prêt (dans le parent) ── */
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

  /* ── Obtenir le token Firebase de l'utilisateur ── */
  async function getToken(user) {
    return await user.getIdToken();
  }

  /* ── Télécharger la save depuis R2 → injecter dans localStorage ── */
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

      console.log(`[SaveSync] ✅ Save chargée depuis R2 (${buffer.byteLength} octets) pour "${gameName}"`);
    } catch (e) {
      console.error('[SaveSync] Erreur téléchargement:', e);
    }
  }

  /* ── Uploader la save si elle a changé ── */
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
      console.log(`[SaveSync] ☁️  Save uploadée sur R2 (${buffer.byteLength} octets) pour "${gameName}"`);
    } catch (e) {
      console.error('[SaveSync] Erreur upload:', e);
    }
  }

  /* ── Démarrer la sync ── */
  async function startSync() {
    waitForAuth(async (user) => {

      // 1. Télécharger la save existante avant que l'émulateur démarre
      await downloadAndInjectSave(user);

      // 2. Sync automatique toutes les 30s
      syncInterval = setInterval(() => {
        uploadSaveIfChanged(user);
      }, 30_000);

      // 3. Sync quand la page se ferme
      window.addEventListener('beforeunload', () => {
        uploadSaveIfChanged(user);
      });

      // 4. Sync forcée depuis le parent (bouton Quitter)
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'FORCE_SAVE_SYNC') {
          uploadSaveIfChanged(user);
        }
      });
    });
  }

  /* ── Helpers base64 ── */
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

  /* ── Go ── */
  startSync();

  window.GbaSaveSync = {
    forceUpload: () => {
      const auth = window.parent?.FirebaseAuth || window.FirebaseAuth;
      if (auth?.currentUser) uploadSaveIfChanged(auth.currentUser);
    }
  };

})();
