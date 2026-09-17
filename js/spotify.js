/* TDPlay OS — Spotify service: PKCE sign-in, Web API, Web Playback SDK (Premium) */
(function (TD) {
  "use strict";
  var S = TD.spotify = { connected: false, player: null, deviceId: null, state: null, me: null, sdkReady: false, volume: 0.8 };
  var SCOPES = "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-modify-public playlist-modify-private user-library-modify user-library-read";
  var AUTH = "https://accounts.spotify.com";

  S.clientId = function () { return TD.store.get("sp:clientId", ""); };
  S.redirectUri = function () { return location.origin + location.pathname.replace(/index\.html$/, ""); };
  S.tokens = function () { return TD.store.get("sp:tokens", null); };

  // ---------------------------------------------------------------- PKCE
  function rand(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[b % 62]; }).join(""); }
  function b64url(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  S.login = function () {
    var cid = S.clientId();
    if (!cid) { TD.open("settings", { tab: "spotify" }); TD.notify("Spotify", "Paste your Spotify app Client ID in Settings first.", { icon: TD.icons.spotify }); return; }
    var verifier = rand(64);
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)).then(function (hash) {
      sessionStorage.setItem("sp:verifier", verifier);
      var p = new URLSearchParams({ client_id: cid, response_type: "code", redirect_uri: S.redirectUri(), scope: SCOPES, code_challenge_method: "S256", code_challenge: b64url(hash), state: rand(12) });
      location.href = AUTH + "/authorize?" + p.toString();
    });
  };
  S.handleRedirect = function () {
    var q = new URLSearchParams(location.search);
    if (!q.get("code") && !q.get("error")) return Promise.resolve(false);
    history.replaceState(null, "", location.pathname);
    if (q.get("error")) { TD.notify("Spotify sign-in failed", q.get("error"), { icon: TD.icons.spotify }); return Promise.resolve(false); }
    var verifier = sessionStorage.getItem("sp:verifier"); sessionStorage.removeItem("sp:verifier");
    return fetch(AUTH + "/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: S.clientId(), grant_type: "authorization_code", code: q.get("code"), redirect_uri: S.redirectUri(), code_verifier: verifier }) })
      .then(function (r) { return r.json(); }).then(function (t) {
        if (!t.access_token) throw new Error(t.error_description || t.error || "no token");
        saveTokens(t); TD.notify("Spotify connected", "TDPlay OS is now a Spotify Connect device.", { icon: TD.icons.spotify });
        TD.store.set("sp:openAfter", true);
        return true;
      }).catch(function (e) { TD.notify("Spotify sign-in failed", e.message, { icon: TD.icons.spotify }); return false; });
  };
  function saveTokens(t) {
    var cur = S.tokens() || {};
    TD.store.set("sp:tokens", { access: t.access_token, refresh: t.refresh_token || cur.refresh, exp: Date.now() + (t.expires_in || 3600) * 1000 - 30000 });
  }
  S.token = function () {
    var t = S.tokens();
    if (!t) return Promise.reject(new Error("not connected"));
    if (Date.now() < t.exp) return Promise.resolve(t.access);
    return fetch(AUTH + "/api/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: S.clientId(), grant_type: "refresh_token", refresh_token: t.refresh }) })
      .then(function (r) { return r.json(); }).then(function (nt) {
        if (!nt.access_token) { S.logout(); throw new Error("Spotify session expired — sign in again"); }
        saveTokens(nt); return nt.access_token;
      });
  };
  S.logout = function () {
    TD.store.del("sp:tokens"); S.connected = false; S.me = null; S.deviceId = null; S.state = null;
    if (S.player) { try { S.player.disconnect(); } catch (e) { } S.player = null; }
    document.getElementById("tb-spotify").classList.remove("on");
    TD.bus.emit("spotify:state", S);
  };

  // ---------------------------------------------------------------- Web API
  S.api = function (method, path, body) {
    return S.token().then(function (tok) {
      return fetch("https://api.spotify.com/v1" + path, { method: method, headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    }).then(function (r) {
      if (r.status === 204 || r.status === 202) return null;
      return r.json().then(function (j) { if (!r.ok) throw new Error((j.error && j.error.message) || r.status); return j; });
    });
  };

  // ---------------------------------------------------------------- Web Playback SDK
  function loadSdk() {
    if (window.Spotify) return Promise.resolve();
    return new Promise(function (resolve) {
      window.onSpotifyWebPlaybackSDKReady = resolve;
      var s = document.createElement("script"); s.src = "https://sdk.scdn.co/spotify-player.js"; document.head.appendChild(s);
    });
  }
  S.connect = function () {
    if (!S.tokens()) return Promise.resolve(false);
    if (S.player) return Promise.resolve(true);
    S.api("GET", "/me").then(function (me) { S.me = me; TD.bus.emit("spotify:state", S); }).catch(function () { });
    return loadSdk().then(function () {
      return new Promise(function (resolve) {
        var p = new Spotify.Player({ name: "TDPlay OS", getOAuthToken: function (cb) { S.token().then(cb).catch(function () { }); }, volume: TD.store.get("sp:vol", 0.8) });
        p.addListener("ready", function (d) {
          S.deviceId = d.device_id; S.connected = true; S.player = p;
          document.getElementById("tb-spotify").classList.add("on"); document.getElementById("tb-spotify").title = "Spotify connected";
          TD.bus.emit("spotify:state", S); resolve(true);
        });
        p.addListener("not_ready", function () { S.connected = false; TD.bus.emit("spotify:state", S); });
        p.addListener("player_state_changed", function (st) { S.state = st; TD.bus.emit("spotify:state", S); if (st && !st.paused) TD.player.pause(); });
        p.addListener("initialization_error", function (e) { TD.notify("Spotify", e.message, { icon: TD.icons.spotify }); resolve(false); });
        p.addListener("authentication_error", function (e) { TD.notify("Spotify sign-in expired", e.message, { icon: TD.icons.spotify }); S.logout(); resolve(false); });
        p.addListener("account_error", function (e) { TD.notify("Spotify Premium needed", e.message, { icon: TD.icons.spotify }); resolve(false); });
        p.addListener("playback_error", function (e) { TD.notify("Spotify playback", e.message, { icon: TD.icons.spotify }); });
        p.connect();
      });
    });
  };
  S.playUris = function (uris, contextUri, offset) {
    if (!S.connected) return Promise.reject(new Error("Spotify not connected"));
    var body = contextUri ? { context_uri: contextUri } : { uris: uris };
    if (offset != null) body.offset = { position: offset };
    TD.player.pause();
    return S.api("PUT", "/me/player/play?device_id=" + S.deviceId, body).catch(function (e) {
      // device may have gone stale; transfer then retry once
      return S.api("PUT", "/me/player", { device_ids: [S.deviceId], play: false }).then(function () { return S.api("PUT", "/me/player/play?device_id=" + S.deviceId, body); });
    });
  };
  S.playLink = function (url) {
    var uri = TD.spotifyUri(url); if (!uri) return Promise.reject(new Error("Not a Spotify link"));
    return uri.indexOf("spotify:track:") === 0 ? S.playUris([uri]) : S.playUris(null, uri);
  };
  S.playItems = function (items, start) {
    // month/artist play: tracks go in as uris; albums contribute their first track
    var links = items.map(function (it) { return it.spotify; }).filter(Boolean);
    var tracks = links.map(TD.spotifyUri).filter(function (u) { return u.indexOf("spotify:track:") === 0; });
    var albums = links.map(TD.spotifyUri).filter(function (u) { return u.indexOf("spotify:album:") === 0; }).slice(0, 20);
    var albumIds = albums.map(function (u) { return u.split(":")[2]; });
    var p = albumIds.length ? S.api("GET", "/albums?ids=" + albumIds.join(",")).then(function (r) {
      return (r.albums || []).map(function (a) { return a && a.tracks && a.tracks.items[0] ? a.tracks.items[0].uri : null; }).filter(Boolean);
    }).catch(function () { return []; }) : Promise.resolve([]);
    return p.then(function (albumTracks) {
      var uris = [];
      links.forEach(function (l) { var u = TD.spotifyUri(l); if (u.indexOf("spotify:track:") === 0) uris.push(u); else if (u.indexOf("spotify:album:") === 0) { var t = albumTracks.shift(); if (t) uris.push(t); } });
      if (!uris.length) throw new Error("No Spotify tracks in this list");
      return S.playUris(uris.slice(0, 200), null, start || 0);
    });
  };
  S.toggle = function () { return S.player ? S.player.togglePlay() : Promise.resolve(); };
  S.next = function () { return S.player ? S.player.nextTrack() : Promise.resolve(); };
  S.prev = function () { return S.player ? S.player.previousTrack() : Promise.resolve(); };
  S.seek = function (ms) { return S.player ? S.player.seek(ms) : Promise.resolve(); };
  S.setVolume = function (v) { TD.store.set("sp:vol", v); return S.player ? S.player.setVolume(v) : Promise.resolve(); };
  S.createPlaylist = function (name, desc, items) {
    var uris = items.map(function (it) { return TD.spotifyUri(it.spotify); }).filter(function (u) { return u.indexOf("spotify:track:") === 0; });
    var albumIds = items.map(function (it) { return TD.spotifyUri(it.spotify); }).filter(function (u) { return u.indexOf("spotify:album:") === 0; }).map(function (u) { return u.split(":")[2]; });
    var chunks = []; for (var i = 0; i < albumIds.length; i += 20) chunks.push(albumIds.slice(i, i + 20));
    return Promise.all(chunks.map(function (ids) { return S.api("GET", "/albums?ids=" + ids.join(",")).catch(function () { return { albums: [] }; }); })).then(function (rs) {
      rs.forEach(function (r) { (r.albums || []).forEach(function (a) { if (a && a.tracks && a.tracks.items[0]) uris.push(a.tracks.items[0].uri); }); });
      if (!uris.length) throw new Error("No Spotify tracks to add");
      return (S.me ? Promise.resolve(S.me) : S.api("GET", "/me")).then(function (me) {
        return S.api("POST", "/users/" + encodeURIComponent(me.id) + "/playlists", { name: name, description: desc || "Made with TDPlay OS", public: true });
      }).then(function (pl) {
        var adds = []; for (var i = 0; i < uris.length; i += 100) adds.push(uris.slice(i, i + 100));
        return adds.reduce(function (p, batch) { return p.then(function () { return S.api("POST", "/playlists/" + pl.id + "/tracks", { uris: batch }); }); }, Promise.resolve()).then(function () { return { playlist: pl, count: uris.length }; });
      });
    });
  };
})(window.TD);
