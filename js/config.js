/* TDPlay OS — site owner configuration.
 * Client IDs are public identifiers (not secrets). Fill these in and every visitor can just press
 * "Connect Spotify" / "Sign in with Google" — no setup screens anywhere in the OS. */
window.TD_CONFIG = {
  spotifyClientId: "",     // from developer.spotify.com/dashboard (redirect URI: https://mircix.github.io/tdplay-os/)
  googleClientId: "",      // OAuth client ID from console.cloud.google.com (origin: https://mircix.github.io)
  igApi: "https://tdplay-ig.mrxsp08.workers.dev"   // the Instagram worker URL, e.g. https://tdplay-ig.<you>.workers.dev (see worker/README.md)
};
