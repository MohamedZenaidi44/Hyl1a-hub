 /*=====================================================================
    Firebase initialization – exposes Auth globally for console debugging
    =====================================================================*/

  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
  import { getAuth }       from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
  import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    updateDoc,
    addDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
  } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
  import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    getBytes,
  } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";

  /* -------------------------- 1️⃣  Config Firebase -------------------------- */
  const firebaseConfig = {
    apiKey: "AIzaSyAcOQ4GAfxvOJWmfbe9SXA63_WNAqUBMzE",
    authDomain: "hyl1a-plaza.firebaseapp.com",
    projectId: "hyl1a-plaza",
    storageBucket: "hyl1a-plaza.firebasestorage.app",
    messagingSenderId: "74246669403",
    appId: "1:74246669403:web:0a7d62be23c73823fbeb7e",
    measurementId: "G-KLLS1L9S2V",
  };

  const app = initializeApp(firebaseConfig);

  /* -------------------------- 2️⃣  Instances -------------------------- */
  const auth   = getAuth(app);          // ← l’objet que vous voulez utiliser
  const db     = getFirestore(app);
  const storage = getStorage(app);

  /* -------------------------- 3️⃣  Export pour les autres modules ----- */
  export { auth, db, storage };

  /* -------------------------- 4️⃣  Exposition globale ---------------- */
  window.auth       = auth;      // ← raccourci pratique pour la console
  window.FirebaseAuth = auth;    // ← compatibilité avec le code existant
  window.FirebaseDB = db;
  window.FirebaseStorage = storage;

  /* -------------------------- 5️⃣  Helpers (facultatif) ------------- */
  window.Firestore = {
    db,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    updateDoc,
    addDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
  };

  window.StorageAPI = {
    storage,
    ref,
    uploadBytes,
    getDownloadURL,
    getBytes,
  };

  /* -------------------------- 6️⃣  Signal de prêt -------------------- */
  // Vous pouvez attendre cet événement si vous avez besoin d’être sûr
  // que Firebase est initialisé avant d’appeler quoi que ce soit.
  window.dispatchEvent(new Event("firebase-ready"));