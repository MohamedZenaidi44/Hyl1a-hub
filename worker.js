/**
 * Cloudflare Worker — GBA Save Sync (v2)
 *
 * Structure R2 :
 *   saves/<firebase_uid>/<gameName>.sav
 *
 * Routes :
 *   GET    /saves?game=<nom>   → télécharger la save de l'utilisateur authentifié
 *   PUT    /saves?game=<nom>   → uploader la save de l'utilisateur authentifié
 *   DELETE /saves?game=<nom>   → supprimer la save (reset / nouvelle partie)
 *
 * Header requis : Authorization: Bearer {firebaseIdToken}
 * Bucket R2 lié : SAVES (à binder dans les settings du Worker)
 *
 * Sécurité :
 *   - L'UID vient UNIQUEMENT du token Firebase vérifié côté serveur.
 *   - Il n'est jamais possible pour le client de lire/écrire la save d'un autre UID.
 */

export default {
  async fetch(request, env, ctx) {
    // ---------- CORS ----------
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      'https://hyl1a-hub.vercel.app',
      'http://127.0.0.1:5500',
      'http://localhost:5500'
    ];
    let allowOrigin = allowedOrigins.includes(origin) ? origin : '';
    if (!allowOrigin && (origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://localhost:'))) {
      allowOrigin = origin;
    }
    if (!allowOrigin) {
      allowOrigin = 'https://hyl1a-hub.vercel.app';
    }
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname !== "/saves") {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const gameNameRaw = url.searchParams.get("game");
    if (!gameNameRaw) {
      return new Response("Missing ?game= param", { status: 400, headers: corsHeaders });
    }
    // Normalisation du nom de jeu pour servir de nom de fichier sûr
    const gameName = sanitizeGameName(gameNameRaw);

    // ---------- Auth ----------
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    let uid;
    try {
      uid = await verifyFirebaseToken(token, env.FIREBASE_API_KEY, "hyl1a-plaza");
    } catch (e) {
      return new Response(`Invalid token: ${e.message}`, { status: 403, headers: corsHeaders });
    }

    // ---------- R2 key (toujours dérivée de l'UID vérifié côté serveur) ----------
    const key = `saves/${uid}/${gameName}.sav`;

    // ---------- GET ----------
    if (request.method === "GET") {
      const object = await env.SAVES.get(key);
      if (!object) {
        return new Response("No save found", { status: 404, headers: corsHeaders });
      }
      const data = await object.arrayBuffer();
      return new Response(data, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/octet-stream",
        },
      });
    }

    // ---------- PUT ----------
    if (request.method === "PUT") {
      const body = await request.arrayBuffer();
      if (!body || body.byteLength === 0) {
        return new Response("Empty body", { status: 400, headers: corsHeaders });
      }
      await env.SAVES.put(key, body);
      return new Response(JSON.stringify({ ok: true, size: body.byteLength, key }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- DELETE ----------
    if (request.method === "DELETE") {
      await env.SAVES.delete(key);
      return new Response(JSON.stringify({ ok: true, deleted: key }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  },
};

/**
 * Nettoie le nom du jeu pour qu'il soit utilisable comme nom de fichier R2.
 * On garde le nom lisible mais on retire les caractères dangereux.
 */
function sanitizeGameName(name) {
  return name
    .normalize('NFC')
    .trim()
    .replace(/[\/\\]/g, '-')   // pas de séparateurs de chemin
    .replace(/\.\./g, '')      // pas de path traversal
    .slice(0, 200);
}

/* -------------------------------------------------------------------------
 * Vérification du token Firebase via l'API Google Identity Toolkit
 * ------------------------------------------------------------------------- */
async function verifyFirebaseToken(token, apiKey, projectId) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  });

  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`Failed to verify token: ${res.status} ${errTxt}`);
  }

  const data = await res.json();
  if (!data.users || !data.users[0]) {
    throw new Error("User not found");
  }
  return data.users[0].localId;
}
