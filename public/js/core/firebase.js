import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, addDoc, deleteDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, getBytes } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAcOQ4GAfxvOJWmfbe9SXA63_WNAqUBMzE",
  authDomain: "hyl1a-plaza.firebaseapp.com",
  projectId: "hyl1a-plaza",
  storageBucket: "hyl1a-plaza.firebasestorage.app",
  messagingSenderId: "74246669403",
  appId: "1:74246669403:web:0a7d62be23c73823fbeb7e",
  measurementId: "G-KLLS1L9S2V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Legacy compatibility
window.FirebaseApp = app;
window.FirebaseAuth = auth;
window.FirebaseDB = db;
window.FirebaseStorage = storage;
window.AuthAPI = auth;

// Firestore helpers — db included so social.js can use window.Firestore.db
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
  serverTimestamp
};

// Storage helpers
window.StorageAPI = {
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  getBytes
};

// Signale aux scripts defer que Firebase est prêt
window.dispatchEvent(new Event("firebase-ready"));