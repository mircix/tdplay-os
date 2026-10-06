# Chrome Web Store submission — TDPlay OS Instagram side panel

Everything the Developer Dashboard asks for, in the order it asks. Build the upload with:

```
python3 tools/pack_extension.py --version 1.2.0
```

→ `dist/tdplay-os-sidepanel-1.2.0.zip` (the `key` is dropped automatically; the Web Store issues its own id).

---

## 0. Before the first upload

1. Sign in at **[chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)** with the Google
   account that should own the item, and pay the **one-off US$5** developer registration fee.
2. Fill in the account's **contact email and verify it** — an unverified email blocks publishing.
3. **Add new item** → upload the zip. Nothing is public until you press *Submit for review*.

## 1. Store listing

| Field | Value |
| --- | --- |
| **Name** | `TDPlay OS — Instagram side panel` |
| **Summary** (132 max) | `Dock the real Instagram in Chrome's side panel, beside whatever you're browsing — and beside TDPlay OS.` |
| **Category** | Social & Communication |
| **Language** | English (United Kingdom) |

**Description**

```
Instagram, docked in Chrome's side panel — the same place Ask Gemini opens — so it sits beside
whatever you're reading instead of taking over a tab.

• The real instagram.com, signed in as you. Your feed, Reels, Explore, DMs and notifications.
• A row of buttons across the top of the panel: Home, Reels, Explore, DMs, and a reload.
• One more button puts TDPlay OS in the panel instead — the music desktop at tdplay.site.
• Click Instagram anywhere in TDPlay OS and it opens here, not in a pop-up window.

Why an extension is needed: Instagram sends headers that stop any other page from displaying it,
and no website can override them. Inside its own panel this extension removes those headers so the
page renders. The rule is limited to frames that belong to no browser tab — which is what a side
panel is — so instagram.com keeps its protection on every website you visit.

It collects nothing: no accounts, no analytics, no servers of ours. The one thing it remembers is
which Instagram page to show when you click Instagram in TDPlay OS, in Chrome's session storage,
cleared when Chrome closes.

Not affiliated with, endorsed by or sponsored by Instagram or Meta.
Open source: github.com/mircix/tdplay-os/tree/main/chrome-sidepanel
```

**Screenshots** — at least one, 1280×800 PNG (up to five). Take them in Chrome with the extension
installed, then pad them to the exact size:

```
python3 tools/store_shot.py ~/Desktop/shot.png dist/store-1.png
```

Worth capturing: (1) the panel on Instagram beside TDPlay OS, (2) the panel open beside an ordinary
website, (3) the panel's TDPlay OS button, (4) the "Instagram is getting ready" card in TDPlay OS.

**Small promo tile** 440×280 (optional, needed only for featuring):

```
python3 tools/store_shot.py --tile dist/store-tile.png
```

## 2. Privacy tab

**Single purpose**

```
Show instagram.com in Chrome's side panel, docked beside the page you're browsing.
```

**Permission justifications**

| Permission | Justification |
| --- | --- |
| `sidePanel` | The extension's only interface is the side panel it opens. |
| `declarativeNetRequestWithHostAccess` | Instagram's X-Frame-Options / CSP headers stop it rendering in the panel. One session rule removes those headers for instagram.com sub-frames that belong to no tab — the side panel. Instagram keeps its protection in ordinary tabs and on every website. |
| `storage` | One value in `chrome.storage.session`: the Instagram path the panel should open when the user clicks Instagram in TDPlay OS. Cleared when Chrome closes. |
| Host access to `https://*.instagram.com/*` | The panel shows instagram.com, and the header rule applies to it. |
| Content script on `https://*.instagram.com/*` (`recover.js`) | Instagram's own app sometimes renders its “this page isn't available” screen for a page that loads fine in a tab. The script reports that to the panel, which reloads the address properly. It reads nothing else, sends nothing anywhere, and returns immediately unless the page is in a frame. |
| Host access to `https://mircix.github.io/*` | TDPlay OS (hosted there) asks the extension whether it is installed and to open the panel on an Instagram page, via `externally_connectable`. |
| Remote code | **No.** All code is in the package; nothing is fetched and executed. The panel only displays instagram.com in an iframe. |

**Data usage** — tick nothing. Then the three certifications:

* I do not sell or transfer user data to third parties, outside of the approved use cases — **yes**
* I do not use or transfer user data for purposes unrelated to my item's single purpose — **yes**
* I do not use or transfer user data to determine creditworthiness or for lending purposes — **yes**

**Privacy policy URL**

```
https://mircix.github.io/tdplay-os/extension-privacy.html
```

**Notes for the reviewer** (the "Justification" free-text box, or an email reply if they ask)

```
The item exists because instagram.com cannot be framed. The single declarativeNetRequest session rule
removes framing/isolation headers only for instagram.com sub-frame requests with tabId -1
(TAB_ID_NONE), i.e. requests made by the extension's own side panel. Requests in real tabs are
untouched, so no website can frame Instagram because this is installed. The rule is a session rule
added by the panel page when it opens, not a static ruleset, so it does not exist while the panel
is closed. Source: github.com/mircix/tdplay-os/tree/main/chrome-sidepanel (panel.js).
```

## 3. Distribution

* Visibility **Public** (or Unlisted while you try it — the install link still works, and TDPlay OS's
  "Add to Chrome" card works the same).
* All regions.
* No ads, no payments.

Then **Submit for review**. Google usually answers within a few days; first submissions and
header-modifying extensions can take longer.

## 4. After it's published

The store gives the item a new id, visible in its URL:
`https://chromewebstore.google.com/detail/tdplay-os-instagram-side-panel/`**`<id>`**

Put both into [`js/config.js`](../js/config.js):

```js
  sidePanelIds: ["<the store id>"],
  sidePanelStoreUrl: "https://chromewebstore.google.com/detail/tdplay-os-instagram-side-panel/<the store id>"
```

then `python3 tools/stamp.py` and commit. That switches on the **"Instagram is getting ready"** card:
the first time a visitor on Chrome clicks Instagram, they get Add to Chrome → Chrome's own confirmation
→ the card notices the install by itself and opens the panel. Everyone else keeps the pop-up window.

Chrome cannot install an extension without that confirmation — no website can, by design since 2018 —
so the card walks the visitor through it rather than pretending to install anything.

## 5. Updating later

Bump the version, pack, upload the new zip over the same item:

```
python3 tools/pack_extension.py --version 1.3.0
```

The published id never changes, so `js/config.js` stays as it is.
