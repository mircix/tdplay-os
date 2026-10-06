# TDPlay OS — Instagram side panel (Chrome)

Docks Instagram in Chrome's side panel, beside whatever you're browsing — the same place
**Ask Gemini** opens. A button also swaps the panel to TDPlay OS itself.

Instagram refuses to be shown inside another page (`X-Frame-Options: DENY`), which no website can
override. An extension can: this one removes that header **only for its own panel** — frames that belong
to no browser tab — so instagram.com stays unframeable on every website you visit.

## Install (one minute, no Web Store)

1. Chrome → `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → choose this `chrome-sidepanel` folder
4. Pin "TDPlay OS — Instagram side panel" to the toolbar; click it to open the panel

## Notes

- You stay signed in as yourself — it's the real instagram.com, just in the panel.
- If Instagram shows a login screen even though you're signed in elsewhere, open
  `instagram.com` in a normal tab once, then reopen the panel.
- The header rule only matches `instagram.com` frames outside any tab (the panel); Instagram inside
  a website keeps its protection, and nothing else on the web is affected.
- Updating: after pulling a new version, press the ⟳ on the extension's card in `chrome://extensions`.
