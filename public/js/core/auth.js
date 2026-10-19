/**
 * Authentication System
 * Handles login, registration, and session management using Firebase Auth & Firestore.
 */

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  getDocs,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";



window.Auth = {
  currentUser: null,
  currentUsername: null,
  currentUserTag: null,

  init() {
    // Listen to Firebase Auth state changes
    onAuthStateChanged(window.FirebaseAuth, async (user) => {
      if (user) {
        this.currentUser = user;
        // Fetch username from Firestore profile
        try {
          const docRef = doc(window.FirebaseDB, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            this.currentUsername = data.username;
            
            // Lazy Migration: If tag is missing, generate and save it now
            if (!data.tag) {
              const newTag = Math.floor(1000 + Math.random() * 9000).toString();
              await window.Firestore.updateDoc(doc(window.FirebaseDB, "users", user.uid), { tag: newTag });
              this.currentUserTag = newTag;
            } else {
              this.currentUserTag = data.tag;
            }

            // Start Heartbeat for Online Presence
            this.startHeartbeat();

            localStorage.setItem('nostalgia_current_user', this.currentUsername);
            localStorage.setItem('nostalgia_current_user_tag', this.currentUserTag);
            
                         // Trigger UI updates in app.js if they are ready
             if (document.getElementById('top-username')) {
                document.getElementById('top-username').textContent = this.currentUsername;
                document.getElementById('auth-overlay').style.display = 'none';
 
                // Play connection SFX once per session
                if (!sessionStorage.getItem('hylia_connect_sfx_played')) {
                  sessionStorage.setItem('hylia_connect_sfx_played', 'true');

                  if (window.AudioManager && window.AudioManager.playConnectSuccess) {
                    window.AudioManager.playConnectSuccess();
                  }
                }

               // Re-trigger loadUserMii via document event or direct call if available
               this.loadUserMii();
               if (window.checkForcedMiiCreation) window.checkForcedMiiCreation();
            }
          }
        } catch(e) { console.error("Error fetching user profile:", e); }
      } else {
        this.currentUser = null;
        this.currentUsername = null;
        this.currentUserTag = null;
        if(this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        localStorage.removeItem('nostalgia_current_user');
        localStorage.removeItem('nostalgia_current_user_tag');
      }
    });
  },

  async loadUserMii() {
    if (!this.currentUser) return;
    const container = document.getElementById('top-avatar-container');
    if (!container) return;

    // Libère l'éventuel viewer 3D précédent avant de reconstruire le conteneur.
    const prevMount = container.querySelector('#top-mii-3d-view');
    if (prevMount && window.Mii3D) window.Mii3D.dispose(prevMount);

    try {
      const docRef = doc(window.FirebaseDB, "avatars", this.currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const myAvatar = docSnap.data();
        if (myAvatar && myAvatar.visual_base64) {
          const b64 = myAvatar.visual_base64;
          const thumbUrl = `https://mii-unsecure.ariankordi.net/miis/image.png?data=${encodeURIComponent(b64)}&verifyCharInfo=0&type=face&width=128&shaderType=wiiu`;
          container.innerHTML = `
            <img id="top-avatar-img" src="${thumbUrl}" style="width: 120%; height: 120%; object-fit: cover; transform: translateY(10%);">
            <div id="top-mii-3d-view" class="top-mii-3d-view"></div>`;
          this._showTopMii3D(b64, container);
        } else {
          container.innerHTML = `<span style="font-size: 24px;">👤</span>`;
        }
      } else {
        container.innerHTML = `<span style="font-size: 24px;">👤</span>`;
      }
    } catch (e) {
      console.error("Error loading user Mii for top bar:", e);
      container.innerHTML = `<span style="font-size: 24px;">👤</span>`;
    }
  },

  // Affiche le Mii en 3D (visage) dans la photo de profil en haut à gauche.
  // Repli silencieux sur l'image 2D statique si le 3D échoue.
  async _showTopMii3D(b64, container) {
    if (!window.Mii3D || !b64) return;
    const mount = container.querySelector('#top-mii-3d-view');
    const img = container.querySelector('#top-avatar-img');
    if (!mount) return;

    try {
      await window.Mii3D.renderInto(mount, b64, { face: true });
      mount.style.display = 'block';
      if (img) img.style.display = 'none';
    } catch (e) {
      console.warn("[Mii3D] photo de profil : rendu 3D indisponible, image 2D conservée.", e);
      mount.style.display = 'none';
      if (img) img.style.display = '';
    }
  },

  async startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    
    const updatePresence = async () => {
      // Ne pas écrire dans Firestore si l'onglet est masqué (économie de bande passante)
      if (document.hidden) return;
      if (!this.currentUser) return;
      try {
        const userRef = doc(window.FirebaseDB, "users", this.currentUser.uid);
        await updateDoc(userRef, { lastActive: new Date().toISOString() });
      } catch (e) { console.error("Heartbeat error:", e); }
    };

    // Initial update
    updatePresence();
    
    // Every 2 minutes
    this.heartbeatTimer = setInterval(updatePresence, 120000);
  },

  getCurrentUser() {
    return this.currentUsername || localStorage.getItem('nostalgia_current_user');
  },

  // Note: hasMii checks if the current user has a Mii avatar saved in Firestore
  // Called with the Firebase user object or username string (handles both)
  async hasMii(userOrUsername) {
    if (!userOrUsername) return false;
    try {
      // If called with a Firebase user object (has .uid), check by UID directly (fastest)
      if (typeof userOrUsername === 'object' && userOrUsername.uid) {
        const avatarRef = doc(window.FirebaseDB, "avatars", userOrUsername.uid);
        const avatarSnap = await getDoc(avatarRef);
        return avatarSnap.exists() && !!avatarSnap.data().visual_base64;
      }
      
      // Fallback: called with a username string — scan all avatars
      const avatarsRef = collection(window.FirebaseDB, "avatars");
      const qSnap = await getDocs(avatarsRef);
      let found = false;
      qSnap.forEach((d) => {
        if (d.data().username && d.data().username.toLowerCase() === userOrUsername.toLowerCase()) {
          found = true;
        }
      });
      return found;
    } catch (e) {
      console.error("Error checking Mii:", e);
      return false;
    }
  },

  async register(username, password) {
    if (!username || !password) return { success: false, message: 'Nom d\'utilisateur et mot de passe requis.' };
    // Firebase Auth requires email format, so we fake one using the username
    const fakeEmail = `${username.toLowerCase()}@hyliaplaza.local`;
    
    try {
      // 1. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(window.FirebaseAuth, fakeEmail, password);
      const user = userCredential.user;
      
      // Generate a random 4-digit code (e.g. 5462)
      const newTag = Math.floor(1000 + Math.random() * 9000).toString();
      
      // 2. Create User Profile Document in Firestore
      await setDoc(doc(window.FirebaseDB, "users", user.uid), {
        username: username,
        tag: newTag,
        createdAt: new Date().toISOString()
      });

      return { success: true, message: 'Compte Firebase créé avec succès !' };
    } catch (e) {
      console.error(e);
      let errorMsg = 'Erreur lors de la création.';
      if (e.code === 'auth/email-already-in-use') errorMsg = 'Ce nom d\'utilisateur existe déjà.';
      if (e.code === 'auth/weak-password') errorMsg = 'Le mot de passe doit faire au moins 6 caractères.';
      return { success: false, message: errorMsg };
    }
  },

  async login(username, password) {
    if (!username || !password) return { success: false, message: 'Nom d\'utilisateur et mot de passe requis.' };
    const fakeEmail = `${username.toLowerCase()}@hyliaplaza.local`;

    try {
      await signInWithEmailAndPassword(window.FirebaseAuth, fakeEmail, password);
      return { success: true, message: 'Connexion réussie.' };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Identifiants incorrects.' };
    }
  },

  async logout() {
    try {
      if (window.Mii3D) window.Mii3D.disposeAll();
      await signOut(window.FirebaseAuth);
      localStorage.removeItem('nostalgia_current_user');
      window.location.reload(); 
    } catch(e) {
      console.error("Logout Error:", e);
    }
  }
};

// Initialize listener
window.Auth.init();
