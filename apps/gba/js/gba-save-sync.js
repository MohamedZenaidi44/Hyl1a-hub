/**
 * gba-save-sync.js — apps/gba/js/gba-save-sync.js
 * Sync SRAM (IndexedDB /data/saves) → Cloudflare R2 via Worker
 *
 * Cette version :
 *   - ne repose plus sur un événement d'émulateur (onSaveState) qui n'existe pas
 *   - poll l'IndexedDB toutes les ~2 s, détecte les changements via un hash
 *   - upload uniquement quand les données ont réellement changé
 *   - conserve les logs détaillés pour le debug
 *   - garde l'upload forcé à la fermeture et via postMessage
 *   - attend que Firebase soit prêt avant de démarrer (avec fallback robuste)
 */
(function () {
  console.log('[SaveSync] 🔧 Script gba-save-sync.js chargé – version polling');

  /* -------------------------- CONFIGURATION -------------------------- */
  const WORKER_URL = "https://gba-saves.mohzn44.workers.dev";

  /* ----- Paramètres de l'URL (hash) ----- */
  const hash     = location.hash.slice(1);
  const params   = new URLSearchParams(hash);
  const romUrl   = decodeURIComponent(params.get('rom') || '');
  const gameName = params.get('name') || 'Unknown Game';

  const romFileName = romUrl.split('/').pop();
  const srmFileName = romFileName.replace(/\.[^.]+$/, '.srm');
  const idbKey = `/data/saves/mGBA/${srmFileName}`;

  /* ----- Intervalles ----- */
  const POLL_INTERVAL_MS = 2000;
  const FORCED_UPLOAD_MS = 30_000;

  /* ----- État ----- */
  let lastSaveHash  = null;
  let cloudSaveHash = null;
  let syncStarted   = false; // garde-fou pour ne pas démarrer deux fois

  /* -------------------------- FONCTIONS IDB -------------------------- */
  function readSaveFromIDB() {
    return new Promise((resolve, reject) => {
      console.log(`[SaveSync] 🔎 Ouverture IDB – db=/data/saves, store=FILE_DATA, key=${idbKey}`);
      const req = indexedDB.open('/data/saves');
      req.onerror = () => {
        console.error('[SaveSync] ❌ Erreur ouverture IDB:', req.error);
        reject(req.error);
      };
      req.onsuccess = (e) => {
        const db  = e.target.result;
        const tx  = db.transaction('FILE_DATA', 'readonly');
        const get = tx.objectStore('FILE_DATA').get(idbKey);
        get.onsuccess = () => {
          const result = get.result || null;
          console.log(`[SaveSync] 📖 Lecture IDB terminée – clé=${idbKey}, résultat=`,
            result
              ? `objet (timestamp=${result.timestamp}, mode=${result.mode}, longueur=${result.contents.byteLength})`
              : 'null');
          resolve(result);
        };
        get.onerror = () => {
          console.error('[SaveSync] ❌ Erreur lecture IDB:', get.error);
          reject(get.error);
        };
      };
    });
  }

  function writeSaveToIDB(contents) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('/data/saves');
      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const db  = e.target.result;
        const tx  = db.transaction('FILE_DATA', 'readwrite');
        const obj = { timestamp: new Date(), mode: 33206, contents: new Int8Array(contents) };
        const put = tx.objectStore('FILE_DATA').put(obj, idbKey);
        put.onsuccess = () => resolve();
        put.onerror   = () => reject(put.error);
      };
    });
  }

  /* -------------------------- AUTH HELPERS -------------------------- */
  function waitForAuth(cb) {
    let tries = 0;
    const check = setInterval(() => {
      tries++;
      const auth = window.FirebaseAuth;
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

  /* -------------------------- DOWNLOAD FROM WORKER -------------------------- */
  async function downloadAndInjectSave(user) {
    try {
      const token = await user.getIdToken();
      const url   = `${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`;
      console.log(`[SaveSync] ▶️  Téléchargement depuis : ${url}`);
      console.log(`[SaveSync]   gameName détecté   = "${gameName}"`);
      console.log(`[SaveSync]   romUrl provenant de l'URL = "${romUrl}"`);

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log(`[SaveSync] ← Statut HTTP = ${res.status}`);

      if (res.status === 404) {
        console.log('[SaveSync] Aucune save cloud — nouvelle partie.');
        cloudSaveHash = null;
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = await res.arrayBuffer();
      console.log(`[SaveSync] ← Taille reçue = ${buffer.byteLength} octets`);

      const view      = new Uint8Array(buffer);
      const zeroCount = view.filter(b => b === 0).length;
      console.log(`[SaveSync]   octets nuls = ${zeroCount} / ${view.length}`);

      await writeSaveToIDB(buffer);
      cloudSaveHash = hashArray(view);
      lastSaveHash  = cloudSaveHash;
      console.log(`[SaveSync] ✅ Save chargée depuis R2 (${buffer.byteLength} octets)`);
      console.log(`[SaveSync]   hash calculé du blob reçu → ${cloudSaveHash}`);
    } catch (e) {
      console.error('[SaveSync] Erreur téléchargement:', e);
    }
  }

  /* -------------------------- UPLOAD TO WORKER -------------------------- */
  async function uploadSaveIfChanged(user) {
    try {
      console.log('[SaveSync] ▶️  Début uploadSaveIfChanged');
      const obj = await readSaveFromIDB();
      if (!obj?.contents) {
        console.log('[SaveSync] Rien lu dans IDB — pas d\'upload');
        return;
      }

      const contents = obj.contents;
      console.log(
        `[SaveSync]   objet lu → timestamp=${obj.timestamp}, mode=${obj.mode}, longueur=${contents.byteLength}`
      );

      const hash = hashArray(contents);
      console.log(`[SaveSync]   hash calculé → ${hash}`);
      console.log(`[SaveSync]   lastSaveHash (dernier upload) → ${lastSaveHash}`);

      if (hash === lastSaveHash) {
        console.log('[SaveSync] Aucun changement détecté (hash identique) – pas d\'upload');
        return;
      }

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
      console.log(`[SaveSync] ☁️   Save uploadée sur R2 (${contents.byteLength} octets)`);
    } catch (e) {
      console.error('[SaveSync] Erreur upload:', e);
    }
  }

  /* -------------------------- POLLING LOOP -------------------------- */
  function startPollingLoop(user) {
    console.log(`[SaveSync] ▶️  Démarrage du polling IDB (intervalle = ${POLL_INTERVAL_MS} ms)`);
    setInterval(async () => {
      try {
        await uploadSaveIfChanged(user);
      } catch (err) {
        console.error('[SaveSync] Erreur dans le polling upload:', err);
      }
    }, POLL_INTERVAL_MS);

    setInterval(async () => {
      try {
        console.log('[SaveSync] ⏳ Upload de secours (forced) déclenché');
        await uploadSaveIfChanged(user);
      } catch (err) {
        console.error('[SaveSync] Erreur dans l\'upload de secours:', err);
      }
    }, FORCED_UPLOAD_MS);
  }

  /* -------------------------- EMULATOR READY HELPER -------------------------- */
  function waitForEmulator(cb, retries = 60) {
    if (window.EJS_emulator) { cb(); return; }
    if (retries <= 0) { console.warn('[SaveSync] Émulateur non prêt.'); return; }
    setTimeout(() => waitForEmulator(cb, retries - 1), 500);
  }

  /* -------------------------- DÉMARRAGE DU SYNC -------------------------- */
  async function startSync() {
    if (syncStarted) return; // évite un double démarrage
    syncStarted = true;

    console.log('[SaveSync] 🚀 Début de startSync');
    waitForAuth(async (user) => {
      console.log('[SaveSync] 🔐 Utilisateur authentifié :', user?.uid || 'unknown');

      waitForEmulator(() => {
        try {
          window.EJS_emulator.startSaveInterval(10000);
          console.log('[SaveSync] Save interval démarré (10s) – conservé pour compatibilité');
        } catch (_) {
          console.warn('[SaveSync] Impossible de démarrer l\'intervalle de sauvegarde de l\'émulateur');
        }
      });

      await new Promise(r => setTimeout(r, 4000));

      await downloadAndInjectSave(user);

      startPollingLoop(user);

      window.addEventListener('beforeunload', () => {
        console.log('[SaveSync] beforeunload – upload forcé');
        uploadSaveIfChanged(user);
      });

      window.addEventListener('message', (e) => {
        if (e.data?.type === 'FORCE_SAVE_SYNC') {
          console.log('[SaveSync] Message FORCE_SAVE_SYNC reçu – upload forcé');
          uploadSaveIfChanged(user);
        }
      });
    });
  }

  /* -------------------------- LANCEMENT (robuste) -------------------------- */
  // Cas 1 : Firebase déjà prêt au moment où ce script s'exécute
  if (window.FirebaseAuth?.currentUser) {
    console.log('[SaveSync] Firebase déjà prêt — démarrage immédiat');
    startSync();
  } else {
    // Cas 2 : on attend l'événement firebase-ready
    window.addEventListener('firebase-ready', () => {
      console.log('[SaveSync] Événement firebase-ready reçu — démarrage');
      startSync();
    });

    // Cas 3 : fallback si l'événement est déjà passé ou n'est jamais dispatché
    setTimeout(() => {
      if (!syncStarted) {
        console.log('[SaveSync] Fallback timeout — tentative de démarrage');
        startSync();
      }
    }, 3000);
  }

  /* Exposer une fonction permettant de forcer un upload depuis la console */
  window.GbaSaveSync = {
    forceUpload: () => {
      const auth = window.FirebaseAuth;
      if (auth?.currentUser) uploadSaveIfChanged(auth.currentUser);
    }
  };
})();
