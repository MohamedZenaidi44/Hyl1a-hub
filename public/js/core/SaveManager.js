/**
 * SaveManager.js
 * Centralised cloud-save module for Hyl1a-hub.
 * Saves binary state blobs to Firebase Storage and keeps lightweight
 * metadata (date, label, URL) in Firestore.
 *
 * Globals expected on window:
 *   window.FirebaseDB       – Firestore instance
 *   window.FirebaseStorage  – Storage instance
 *   window.Auth.currentUser.uid
 *   window.Firestore        – { doc, setDoc, getDoc, updateDoc, ... }
 *   window.StorageAPI       – { ref, uploadBytes, getDownloadURL }
 */

const SaveManager = (() => {
  /* ------------------------------------------------------------------ */
  /*  Internal helpers                                                    */
  /* ------------------------------------------------------------------ */

  function _uid() {
    const user = window.Auth?.currentUser;
    if (!user?.uid) throw new Error("SaveManager: user not authenticated.");
    return user.uid;
  }

  /**
   * Storage path: saves/{uid}/{platform}/{gameName}/slot_{n}.sav
   */
  function _storagePath(uid, platform, gameName, slot) {
    const safe = gameName.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
    return `saves/${uid}/${platform}/${safe}/slot_${slot}.sav`;
  }

  /**
   * Firestore doc ID: saves/{uid}_{platform}_{gameName}
   */
  function _firestoreDocId(uid, platform, gameName) {
    const safe = gameName.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
    return `saves/${uid}_${platform}_${safe}`;
  }

  function _now() {
    return new Date().toISOString();
  }

  /* ------------------------------------------------------------------ */
  /*  saveState                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Upload a save-state blob to Firebase Storage and record its metadata
   * in Firestore.
   *
   * @param {string}           platform  – e.g. "gba", "ds", "nes", "n64"
   * @param {string}           gameName  – human-readable ROM name
   * @param {Uint8Array|Blob}  stateBlob – raw binary data from EmulatorJS
   * @param {1|2|3}            slot      – save slot number
   * @param {string}           [label]   – optional display label
   * @returns {Promise<{url: string, date: string}>}
   */
  async function saveState(platform, gameName, stateBlob, slot, label = "") {
    const uid = _uid();

    // Normalise to Blob for uploadBytes
    const blob =
      stateBlob instanceof Blob
        ? stateBlob
        : new Blob([stateBlob], { type: "application/octet-stream" });

    // 1. Upload to Storage
    const path = _storagePath(uid, platform, gameName, slot);
    const storageRef = window.StorageAPI.ref(window.FirebaseStorage, path);
    await window.StorageAPI.uploadBytes(storageRef, blob);
    const url = await window.StorageAPI.getDownloadURL(storageRef);

    // 2. Write metadata to Firestore
    const docId = _firestoreDocId(uid, platform, gameName);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);

    const slotKey = `slot_${slot}`;
    const meta = {
      [slotKey]: {
        date: _now(),
        label: label || `Slot ${slot}`,
        url,
      },
    };

    // merge: keep other slots intact
    await window.Firestore.setDoc(docRef, meta, { merge: true });

    console.log(`[SaveManager] Saved ${platform}/${gameName} → slot ${slot}`);
    return { url, date: meta[slotKey].date };
  }

  /* ------------------------------------------------------------------ */
  /*  loadState                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Download a save-state blob from Firebase Storage.
   *
   * @param {string} platform
   * @param {string} gameName
   * @param {1|2|3}  slot
   * @returns {Promise<Uint8Array>} raw binary data
   */
  async function loadState(platform, gameName, slot) {
    const uid = _uid();

    // 1. Fetch URL from Firestore metadata (preferred – avoids re-signing)
    const docId = _firestoreDocId(uid, platform, gameName);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);
    const snap = await window.Firestore.getDoc(docRef);

    let url;
    if (snap.exists()) {
      const slotMeta = snap.data()[`slot_${slot}`];
      if (slotMeta?.url) url = slotMeta.url;
    }

    // Fall back: re-derive Storage URL
    if (!url) {
      const path = _storagePath(uid, platform, gameName, slot);
      const storageRef = window.StorageAPI.ref(window.FirebaseStorage, path);
      url = await window.StorageAPI.getDownloadURL(storageRef);
    }

    // 2. Download raw bytes
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`SaveManager: fetch failed – ${response.status}`);
    const buffer = await response.arrayBuffer();

    console.log(`[SaveManager] Loaded ${platform}/${gameName} ← slot ${slot}`);
    return new Uint8Array(buffer);
  }

  /* ------------------------------------------------------------------ */
  /*  getSlotsMeta                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Return metadata for all three slots of a given game.
   *
   * @param {string} platform
   * @param {string} gameName
   * @returns {Promise<{ slot_1: object|null, slot_2: object|null, slot_3: object|null }>}
   */
  async function getSlotsMeta(platform, gameName) {
    const uid = _uid();
    const docId = _firestoreDocId(uid, platform, gameName);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);
    const snap = await window.Firestore.getDoc(docRef);

    const empty = { slot_1: null, slot_2: null, slot_3: null };
    if (!snap.exists()) return empty;

    const data = snap.data();
    return {
      slot_1: data.slot_1 ?? null,
      slot_2: data.slot_2 ?? null,
      slot_3: data.slot_3 ?? null,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Playtime tracking                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Collection path for playtime: playtimes/{uid}_{platform}
   * Document structure: { games: { [gameName]: { totalMinutes, sessions: [...] } } }
   */
  function _playtimeDocId(uid, platform) {
    return `playtimes/${uid}_${platform}`;
  }

  /**
   * Load all playtime data for a given platform.
   *
   * @param {string} platform
   * @returns {Promise<{ [gameName]: { totalMinutes: number, sessions: object[] } }>}
   */
  async function loadPlaytimes(platform) {
    const uid = _uid();
    const docId = _playtimeDocId(uid, platform);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);
    const snap = await window.Firestore.getDoc(docRef);
    return snap.exists() ? snap.data().games ?? {} : {};
  }

  /**
   * Add a play session for a game.
   *
   * @param {string} platform
   * @param {string} gameName
   * @param {number} minutes  – duration of this session
   * @param {string} [map]    – current map/area if known
   * @returns {Promise<void>}
   */
  async function addPlaytime(platform, gameName, minutes, map = "") {
    const uid = _uid();
    const docId = _playtimeDocId(uid, platform);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);

    const snap = await window.Firestore.getDoc(docRef);
    const all = snap.exists() ? snap.data().games ?? {} : {};

    const prev = all[gameName] ?? { totalMinutes: 0, sessions: [] };
    const session = { date: _now(), minutes, ...(map ? { map } : {}) };

    all[gameName] = {
      totalMinutes: prev.totalMinutes + minutes,
      sessions: [...prev.sessions, session].slice(-100), // keep last 100 sessions
    };

    await window.Firestore.setDoc(
      docRef,
      { games: all },
      { merge: true }
    );

    console.log(
      `[SaveManager] Playtime +${minutes}m for ${platform}/${gameName}`
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                          */
  /* ------------------------------------------------------------------ */

  return {
    saveState,
    loadState,
    getSlotsMeta,
    loadPlaytimes,
    addPlaytime,
  };
})();

// Make available globally (for gba.js / other platform scripts)
window.SaveManager = SaveManager;
