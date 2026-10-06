/* TDPlay OS — site owner configuration.
 * Client IDs are public identifiers (not secrets). Fill these in and every visitor can just press
 * "Connect Spotify" / "Sign in with Google" — no setup screens anywhere in the OS. */
window.TD_CONFIG = {
  spotifyClientId: "",     // from developer.spotify.com/dashboard (redirect URI: https://mircix.github.io/tdplay-os/)
  googleClientId: "",      // OAuth client ID from console.cloud.google.com (origin: https://mircix.github.io)
  igApi: "https://tdplay-ig.mrxsp08.workers.dev",  // the Instagram worker URL, e.g. https://tdplay-ig.<you>.workers.dev (see worker/README.md)

  /* Instagram in Chrome's side panel (chrome-sidepanel/). The unpacked build's id is built in; add the
   * Web Store id here once the listing is live, and paste the listing URL below — that URL is what turns
   * on the "Instagram is getting ready" card for visitors who don't have it yet. Empty = pop-up window. */
  sidePanelIds: ["hkacdfhmaojpanffljaecpclcdaghaja"],   // the Chrome Web Store build (draft 2026-10-06)
  sidePanelStoreUrl: ""   // e.g. https://chromewebstore.google.com/detail/tdplay-os-instagram-side-panel/<id>
};
