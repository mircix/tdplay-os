# TDPlay OS

A music desktop built on every song ever featured on **[tdplay.site](https://tdplay.site)** —
windows, a dock, and apps for YouTube, Spotify, Apple Music and artist websites.

**Live:** https://mircix.github.io/tdplay-os/

## Apps

| App | What it does |
|---|---|
| **Home** | The current month as the boot screen; browse any month or year like folders, the featured video of every page, month + year playlists, *Keep Up With* |
| **Library** | Search everything (artists, songs, initials, months), browse by year / month / artist, featured, hidden gems |
| **Player** | One YouTube player for the whole OS with a real queue, shuffle, repeat, seek — it docks into the Player window and shrinks to a picture-in-picture corner when the window closes |
| **Radio** | Endless shuffle stations: everything, featured, hidden gems, regulars, each year |
| **Spotify** | Month & year playlists; with Spotify Premium connected, TDPlay OS becomes a Spotify Connect device — full tracks, transport, and *Save as playlist* for any month or artist |
| **Apple Music** | Month & year playlists and any pick, via Apple's embed player |
| **Artists** | 2,000+ artists with their website, songs, first/latest feature, Spotify / Apple links |
| **Instagram** | TDPlay's @mitch_tdp plus 180+ featured artists' Instagram profiles; paste any post/reel link to view it inside the OS |
| **Artist Websites** | Every artist's website inside the OS; sites that forbid framing open in a new tab instead (pre-checked, see `sites.json`) |
| **Terminal** | `play lolo`, `cd aug 26`, `radio 2024`, `search …`, `neofetch` |
| **Stats** | Most featured artists, songs per year and month, link coverage |
| **Settings** | Spotify Client ID, wallpaper, accent colour, motion, data |

Shortcuts: `⌘K` or `/` search · `space` play/pause · `⇧←` `⇧→` previous/next · `⌘W` close window · right-click any song.

Deep links: `#month=August'26`, `#q=tally spear`, `#artist=lolo`, `#v=<youtube id>`, `#app=stats`.

## How it works

```
tdplay.site ──► mircix/tdplay-search (index rebuilt every 6 h) ──► data.json ──► TDPlay OS (this repo)
```

* Everything is static: `index.html`, `css/os.css`, `js/*`. No build step, no framework.
* On boot the OS downloads `data.json` from the search repo's GitHub Pages and indexes it in
  the browser (months, pages, songs, artists, search). New months on tdplay.site show up
  automatically after the next index rebuild.
* `js/wm.js` is the window manager (windows, dock, menus, ⌘K launcher, toasts);
  `js/player.js` the YouTube engine; `js/spotify.js` the Spotify PKCE sign-in, Web API and
  Web Playback SDK; each app lives in `js/apps/`.
* `tools/probe_sites.py` checks every artist website for `X-Frame-Options` / CSP
  `frame-ancestors` and writes `sites.json`; a weekly GitHub Action keeps it fresh.

## Spotify Premium (one-time)

1. Open https://developer.spotify.com/dashboard → **Create app**.
2. Any name (e.g. *TDPlay OS*). **Redirect URI:** `https://mircix.github.io/tdplay-os/`
   (add `http://127.0.0.1:8787/` too if you run it locally). Tick **Web Playback SDK** and **Web API**.
3. Put the **Client ID** in `js/config.js` (`spotifyClientId`) — it's a public identifier — and everyone just presses **Connect Spotify**. (Settings → Developer can override it per browser.)

The sign-in stays in your browser (PKCE, no secret, no server).

## On tdplay.site

`embed.html` is the snippet for a Hostinger **Embed code** element: it drops the OS into the page
as an iframe that fills the window under the site header. Inside the site the Spotify sign-in
opens in a pop-up (Spotify refuses to be framed), and the top bar gets an "open in its own tab"
button. Settings / sign-in made inside the site are stored separately from the standalone URL
(browsers partition storage for embedded pages).

## YouTube account (one-time)

Player → **YouTube** tab → **Sign in with Google**. Then your
playlists (including the TDPlay monthly ones on your channel), liked videos and subscriptions
are playable in the OS, and any song can be liked / added to a playlist from its right-click menu.

1. https://console.cloud.google.com → create a project → **APIs & Services → Enable APIs → YouTube Data API v3**.
2. **OAuth consent screen** → External → name + email → **Test users**: add your Google account.
3. **Credentials → Create credentials → OAuth client ID → Web application** → Authorized JavaScript
   origins: `https://mircix.github.io` (+ `http://localhost:8787` for local) → put the **Client ID** in `js/config.js` (`googleClientId`).

Tokens come from Google's token flow (no secret, no server); they're renewed silently through
your Google session. Writes cost YouTube API quota (50 units each of the 10,000/day).

## Run locally

```bash
python3 -m http.server 8787 --bind 127.0.0.1
```
then open http://127.0.0.1:8787/ — the catalog still loads from GitHub Pages (CORS is open).

## Deploy

GitHub Pages, `main` branch, root. `.nojekyll` is there so nothing gets processed.
Before committing a change run `python3 tools/stamp.py` — it rewrites the `?v=` on every script
and stylesheet URL in `index.html`, so visitors' browsers fetch the new files instead of cached ones
(GitHub Pages caches for 10 minutes; browsers may keep files longer).
