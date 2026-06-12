(function () {
  const WORKER_URL = "https://gba-saves.mohzn44.workers.dev";

  const hash = location.hash.slice(1);
  const params = new URLSearchParams(hash);

  const romUrl = decodeURIComponent(params.get('rom') || '');
  const gameName = params.get('name') || 'Unknown Game';

  const romFileName = romUrl.split('/').pop();
  const srmFileName = romFileName.replace(/\.[^.]+$/, '.srm');

  const idbKey = `/data/saves/mGBA/${srmFileName}`;

  let lastSaveHash = null;
  let cloudSaveHash = null;

  /* ---------------- IDB ---------------- */

  function readSaveFromIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('/data/saves');

      req.onerror = () => reject(req.error);

      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('FILE_DATA', 'readonly');
        const get = tx.objectStore('FILE_DATA').get(idbKey);

        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => reject(get.error);
      };
    });
  }

  function writeSaveToIDB(contents) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('/data/saves');

      req.onerror = () => reject(req.error);

      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('FILE_DATA', 'readwrite');

        const obj = {
          timestamp: new Date(),
          mode: 33206,
          contents: new Int8Array(contents)
        };

        const put = tx.objectStore('FILE_DATA').put(obj, idbKey);

        put.onsuccess = () => resolve();
        put.onerror = () => reject(put.error);
      };
    });
  }

  /* ---------------- AUTH ---------------- */

  function waitForAuth(cb) {
    let tries = 0;

    const check = setInterval(() => {
      tries++;

      const auth = window.parent?.FirebaseAuth || window.FirebaseAuth;
      const user = auth?.currentUser;

      if (user) {
        clearInterval(check);
        cb(user);
      }

      if (tries > 40) {
        clearInterval(check);
        console.warn("[SaveSync] Pas connecté");
      }
    }, 300);
  }

  /* ---------------- HASH ---------------- */

  function hashArray(arr) {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum = (sum + (arr[i] & 0xff) * (i + 1)) & 0xffffffff;
    }
    return sum.toString(16) + "_" + arr.length;
  }

  /* ---------------- UPLOAD ---------------- */

  async function uploadSaveIfChanged(user) {
    try {
      const obj = await readSaveFromIDB();

      if (!obj?.contents) {
        console.log("[SaveSync] aucune save");
        return;
      }

      const contents = obj.contents;
      const hash = hashArray(contents);

      console.log("[SaveSync] save détectée :", contents.byteLength);

      if (hash === lastSaveHash) {
        console.log("[SaveSync] pas de changement");
        return;
      }

      const token = await user.getIdToken();

      const res = await fetch(`${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/octet-stream"
        },
        body: contents.buffer
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      lastSaveHash = hash;

      console.log("[SaveSync] ☁️ upload OK", contents.byteLength);

    } catch (e) {
      console.error("[SaveSync] upload error:", e);
    }
  }

  /* ---------------- DOWNLOAD ---------------- */

  async function downloadAndInjectSave(user) {
    try {
      const token = await user.getIdToken();

      const url = `${WORKER_URL}/saves?game=${encodeURIComponent(gameName)}`;

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.status === 404) {
        console.log("[SaveSync] pas de save cloud");
        return;
      }

      if (!res.ok) throw new Error(res.status);

      const buffer = await res.arrayBuffer();

      await writeSaveToIDB(buffer);

      console.log("[SaveSync] save cloud chargée", buffer.byteLength);

    } catch (e) {
      console.error("[SaveSync] download error:", e);
    }
  }

  /* ---------------- START ---------------- */

  function waitForEmulator(cb) {
    if (window.EJS_emulator) return cb();

    setTimeout(() => waitForEmulator(cb), 500);
  }

  async function startSync() {
    waitForAuth(async (user) => {

      /* IMPORTANT: trigger réel de save */
      waitForEmulator(() => {
        console.log("[SaveSync] emulator ready");

        window.EJS_emulator.startSaveInterval(10000);

        // 🔥 TRIGGER IMPORTANT
        window.EJS_emulator.onSaveState = () => {
          console.log("[SaveSync] SAVE DETECTED");
          uploadSaveIfChanged(user);
        };
      });

      await new Promise(r => setTimeout(r, 3000));

      await downloadAndInjectSave(user);

      /* backup safety */
      setInterval(() => uploadSaveIfChanged(user), 15000);

      window.addEventListener("beforeunload", () => uploadSaveIfChanged(user));

      window.addEventListener("message", (e) => {
        if (e.data?.type === "FORCE_SAVE_SYNC") {
          uploadSaveIfChanged(user);
        }
      });

    });
  }

  startSync();

  window.GbaSaveSync = {
    forceUpload: () => {
      const auth = window.parent?.FirebaseAuth || window.FirebaseAuth;
      if (auth?.currentUser) {
        uploadSaveIfChanged(auth.currentUser);
      }
    }
  };

})();