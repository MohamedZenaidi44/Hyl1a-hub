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
 
                // Only show welcome message and play SFX once per session
                if (!sessionStorage.getItem('hylia_welcome_shown')) {
                  sessionStorage.setItem('hylia_welcome_shown', 'true');

                  // Play welcome SFX
                  if (window.AudioManager && window.AudioManager.playConnectSuccess) {
                    window.AudioManager.playConnectSuccess();
                  }
 
                  // Show welcome message
                  const welcomeMsg = document.createElement('div');
                  welcomeMsg.id = 'login-welcome-msg';
                  welcomeMsg.style.cssText = `
                    position: fixed;
                    top: 20%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(255, 255, 255, 0.08);
                    backdrop-filter: blur(35px) saturate(180%);
                    color: white;
                    padding: 20px 40px;
                    border-radius: 40px;
                    font-size: 32px;
                    font-weight: 900;
                    z-index: 30000;
                    box-shadow: 0 30px 90px rgba(0,0,0,0.6), 
                                inset 0 0 30px rgba(255,255,255,0.2),
                                0 0 0 1px rgba(255,255,255,0.4);
                    pointer-events: none;
                    text-shadow: 0 5px 15px rgba(0,0,0,0.5);
                    letter-spacing: -1.5px;
                    text-align: center;
                    animation: welcomeCinematic 4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                  `;
                  welcomeMsg.innerHTML = `Welcome <span style="background: linear-gradient(135deg, #7ec4ff, #4a9fff, #7ec4ff); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: textShine 3s linear infinite;">${this.currentUsername}<span style="font-size: 0.6em; opacity: 0.7;">#${this.currentUserTag}</span></span> ! :)`;
                  
                  // Add animation keyframes
                  if (!document.getElementById('welcome-anim-style')) {
                    const style = document.createElement('style');
                    style.id = 'welcome-anim-style';
                    style.textContent = `
                      @keyframes welcomeCinematic {
                        0% { opacity: 0; transform: translate(-50%, -10%) scale(0.8); filter: blur(20px) brightness(1.5); }
                        15%, 85% { opacity: 1; transform: translate(-50%, -20%) scale(1); filter: blur(0px) brightness(1); }
                        100% { opacity: 0; transform: translate(-50%, -30%) scale(1.05); filter: blur(30px) brightness(0.8); }
                      }
                      @keyframes textShine {
                        to { background-position: 200% center; }
                      }
                    `;
                    document.head.appendChild(style);
                  }
  
                  document.body.appendChild(welcomeMsg);
                  setTimeout(() => welcomeMsg.remove(), 3800);
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

    try {
      const docRef = doc(window.FirebaseDB, "avatars", this.currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const myAvatar = docSnap.data();
        if (myAvatar && myAvatar.visual_base64) {
          const b64 = myAvatar.visual_base64;
          const thumbUrl = `https://mii-unsecure.ariankordi.net/miis/image.png?data=${encodeURIComponent(b64)}&verifyCharInfo=0&type=face&width=128&shaderType=wiiu`;
          container.innerHTML = `<img src="${thumbUrl}" style="width: 120%; height: 120%; object-fit: cover; transform: translateY(10%);">`;
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

  async startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    
    const updatePresence = async () => {
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
