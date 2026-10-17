/**
 * Enhanced Avatar System
 * Spawns 3D-styled Mii-like characters with emotions and interactions.
 */

const AvatarSystem = {
  avatars: [],
  container: null,
  
  messages: [
    "Welcome to the plaza!",
    "It's a beautiful day.",
    "Try clicking the Radio Booth for some tunes.",
    "The Gallery has some nice pictures.",
    "Have you signed the Town Board yet?",
    "*relaxing sigh*"
  ],

  faces: {
    normal: `
      <circle cx="22" cy="22" r="2" fill="#333" />
      <circle cx="38" cy="22" r="2" fill="#333" />
      <path d="M25 32 Q30 35 35 32" stroke="#333" stroke-width="2" fill="none" />
    `,
    happy: `
      <path d="M18 22 Q22 18 26 22" stroke="#333" stroke-width="2" fill="none" />
      <path d="M34 22 Q38 18 42 22" stroke="#333" stroke-width="2" fill="none" />
      <path d="M25 30 Q30 36 35 30 Z" fill="#333" />
    `,
    surprised: `
      <circle cx="22" cy="20" r="3" fill="#333" />
      <circle cx="38" cy="20" r="3" fill="#333" />
      <circle cx="30" cy="32" r="4" fill="#333" />
    `,
    sleepy: `
      <path d="M18 22 L26 22" stroke="#333" stroke-width="2" fill="none" />
      <path d="M34 22 L42 22" stroke="#333" stroke-width="2" fill="none" />
      <circle cx="30" cy="32" r="2" fill="#333" />
    `
  },

  init: async function() {
    this.container = document.getElementById('avatar-container');
    if (!this.container) return;
    
    let avatarsData = [];
    try {
      if (window.Firestore && window.FirebaseDB) {
        const avatarsRef = window.Firestore.collection(window.FirebaseDB, "avatars");
        const qSnap = await window.Firestore.getDocs(avatarsRef);
        qSnap.forEach(doc => {
          const d = doc.data();
          if (d.visual_base64) {
            avatarsData.push({ 
              username: d.username, 
              visual_data: { visual_base64: d.visual_base64 } 
            });
          }
        });
      }
    } catch (e) {
      console.error("Error fetching avatars for plaza:", e);
    }

    // Spawn at least 5 avatars. Mix saved Miis with random ones if needed.
    const spawnCount = Math.max(5, avatarsData.length);
    for (let i = 0; i < spawnCount; i++) {
        this.spawnAvatar(i, avatarsData[i] || null);
    }
  },

  spawnAvatar: function(id, miiData) {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    
    if (miiData && miiData.visual_data && miiData.visual_data.visual_base64) {
      const b64 = miiData.visual_data.visual_base64;
      const bodyUrl = `https://mii-unsecure.ariankordi.net/miis/image.png?data=${encodeURIComponent(b64)}&verifyCharInfo=0&type=all_body&width=256&shaderType=wiiu`;
      
      avatar.innerHTML = `
        <div class="avatar-dialogue">${miiData.username || 'Mii'}</div>
        <div class="avatar-body" style="filter: drop-shadow(0 10px 10px rgba(0,0,0,0.2));">
           <img src="${bodyUrl}" style="width: 100px; height: 150px; object-fit: contain;">
        </div>
      `;
    } else {
      const hue = Math.floor(Math.random() * 360);
      avatar.innerHTML = `
        <div class="avatar-dialogue">Hello!</div>
        <div class="avatar-body" style="filter: drop-shadow(0 10px 10px rgba(0,0,0,0.2));">
          <svg viewBox="0 0 60 90" width="60" height="90">
            <path d="M15 45 Q30 40 45 45 L40 85 Q30 90 20 85 Z" fill="hsl(${hue}, 70%, 50%)" />
            <path d="M17 46 Q30 41 43 46 L38 84 Q30 88 22 84 Z" fill="hsl(${hue}, 70%, 60%)" />
            <path d="M20 48 Q30 43 40 48 L35 80 Q30 84 25 80 Z" fill="hsl(${hue}, 70%, 75%)" />
            <circle cx="30" cy="25" r="20" fill="#e6c2a5" />
            <circle cx="28" cy="23" r="18" fill="#ffdfc4" />
            <g class="avatar-face">
              ${this.faces.normal}
            </g>
          </svg>
        </div>
      `;
    }
    
    this.container.appendChild(avatar);
    
    const obj = { id, el: avatar, isMii: !!miiData };
    this.avatars.push(obj);
    
    // Interaction logic
    avatar.addEventListener('click', (e) => {
      e.stopPropagation(); 
      this.interact(obj);
    });
    
    this.wander(obj);
  },

  setEmotion: function(obj, emotionName) {
    const faceGroup = obj.el.querySelector('.avatar-face');
    if (faceGroup && this.faces[emotionName]) {
      faceGroup.innerHTML = this.faces[emotionName];
    }
  },

  wander: function(obj) {
    this.setEmotion(obj, 'normal');
    
    const body = obj.el.querySelector('.avatar-body');
    if (Math.random() > 0.5) body.style.transform = 'scaleX(-1)';
    else body.style.transform = 'scaleX(1)';
    
    const duration = Math.random() * 3000 + 4000;
    
    setTimeout(() => {
      if (!obj.el.classList.contains('interacting')) {
        if (Math.random() > 0.7) {
          this.setEmotion(obj, 'sleepy');
          setTimeout(() => {
            if (!obj.el.classList.contains('interacting')) this.wander(obj);
          }, 3000);
        } else {
          this.wander(obj);
        }
      }
    }, duration);
  },

  interact: function(obj) {
    // Prevent double interactions
    if (obj.el.classList.contains('interacting')) return;
    
    if (typeof AudioManager !== 'undefined') AudioManager.playPop();
    
    obj.el.classList.add('interacting');
    
    // Pick random interaction feeling
    const feel = Math.random();
    let animClass = 'anim-jump';
    
    if (feel > 0.8) {
      this.setEmotion(obj, 'surprised');
      animClass = 'anim-flip';
    } else {
      this.setEmotion(obj, 'happy');
    }

    const body = obj.el.querySelector('.avatar-body');
    
    // Temporarily swap animation class on body
    const oldStyle = body.style.animation;
    body.style.animation = 'none';
    body.classList.add(animClass);
    
    const dialog = obj.el.querySelector('.avatar-dialogue');
    dialog.textContent = this.messages[Math.floor(Math.random() * this.messages.length)];
    dialog.style.opacity = 1;
    dialog.style.transform = 'translateX(-50%) translateY(0) scale(1)';
    
    // Stop wandering temporarily
    obj.el.style.transition = 'none';
    
    setTimeout(() => {
      dialog.style.opacity = 0;
      dialog.style.transform = 'translateX(-50%) translateY(10px) scale(0.9)';
      
      body.classList.remove(animClass);
      body.style.animation = oldStyle;
      
      obj.el.classList.remove('interacting');
      
      // Resume wander
      setTimeout(() => this.wander(obj), 500);
    }, 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AvatarSystem.init();
});
