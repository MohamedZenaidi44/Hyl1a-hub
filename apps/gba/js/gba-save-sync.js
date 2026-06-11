/**
 * gba-save-sync.js
 *
 * À placer dans : apps/gba/js/gba-save-sync.js
 * À inclure dans gba_player.html AVANT la config EJS (voir instructions en bas)
 *
 * Ce script :
 *  1. Au démarrage → télécharge la save Firebase et l'injecte dans localStorage
 *  2. Toutes les 30s → détecte si la save a changé et l'upload sur Firebase
 *  3. Quand la page se ferme → force un dernier upload
 *
 * Il ne touche pas à l'interface, au carrousel, ni à l'émulateur.
 */

(function () {

  /* ─── 1. Récupérer rom + user depuis l'URL hash ─────────────────────── */
  const hash     = location.hash.slice(1);
  const params   = new URLSearchParams(hash);
  const gameName = params.get('name') || 'Unknown Game';

  // Clé localStorage qu'EmulatorJS utilise pour la SRAM (doit correspondre à EJS_localStorageKey dans gba_player.html)
  const currentUser  = localStorage.getItem('nostalgia_current_user') || 'guest';
  const ejsSaveKey   = `ejs_${currentUser}_gba_${gameName}`;

  // Chemin Firebase Storage : saves/{uid}/{gameName}.sav
  const getStoragePath = (uid) => `saves/${uid}/${gameName}.sav`;

  let lastSaveHash = null;  // pour détecter les changements
  let syncInterval = null;
  let firebaseReady = false;

  /* ─── 2. Attendre que Firebase soit prêt ───────────────────────────── */
  function waitForFirebase(cb) {
    // Firebase est initialisé dans la page parente et exposé sur window.parent
    const maxTries = 40;
    let tries = 0;
    const check = setInterval(() => {
      tries++;
      const auth    = window.parent?.FirebaseAuth || window.FirebaseAuth;
      const storage = window.parent?.StorageAPI   || window.StorageAPI;
      const user    = auth?.currentUser;

      if (auth && storage && user) {
        clearInterval(check);
        cb(user, storage);
      } else if (tries >= maxTries) {
        clearInterval(check);
        console.warn('[SaveSync] Firebase ou utilisateur non disponible — saves locales uniquement.');
      }
    }, 300);
  }

  /* ─── 3. Télécharger la save Firebase → injecter dans localStorage ── */
  async function downloadAndInjectSave(user, storageAPI) {
    try {
      const path    = getStoragePath(user.uid);
      const fileRef = storageAPI.ref(storageAPI.storage, path);
      const bytes   = await storageAPI.getBytes(fileRef);

      if (!bytes || bytes.byteLength === 0) return;

      // Convertir ArrayBuffer → base64 (format utilisé par EmulatorJS)
      const b64 = arrayBufferToBase64(bytes);
      localStorage.setItem(ejsSaveKey, b64);
      lastSaveHash = b64;

      console.log(`[SaveSync] ✅ Save chargée depuis Firebase (${bytes.byteLength} octets) pour "${gameName}"`);
    } catch (e) {
      if (e?.code === 'storage/object-not-found') {
        console.log('[SaveSync] Aucune save cloud trouvée — nouvelle partie.');
      } else {
        console.error('[SaveSync] Erreur téléchargement save:', e);
      }
    }
  }

  /* ─── 4. Lire la save locale et l'uploader si elle a changé ────────── */
  async function uploadSaveIfChanged(user, storageAPI) {
    const current = localStorage.getItem(ejsSaveKey);
    if (!current) return;
    if (current === lastSaveHash) return; // pas de changement

    try {
      const bytes   = base64ToArrayBuffer(current);
      const path    = getStoragePath(user.uid);
      const fileRef = storageAPI.ref(storageAPI.storage, path);
      await storageAPI.uploadBytes(fileRef, new Uint8Array(bytes));

      lastSaveHash = current;
      console.log(`[SaveSync] ☁️  Save uploadée sur Firebase (${bytes.byteLength} octets) pour "${gameName}"`);
    } catch (e) {
      console.error('[SaveSync] Erreur upload save:', e);
    }
  }

  /* ─── 5. Démarrer la synchronisation ───────────────────────────────── */
  async function startSync() {
    waitForFirebase(async (user, storageAPI) => {
      firebaseReady = true;

      // Télécharger la save existante AVANT que l'émulateur ne démarre
      await downloadAndInjectSave(user, storageAPI);

      // Sync automatique toutes les 30 secondes
      syncInterval = setInterval(() => {
        uploadSaveIfChanged(user, storageAPI);
      }, 30_000);

      // Sync au moment où la page se ferme
      window.addEventListener('beforeunload', () => {
        uploadSaveIfChanged(user, storageAPI);
      });

      // Sync quand le parent demande explicitement (ex: bouton Quitter)
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'FORCE_SAVE_SYNC') {
          uploadSaveIfChanged(user, storageAPI);
        }
      });
    });
  }

  /* ─── 6. Helpers base64 ─────────────────────────────────────────────── */
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /* ─── Lancement ─────────────────────────────────────────────────────── */
  startSync();

  // Exposer pour usage externe si besoin
  window.GbaSaveSync = {
    forceUpload: () => {
      const auth    = window.parent?.FirebaseAuth || window.FirebaseAuth;
      const storage = window.parent?.StorageAPI   || window.StorageAPI;
      if (auth?.currentUser && storage) {
        uploadSaveIfChanged(auth.currentUser, storage);
      }
    }
  };

})();
