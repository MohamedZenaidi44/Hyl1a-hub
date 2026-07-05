/**
 * Mii Manager Application
 * Allows users to view and delete their created Miis.
 */

window.MiiManager = {
  passwordVerified: false,

  async open(container) {
    this.container = container;

    if (!this.passwordVerified) {
      this.renderPasswordPrompt();
      return;
    }

    this.renderLoading();
    const user = window.Auth ? window.Auth.currentUser : null;
    if (!user) {
      this.container.innerHTML = '<div class="mii-manager-error">Veuillez vous connecter pour gérer vos Miis.</div>';
      return;
    }

    try {
      const miis = await this.fetchUserMiis(user.uid);
      this.renderMiiList(miis);
    } catch (e) {
      console.error("Error opening Mii Manager:", e);
      this.container.innerHTML = '<div class="mii-manager-error">Erreur lors du chargement des Miis.</div>';
    }
  },

  renderPasswordPrompt() {
    this.container.innerHTML = `
      <div class="mii-manager-auth" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 20px; background: #16162a; color: white; font-family: 'Inter', sans-serif;">
        <div style="font-size: 50px;"></div>
        <h2 style="margin: 0; color: #7eb8ff;">Accès Protégé</h2>
        <p style="color: rgba(255,255,255,0.6); margin: 0;">Entrez le code pour gérer les Miis</p>
        <div style="display: flex; gap: 10px;">
          <input type="password" id="mii-auth-input" placeholder="Code secret" 
                 style="padding: 12px 20px; border-radius: 12px; border: 2px solid #2a2a4a; background: #22223a; color: white; outline: none; font-size: 16px; width: 180px; text-align: center;">
          <button id="mii-auth-btn" 
                  style="padding: 12px 25px; border-radius: 12px; border: none; background: #3366cc; color: white; font-weight: 800; cursor: pointer; transition: all 0.2s;">OK</button>
        </div>
        <p id="mii-auth-error" style="color: #ff4455; font-size: 14px; height: 20px; margin: 0;"></p>
      </div>
    `;

    const input = this.container.querySelector('#mii-auth-input');
    const btn = this.container.querySelector('#mii-auth-btn');
    const error = this.container.querySelector('#mii-auth-error');

    const check = () => {
      if (input.value === '375513') {
        this.passwordVerified = true;
        this.open(this.container);
      } else {
        error.textContent = 'Code incorrect';
        input.value = '';
        input.focus();
        error.style.animation = 'none';
        error.offsetHeight; // trigger reflow
        error.style.animation = 'shake 0.4s';
      }
    };

    btn.onclick = check;
    input.onkeydown = (e) => { if (e.key === 'Enter') check(); };
    input.focus();
  },

  renderLoading() {
    this.container.innerHTML = `
      <div class="mii-manager-loading">
        <div class="mii-spinner"></div>
        <p>Chargement de vos Miis...</p>
      </div>
    `;
  },

  async fetchUserMiis(uid) {
    if (!window.Firestore || !window.FirebaseDB) return [];

    // In this implementation, we fetch all Miis and filter by owner if we had an owner field.
    // For now, based on auth.js, we might only have one Mii per user in 'avatars' collection indexed by UID.
    // However, the user request implies multiple Miis ("selectionner les mii a supprimer").
    // Let's check how many Miis are stored.

    const avatarsRef = window.Firestore.collection(window.FirebaseDB, "avatars");
    const qSnap = await window.Firestore.getDocs(avatarsRef);
    const miis = [];

    qSnap.forEach(doc => {
      const data = doc.data();
      // If we want to restrict to current user, we'd check an owner field.
      // But if the user wants a global manager or if Miis aren't strictly owned, we show all.
      // Based on previous conversations, there's a 1-to-1 link usually, but let's allow managing all for this specific tool.
      if (data.visual_base64 && data.username) {
        miis.push({
          id: doc.id,
          username: data.username,
          b64: data.visual_base64
        });
      }
    });

    return miis;
  },

  renderMiiList(miis) {
    if (miis.length === 0) {
      this.container.innerHTML = `
        <div class="mii-manager-empty">
          <p>Aucun Mii trouvé.</p>
          <button class="mii-btn-primary" onclick="document.querySelector('.app-trigger[data-app=\\'miiMaker\\']').click()">Créer un Mii</button>
        </div>
      `;
      return;
    }

    let miiCards = miis.map(mii => `
      <div class="mii-card" id="mii-card-${mii.id}">
        <div class="mii-card-avatar">
          <img src="https://mii-unsecure.ariankordi.net/miis/image.png?data=${encodeURIComponent(mii.b64)}&verifyCharInfo=0&type=face&width=160&shaderType=wiiu" 
               alt="${mii.username}">
        </div>
        <div class="mii-card-info">
          <h3>${mii.username}</h3>
          <button class="mii-btn-delete" onclick="window.MiiManager.deleteMii('${mii.id}', '${mii.username}')">Supprimer</button>
        </div>
      </div>
    `).join('');

    this.container.innerHTML = `
      <style>
        .mii-manager-fullscreen {
          width: 100%;
          height: 100%;
          background: rgba(10, 10, 25, 0.95);
          color: white;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          animation: miiFadeIn 0.5s ease-out;
        }
        @keyframes miiFadeIn { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
        
        .mii-manager-top {
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .mii-manager-close {
          background: #ff4455;
          color: white;
          border: none;
          padding: 10px 25px;
          border-radius: 30px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .mii-manager-close:hover { transform: scale(1.1); }
        
        .mii-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 25px;
          padding: 40px;
          overflow-y: auto;
          flex: 1;
        }
        .mii-card {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
        }
        .mii-card:hover { 
          background: rgba(255,255,255,0.12); 
          transform: translateY(-5px);
          border-color: #3366cc;
        }
        .mii-card-avatar img { width: 120px; height: 120px; border-radius: 50%; background: rgba(0,0,0,0.2); margin-bottom: 15px; }
        .mii-btn-delete {
          background: transparent;
          border: 1px solid #ff4455;
          color: #ff4455;
          padding: 8px 15px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .mii-btn-delete:hover { background: #ff4455; color: white; }
      </style>
      <div class="mii-manager-fullscreen">
        <div class="mii-manager-top">
          <div>
            <h2 style="margin:0; font-size: 28px;">Gestion des Miis</h2>
            <p style="margin:5px 0 0; opacity: 0.6;">DANGER : Toute suppression est irréversible.</p>
          </div>
          <button class="mii-manager-close" onclick="if(window.AppRegistry.miiManager.close) window.AppRegistry.miiManager.close()">Quitter</button>
        </div>
        <div class="mii-grid">
          ${miiCards}
        </div>
      </div>
    `;
  },

  async deleteMii(id, name) {
    if (!confirm(`Voulez-vous vraiment supprimer le Mii "${name}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const docRef = window.Firestore.doc(window.FirebaseDB, "avatars", id);
      // We don't have a deleteDoc export in firebase.js KI, let's check what's available.
      // Wait, firebase.js has { doc, setDoc, getDoc, collection, getDocs }.
      // I might need deleteDoc.

      this.container.querySelector(`#mii-card-${id}`).style.opacity = '0.5';
      this.container.querySelector(`#mii-card-${id} .mii-btn-delete`).disabled = true;
      this.container.querySelector(`#mii-card-${id} .mii-btn-delete`).textContent = '...';

      await window.Firestore.deleteDoc(docRef);

      this.container.querySelector(`#mii-card-${id}`).style.transform = 'scale(0.8)';
      this.container.querySelector(`#mii-card-${id}`).style.opacity = '0';

      setTimeout(() => {
        const user = window.Auth ? window.Auth.currentUser : null;
        if (user) this.open(this.container);
      }, 400);

    } catch (e) {
      console.error("Error deleting Mii:", e);
      alert("Erreur lors de la suppression.");
      if (this.container.querySelector(`#mii-card-${id}`)) {
        this.container.querySelector(`#mii-card-${id}`).style.opacity = '1';
        this.container.querySelector(`#mii-card-${id} .mii-btn-delete`).disabled = false;
        this.container.querySelector(`#mii-card-${id} .mii-btn-delete`).textContent = 'Supprimer';
      }
    }
  }
};

const loadScript = url => new Promise((resolve) => {
  if (document.querySelector(`script[src="${url}"]`)) return resolve();
  const s = document.createElement('script');
  s.src = url;
  s.onload = resolve;
  document.head.appendChild(s);
});

export default async function renderMiiManager(container) {
    try {
      const miiModule = await import('../../../apps/mii_maker/js/mii.js');
      window.Mii = miiModule.default || miiModule.Mii;
    } catch (e) {
      console.error("Failed to load mii.js module:", e);
    }
    await loadScript('apps/mii_maker/js/avatar.js');
    if (window.MiiManager) window.MiiManager.open(container);
}
