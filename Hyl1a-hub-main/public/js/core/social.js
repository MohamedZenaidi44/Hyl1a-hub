/**
 * Social System
 * Handles Sidebar navigation, Friend List rendering, and Profile overlays.
 * Wii U / iiSU aesthetic
 */

window.SocialSystem = {
  overlay: null,
  friends: [],
  friendRequests: [],
  globalUsers: [],
  unsubFriends: null,
  unsubRequests: null,
  unsubGlobal: null,
  unsubPrivateThreads: null,
  unsubPrivate: null,
  focusTimeout: null,

  init() {
    this.overlay = document.getElementById('social-overlay');
    
    // Escape key to close social overlay
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay && !this.overlay.classList.contains('hidden')) {
        this.closeOverlay();
      }
    });
  },

  openOverlay(tab) {
    if(!this.overlay) this.init();
    this.overlay.classList.remove('hidden');
    this.resetViewLayout();
    
    // Stop home scroll check
    document.body.classList.add('social-active');

    const header = document.getElementById('social-header');
    const leftCol = document.getElementById('social-left-col');
    
    // Play sound
    if (window.AudioManager && AudioManager.playClick) {
      AudioManager.playClick();
    }

    // Reset UI
    this.setFocusMii(null);
    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
    
    if (this.unsubGlobal) { this.unsubGlobal(); this.unsubGlobal = null; }
    if (this.unsubPrivate) { this.unsubPrivate(); this.unsubPrivate = null; }
    if (this.unsubPrivateThreads) { this.unsubPrivateThreads(); this.unsubPrivateThreads = null; }

    this.switchTab(tab);
  },

  switchTab(tab) {
    const header = document.getElementById('social-header');
    const leftCol = document.getElementById('social-left-col');
    const listInner = document.getElementById('social-list');
    
    // Reset sidebars
    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
    
    // Smooth fade transition between tabs
    if (leftCol) {
      leftCol.style.transition = 'opacity 0.15s ease';
      leftCol.style.opacity = '0';
      setTimeout(() => { leftCol.style.opacity = '1'; }, 50);
    }

    if (tab === 'profile') {
      document.getElementById('btn-my-profile').classList.add('active');
      header.textContent = "Mon Profil";
      leftCol.style.opacity = '1'; 
      
      const currentUser = (window.Auth && Auth.getCurrentUser()) ? Auth.getCurrentUser() : "Guest";
      const currentTag = (window.Auth && Auth.currentUserTag) ? Auth.currentUserTag : "0000";
      
      // Populate Left Column with Account Info
      document.getElementById('social-list').innerHTML = `
        <div class="friend-card active" style="cursor:default; margin-bottom: 20px;">
          <div class="friend-name" style="font-size: 18px; display:flex; align-items:baseline;">${currentUser}<span class="friend-tag" style="margin-left: 2px;">#${currentTag}</span></div>
        </div>
        <div style="padding: 10px 20px; color: #5f6f82; font-weight: 700;">
          <div style="margin-bottom: 15px;">
            <div style="font-size: 11px; text-transform: uppercase; opacity: 0.6; margin-bottom: 5px;">Statut de compte</div>
            <div style="display:flex; gap: 8px;">
               <input type="text" id="user-status-input" placeholder="Que faites-vous ?" maxlength="60" style="flex:1; padding: 8px 12px; border-radius: 12px; border: 1.5px solid rgba(0,0,0,0.1); font-family: inherit;">
               <button onclick="SocialSystem.updateMyStatus()" style="padding: 8px 15px; background: #3a7bd5; color:white; border:none; border-radius: 12px; font-weight: 700; cursor: pointer;">OK</button>
            </div>
          </div>
          <div style="margin-bottom: 15px;">
            <div style="font-size: 11px; text-transform: uppercase; opacity: 0.6;">Localisation</div>
            <div style="font-size: 16px;">France</div>
          </div>
          <div style="margin-bottom: 15px;">
            <div style="font-size: 11px; text-transform: uppercase; opacity: 0.6;">Dernière Connexion</div>
            <div style="font-size: 16px;">En ligne maintenant</div>
          </div>
        </div>
        
        <button onclick="window.Auth.logout()" style="margin-top: 20px; padding: 12px; width: 100%; background: #ff6b6b; color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 15px rgba(255,107,107,0.3);">Déconnexion</button>
      `;
      
      // Load and show current status in input
      this.loadMyStatus();
      
      this.resetRightCol(); // Show Mii on the right
      // Fetch Real Mii
      this.fetchUserMii(currentUser, currentTag);

    } else if (tab === 'friends') {
      document.getElementById('btn-friends').classList.add('active');
      header.textContent = "Liste d'Amis";
      leftCol.style.opacity = '1';
      this.resetRightCol();
      this.renderFriendsHubUI();
      this.fetchRealFriends();
      this.fetchPotentialFriends();

    } else if (tab === 'global') {
      document.getElementById('btn-global').classList.add('active');
      header.textContent = "Chat Général";
      leftCol.style.opacity = '1';
      listInner.classList.remove('social-list-scroll');
      listInner.style.padding = '0';
      listInner.style.overflow = 'hidden';
      listInner.style.display = 'block';
      listInner.style.flex = '1';
      listInner.style.minHeight = '0';
      this.renderGlobalChat(listInner);
      if (document.getElementById('social-right-col')) {
        document.getElementById('social-right-col').innerHTML = '';
      }

    } else if (tab === 'messages') {
      document.getElementById('btn-messages').classList.add('active');
      header.textContent = "Messages Privés";
      leftCol.style.opacity = '1';
      this.resetRightCol(); 
      this.renderPrivateMessagesList(listInner);
    } else {
      // For profile, friends, etc.
      this.resetRightCol();
    }
  },

  async updateMyStatus() {
    const input = document.getElementById('user-status-input');
    if (!input || !window.Auth?.currentUser) return;
    const status = input.value.trim();
    
    try {
      const userRef = window.Firestore.doc(window.FirebaseDB, "users", window.Auth.currentUser.uid);
      await window.Firestore.updateDoc(userRef, { status: status });
      
      // Update local stat-bio display if it exists (Focus Zone)
      const bioEl = document.getElementById('stat-bio');
      const speechEl = document.getElementById('social-focus-speech');
      if (bioEl && speechEl) {
          if (status) {
              speechEl.style.display = 'block';
              bioEl.textContent = status;
          } else {
              speechEl.style.display = 'none';
          }
      }
      
      alert("Statut mis à jour !");
    } catch (e) {
      console.error("Status update error:", e);
      alert("Erreur lors de la mise à jour du statut.");
    }
  },

  async loadMyStatus() {
    if (!window.Auth?.currentUser) return;
    try {
      const userRef = window.Firestore.doc(window.FirebaseDB, "users", window.Auth.currentUser.uid);
      const snap = await window.Firestore.getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        const input = document.getElementById('user-status-input');
        if (input && data.status) input.value = data.status;
        
        const bioEl = document.getElementById('stat-bio');
        const speechEl = document.getElementById('social-focus-speech');
        if (bioEl && speechEl) {
            if (data.status) {
                speechEl.style.display = 'block';
                bioEl.textContent = data.status;
            } else {
                speechEl.style.display = 'none';
            }
        }
      }
    } catch (e) {
      console.error("Status load error:", e);
    }
  },

  closeOverlay() {
    if(this.overlay) this.overlay.classList.add('hidden');
    document.body.classList.remove('social-active');
    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
    this.resetViewLayout();
    
    if(this.unsubFriends) this.unsubFriends();
    if(this.unsubRequests) this.unsubRequests();
    if(this.unsubGlobal) this.unsubGlobal();
    if(this.unsubPrivate) this.unsubPrivate();
    if(this.unsubPrivateThreads) this.unsubPrivateThreads();
    
    if (window.AudioManager && AudioManager.playBack) {
      AudioManager.playBack();
    }
  },

  resetRightCol() {
    const rightCol = document.getElementById('social-right-col');
    if (!rightCol) return;
    
    // Restore Mii Focus UI
    rightCol.innerHTML = `
      <div id="social-mii-header" style="position:absolute; top:20px; font-weight:900; color:#5f6f82; letter-spacing:1px; z-index:10; font-size:18px; text-transform:uppercase; text-shadow: 0 1px 3px rgba(0,0,0,0.1);"></div>
      <div id="social-focus-speech" class="speech-bubble mii-glass-panel" style="display: none;">
        <span id="stat-bio"></span>
      </div>
      <div id="social-focus-mii-container">
        <img id="social-focus-mii" src="public/assets/icons/mii.webp" alt="Mii" style="opacity: 0;">
      </div>
      <div id="social-focus-stats" class="stats-panel mii-glass-panel">
        <div class="stat-wrapper"><div class="stat-label">Tag</div><div class="stat-header" id="stat-display-name">---</div></div>
        <div class="stat-wrapper"><div class="stat-label">Sexe</div><div class="stat-value" id="stat-gender">--</div></div>
        <div class="stat-wrapper"><div class="stat-label">Début</div><div class="stat-value" id="stat-creation">--</div></div>
        <div class="stat-wrapper"><div class="stat-label">Jeu préféré</div><div class="stat-value" id="stat-favapp">--</div></div>
      </div>
    `;
    // Re-trigger focus for first item if list exists (but not on profile tab where it clashes)
    const isProfile = document.getElementById('btn-my-profile') && document.getElementById('btn-my-profile').classList.contains('active');
    if (this.friends.length > 0 && !isProfile) {
        this.setFocusMii(this.friends[0]);
    }
  },

  renderFriendsHubUI() {
    const list = document.getElementById('social-list');
    list.innerHTML = `
      <div style="padding: 15px; margin-bottom: 16px; background: rgba(0,0,0,0.05); border-radius: 20px;">
        <div style="font-weight: 800; margin-bottom: 10px; opacity: 0.75;">Ajouter un ami</div>
        <input type="text" id="friend-search-input" placeholder="Pseudo#1234..." style="width: 100%; padding: 10px; border: none; border-radius: 10px; font-family: inherit;">
        <button onclick="SocialSystem.addFriendRequest()" style="width:100%; margin-top: 10px; padding: 10px; background: #6adae4; color:white; border:none; border-radius: 10px; font-weight: 700; cursor: pointer;">Ajouter</button>
      </div>
      <div id="requests-list-inner" style="margin-bottom: 16px;"></div>
      <div style="font-size: 14px; font-weight: 800; color: #5f6f82; margin-bottom: 10px; padding-left: 10px;">MES AMIS</div>
      <div id="friends-list-inner" style="margin-bottom: 18px;">Chargement...</div>
      <div style="font-size: 14px; font-weight: 800; color: #5f6f82; margin-bottom: 10px; padding-left: 10px;">AUTRES UTILISATEURS</div>
      <div id="other-users-list">Chargement...</div>
    `;
  },

  async fetchRealFriends() {
    const listInner = document.getElementById('friends-list-inner');
    const requestsInner = document.getElementById('requests-list-inner');
    if (!listInner || !requestsInner) return;

    const fbUser = window.Auth ? window.Auth.currentUser : null;
    if (!fbUser) return;

    try {
      // 1. Listen for requests
      const requestsRef = window.Firestore.collection(window.FirebaseDB, "users", fbUser.uid, "friend_requests");
      this.unsubRequests = window.Firestore.onSnapshot(requestsRef, (snapshot) => {
        this.friendRequests = [];
        snapshot.forEach(doc => {
          this.friendRequests.push({ id: doc.id, ...doc.data() });
        });
        this.renderRequests(this.friendRequests, requestsInner);
      });

      // 2. Listen for actual friends
      const friendsRef = window.Firestore.collection(window.FirebaseDB, "users", fbUser.uid, "friends");
      this.unsubFriends = window.Firestore.onSnapshot(friendsRef, async (snapshot) => {
        const friendsList = [];
        for (const friendDoc of snapshot.docs) {
          const friendUid = friendDoc.id;
          // Fetch full profile to get bio, gender, lastActive, etc.
          try {
            const userRef = window.Firestore.doc(window.FirebaseDB, "users", friendUid);
            const userSnap = await window.Firestore.getDoc(userRef);
            if (userSnap.exists()) {
              friendsList.push({ uid: friendUid, ...userSnap.data() });
            } else {
              // Fallback to minimal data if profile fetch fails
              friendsList.push({ uid: friendUid, ...friendDoc.data() });
            }
          } catch(e) { 
            console.error("Social: Error fetching friend profile", e);
            friendsList.push({ uid: friendUid, ...friendDoc.data() });
          }
        }
        this.friends = friendsList;
        this.renderListItems(this.friends, listInner, "Tu n'as pas encore d'amis.");
        if (document.getElementById('other-users-list')) {
          this.fetchPotentialFriends();
        }
      });

    } catch (e) { console.error("SocialSystem: Listeners error:", e); }
  },

  renderRequests(data, container) {
    if (data.length === 0) {
      container.innerHTML = '';
      return;
    }
    
    let html = '<div style="font-size: 14px; font-weight: 800; color: #ff6b6b; margin-bottom: 10px; padding-left: 10px;">DEMANDES EN ATTENTE</div>';
    data.forEach(req => {
       html += `
         <div class="friend-card" style="margin-bottom: 10px;">
           <div class="friend-name">${req.username}<span class="friend-tag">#${req.tag}</span></div>
           <div style="display:flex; gap: 8px; margin-top: 10px;">
             <button onclick="SocialSystem.acceptRequest('${req.id}')" style="flex:1; padding: 6px; background: #34c759; color:white; border:none; border-radius: 8px; font-weight: 700; cursor: pointer;">Accepter</button>
             <button onclick="SocialSystem.rejectRequest('${req.id}')" style="flex:1; padding: 6px; background: #ff6b6b; color:white; border:none; border-radius: 8px; font-weight: 700; cursor: pointer;">Refuser</button>
           </div>
         </div>
       `;
    });
    container.innerHTML = html;
  },

  async fetchGlobalUsers() {
    const list = document.getElementById('social-list');
    list.innerHTML = '<div style="text-align:center; padding: 40px;">Recherche d\'utilisateurs...</div>';

    try {
      const usersRef = window.Firestore.collection(window.FirebaseDB, "users");
      const qSnap = await window.Firestore.getDocs(usersRef);
      
      const avatarsRef = window.Firestore.collection(window.FirebaseDB, "avatars");
      const avSnap = await window.Firestore.getDocs(avatarsRef);
      const avatarsMap = {};
      avSnap.forEach(doc => {
        avatarsMap[doc.id] = doc.data();
      });

      this.globalUsers = [];
      qSnap.forEach(doc => {
          const u = doc.data();
          const av = avatarsMap[doc.id];
          
          // A "real" account for the user seems to be one that has a Mii created
          if (av && u.username !== (window.Auth ? window.Auth.currentUsername : "")) {
            this.globalUsers.push({
              username: u.username,
              tag: u.tag || av.tag || "0000",
              first_name: av.first_name || u.username,
              b64: av.visual_base64 || "",
              bio: u.bio || av.status || "Explorateur Hylia Plaza",
              gender: av.gender || u.gender || "Joueur",
              mii: 'public/assets/icons/logov2.webp',
              playtime: u.playtime || "??",
              creation: u.createdAt ? new Date(u.createdAt).getFullYear().toString() : "2024",
              favapp: u.favoriteApp || "Pokémon Émeraude",
              uid: doc.id
            });
          }
      });

      this.renderList(this.globalUsers);
    } catch(e) { 
      console.error("SocialSystem: Global fetch error:", e); 
      list.innerHTML = `
        <div style="text-align:center; padding: 40px; color: #5f6f82;">
          <div style="font-size: 40px; margin-bottom: 10px;">🛡️</div>
          <div>Accès restreint</div>
          <div style="font-size: 11px; opacity: 0.7; margin-top: 10px;">La liste globale nécessite des permissions administratives.</div>
        </div>
      `;
    }
  },

  async fetchPotentialFriends() {
    const list = document.getElementById('other-users-list');
    if (!list) return;

    const fbUser = window.Auth ? window.Auth.currentUser : null;
    if (!fbUser) return;

    list.innerHTML = '<div style="text-align:center; padding: 20px; opacity:0.6;">Chargement...</div>';

    try {
      const usersRef = window.Firestore.collection(window.FirebaseDB, "users");
      const qSnap = await window.Firestore.getDocs(usersRef);

      const avatarsRef = window.Firestore.collection(window.FirebaseDB, "avatars");
      const avSnap = await window.Firestore.getDocs(avatarsRef);
      const avatarsMap = {};
      avSnap.forEach(doc => {
        avatarsMap[doc.id] = doc.data();
      });

      const currentUsername = window.Auth ? window.Auth.currentUsername : "";
      const currentTag = window.Auth?.currentUserTag || "0000";
      const existingFriendIds = new Set(this.friends.map(friend => friend.uid));

      const potentialFriends = [];
      qSnap.forEach(doc => {
        if (doc.id === fbUser.uid || existingFriendIds.has(doc.id)) return;

        const u = doc.data();
        const av = avatarsMap[doc.id];
        if (!av || u.username === currentUsername) return;

        potentialFriends.push({
          username: u.username,
          tag: u.tag || av.tag || "0000",
          first_name: av.first_name || u.username,
          b64: av.visual_base64 || "",
          bio: u.bio || av.status || "Explorateur Hylia Plaza",
          gender: av.gender || u.gender || "Joueur",
          mii: 'public/assets/icons/logov2.webp',
          playtime: u.playtime || "??",
          creation: u.createdAt ? new Date(u.createdAt).getFullYear().toString() : "2024",
          favapp: u.favoriteApp || "Pokémon Émeraude",
          uid: doc.id
        });
      });

      if (potentialFriends.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 18px; opacity:0.55;">Aucun autre utilisateur trouvé.</div>';
        return;
      }

      list.innerHTML = '';
      this.renderListItems(potentialFriends, list, "Aucun autre utilisateur trouvé.", true);
    } catch (e) {
      console.error("SocialSystem: Potential friends error:", e);
      list.innerHTML = '<div style="text-align:center; padding: 18px; opacity:0.55;">Impossible de charger les autres utilisateurs.</div>';
    }
  },

  renderList(data) {
    const list = document.getElementById('social-list');
    // If it's global, we might not have the add friend UI
    if (document.getElementById('friends-list-inner')) {
       const inner = document.getElementById('friends-list-inner');
       inner.innerHTML = '';
       this.renderListItems(data, inner);
    } else {
       list.innerHTML = '';
       this.renderListItems(data, list, "Aucune information trouvée.", true);
    }
  },

  renderListItems(data, container, emptyMsg = "Aucune information trouvée.", showAddButton = false) {
    container.innerHTML = '';
    if (data.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 20px; opacity:0.6;">'+emptyMsg+'</div>';
      return;
    }

    data.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'friend-card';
      if(index === 0) card.classList.add('active'); 
      
      let addButtonHtml = '';
      if (showAddButton) {
        addButtonHtml = `<button onclick="event.stopPropagation(); SocialSystem.addFriendRequest('${item.username}#${item.tag}')" style="margin-top: 8px; width: 100%; padding: 4px; background: rgba(0,0,0,0.1); border: none; border-radius: 6px; font-weight: bold; cursor: pointer; color: #333;">+ Ajouter</button>`;
      }

      const isOnline = item.lastActive ? (Date.now() - new Date(item.lastActive).getTime() < 300000) : false; // 5 mins
      const statusClass = isOnline ? 'online' : 'offline';

      const displayName = item.first_name || ''; // Show nothing if no first name as requested

      card.innerHTML = `
        <div class="friend-status-dot ${statusClass}"></div>
        <div class="friend-name">${displayName}<span class="friend-tag">#${item.tag}</span></div>
        <div class="friend-bio-small">${item.bio || ""}</div>
        <div class="friend-gender">${item.gender || ""}</div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button onclick="event.stopPropagation(); SocialSystem.openOverlay('messages'); setTimeout(() => SocialSystem.openPrivateChat('${item.uid}', '${item.first_name || item.username}'), 100);" style="flex:1; padding: 6px; background: rgba(58, 123, 213, 0.15); border: 1px solid rgba(58, 123, 213, 0.3); border-radius: 8px; font-weight: bold; cursor: pointer; color: #3a7bd5;">Message</button>
          ${addButtonHtml ? `<div style="flex:1">${addButtonHtml}</div>` : ''}
        </div>
      `;

      card.addEventListener('mouseenter', () => {
         document.querySelectorAll('.friend-card').forEach(c => c.classList.remove('active'));
         card.classList.add('active');
         this.setFocusMii(item);
         if(window.AudioManager && AudioManager.playHover) AudioManager.playHover();
      });

      container.appendChild(card);
    });

    if(data.length > 0) this.setFocusMii(data[0]);
  },

  async addFriendRequest(targetId) {
    const input = document.getElementById('friend-search-input');
    let target = input ? input.value.trim() : targetId;
    
    if (!target) return;
    
    const fbUser = window.Auth ? window.Auth.currentUser : null;
    if (!fbUser) return;
    
    const parts = target.split('#');
    if(parts.length !== 2) {
      alert("Format invalide. Utilise Pseudo#1234");
      return;
    }
    
    const [targetUsername, targetTag] = parts;
    const currentUsername = window.Auth.currentUsername;
    const currentTag = window.Auth.currentUserTag || "0000";
    
    if (targetUsername === currentUsername && targetTag === currentTag) {
       alert("Tu ne peux pas t'ajouter toi-même !");
       return;
    }
    
    try {
       // Search for user
       const usersRef = window.Firestore.collection(window.FirebaseDB, "users");
       const q = window.Firestore.query(usersRef, window.Firestore.where("username", "==", targetUsername), window.Firestore.where("tag", "==", targetTag));
       const qSnap = await window.Firestore.getDocs(q);
       
       if (qSnap.empty) {
         alert("Utilisateur introuvable. Vérifie le pseudo et le tag.");
         return;
       }
       
       const targetDoc = qSnap.docs[0];
       const targetUid = targetDoc.id;
       
       // Send request
       const requestRef = window.Firestore.doc(window.FirebaseDB, "users", targetUid, "friend_requests", fbUser.uid);
       await window.Firestore.setDoc(requestRef, {
         username: currentUsername,
         tag: currentTag,
         status: 'pending',
         timestamp: new Date().toISOString()
       });
       
       alert("Demande d'ami envoyée à " + target + " !");
       if(input) input.value = "";
    } catch(e) {
       console.error(e);
       alert("Erreur lors de l'envoi de la demande. Tes règles Firestore le bloquent peut-être.");
    }
  },
  
  async acceptRequest(senderUid) {
     const fbUser = window.Auth ? window.Auth.currentUser : null;
     if(!fbUser) return;
     
     const req = this.friendRequests.find(r => r.id === senderUid);
     if(!req) return;
     
     try {
       // Add to my friends
       const myFriendRef = window.Firestore.doc(window.FirebaseDB, "users", fbUser.uid, "friends", senderUid);
       await window.Firestore.setDoc(myFriendRef, {
         username: req.username,
         tag: req.tag,
         timestamp: new Date().toISOString()
       });
       
       // Add me to their friends
       const theirFriendRef = window.Firestore.doc(window.FirebaseDB, "users", senderUid, "friends", fbUser.uid);
       await window.Firestore.setDoc(theirFriendRef, {
         username: window.Auth.currentUsername,
         tag: window.Auth.currentUserTag || "0000",
         timestamp: new Date().toISOString()
       });
       
       // Delete request
       await this.rejectRequest(senderUid);
       alert("Ami ajouté avec succès !");
     } catch(e) {
       console.error("Accept error", e);
       alert("Action bloquée par Firestore.");
     }
  },
  
  async rejectRequest(senderUid) {
     const fbUser = window.Auth ? window.Auth.currentUser : null;
     if(!fbUser) return;
     try {
       const reqRef = window.Firestore.doc(window.FirebaseDB, "users", fbUser.uid, "friend_requests", senderUid);
       await window.Firestore.deleteDoc(reqRef);
     } catch(e) {
       console.error("Reject error", e);
     }
  },

  setFocusMii(friend) {
    const imgObj = document.getElementById('social-focus-mii');
    if(!imgObj) return;
    
    if (this.focusTimeout) {
      clearTimeout(this.focusTimeout);
      this.focusTimeout = null;
    }

    if(!friend) {
      imgObj.style.opacity = '0';
      return;
    }

    imgObj.style.opacity = '0'; 
    imgObj.style.transform = 'scale(0.95)';
    
    this.focusTimeout = setTimeout(async () => {
      const nameEl = document.getElementById('stat-display-name');
      if (nameEl) nameEl.innerHTML = `<span style="opacity:0.75; font-size:1em;">#${friend.tag}</span>`;
      
      const bioEl = document.getElementById('stat-bio');
      const speechEl = document.getElementById('social-focus-speech');
      if (bioEl && speechEl) {
          const text = friend.bio || "";
          if (text.trim() === "" || text === "Explorateur Hylia Plaza" || text === "Aucun personnage Mii trouvé pour ce compte.") {
              speechEl.style.display = 'none';
          } else {
              speechEl.style.display = 'block';
              bioEl.textContent = text;
          }
      }
      
      const genEl = document.getElementById('stat-gender');
      if (genEl) {
        genEl.textContent = friend.gender || "Homme";
      }
      
      const ptEl = document.getElementById('stat-playtime');
      if (ptEl) ptEl.textContent = friend.playtime || "??";
      
      const crEl = document.getElementById('stat-creation');
      if (crEl) crEl.textContent = friend.creation || "2024";
      
      const favEl = document.getElementById('stat-favapp');
      if (favEl) {
          // GBA restriction for now
          let fav = friend.favapp || "Pokémon Émeraude";
          if (!fav.toLowerCase().includes("(gba)")) fav += " (GBA)";
          favEl.textContent = fav;
      }

      const miiHeaderEl = document.getElementById('social-mii-header');
      if (miiHeaderEl) {
          const isSelf = friend.username === (window.Auth ? window.Auth.currentUsername : "");
          const pseudo = friend.first_name || friend.username || "Mii";
          miiHeaderEl.textContent = isSelf ? `MON MII avec ${pseudo}` : `MII de ${pseudo}`;
      }
      
      // Try to fetch Mii if not present
      let displayB64 = friend.b64;
      if (!displayB64 && friend.uid) {
         try {
           const avatarRef = window.Firestore.doc(window.FirebaseDB, "avatars", friend.uid);
           const avatarSnap = await window.Firestore.getDoc(avatarRef);
           if (avatarSnap.exists()) {
              displayB64 = avatarSnap.data().visual_base64;
           }
         } catch(e) { console.error("SocialSystem: Error fetching friend mii", e); }
      }

      // Render as full body for the focus zone
      if (displayB64) {
         imgObj.src = `https://mii-unsecure.ariankordi.net/miis/image.png?data=${encodeURIComponent(displayB64)}&verifyCharInfo=0&type=all_body&width=512&shaderType=wiiu`;
      } else {
         imgObj.src = 'public/assets/icons/mii.webp'; // Default Mii instead of logo
      }
      
      imgObj.onload = () => {
         imgObj.style.opacity = '1';
         imgObj.style.transform = 'scale(1)';
      };
    }, 150);
  },

  async fetchUserMii(username, tag) {
    const fbUser = window.Auth ? window.Auth.currentUser : null;
    if (!fbUser) return;

    try {
      if (!window.Firestore || !window.Firestore.getDoc) return;
      const docRef = window.Firestore.doc(window.FirebaseDB, "avatars", fbUser.uid);
      const docSnap = await window.Firestore.getDoc(docRef);

      if (docSnap.exists()) {
        const myAvatar = docSnap.data();
        if (myAvatar && myAvatar.visual_base64) {
          const b64 = myAvatar.visual_base64;
          this.setFocusMii({
            username: username,
            tag: tag,
            bio: "",
            gender: myAvatar.gender || "Homme",
            playtime: "12h",
            creation: myAvatar.createdAt ? new Date(myAvatar.createdAt).getFullYear().toString() : "2024",
            favapp: "Pokémon Émeraude (GBA)",
            b64: b64
          });
          return;
        }
      }
    } catch(e) { console.error("SocialSystem: Error fetching user Mii:", e); }

    // Fallback if no Mii or error
    this.setFocusMii({
      username: username,
      tag: tag,
      bio: "Aucun personnage Mii trouvé pour ce compte.",
      gender: "--",
      playtime: "0h",
      creation: "--",
      favapp: "Pokémon Émeraude (GBA)",
      mii: 'public/assets/icons/logov2.webp'
    });
  },

  // detectMiiGender removed as per user feedback

  // --- NEW CHAT FUNCTIONS ---

  renderGlobalChat(container) {
    if (!container) return;
    
    // Make container a chat box
    container.innerHTML = `
      <div class="chat-container full-height">
        <div class="chat-header">Plaza Chat Global</div>
        <div id="global-chat-messages" class="chat-messages smaller-text">
          <div style="text-align:center; padding:20px; opacity:0.5;">Chargement du chat...</div>
        </div>
        <div class="chat-input-bar glass">
          <input type="text" id="global-chat-input" class="chat-input" placeholder="Écrire un message..." maxlength="180">
          <button id="global-chat-send" class="chat-send-btn">➔</button>
        </div>
      </div>
    `;

    const input = document.getElementById('global-chat-input');
    const sendBtn = document.getElementById('global-chat-send');
    const messagesDiv = document.getElementById('global-chat-messages');

    const handleSend = () => {
      const text = input.value.trim();
      if (text) {
        this.sendGlobalMessage(text);
        input.value = '';
      }
    };

    sendBtn.onclick = handleSend;
    input.onkeydown = (e) => { if(e.key === 'Enter') handleSend(); };

    // Real-time listener
    const q = window.Firestore.query(
      window.Firestore.collection(window.FirebaseDB, "global_messages"),
      window.Firestore.orderBy("timestamp", "desc"),
      window.Firestore.limit(50)
    );

    this.unsubGlobal = window.Firestore.onSnapshot(q, (snapshot) => {
      messagesDiv.innerHTML = '';
      const docs = [...snapshot.docs].reverse();
      docs.forEach(doc => {
        const data = doc.data();
        const isSelf = data.uid === (window.Auth?.currentUser?.uid);
        const time = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...';
        
        const msg = document.createElement('div');
        msg.className = `message-bubble ${isSelf ? 'self' : 'other'}`;
        msg.innerHTML = `
          <div class="message-info">${isSelf ? 'Moi' : (data.first_name || data.username || 'Anonyme')} • ${time}</div>
          <div class="message-text">${this.escapeHtml(data.text)}</div>
        `;
        messagesDiv.appendChild(msg);
      });
      messagesDiv.scrollTo({ top: messagesDiv.scrollHeight, behavior: 'smooth' });
    });
  },

  async sendGlobalMessage(text) {
    const user = window.Auth?.currentUser;
    if (!user) return;

    try {
      await window.Firestore.addDoc(window.Firestore.collection(window.FirebaseDB, "global_messages"), {
        uid: user.uid,
        username: window.Auth.currentUsername || "Anonyme",
        first_name: window.Auth.currentUsername || "",
        text: text,
        timestamp: window.Firestore.serverTimestamp()
      });
    } catch(e) { console.error("Chat Global Error:", e); }
  },

  renderPrivateMessagesList(container) {
    const fbUser = window.Auth?.currentUser;
    if (!container || !fbUser) return;

    if (this.unsubPrivateThreads) {
      this.unsubPrivateThreads();
      this.unsubPrivateThreads = null;
    }
    if (this.unsubPrivate) {
      this.unsubPrivate();
      this.unsubPrivate = null;
    }

    container.innerHTML = `
      <div style="padding: 20px; height: 100%; display: flex; flex-direction: column; gap: 14px; box-sizing: border-box;">
        <div style="font-weight: 800; margin-bottom: 2px; opacity: 0.7;">Conversations privées</div>
        <div id="private-threads-list" style="display:flex; flex-direction:column; gap:10px; flex:1; min-height:0;"></div>
      </div>
    `;

    const threadsList = document.getElementById('private-threads-list');
    if (!threadsList) return;

    const chatsRef = window.Firestore.collection(window.FirebaseDB, "private_chats");
    const chatsQuery = window.Firestore.query(
      chatsRef,
      window.Firestore.where("participants", "array-contains", fbUser.uid)
    );

    const formatTime = (value) => {
      if (!value) return '';
      const raw = value.seconds ? value.seconds * 1000 : new Date(value).getTime();
      if (!Number.isFinite(raw)) return '';
      return new Date(raw).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    this.unsubPrivateThreads = window.Firestore.onSnapshot(chatsQuery, async (snapshot) => {
      const chats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      chats.sort((a, b) => {
        const at = a.lastTimestamp?.seconds ? a.lastTimestamp.seconds * 1000 : 0;
        const bt = b.lastTimestamp?.seconds ? b.lastTimestamp.seconds * 1000 : 0;
        return bt - at;
      });

      if (chats.length === 0) {
        threadsList.innerHTML = `
          <div style="opacity:0.55; padding: 18px 10px; text-align:center;">
            Aucune conversation pour le moment.
            <div style="margin-top:8px; font-size:12px;">Envoie un premier message à un ami pour créer un fil privé.</div>
          </div>
        `;
        return;
      }

      const threadData = await Promise.all(chats.map(async (chat) => {
        const participants = Array.isArray(chat.participants) ? chat.participants : [];
        const otherUid = participants.find((id) => id !== fbUser.uid) || participants[0] || null;
        let displayName = 'Conversation privée';
        let tag = '';

        if (otherUid) {
          try {
            const userSnap = await window.Firestore.getDoc(window.Firestore.doc(window.FirebaseDB, "users", otherUid));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              displayName = userData.first_name || userData.username || displayName;
              tag = userData.tag || '';
            }
          } catch (e) {
            console.error('SocialSystem: private thread user fetch error', e);
          }
        }

        return {
          chatId: chat.id,
          otherUid,
          displayName,
          tag,
          lastMessage: chat.lastMessage || 'Message privé',
          lastSeen: formatTime(chat.lastTimestamp),
        };
      }));

      threadsList.innerHTML = '';
      threadData.forEach((thread, index) => {
        const item = document.createElement('div');
        item.className = 'friend-card';
        if (index === 0) item.classList.add('active');
        item.style.margin = '0';
        item.style.cursor = 'pointer';
        item.innerHTML = `
          <div class="friend-name">${this.escapeHtml(thread.displayName)}${thread.tag ? `<span class="friend-tag">#${this.escapeHtml(thread.tag)}</span>` : ''}</div>
          <div style="font-size: 12px; opacity: 0.72; margin-top: 4px;">${this.escapeHtml(thread.lastMessage)}</div>
          <div style="font-size: 10px; opacity: 0.45; margin-top: 6px;">${this.escapeHtml(thread.lastSeen)}</div>
        `;
        item.onclick = () => {
          if (!thread.otherUid) return;
          this.openPrivateChat(thread.otherUid, thread.displayName);
        };
        threadsList.appendChild(item);
      });
    });
  },

  async openPrivateChat(friendUid, friendName) {
    const user = window.Auth?.currentUser;
    if (!user) return;

    if (this.unsubPrivateThreads) {
      this.unsubPrivateThreads();
      this.unsubPrivateThreads = null;
    }

    if (this.unsubPrivate) {
      this.unsubPrivate();
      this.unsubPrivate = null;
    }

    const header = document.getElementById('social-header');
    const container = document.getElementById('social-list');
    header.textContent = `Discussion : ${friendName}`;

    const chatId = [user.uid, friendUid].sort().join('_');
    
    container.innerHTML = `
      <div class="chat-container">
        <div id="private-chat-messages" class="chat-messages"></div>
        <div class="chat-input-bar">
          <button onclick="SocialSystem.switchTab('messages')" style="background:none; border:none; font-size:20px; cursor:pointer; opacity:0.6;">←</button>
          <input type="text" id="private-chat-input" class="chat-input" placeholder="Message privé..." maxlength="300">
          <button id="private-chat-send" class="chat-send-btn">➔</button>
        </div>
      </div>
    `;

    const input = document.getElementById('private-chat-input');
    const sendBtn = document.getElementById('private-chat-send');
    const messagesDiv = document.getElementById('private-chat-messages');

    const handleSend = () => {
      const text = input.value.trim();
      if (text) {
        this.sendPrivateMessage(chatId, text);
        input.value = '';
      }
    };

    sendBtn.onclick = handleSend;
    input.onkeydown = (e) => { if(e.key === 'Enter') handleSend(); };

    const q = window.Firestore.query(
      window.Firestore.collection(window.FirebaseDB, "private_chats", chatId, "messages"),
      window.Firestore.orderBy("timestamp", "asc")
    );

    this.unsubPrivate = window.Firestore.onSnapshot(q, (snapshot) => {
      messagesDiv.innerHTML = '';
      snapshot.forEach(doc => {
        const data = doc.data();
        const isSelf = data.senderId === user.uid;
        const msg = document.createElement('div');
        msg.className = `message-bubble ${isSelf ? 'self' : 'other'}`;
        msg.innerHTML = `<div class="message-text">${this.escapeHtml(data.text)}</div>`;
        messagesDiv.appendChild(msg);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  },

  async sendPrivateMessage(chatId, text) {
    const user = window.Auth?.currentUser;
    if (!user) return;

    try {
      const chatRef = window.Firestore.doc(window.FirebaseDB, "private_chats", chatId);
      await window.Firestore.setDoc(chatRef, {
        participants: chatId.split('_'),
        lastMessage: text,
        lastTimestamp: window.Firestore.serverTimestamp()
      }, { merge: true });

      await window.Firestore.addDoc(window.Firestore.collection(window.FirebaseDB, "private_chats", chatId, "messages"), {
        senderId: user.uid,
        text: text,
        timestamp: window.Firestore.serverTimestamp()
      });
    } catch(e) { console.error("Private Chat Error:", e); }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  // Direct view methods (show only the specific service)
  openFriendsView() {
    this.openOverlay('friends');
    this.expandLeftPane();
  },

  openMessagesView() {
    this.openOverlay('messages');
    this.expandLeftPane();
  },

  openGlobalView() {
    this.openOverlay('global');
    this.expandLeftPane();
  },

  expandLeftPane() {
    const sidebar = document.getElementById('main-sidebar');
    const rightCol = document.getElementById('social-right-col');
    const leftCol = document.getElementById('social-left-col');
    const content = document.querySelector('.social-content');
    const header = document.getElementById('social-header');

    if (sidebar) { sidebar.style.display = 'none'; }
    if (rightCol) { rightCol.style.display = 'none'; }
    if (content) {
      content.style.gap = '0';
    }
    if (leftCol) {
      leftCol.style.display = 'flex';
      leftCol.style.flex = '1 1 auto';
      leftCol.style.width = '100%';
      leftCol.style.minWidth = '0';
      leftCol.style.padding = '20px';
      leftCol.style.boxSizing = 'border-box';
    }
    if (header) { header.style.textAlign = 'center'; }
  },

  resetViewLayout() {
    const sidebar = document.getElementById('main-sidebar');
    const rightCol = document.getElementById('social-right-col');
    const leftCol = document.getElementById('social-left-col');
    const content = document.querySelector('.social-content');
    const listInner = document.getElementById('social-list');

    if (sidebar) { sidebar.style.display = ''; }
    if (rightCol) { rightCol.style.display = ''; }
    if (content) {
      content.style.gap = '';
    }
    if (leftCol) {
      leftCol.style.display = '';
      leftCol.style.flex = '';
      leftCol.style.width = '';
      leftCol.style.minWidth = '';
      leftCol.style.padding = '';
      leftCol.style.boxSizing = '';
    }
    if (listInner) {
      listInner.classList.add('social-list-scroll');
      listInner.style.padding = '';
      listInner.style.overflow = '';
      listInner.style.display = '';
      listInner.style.flex = '';
      listInner.style.minHeight = '';
    }
  },

  openNotificationsView() {
    // For notifications, we can use the existing NotifSystem
    if (window.NotifSystem) {
      NotifSystem.openPanel();
    }
    // Also close any social overlay if open
    this.closeOverlay();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.SocialSystem) window.SocialSystem.init();
});
