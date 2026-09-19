# TDPlay OS · Instagram worker

A Cloudflare Worker that keeps the owner's Instagram token and serves the OS's Instagram app
(your profile + posts, and any Business/Creator account's public profile + posts via Business Discovery).

## One-time setup (~20 min, all in the browser)

**A. Instagram** — make @mitch_tdp a professional account: Instagram app → Settings → *Account type and tools*
→ *Switch to professional account* → **Creator**. (Free; can be switched back any time.)

**B. Meta app** — https://developers.facebook.com/apps → *Create app* → use case *Other* → type **Business** → name it (e.g. TDPlay OS).
1. *Add product* → **Instagram** → *API setup with Instagram business login* → *Set up*.
2. Under *Business login settings*: **Redirect URI** = `https://<your-worker>.workers.dev/auth/callback` (fill in after step C).
3. Note the **Instagram app ID** and **Instagram app secret** (same page).
4. *App roles → Roles* → **Instagram Testers** → add `mitch_tdp` → then in Instagram: Settings → *Website permissions* → *Apps and websites* → *Tester invites* → accept.
   (While the app is in Development mode only tester accounts can sign in — that's fine: only the owner ever does.)

**B2. Get a token the easy way** — on the same *API setup with Instagram login* page: *2. Generate access tokens* →
**Add account** → log in as @mitch_tdp → **Generate token** → copy it (it's a 60-day token; the worker refreshes it nightly).
With this you can skip the redirect URI / `/auth/start` steps entirely.

**C. Cloudflare** — https://dash.cloudflare.com (free plan is enough).
1. *Workers & Pages* → *Create* → *Create Worker* → name `tdplay-ig` → *Deploy*, then *Edit code* → paste `instagram-worker.js` → *Deploy*.
2. *Storage & Databases → KV* → *Create namespace* `tdplay-ig` → back in the worker: *Settings → Bindings → Add → KV namespace*, variable name **`IG_KV`**.
3. *Settings → Variables and Secrets*: add the **secret** `IG_TOKEN` (from B2) and a plain variable **`ALLOWED_ORIGINS`** = `https://mircix.github.io,http://localhost:8787`.
   (Only if you'd rather sign in through the browser instead of pasting a token: secrets `IG_APP_ID`, `IG_APP_SECRET`, `ADMIN_KEY` and step D.)
4. *Settings → Triggers → Cron Triggers* → add `0 3 * * *` (daily token refresh).
5. Copy the worker URL (`https://tdplay-ig.<you>.workers.dev`) into step B.2 and into `js/config.js` → `igApi`.

**D. (browser sign-in route only)** — open `https://<worker>/auth/start?key=<ADMIN_KEY>` once → log in with @mitch_tdp → "Connected".

`GET https://<worker>/status` shows whether it's connected.

## Endpoints

| | |
|---|---|
| `GET /me` | owner profile |
| `GET /me/media?after=` | owner posts (24 per page) |
| `GET /discover/<username>` | public profile + posts of a Business/Creator account (404 = personal account) |
| `GET /media/<id>/comments` | comments on one of the owner's posts |

Responses are cached in KV (5–60 min) so the OS stays well under Instagram's rate limits.
