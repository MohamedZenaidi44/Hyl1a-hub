/**
 * Mii Manager Application
 *
 * Outil de gestion des Mii.
 *  - Un compte normal ne peut gérer QUE son propre Mii.
 *  - Un compte administrateur (users/{uid}.role === "admin") peut gérer tous
 *    les Mii de la base.
 *
 * ⚠️ La vérification côté client ne suffit pas : les règles Firestore
 * (voir firestore.rules) DOIVENT interdire la suppression d'un document
 * `avatars/*` qui n'appartient pas à l'utilisateur courant.
 */

window.MiiManager = {
  isAdmin: false,
  currentUid: null,

  async open(container) {
    this.container = container;

    const user = window.Auth ? window.Auth.currentUser : null;
    if (!user) {
      this.container.innerHTML = '<div class="mii-manager-error">Veuillez vous connecter pour gérer vos Miis.</div>';
      return;
    }

    this.currentUid = user.uid;
    this.renderLoading();

    try {
      this.isAdmin = await this.checkAdmin(user.uid);
      const miis = await this.fetchMiis(user.uid, this.isAdmin);
      this.renderMiiList(miis, this.isAdmin);
    } catch (e) {
      console.error("Error opening Mii Manager:", e);
      this.container.innerHTML = '<div class="mii-manager-error">Erreur lors du chargement des Miis.</div>';
    }
  },

  async checkAdmin(uid) {
    try {
      if (!window.Firestore || !window.FirebaseDB) return false;
      const snap = await window.Firestore.getDoc(
        window.Firestore.doc(window.FirebaseDB, "users", uid)
      );
      if (!snap.exists()) return false;
      const data = snap.data();
      return data.role === 'admin' || data.isAdmin === true;
    } catch (e) {
      console.warn("MiiManager: admin check failed", e);
      return false;
    }
  },

  renderLoading() {
    this.container.innerHTML = `
      <div class="mii-manager-loading">
        <div class="mii-spinner"></div>
        <p>Chargement des Miis...</p>
      </div>
    `;
  },

  async fetchMiis(uid, isAdmin) {
    if (!window.Firestore || !window.FirebaseDB) return [];

    // Compte normal : uniquement son propre Mii (avatars/{uid}).
    if (!isAdmin) {
      const mySnap = await window.Firestore.getDoc(
        window.Firestore.doc(window.FirebaseDB, "avatars", uid)
      );
      if (mySnap.exists()) {
        const d = mySnap.data();
        if (d.visual_base64 && d.username) {
          return [{ id: uid, username: d.username, b64: d.visual_base64, own: true }];
        }
      }
      return [];
    }

    // Admin : tous les Mii.
    const avatarsRef = window.Firestore.collection(window.FirebaseDB, "avatars");
    const qSnap = await window.Firestore.getDocs(avatarsRef);
    const miis = [];
    qSnap.forEach(doc => {
      const data = doc.data();
      if (data.visual_base64 && data.username) {
        miis.push({
          id: doc.id,
          username: data.username,
          b64: data.visual_base64,
          own: doc.id === uid,
        });
      }
    });
    return miis;
  },

  renderMiiList(miis, isAdmin) {
    if (!miis || miis.length === 0) {
      this.container.innerHTML = `
        <div class="mii-manager-empty" style="padding:40px; text-align:center; color:#ccc;">
          <p>Aucun Mii trouvé pour ce compte.</p>
        </div>
      `;
      return;
    }

    const style = document.createElement('style');
    style.textContent = `
      .mii-manager-fullscreen { width:100%; height:100%; background:rgba(10,10,25,0.95); color:white; font-family:'Inter',sans-serif; display:flex; flex-direction:column; animation:miiFadeIn .5s ease-out; }
      @keyframes miiFadeIn { from { opacity:0; transform:scale(1.05);} to { opacity:1; transform:scale(1);} }
      .mii-manager-top { padding:20px 40px; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,.05); border-bottom:1px solid rgba(255,255,255,.1); }
      .mii-manager-close { background:#ff4455; color:white; border:none; padding:10px 25px; border-radius:30px; font-weight:800; cursor:pointer; transition:transform .2s; }
      .mii-manager-close:hover { transform:scale(1.1); }
      .mii-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:25px; padding:40px; overflow-y:auto; flex:1; }
      .mii-card { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:20px; text-align:center; transition:all .3s cubic-bezier(.19,1,.22,1); }
      .mii-card:hover { background:rgba(255,255,255,.12); transform:translateY(-5px); border-color:#3366cc; }
      .mii-card-avatar img { width:120px; height:120px; border-radius:50%; background:rgba(0,0,0,.2); margin-bottom:15px; object-fit:cover; }
      .mii-btn-delete { background:transparent; border:1px solid #ff4455; color:#ff4455; padding:8px 15px; border-radius:10px; cursor:pointer; font-weight:600; transition:all .2s; }
      .mii-btn-delete:hover { background:#ff4455; color:white; }
    `;

    const root = document.createElement('div');
    root.className = 'mii-manager-fullscreen';

    const top = document.createElement('div');
    top.className = 'mii-manager-top';
    const topInfo = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.style.cssText = 'margin:0; font-size:28px;';
    h2.textContent = isAdmin ? 'Gestion des Miis (admin)' : 'Mon Mii';
    const p = document.createElement('p');
    p.style.cssText = 'margin:5px 0 0; opacity:.6;';
    p.textContent = isAdmin ? 'Vue administrateur : tous les Miis.' : 'DANGER : toute suppression est irréversible.';
    topInfo.appendChild(h2);
    topInfo.appendChild(p);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'mii-manager-close';
    closeBtn.textContent = 'Quitter';
    closeBtn.addEventListener('click', () => {
      if (window.AppRegistry?.miiManager?.close) window.AppRegistry.miiManager.close();
    });

    top.appendChild(topInfo);
    top.appendChild(closeBtn);

    const grid = document.createElement('div');
    grid.className = 'mii-grid';

    miis.forEach(mii => {
      const card = document.createElement('div');
      card.className = 'mii-card';
      card.id = `mii-card-${mii.id}`;

      const avatar = document.createElement('div');
      avatar.className = 'mii-card-avatar';
      const img = document.createElement('img');
      img.alt = mii.username;
      img.src = `https://mii-unsecure.ariankordi.net/miis/image.png?data=${encodeURIComponent(mii.b64)}&verifyCharInfo=0&type=face&width=160&shaderType=wiiu`;
      avatar.appendChild(img);

      const info = document.createElement('div');
      info.className = 'mii-card-info';
      const name = document.createElement('h3');
      name.textContent = mii.username;
      name.style.cssText = 'margin:0 0 10px; word-break:break-word;';

      const canDelete = isAdmin || mii.own;
      if (canDelete) {
        const del = document.createElement('button');
        del.className = 'mii-btn-delete';
        del.textContent = 'Supprimer';
        del.addEventListener('click', () => this.deleteMii(mii.id, mii.username, mii.own));
        info.appendChild(name);
        info.appendChild(del);
      } else {
        info.appendChild(name);
      }

      card.appendChild(avatar);
      card.appendChild(info);
      grid.appendChild(card);
    });

    root.appendChild(top);
    root.appendChild(grid);

    this.container.innerHTML = '';
    this.container.appendChild(style);
    this.container.appendChild(root);
  },

  async deleteMii(id, name, own) {
    // Garde-fou : un non-admin ne peut supprimer que son propre Mii.
    if (!this.isAdmin && !own) {
      alert("Action non autorisée.");
      return;
    }
    if (!confirm(`Voulez-vous vraiment supprimer le Mii "${name}" ? Cette action est irréversible.`)) {
      return;
    }

    const card = this.container.querySelector(`#mii-card-${id}`);
    const btn = card ? card.querySelector('.mii-btn-delete') : null;

    try {
      if (card) card.style.opacity = '0.5';
      if (btn) { btn.disabled = true; btn.textContent = '...'; }

      const docRef = window.Firestore.doc(window.FirebaseDB, "avatars", id);
      await window.Firestore.deleteDoc(docRef);

      if (card) {
        card.style.transform = 'scale(0.8)';
        card.style.opacity = '0';
      }

      setTimeout(() => this.open(this.container), 400);
    } catch (e) {
      console.error("Error deleting Mii:", e);
      alert("Erreur lors de la suppression. Vérifie tes règles Firestore.");
      if (card) card.style.opacity = '1';
      if (btn) { btn.disabled = false; btn.textContent = 'Supprimer'; }
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
    console.warn("Failed to load mii.js module (non bloquant):", e);
  }
  await loadScript('apps/mii_maker/js/avatar.js').catch(() => {});
  if (window.MiiManager) window.MiiManager.open(container);
}
