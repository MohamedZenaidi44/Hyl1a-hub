window.CloudSaveManager = {
  // Affiche une notification UI personnalisée
  showNotification(message, duration = 3000) {
    let notif = document.getElementById('cloud-save-notif');
    if (!notif) {
      notif = document.createElement('div');
      notif.id = 'cloud-save-notif';
      notif.style.cssText =
        'position: fixed;' +
        'bottom: 20px;' +
        'right: 20px;' +
        'background: rgba(0, 0, 0, 0.8);' +
        'backdrop-filter: blur(10px);' +
        'color: #fff;' +
        'padding: 12px 24px;' +
        'border-radius: 8px;' +
        'font-family: \'Segoe UI\', sans-serif;' +
        'font-size: 14px;' +
        'font-weight: 600;' +
        'z-index: 99999;' +
        'pointer-events: none;' +
        'box-shadow: 0 4px 12px rgba(0,0,0,0.5);' +
        'border: 1px solid rgba(255,255,255,0.1);' +
        'transition: opacity 0.3s ease, transform 0.3s ease;' +
        'opacity: 0;' +
        'transform: translateY(20px);';
      document.body.appendChild(notif);
    }

    notif.innerHTML = message;

    // Force reflow
    void notif.offsetWidth;

    notif.style.opacity = '1';
    notif.style.transform = 'translateY(0)';

    if (this.notifTimeout) clearTimeout(this.notifTimeout);
    this.notifTimeout = setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transform = 'translateY(20px)';
    }, duration);
  },

  async saveStateToCloud(gameName, core, stateData) {
    try {
      const user = window.FirebaseAuth ? window.FirebaseAuth.currentUser : null;
      if (!user) {
        console.log("CloudSave: Utilisateur non connecté, sauvegarde locale uniquement.");
        return;
      }

      if (!window.StorageAPI) {
        console.error("CloudSave: StorageAPI non initialisé.");
        return;
      }

      this.showNotification('☁️ Sauvegarde Cloud en cours...', 5000);

      const path = 'saves/' + user.uid + '/' + core + '/' + gameName + '.state';
      const storageRef = window.StorageAPI.ref(window.StorageAPI.storage, path);

      // stateData est normalement un Uint8Array
      await window.StorageAPI.uploadBytes(storageRef, stateData);

      console.log('CloudSave: Sauvegarde réussie pour ' + gameName);
      this.showNotification('✅ Sauvegarde Cloud terminée !');
    } catch (error) {
      console.error("CloudSave: Erreur lors de la sauvegarde :", error);
      this.showNotification('❌ Erreur de Sauvegarde Cloud.');
    }
  },

  async checkCloudSave(gameName, core) {
    try {
      // Need to wait for auth to be ready if it's right on page load
      // We will check currentUser directly, so make sure Auth is loaded.
      const user = window.FirebaseAuth ? window.FirebaseAuth.currentUser : null;
      if (!user) {
        return null; // Not logged in or not ready
      }

      if (!window.StorageAPI) return null;

      const path = 'saves/' + user.uid + '/' + core + '/' + gameName + '.state';
      const storageRef = window.StorageAPI.ref(window.StorageAPI.storage, path);

      const url = await window.StorageAPI.getDownloadURL(storageRef);
      console.log('CloudSave: Sauvegarde trouvée pour ' + gameName);
      return url;
    } catch (error) {
      // It's normal to have an error if the file doesn't exist (e.g. 404 object-not-found)
      if (error.code !== 'storage/object-not-found') {
        console.error("CloudSave: Erreur lors de la vérification :", error);
      }
      return null;
    }
  }
};