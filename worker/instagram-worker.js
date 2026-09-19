/**
 * TDPlay OS — Instagram worker (Cloudflare Workers, ES module)
 *
 * Holds the owner's Instagram token (Instagram API with Instagram Login, Business/Creator account)
 * and serves the OS:  GET /me · GET /me/media · GET /discover/<username> · GET /media/<id>/comments
 * Owner sign-in (once):  GET /auth/start?key=<ADMIN_KEY>  →  Instagram  →  /auth/callback
 *
 * Bindings / settings (Worker → Settings):
 *   KV namespace  IG_KV
 *   secret        IG_TOKEN        (simplest: the token from the Meta dashboard's "Generate access tokens")
 *   secrets       IG_APP_ID, IG_APP_SECRET, ADMIN_KEY   (only for the /auth/start browser sign-in instead)
 *   variable      ALLOWED_ORIGINS = https://mircix.github.io,http://localhost:8787
 *   cron trigger  0 3 * * *   (refreshes the 60-day token)
 */
const GRAPH = "https://graph.instagram.com/v23.0";
const MEDIA_FIELDS = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children{id,media_type,media_url,thumbnail_url}";
const PROFILE_FIELDS = "username,name,profile_picture_url,biography,website,followers_count,follows_count,media_count";

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const p = url.pathname.replace(/\/+$/, "") || "/";
      if (p === "/") return json({ ok: true, service: "tdplay-ig", connected: !!(await getAuth(env)) }, cors);
      if (p === "/auth/start") return authStart(url, env);
      if (p === "/auth/callback") return authCallback(url, env);
      if (p === "/status") { const a = await getAuth(env); return json({ connected: !!a, username: a && a.username, expires_at: a && a.expires_at, token_set: !!env.IG_TOKEN, token_len: env.IG_TOKEN ? env.IG_TOKEN.length : 0, bootstrap_error: LAST_ERR || null }, cors); }
      const auth = await getAuth(env);
      if (!auth) return json({ error: "not_connected", message: "The owner hasn't connected Instagram yet." }, cors, 503);
      if (p === "/me") return json(await cached(env, "me", 600, () => graph(`/me?fields=id,user_id,${PROFILE_FIELDS},account_type`, auth)), cors);
      if (p === "/me/media") {
        const after = url.searchParams.get("after") || "";
        return json(await cached(env, "me:media:" + after, 300, () => graph(`/me/media?fields=${MEDIA_FIELDS}&limit=24${after ? "&after=" + encodeURIComponent(after) : ""}`, auth)), cors);
      }
      let m;
      if ((m = p.match(/^\/discover\/([A-Za-z0-9._]{1,30})$/))) {
        const user = m[1].toLowerCase(), after = url.searchParams.get("after") || "";
        const data = await cached(env, `bd:${user}:${after}`, 3600, async () => {
          const q = `business_discovery.username(${user}){${PROFILE_FIELDS},media.limit(24)${after ? `.after(${after})` : ""}{${MEDIA_FIELDS}}}`;
          const r = await graph(`/${auth.user_id}?fields=${encodeURIComponent(q)}`, auth, true);
          if (r.error) {
            const code = r.error.code, msg = r.error.message || "";
            if (code === 110 || /business|creator|not found|cannot be found|does not exist/i.test(msg)) return { unavailable: true, reason: msg };
            throw new Error(msg);
          }
          return r.business_discovery;
        });
        return json(data, cors, data && data.unavailable ? 404 : 200);
      }
      if ((m = p.match(/^\/media\/(\d+)\/comments$/))) {
        return json(await cached(env, "comments:" + m[1], 300, () => graph(`/${m[1]}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp}&limit=50`, auth)), cors);
      }
      return json({ error: "not_found" }, cors, 404);
    } catch (e) {
      return json({ error: "worker_error", message: String(e && e.message || e) }, cors, 502);
    }
  },
  async scheduled(event, env) {
    const auth = await getAuth(env);
    if (!auth) return;
    // refresh the long-lived token when it has < 15 days left (Instagram tokens live 60 days)
    if (auth.expires_at - Date.now() > 15 * 864e5) return;
    const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(auth.access_token)}`).then(r => r.json());
    if (r.access_token) await env.IG_KV.put("auth", JSON.stringify({ ...auth, access_token: r.access_token, expires_at: Date.now() + (r.expires_in || 5184000) * 1000 }));
  }
};

// ---------------------------------------------------------------- auth
function callbackUrl(url) { return `${url.origin}/auth/callback`; }
async function authStart(url, env) {
  if (url.searchParams.get("key") !== env.ADMIN_KEY) return new Response("Forbidden", { status: 403 });
  const state = await sign(env, String(Date.now()));
  const q = new URLSearchParams({
    client_id: env.IG_APP_ID, redirect_uri: callbackUrl(url), response_type: "code", state,
    scope: "instagram_business_basic", enable_fb_login: "0", force_authentication: "1"
  });
  return Response.redirect("https://www.instagram.com/oauth/authorize?" + q.toString(), 302);
}
async function authCallback(url, env) {
  const code = (url.searchParams.get("code") || "").replace(/#_$/, ""), state = url.searchParams.get("state") || "";
  if (url.searchParams.get("error")) return page(`Instagram said: ${url.searchParams.get("error_description") || url.searchParams.get("error")}`);
  if (!code || !(await verify(env, state))) return page("Missing or invalid state — start again from /auth/start?key=…", 400);
  const body = new URLSearchParams({ client_id: env.IG_APP_ID, client_secret: env.IG_APP_SECRET, grant_type: "authorization_code", redirect_uri: callbackUrl(url), code });
  const short = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body }).then(r => r.json());
  if (!short.access_token) return page("Token exchange failed: " + JSON.stringify(short), 502);
  const long = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(env.IG_APP_SECRET)}&access_token=${encodeURIComponent(short.access_token)}`).then(r => r.json());
  const token = long.access_token || short.access_token, expires = long.expires_in || 3600;
  const me = await fetch(`${GRAPH}/me?fields=id,user_id,username&access_token=${encodeURIComponent(token)}`).then(r => r.json());
  await env.IG_KV.put("auth", JSON.stringify({ access_token: token, user_id: me.user_id || me.id || short.user_id, username: me.username || "", expires_at: Date.now() + expires * 1000 }));
  // drop cached data from a previous account
  return page(`Connected as @${me.username || "?"}. You can close this window — TDPlay OS is now wired to Instagram.`);
}
async function getAuth(env) {
  const v = await env.IG_KV.get("auth");
  if (v) return JSON.parse(v);
  // Bootstrap from a token generated in the Meta dashboard ("Generate access tokens → Add account"):
  // set the IG_TOKEN secret once; it's a 60-day token and the nightly cron keeps refreshing it.
  if (env.IG_TOKEN) {
    const tok = env.IG_TOKEN.trim();
    const me = await fetch(`${GRAPH}/me?fields=id,user_id,username&access_token=${encodeURIComponent(tok)}`).then(r => r.json()).catch(e => ({ error: { message: String(e) } }));
    if (me && (me.user_id || me.id)) {
      const auth = { access_token: tok, user_id: me.user_id || me.id, username: me.username || "", expires_at: Date.now() + 55 * 864e5 };
      await env.IG_KV.put("auth", JSON.stringify(auth));
      LAST_ERR = null;
      return auth;
    }
    LAST_ERR = (me && me.error && (me.error.message + (me.error.code ? " (code " + me.error.code + ")" : ""))) || "unexpected reply from Instagram";
  }
  return null;
}
let LAST_ERR = null;
async function sign(env, msg) { const mac = await hmac(env, msg); return `${msg}.${mac}`; }
async function verify(env, state) {
  const [msg, mac] = state.split("."); if (!msg || !mac) return false;
  if (Date.now() - Number(msg) > 15 * 60e3) return false;
  return (await hmac(env, msg)) === mac;
}
async function hmac(env, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.IG_APP_SECRET + env.ADMIN_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------- graph + cache
async function graph(path, auth, raw) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`${GRAPH}${path}${sep}access_token=${encodeURIComponent(auth.access_token)}`).then(r => r.json());
  if (raw) return r;
  if (r.error) throw new Error(r.error.message || "Instagram API error");
  return r;
}
async function cached(env, key, ttl, fn) {
  const k = "cache:" + key;
  const hit = await env.IG_KV.get(k);
  if (hit) return JSON.parse(hit);
  const v = await fn();
  await env.IG_KV.put(k, JSON.stringify(v), { expirationTtl: Math.max(60, ttl) });
  return v;
}

// ---------------------------------------------------------------- responses
function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || allowed.includes("*");
  return {
    "Access-Control-Allow-Origin": ok ? origin : (allowed[0] || ""),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function json(data, cors, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors } });
}
function page(text, status = 200) {
  return new Response(`<!doctype html><meta charset="utf-8"><title>TDPlay OS · Instagram</title><body style="font:16px -apple-system,sans-serif;background:#07070c;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="max-width:520px;padding:32px;text-align:center"><h1 style="font-weight:600">TDPlay OS</h1><p>${text.replace(/</g, "&lt;")}</p></div></body>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
