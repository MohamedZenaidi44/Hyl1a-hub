# Déploiement du worker Cloudflare GBA Save Sync

## Prérequis
- [Node.js ≥ 18](https://nodejs.org/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installé globalement : `npm i -g wrangler`
- Un compte Cloudflare
- La clé API Firebase Identity Toolkit (dans la console Firebase → Project Settings → Général → Votre app web → **Clé API**)

## Étapes

1. **Se connecter à Cloudflare**  
   ```bash
   wrangler login
   ```
   Une fenêtre de navigateur s’ouvre, connectez‑vous et autorisez Wrangler.

2. **Créer le bucket R2 nommé `SAVES`** (ignorez l’erreur s’il existe déjà)  
   ```bash
   wrangler r2 bucket create SAVES
   ```

3. **Ajouter le secret contenant la clé API Firebase**  
   ```bash
   wrangler secret put FIREBASE_API_KEY
   # Quand il vous demande la valeur, collez exactement :
   AIzaSyAcOQ4GAfxvOJWmfbe9SXA63_WNAqUBMzE
   ```

4. **(Re)déployer le worker**  
   ```bash
   wrangler publish
   ```
   Vous verrez quelque chose comme :  
   ```
   ✨  Successfully published your script to
   https://gba-saves.mohzn44.workers.dev
   ```

5. **Test rapide** (optionnel mais recommandé)  
   - Connectez un utilisateur via votre UI Firebase (email/pass, Google, etc.).  
   - Dans la console du navigateur, récupérez le token :  
     ```js
     firebaseAuth.currentUser.getIdToken().then(t => console.log("TOKEN:", t));
     ```
   - Copiez le token affiché.  
   - Dans un terminal, testez le worker :  
     ```bash
     TOKEN="VOTRE_TOKEN_ICI"
     GAME=TestGame
     PAYLOAD=$(printf '\x00\x01\x02\x03')   # 4 octets factices

     # Upload (PUT)
     curl -i -X PUT "https://gba-saves.mohzn44.workers.dev/saves?game=$GAME" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/octet-stream" \
          --data-binary "$PAYLOAD"

     # Download (GET)
     curl -i -X GET "https://gba-saves.mohzn44.workers.dev/saves?game=$GAME" \
          -H "Authorization: Bearer $TOKEN"
     ```
   - Le `PUT` doit retourner `200 OK` avec `{"ok":true,"size":4}`.  
   - Le `GET` suivant doit retourner `200 OK`, `Content-Type: application/octet-stream` et le corps contenant exactement les 4 octets envoyés.

6. **Vérifier l’isolation**  
   - Déconnectez‑vous, connectez‑vous avec un deuxième compte Firebase.  
   - Répétez le `GET` pour le même nom de jeu → vous devez obtenir `404 Not found` (ou une sauvegarde vide) car la clé R2 est maintenant `saves/<UID_2>/TestGame.sav`.

## Notes
- Le worker lit la clé API depuis les *secrets* du worker (`env.FIREBASE_API_KEY`). Jamais exposée dans le code source.
- Le bucket R2 lié s’appelle `SAVES` (binding dans `wrangler.toml`).
- Le frontend (Vercel) utilise déjà le SDK Firebase exposé via `public/js/core/firebase.js` (`window.FirebaseAuth`). Aucun changement supplémentaire n’est requis dans le code GBA.