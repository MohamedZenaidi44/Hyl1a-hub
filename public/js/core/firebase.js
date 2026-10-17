/*=====================================================================
  Firebase — initialisation UNIQUE (source de vérité)
  --------------------------------------------------------------------
  - Une seule initialisation de l'app Firebase (garde getApps/getApp)
    → évite l'erreur `app/duplicate-app`.
  - Une seule version du SDK pour tout le projet.
  - Expose des helpers globaux (window.Firestore, window.StorageAPI…)
    utilisés par le reste de l'application.
  =====================================================================*/

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
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

import { firebaseConfig } from "../firebase/config.js";

/* -------------------------- App + instances -------------------------- */
// Initialisation idempotente : si l'app existe déjà, on la réutilise.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* -------------------------- Exports modules -------------------------- */
export { app, auth, db, storage };

/* -------------------------- Exposition globale ----------------------- */
window.FirebaseApp = app;
window.FirebaseAuth = auth;
window.FirebaseDB = db;
window.FirebaseStorage = storage;
// alias de compatibilité (ancien init.js)
window.firebaseAuth = auth;
window.auth = auth;

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

/* -------------------------- Signal de prêt --------------------------- */
window.firebaseReady = true;
window.dispatchEvent(new Event("firebase-ready"));
