/**
 * SaveManager.js
 * Cloud save module — stockage 100% Firestore (pas de Firebase Storage).
 * Les blobs binaires sont compressés (DeflateRaw via CompressionStream) puis
 * encodés en base64 avant d'être écrits dans Firestore.
 *
 * Structure Firestore :
 *   saves/{uid}_{platform}_{gameName}
 *     slot_1: { date, label, data: "<base64>" }
 *     slot_2: { ... }
 *     slot_3: { ... }
 *
 *   playtimes/{uid}_{platform}
 *     games: { [gameName]: { totalMinutes, sessions: [...] } }
 *
 * Globals attendus :
 *   window.FirebaseDB   – instance Firestore
 *   window.Auth.currentUser.uid
 *   window.Firestore    – { doc, setDoc, getDoc }
 */

const SaveManager = (() => {

  /* ────────────────────────────────────────────────────────────────────────
     Helpers internes
  ──────────────────────────────────────────────────────────────────────── */

  function _uid() {
    const user = window.Auth?.currentUser;
    if (!user?.uid) throw new Error('SaveManager: utilisateur non connecté.');
    return user.uid;
  }

  function _docId(uid, platform, gameName) {
    const safe = gameName.replace(/[^a-zA-Z0-9_\-. ]/g, '_');
    return `saves/${uid}_${platform}_${safe}`;
  }

  function _playtimeDocId(uid, platform) {
    return `playtimes/${uid}_${platform}`;
  }

  function _now() { return new Date().toISOString(); }

  /* ── Compression : Uint8Array → Uint8Array (deflate-raw) ── */
  async function _compress(uint8) {
    if (typeof CompressionStream === 'undefined') return uint8; // fallback navigateur ancien
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(uint8);
    writer.close();
    const chunks = [];
    const reader = cs.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }
    return out;
  }

  /* ── Décompression : Uint8Array → Uint8Array ── */
  async function _decompress(uint8) {
    if (typeof DecompressionStream === 'undefined') return uint8;
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(uint8);
    writer.close();
    const chunks = [];
    const reader = ds.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }
    return out;
  }

  /* ── Uint8Array → base64 string ── */
  function _toBase64(uint8) {
    let binary = '';
    const CHUNK = 8192;
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }

  /* ── base64 string → Uint8Array ── */
  function _fromBase64(b64) {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  /* ────────────────────────────────────────────────────────────────────────
     saveState
  ──────────────────────────────────────────────────────────────────────── */

  /**
   * Sauvegarde un état dans Firestore (compressé + base64).
   *
   * @param {string}           platform   – 'gba' | 'ds' | 'nes' | 'n64'
   * @param {string}           gameName
   * @param {Uint8Array|Blob}  stateBlob
   * @param {1|2|3}            slot
   * @param {string}           [label]
   */
  async function saveState(platform, gameName, stateBlob, slot, label = '') {
    const uid = _uid();

    // Normalise en Uint8Array
    let uint8;
    if (stateBlob instanceof Blob) {
      uint8 = new Uint8Array(await stateBlob.arrayBuffer());
    } else {
      uint8 = stateBlob instanceof Uint8Array ? stateBlob : new Uint8Array(stateBlob);
    }

    const rawKB = Math.round(uint8.length / 1024);

    // Compression
    const compressed = await _compress(uint8);
    const compKB = Math.round(compressed.length / 1024);
    console.log(`[SaveManager] ${rawKB} KB → ${compKB} KB après compression`);

    // Vérification taille (limite Firestore ~1 MB par document, on vise < 700 KB en base64)
    const b64 = _toBase64(compressed);
    const b64KB = Math.round(b64.length / 1024);
    if (b64KB > 700) {
      throw new Error(`Save state trop volumineux pour Firestore (${b64KB} KB). Utilise Firebase Storage.`);
    }

    const date = _now();
    const slotKey = `slot_${slot}`;
    const docId = _docId(uid, platform, gameName);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);

    await window.Firestore.setDoc(
      docRef,
      { [slotKey]: { date, label: label || `Slot ${slot}`, data: b64 } },
      { merge: true }
    );

    console.log(`[SaveManager] Slot ${slot} sauvegardé → ${docId}`);
    return { date, sizeKB: b64KB };
  }

  /* ────────────────────────────────────────────────────────────────────────
     loadState
  ──────────────────────────────────────────────────────────────────────── */

  /**
   * Charge un état depuis Firestore.
   *
   * @param {string} platform
   * @param {string} gameName
   * @param {1|2|3}  slot
   * @returns {Promise<Uint8Array>}
   */
  async function loadState(platform, gameName, slot) {
    const uid = _uid();
    const docId = _docId(uid, platform, gameName);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);
    const snap = await window.Firestore.getDoc(docRef);

    if (!snap.exists()) throw new Error(`Aucune sauvegarde trouvée pour ${gameName}.`);

    const slotData = snap.data()[`slot_${slot}`];
    if (!slotData?.data) throw new Error(`Slot ${slot} vide pour ${gameName}.`);

    const compressed = _fromBase64(slotData.data);
    const uint8 = await _decompress(compressed);

    console.log(`[SaveManager] Slot ${slot} chargé ← ${docId} (${Math.round(uint8.length / 1024)} KB)`);
    return uint8;
  }

  /* ────────────────────────────────────────────────────────────────────────
     getSlotsMeta
  ──────────────────────────────────────────────────────────────────────── */

  /**
   * Retourne les métadonnées des 3 slots (sans le blob de données).
   *
   * @returns {Promise<{ slot_1, slot_2, slot_3 }>}
   *   Chaque slot : { date, label } ou null
   */
  async function getSlotsMeta(platform, gameName) {
    const uid = _uid();
    const docId = _docId(uid, platform, gameName);
    const docRef = window.Firestore.doc(window.FirebaseDB, docId);
    const snap = await window.Firestore.getDoc(docRef);

    const empty = { slot_1: null, slot_2: null, slot_3: null };
    if (!snap.exists()) return empty;

    const raw = snap.data();
    // On retourne date + label uniquement, pas le blob base64
    const pick = (s) => s ? { date: s.date, label: s.label } : null;
    return {
      slot_1: pick(raw.slot_1),
      slot_2: pick(raw.slot_2),
      slot_3: pick(raw.slot_3),
    };
  }

  /* ────────────────────────────────────────────────────────────────────────
     Playtime
  ──────────────────────────────────────────────────────────────────────── */

  async function loadPlaytimes(platform) {
    const uid = _uid();
    const docRef = window.Firestore.doc(window.FirebaseDB, _playtimeDocId(uid, platform));
    const snap = await window.Firestore.getDoc(docRef);
    return snap.exists() ? (snap.data().games ?? {}) : {};
  }

  async function addPlaytime(platform, gameName, minutes, map = '') {
    const uid = _uid();
    const docRef = window.Firestore.doc(window.FirebaseDB, _playtimeDocId(uid, platform));
    const snap = await window.Firestore.getDoc(docRef);
    const all = snap.exists() ? (snap.data().games ?? {}) : {};
    const prev = all[gameName] ?? { totalMinutes: 0, sessions: [] };

    all[gameName] = {
      totalMinutes: prev.totalMinutes + minutes,
      sessions: [...prev.sessions, { date: _now(), minutes, ...(map ? { map } : {}) }].slice(-100),
    };

    await window.Firestore.setDoc(docRef, { games: all }, { merge: true });
    console.log(`[SaveManager] +${minutes} min pour ${platform}/${gameName}`);
  }

  /* ────────────────────────────────────────────────────────────────────────
     API publique
  ──────────────────────────────────────────────────────────────────────── */
  return { saveState, loadState, getSlotsMeta, loadPlaytimes, addPlaytime };

})();

window.SaveManager = SaveManager;
