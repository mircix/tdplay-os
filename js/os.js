/* TDPlay OS — boot */
(function (TD) {
  "use strict";
  TD.bootTime = Date.now();
  var $ = function (id) { return document.getElementById(id); };

  TD.setWall = function (w) { TD.store.set("wall", w); $("wallpaper").dataset.wall = w; if (w === "art") { var it = TD.player.current(); if (it) $("wp-art").style.backgroundImage = "url(" + TD.thumb(it, true) + ")"; } };
  TD.setAccent = function (a) { TD.store.set("accent", a); document.documentElement.dataset.accent = a; };

  function applyPrefs() {
    $("wallpaper").dataset.wall = TD.store.get("wall", "aurora");
    var acc = TD.store.get("accent", "red"); if (acc !== "red") document.documentElement.dataset.accent = acc;
    if (TD.store.get("reduceMotion", false)) document.documentElement.classList.add("reduce-motion");
  }
  function progress(f, msg) { $("boot-fill").style.width = Math.round(f * 100) + "%"; if (msg) $("boot-status").textContent = msg; }

  // Browsers only allow full screen from a user gesture, so the first click anywhere is the trigger.
  function armFullscreen() {
    if (!TD.store.get("fullscreenOnOpen", true)) return;
    if (!document.fullscreenEnabled || document.fullscreenElement) return;
    var go = function (e) {
      document.removeEventListener("pointerdown", go, true);
      if (e.target.closest && e.target.closest("#tb-full")) return;        // that button handles itself
      var p = document.documentElement.requestFullscreen({ navigationUI: "hide" });
      if (p && p.then) p.then(function () { TD.notify("Full screen", "Press Esc to leave.", { ms: 2500 }); }).catch(function () { });
    };
    document.addEventListener("pointerdown", go, true);
  }
  TD.armFullscreen = armFullscreen;
  function openFromHash() {
    var h = location.hash.replace(/^#/, ""); if (!h) return false;
    var p = new URLSearchParams(h), app = p.get("app") || p.get("open");
    if (p.get("v")) { var it = TD.catalog.items.filter(function (i) { return i.yt === p.get("v"); })[0]; if (it) { TD.open("player", { items: [it] }); return true; } }
    if (p.get("month")) { TD.open("home", { month: p.get("month") }); return true; }
    if (p.get("q")) { TD.open("library", { q: p.get("q") }); return true; }
    if (p.get("artist")) { var A = TD.catalog.findArtist(p.get("artist")); if (A) { TD.open("artists", { artist: A.key }); return true; } }
    if (app && TD.app(app)) { TD.open(app); return true; }
    return false;
  }

  function popupFlow() {
    // Spotify sign-in popup opened by an embedded TDPlay OS (see spotify.js): no desktop, just the OAuth dance.
    var q = new URLSearchParams(location.search);
    if (q.get("splogin")) {
      TD.store.set("sp:clientId", q.get("splogin"));
      progress(.3, "Opening Spotify sign-in…");
      TD.spotify.login();
      return true;
    }
    if ((q.get("code") || q.get("error")) && window.opener) {
      progress(.6, "Finishing Spotify sign-in…");
      TD.spotify.handleRedirect().then(function (r) {
        progress(1, r === "popup" ? "Connected — you can close this window." : "Sign-in failed — close this window and try again.");
        if (r === "popup") setTimeout(function () { window.close(); }, 800);
      });
      return true;
    }
    return false;
  }
  function boot() {
    applyPrefs();
    if (popupFlow()) return;
    TD.wm.init(); TD.player.init();
    progress(.05, "Loading TDPlay index…");
    var t0 = Date.now();
    TD.catalog.load(progress).then(function (C) {
      TD.catalog.loadSites();
      TD.buildDock();
      var wait = Math.max(0, 900 - (Date.now() - t0));
      setTimeout(function () {
        $("desktop").hidden = false;
        $("boot").classList.add("out");
        armFullscreen();
        setTimeout(function () { $("boot").remove(); }, 700);
        TD.spotify.handleRedirect().then(function (ok) {
          if (ok || TD.store.get("sp:openAfter")) { TD.store.del("sp:openAfter"); TD.open("spotify"); return; }
          if (!openFromHash()) {
            if (!TD.store.get("seen")) {
              TD.store.set("seen", true);
              TD.open("home");
              setTimeout(function () { TD.notify("Welcome to TDPlay OS", "Press ⌘K (or /) to search anything. Right-click a song for more.", { ms: 7000 }); }, 900);
            } else {
              TD.open("home");
            }
          }
          if (TD.spotify.tokens()) TD.spotify.connect();
          TD.yt.restore();
        });
      }, wait);
    }).catch(function (e) {
      console.error(e);
      progress(1, "Couldn't load the TDPlay index (" + e.message + ").");
      $("boot-status").innerHTML += ' <button class="btn sm" onclick="location.reload()">Retry</button>';
    });
  }
  window.addEventListener("hashchange", function () { if (TD.catalog.ready) openFromHash(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})(window.TD);
