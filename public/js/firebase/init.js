<script type="module">
  // ---- SDK Firebase ----
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
  import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

  // ---- Votre configuration (copiez‑collez exactement ce que vous avez) ----
  const firebaseConfig = {
    apiKey: "AIzaSyAcOQ4GAfxvOJWmfbe9SXA63_WNAqUBMzE",
    authDomain: "hyl1a-plaza.firebaseapp.com",
    projectId: "hyl1a-plaza",
    storageBucket: "hyl1a-plaza.firebasestorage.app",
    messagingSenderId: "74246669403",
    appId: "1:74246669403:web:0a7d62be23c73823fbeb7e",
    measurementId: "G-KLLS1L9S2V"
  };

  // ---- Initialisation ----
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  // Expose l’instance Auth pour que gba‑save‑sync.js puisse l’utiliser
  window.firebaseAuth = auth;
</script>