/**
 * gba-save-sync.js — apps/gba/js/gba-save-sync.js
 * Sync SRAM (IndexedDB /data/saves) ↔ Cloudflare R2 via Worker
 *
 * TIMING FIX :
 *   - La save cloud est injectée dans IDB AVANT que l'émulateur démarre
 *   - On utilise EJS_onGameStart pour forcer le rechargement de la SRAM
 *     au moment exact où mGBA est prêt à la lire
 */
(function () {

  const WORKER_URL = "https://gba-saves.mohzn44.workers.dev";

  const hash       = location.hash.slice(1);
  const params     = new URLSearchParams(hash);
  const romUrl     = decodeURIComponent(params.get('rom') || '');
  const gameName   = params.get('name') || 'Unknown Game';

  const romFileName = romUrl.split('/').pop();
  const srmFileName = romFileName.replace(/\.[^.]+$/, '.srm');
  const idbKey      = `/data/saves/mGBA/${srmFileName}`;

  let lastSaveHash  = null;
  let cloudBuffer   = null; // buffer téléchargé, à injecter au bon moment

  // ─── IndexedDB helpers ────────────────────────────────────────────────────

  function openSavesDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('/data/saves');
      req.onerror   = () => reject(req.error);
      req.onsuccess = (e) => resolve(e.target.result);
    });
  }

  async function readSaveFromIDB() {
    const db  = await openSavesDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction('FILE_DATA', 'readonly');
      const get = tx.objectStore('FILE_DATA').get(idbKey);
      get.onsuccess = () => resolve(get.result || null);
      get.onerror   = () => reject(get.error);
    });
  }

  async function writeSaveToIDB(buffer) {
    const db  = await openSavesDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction('FILE_DATA', 'readwrite');
      const obj = {
        timestamp : new Date(),
        mode      : 33206,
        contents  : new Int8Array(buffer)
      };
      const put = tx.objectStore('FILE_DATA').put(obj, idbKey);
      put.onsuccess = () => resolve();
      put.onerror   = () => reject(put.error);
    });
  }

  // ─── Auth helper ──────────────────────────────────────────────────────────

  function waitForAuth(cb) {
    let tries = 0;
    const check = setInterval(() => {
      tries++;
      const auth = window.parent?.FirebaseAuth || window.FirebaseAuth;
      const user = auth?.currentUser;
      if (user) {
        clearInterval(check);
        cb(user);
      } else if (tries >= 40) {
        clearInterval(check);
        console.warn('[SaveSync] Non connecté — saves locales uniquement.');
      }
    }, 300);
  }

  // ─── Hash helper ──────────────────────────────────────────────────────────

  function hashArray(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum = (sum + (arr[i] & 0xFF) * (i + 1)) & 0xFFFFFFFF;
    }
    return sum.toString(16) + '_' + arr.length;
  }

  // ─── Download ─────────────────────────────────────────────────────────────

  async function fetchCloudSave(user) {
    try {
      const token = await user.getIdToken();
      const res   = await fetch(
        `${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (res.status === 404) {
        console.log('[SaveSync] Aucune save cloud — nouvelle partie.');
        return null;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = await res.arrayBuffer();
      console.log(`[SaveSync] Save cloud récupérée (${buffer.byteLength} octets)`);
      return buffer;

    } catch (e) {
      console.error('[SaveSync] Erreur téléchargement:', e);
      return null;
    }
  }

  // ─── Injection dans mGBA via FS + reload ──────────────────────────────────

  async function injectSaveIntoEmulator(buffer) {
    // 1. Écrire dans IDB (source de vérité pour EmulatorJS)
    await writeSaveToIDB(buffer);

    // 2. Écrire aussi dans le FS Emscripten si dispo (chemin mGBA)
    try {
      const FS = window.EJS_emulator?.gameManager?.FS
              || window.Module?.FS;
      if (FS) {
        const path = `/data/saves/mGBA/${srmFileName}`;
        try { FS.unlink(path); } catch (_) {}
        FS.writeFile(path, new Uint8Array(buffer));
        console.log('[SaveSync] Save injectée dans le FS Emscripten');
      }
    } catch (e) {
      console.warn('[SaveSync] Injection FS échouée (non bloquant):', e);
    }

    // 3. Mettre à jour le hash pour ne pas re-uploader inutilement
    lastSaveHash = hashArray(new Uint8Array(buffer));
    console.log(`[SaveSync] ✅ Save injectée (${buffer.byteLength} octets)`);
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async function uploadSaveIfChanged(user) {
    try {
      const obj = await readSaveFromIDB();
      if (!obj?.contents) {
        console.log('[SaveSync] Rien dans IDB, skip upload.');
        return;
      }

      const contents  = obj.contents;
      const h         = hashArray(contents);

      if (h === lastSaveHash) {
        console.log('[SaveSync] Pas de changement, skip upload.');
        return;
      }

      const token = await user.getIdToken();
      const res   = await fetch(
        `${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`,
        {
          method  : 'PUT',
          headers : {
            'Authorization': `Bearer ${token}`,
            'Content-Type' : 'application/octet-stream'
          },
          body: contents.buffer
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      lastSaveHash = h;
      console.log(`[SaveSync] ☁️  Save uploadée (${contents.byteLength} octets)`);

    } catch (e) {
      console.error('[SaveSync] Erreur upload:', e);
    }
  }

  // ─── Point d'entrée principal ─────────────────────────────────────────────

  async function startSync() {
    waitForAuth(async (user) => {

      // ── ÉTAPE 1 : télécharger la save cloud avant le démarrage de l'ému ──
      cloudBuffer = await fetchCloudSave(user);

      if (cloudBuffer) {
        // Écrire dans IDB MAINTENANT — l'émulateur n'a pas encore démarré
        // (loader.js est ajouté par gba_player.html APRÈS ce script)
        await writeSaveToIDB(cloudBuffer);
        lastSaveHash = hashArray(new Uint8Array(cloudBuffer));
        console.log('[SaveSync] Save cloud écrite dans IDB avant boot émulateur');
      }

      // ── ÉTAPE 2 : hook EJS_onGameStart pour injecter dans le FS Emscripten
      //    Ce callback est appelé par EmulatorJS quand le jeu est réellement
      //    lancé et que le FS est accessible. C'est le seul moment fiable.
      const prevOnGameStart = window.EJS_onGameStart;
      window.EJS_onGameStart = async function () {
        if (prevOnGameStart) prevOnGameStart();

        if (cloudBuffer) {
          // Petit délai pour que mGBA finisse d'initialiser son FS
          await new Promise(r => setTimeout(r, 500));
          await injectSaveIntoEmulator(cloudBuffer);
          cloudBuffer = null; // libérer
        }

        // Démarrer le save interval
        try {
          window.EJS_emulator.startSaveInterval(10000);
          console.log('[SaveSync] Save interval démarré (10s)');
        } catch (e) {
          console.warn('[SaveSync] startSaveInterval échoué:', e);
        }
      };

      // ── ÉTAPE 3 : sync périodique ──────────────────────────────────────
      setInterval(() => uploadSaveIfChanged(user), 30_000);

      // Sync à la fermeture
      window.addEventListener('beforeunload', () => uploadSaveIfChanged(user));

      // Sync forcée depuis gba.js (bouton Quitter)
      window.addEventListener('message', (e) => {
        if (e.data?.type === 'FORCE_SAVE_SYNC') uploadSaveIfChanged(user);
      });

      console.log('[SaveSync] 🟢 OK');
    });
  }

  startSync();

  // API publique
  window.GbaSaveSync = {
    forceUpload: () => {
      const auth = window.parent?.FirebaseAuth || window.FirebaseAuth;
      const user = auth?.currentUser;
      if (user) uploadSaveIfChanged(user);
      else console.warn('[SaveSync] forceUpload: non connecté');
    },
    forceReload: async () => {
      const auth = window.parent?.FirebaseAuth || window.FirebaseAuth;
      const user = auth?.currentUser;
      if (!user) { console.warn('[SaveSync] forceReload: non connecté'); return; }
      const buf = await fetchCloudSave(user);
      if (buf) await injectSaveIntoEmulator(buf);
    }
  };

})();
