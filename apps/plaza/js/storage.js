/**
 * storage.js — Accès aux données persistantes de la Plaza.
 *
 * Étape 2 : on charge **le Mii de l'utilisateur** depuis Firestore
 * (`avatars/{uid}.visual_base64`, même format que le Mii Maker) avec un Mii par
 * défaut en secours. La sauvegarde complète de la Plaza (relations, besoins…)
 * viendra à l'étape 10.
 */

/** Mii « par défaut » valide (même valeur que miiMaker.js). */
export const DEFAULT_MII_B64 =
  'AAEAAAAAAAAAAAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAAAAAAABowBgANMAYgBgAaAwAACEAUgg9AAAAAAAAAAAAAAAAAAAAAAAAAAAAADXP';

/**
 * Récupère le Mii de l'utilisateur courant.
 * @returns {Promise<{name:string, b64:string, isDefault:boolean}>}
 */
export async function loadLocalMii() {
  const auth = window.Auth || {};
  const name = (auth.currentUsername || 'Moi').slice(0, 12);
  try {
    const user = auth.currentUser;
    if (user && window.Firestore && window.FirebaseDB) {
      const snap = await window.Firestore.getDoc(
        window.Firestore.doc(window.FirebaseDB, 'avatars', user.uid)
      );
      if (snap.exists()) {
        const d = snap.data() || {};
        if (d.visual_base64) {
          return { name: d.username || name, b64: d.visual_base64, isDefault: false };
        }
      }
    }
  } catch (e) {
    console.warn('[Plaza] Mii local indisponible, on utilise le Mii par défaut :', e);
  }
  return { name, b64: DEFAULT_MII_B64, isDefault: true };
}

/**
 * Récupère les Mii de la communauté (Firestore `avatars`), pour peupler la
 * place aux étapes suivantes. Limité et tolérant aux erreurs.
 * @returns {Promise<Array<{name:string, b64:string}>>}
 */
export async function loadCommunityMiis(max = 20) {
  const out = [];
  try {
    if (window.Firestore && window.FirebaseDB) {
      const ref = window.Firestore.collection(window.FirebaseDB, 'avatars');
      const snap = await window.Firestore.getDocs(ref);
      snap.forEach((doc) => {
        const d = doc.data() || {};
        if (d.visual_base64 && out.length < max) {
          out.push({ name: d.username || 'Mii', b64: d.visual_base64 });
        }
      });
    }
  } catch (e) {
    console.warn('[Plaza] Mii de la communauté indisponibles :', e);
  }
  return out;
}
