# TDPlay OS — Side Panel for Instagram (Chrome)

Docks Instagram in Chrome's side panel, beside whatever you're browsing — the same place
**Ask Gemini** opens. A button also swaps the panel to TDPlay OS itself, and with the extension installed,
clicking Instagram anywhere in TDPlay OS opens it here instead of in a pop-up window.

Instagram refuses to be shown inside another page (`X-Frame-Options: DENY`), which no website can
override. An extension can: this one removes that header **only for its own panel** — frames that belong
to no browser tab — so instagram.com stays unframeable on every website you visit. The same panel-only rule
also makes the request's `Referer` and `Sec-Fetch-*` headers those of an ordinary visit, because Instagram
answers a cross-site frame request with “Sorry, this page isn't available” even when the page is fine.

## Install

Two routes. The Web Store one is what visitors get; the unpacked one is for developing.

### From the Chrome Web Store (visitors)

Not published yet. [`STORE.md`](STORE.md) has the whole submission — listing copy, permission
justifications, privacy answers — and the build command:

```bash
python3 tools/pack_extension.py            # → dist/tdplay-os-sidepanel-<version>.zip
```

Once it's live, put the store id and URL into [`../js/config.js`](../js/config.js). That turns on the
**“Instagram is getting ready”** card: the first time someone on Chrome clicks Instagram in TDPlay OS they
get *Add to Chrome* → Chrome's own confirmation → the card notices the install and opens the panel.

### Unpacked (one minute, no Web Store)

1. Chrome → `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → choose this `chrome-sidepanel` folder
4. Pin "TDPlay OS — Side Panel for Instagram" to the toolbar; click it to open the panel

## Notes

- You stay signed in as yourself — it's the real instagram.com, just in the panel.
- If Instagram shows a login screen even though you're signed in elsewhere, open
  `instagram.com` in a normal tab once, then reopen the panel.
- The header rule only matches `instagram.com` frames outside any tab (the panel); Instagram inside
  a website keeps its protection, and nothing else on the web is affected.
- Updating: after pulling a new version, press the ⟳ on the extension's card in `chrome://extensions`.
  Coming from 1.0 / 1.1, **Remove** it and **Load unpacked** again instead: since 1.2 the extension has a
  fixed ID (the `key` in `manifest.json`), which is how TDPlay OS finds it.
- Clicking Instagram in TDPlay OS opens the panel through `bridge.js`, which the extension puts into the
  OS's own pages — so no extension id has to match, but the OS page has to be **reloaded** after you
  install or reload the extension (content scripts only reach pages loaded afterwards).
- Opening the panel starts at Instagram **Home**, wherever you left it last — unless TDPlay OS asked for a
  particular page (Reels, a profile), which it then opens instead.
- If Instagram's app lands on “Sorry, this page isn't available” for a page that is fine, `recover.js`
  notices from inside the frame and the panel loads that address properly. If the same page comes back
  wrong, a small bar offers **Try again** and **Open in a tab** rather than reloading forever.
- Full screen is left alone — the panel shows beside a window the browser put full screen itself.
