/**
 * Configuration Firebase — SOURCE UNIQUE DE VÉRITÉ.
 *
 * ⚠️ La clé API web Firebase n'est PAS un secret : elle est publiée dans
 * l'application et doit être considérée comme publique. Ce qui protège
 * réellement les données, ce sont les *règles de sécurité* Firestore / Storage
 * (voir firestore.rules et storage.rules à la racine du projet).
 *
 * Ne jamais dupliquer cette config ailleurs : importer ce module.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyAcOQ4GAfxvOJWmfbe9SXA63_WNAqUBMzE",
  authDomain: "hyl1a-plaza.firebaseapp.com",
  projectId: "hyl1a-plaza",
  storageBucket: "hyl1a-plaza.firebasestorage.app",
  messagingSenderId: "74246669403",
  appId: "1:74246669403:web:0a7d62be23c73823fbeb7e",
  measurementId: "G-KLLS1L9S2V",
};

export const FIREBASE_SDK_VERSION = "11.4.0";
