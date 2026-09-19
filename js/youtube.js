/* TDPlay OS — YouTube account: Google sign-in (GIS token flow) + YouTube Data API v3 */
(function (TD) {
  "use strict";
  var Y = TD.yt = { signedIn: false, me: null, playlists: null, token: null };
  var SCOPE = "https://www.googleapis.com/auth/youtube";
  var API = "https://www.googleapis.com/youtube/v3/";
  var gisLoading = null, tokenClient = null, pending = null;

  Y.clientId = function () { return TD.store.get("yt:clientId", ""); };
  Y.setClientId = function (id) { TD.store.set("yt:clientId", (id || "").trim()); tokenClient = null; };
  function saved() { return TD.store.get("yt:token", null); }

  function loadGis() {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    if (gisLoading) return gisLoading;
    gisLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
      s.onload = resolve; s.onerror = function () { gisLoading = null; reject(new Error("Couldn't load Google sign-in")); };
      document.head.appendChild(s);
    });
    return gisLoading;
  }
  function client() {
    if (tokenClient) return tokenClient;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: Y.clientId(), scope: SCOPE,
      callback: function (r) {
        var p = pending; pending = null;
        if (!r || r.error) { if (p) p.reject(new Error((r && (r.error_description || r.error)) || "Sign-in cancelled")); return; }
        Y.token = { access: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 - 60000 };
        TD.store.set("yt:token", Y.token);
        if (p) p.resolve(Y.token.access);
      },
      error_callback: function (e) { var p = pending; pending = null; if (p) p.reject(new Error(e && e.message || "Sign-in cancelled")); }
    });
    return tokenClient;
  }
  function request(prompt) {
    return loadGis().then(function () {
      return new Promise(function (resolve, reject) {
        pending = { resolve: resolve, reject: reject };
        client().requestAccessToken({ prompt: prompt });
      });
    });
  }
  // access token: cached → silent renew (uses the Google session) → interactive only via signIn()
  Y.accessToken = function () {
    var t = Y.token || saved();
    if (t && Date.now() < t.exp) { Y.token = t; return Promise.resolve(t.access); }
    if (!t || !Y.clientId()) return Promise.reject(new Error("Not signed in to YouTube"));
    return request("");
  };
  Y.signIn = function () {
    if (!Y.clientId()) return Promise.reject(new Error("Add your Google Client ID first"));
    return request("consent").then(function () { return Y.loadMe(); }).then(function () {
      Y.signedIn = true; TD.bus.emit("yt:state", Y);
      TD.notify("YouTube connected", Y.me ? Y.me.title : "Signed in", { icon: TD.icons.player, img: Y.me && Y.me.avatar });
      return Y.me;
    });
  };
  Y.signOut = function () {
    var t = Y.token || saved();
    if (t && window.google && google.accounts) { try { google.accounts.oauth2.revoke(t.access, function () { }); } catch (e) { } }
    TD.store.del("yt:token"); TD.store.del("yt:me"); Y.token = null; Y.me = null; Y.playlists = null; Y.signedIn = false;
    TD.bus.emit("yt:state", Y);
  };
  Y.restore = function () {                       // on boot: pick up a previous sign-in without any popup
    var me = TD.store.get("yt:me", null), t = saved();
    if (me && t) { Y.me = me; Y.token = t; Y.signedIn = true; TD.bus.emit("yt:state", Y); }
  };

  // ---------------------------------------------------------------- API
  Y.api = function (path, params, method, body) {
    return Y.accessToken().then(function (tok) {
      var url = API + path + (params ? "?" + new URLSearchParams(params).toString() : "");
      return fetch(url, { method: method || "GET", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    }).then(function (r) {
      if (r.status === 204) return null;
      return r.json().then(function (j) {
        if (!r.ok) { var m = (j.error && j.error.message) || ("YouTube API " + r.status); if (r.status === 401) { Y.token = null; TD.store.del("yt:token"); } throw new Error(m); }
        return j;
      });
    });
  };
  function allPages(path, params, max) {
    var items = [];
    var step = function (pageToken) {
      var p = Object.assign({ maxResults: 50 }, params); if (pageToken) p.pageToken = pageToken;
      return Y.api(path, p).then(function (j) {
        items = items.concat(j.items || []);
        if (j.nextPageToken && items.length < (max || 500)) return step(j.nextPageToken);
        return items;
      });
    };
    return step();
  }
  Y.loadMe = function () {
    return Y.api("channels", { part: "snippet,statistics", mine: "true" }).then(function (j) {
      var c = j.items && j.items[0];
      Y.me = c ? { id: c.id, title: c.snippet.title, handle: c.snippet.customUrl || "", avatar: c.snippet.thumbnails && (c.snippet.thumbnails.default || c.snippet.thumbnails.medium).url, subs: c.statistics && c.statistics.subscriberCount } : { title: "YouTube account" };
      TD.store.set("yt:me", Y.me); return Y.me;
    });
  };
  Y.loadPlaylists = function (force) {
    if (Y.playlists && !force) return Promise.resolve(Y.playlists);
    return allPages("playlists", { part: "snippet,contentDetails", mine: "true" }).then(function (items) {
      Y.playlists = items.map(function (p) { return { id: p.id, title: p.snippet.title, count: p.contentDetails.itemCount, thumb: p.snippet.thumbnails && p.snippet.thumbnails.medium ? p.snippet.thumbnails.medium.url : "", privacy: p.status && p.status.privacyStatus }; });
      return Y.playlists;
    });
  };
  Y.playlistItems = function (playlistId) {
    return allPages("playlistItems", { part: "snippet,contentDetails", playlistId: playlistId }).then(function (items) {
      return items.filter(function (i) { return i.contentDetails && i.contentDetails.videoId && !/^(Private|Deleted) video$/.test(i.snippet.title); })
        .map(function (i) { return Y.toItem(i.contentDetails.videoId, i.snippet.title, i.snippet.videoOwnerChannelTitle || ""); });
    });
  };
  Y.likedVideos = function () {
    return allPages("videos", { part: "snippet", myRating: "like" }, 200).then(function (items) {
      return items.map(function (v) { return Y.toItem(v.id, v.snippet.title, v.snippet.channelTitle); });
    });
  };
  Y.subscriptions = function () {
    return allPages("subscriptions", { part: "snippet", mine: "true", order: "alphabetical" }).then(function (items) {
      return items.map(function (s) { return { channelId: s.snippet.resourceId.channelId, title: s.snippet.title, thumb: s.snippet.thumbnails && s.snippet.thumbnails.default ? s.snippet.thumbnails.default.url : "" }; });
    });
  };
  Y.like = function (videoId) { return Y.api("videos/rate", { id: videoId, rating: "like" }, "POST"); };
  Y.addToPlaylist = function (playlistId, videoId) {
    return Y.api("playlistItems", { part: "snippet" }, "POST", { snippet: { playlistId: playlistId, resourceId: { kind: "youtube#video", videoId: videoId } } });
  };
  Y.createPlaylist = function (title, description, items) {
    return Y.api("playlists", { part: "snippet,status" }, "POST", { snippet: { title: title, description: description || "Made with TDPlay OS" }, status: { privacyStatus: "public" } }).then(function (pl) {
      var ids = items.map(function (it) { return it.yt; }).filter(Boolean);
      return ids.reduce(function (p, id) { return p.then(function () { return Y.addToPlaylist(pl.id, id).catch(function () { }); }); }, Promise.resolve()).then(function () { Y.playlists = null; return { id: pl.id, count: ids.length, url: "https://www.youtube.com/playlist?list=" + pl.id }; });
    });
  };
  Y.subscribe = function (videoId) {
    return Y.api("videos", { part: "snippet", id: videoId }).then(function (j) {
      var v = j.items && j.items[0]; if (!v) throw new Error("Video not found");
      return Y.api("subscriptions", { part: "snippet" }, "POST", { snippet: { resourceId: { kind: "youtube#channel", channelId: v.snippet.channelId } } }).then(function () { return v.snippet.channelTitle; });
    });
  };
  // A YouTube video as an OS item: the real catalog item when TDPlay has featured it, otherwise a stand-in
  Y.toItem = function (videoId, title, channel) {
    var known = TD.catalog.byYt && TD.catalog.byYt[videoId];
    if (known) return known;
    var sc = TD.splitCaption(title || "");
    return { id: "yt/" + videoId, yt: videoId, caption: title || videoId, artist: sc.artist || channel || "", title: TD.cleanTitle(sc.artist ? sc.title : title), channel: channel || "",
      initials: "", site: "", apple: "", spotify: "", youtube: "", thumb: "", anchor: "", featured: false, external: true,
      month: { title: "YouTube", key: "", name: "YouTube", year: 0, sort: 0 }, page: null, url: "https://www.youtube.com/watch?v=" + videoId };
  };
})(window.TD);
