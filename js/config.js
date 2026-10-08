/* TDPlay OS — site owner configuration.
 * Client IDs are public identifiers (not secrets). Fill these in and every visitor can just press
 * "Connect Spotify" / "Sign in with Google" — no setup screens anywhere in the OS. */
window.TD_CONFIG = {
  spotifyClientId: "",     // from developer.spotify.com/dashboard (redirect URI: https://mircix.github.io/tdplay-os/)
  googleClientId: "",      // OAuth client ID from console.cloud.google.com (origin: https://mircix.github.io)
  igApi: "https://tdplay-ig.mrxsp08.workers.dev",  // the Instagram worker URL, e.g. https://tdplay-ig.<you>.workers.dev (see worker/README.md)

  /* Instagram in Chrome's side panel (chrome-sidepanel/). The unpacked build's id is built in; add the
   * Web Store id is below, with the listing URL — that URL is what turns on the "Install Instagram to
   * continue" card for visitors who don't have the panel yet. Empty = they get the pop-up window. */
  sidePanelIds: ["hkacdfhmaojpanffljaecpclcdaghaja"],   // the Chrome Web Store build
  sidePanelStoreUrl: "https://chromewebstore.google.com/detail/hkacdfhmaojpanffljaecpclcdaghaja"   // live 2026-10-08
};
