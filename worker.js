/**
 * Cloudflare Worker — GBA Save Sync
 *
 * Routes :
 *   GET  /saves?game=<nom>    → télécharger la save
 *   PUT  /saves?game=<nom>    → uploader la save
 *
 * Header requis : Authorization: Bearer {firebaseIdToken}
 * Bucket R2 lié : SAVES (à binder dans les settings du Worker)
 */

export default {
  async fetch(request, env, ctx) {
    // ---------- CORS ----------
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://hyl1a-hub.vercel.app",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ---------- Routing ----------
    if (url.pathname !== "/saves") {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const gameName = url.searchParams.get("game");
    if (!gameName) {
      return new Response("Missing ?game= param", { status: 400, headers: corsHeaders });
    }

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

    // ---------- R2 key ----------
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
      return new Response(JSON.stringify({ ok: true, size: body.byteLength }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- Method not allowed ----------
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  },
};

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
  // Le champ localId est l'UID Firebase
  return data.users[0].localId;
}