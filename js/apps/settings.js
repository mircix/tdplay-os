/* Settings — Spotify, look & feel, data */
(function (TD) {
  "use strict";
  TD.register({
    id: "settings", name: "Settings", desc: "Spotify, wallpaper, accent, data", icon: TD.icons.settings, width: 760, height: 620, keywords: "settings preferences wallpaper spotify",
    mount: function (win, params) {
      var state = { tab: (params && params.tab) || "spotify" };
      var app = TD.h("div", { "class": "app" }), split = TD.h("div", { "class": "app-split" });
      var side = TD.h("div", { "class": "app-side", style: "width:170px" }), main = TD.h("div", { "class": "app-main" });
      split.appendChild(side); split.appendChild(main); app.appendChild(split); win.body.appendChild(app);
      var tabs = [["spotify", "Spotify"], ["youtube", "YouTube"], ["look", "Look & feel"], ["data", "Data"], ["about", "About"]];
      function renderSide() { TD.clear(side); tabs.forEach(function (t) { side.appendChild(TD.h("button", { "class": "side-item" + (state.tab === t[0] ? " active" : ""), text: t[1], onclick: function () { state.tab = t[0]; renderSide(); render(); } })); }); }
      function field(label, control, hint) { return TD.h("div", { "class": "field" }, [TD.h("label", { text: label }), control, hint ? TD.h("div", { "class": "hint", html: hint }) : null]); }
      function render() {
        TD.clear(main); win.setTitle("Settings — " + tabs.filter(function (t) { return t[0] === state.tab; })[0][1]);
        if (state.tab === "spotify") {
          var S = TD.spotify;
          main.appendChild(TD.h("h2", { text: "Spotify Premium" }));
          main.appendChild(TD.h("p", { "class": "muted", html: "Connect once and TDPlay OS becomes a Spotify Connect device: full songs, your account, and one-click playlists from any month. It needs a free Spotify <i>developer app</i> so Spotify knows who's asking:" }));
          main.appendChild(TD.h("ol", { "class": "muted", style: "padding-left:20px;font-size:13.5px;line-height:1.7", html:
            'Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a> → <b>Create app</b>.<br>' +
            "Name it anything (e.g. <b>TDPlay OS</b>). Under <b>Redirect URIs</b> add exactly:<br>&nbsp;&nbsp;<code>" + TD.esc(S.redirectUri()) + "</code><br>" +
            "Tick <b>Web Playback SDK</b> and <b>Web API</b>, save, then copy the <b>Client ID</b> here." }));
          var cid = TD.h("input", { "class": "input", type: "text", value: S.clientId(), placeholder: "32-character Client ID", spellcheck: "false", style: "font-family:var(--mono)" });
          main.appendChild(field("Client ID", cid));
          main.appendChild(TD.h("div", { "class": "pill-row" }, [
            TD.h("button", { "class": "btn primary", text: "Save", onclick: function () { TD.store.set("sp:clientId", cid.value.trim()); TD.notify("Saved", "Spotify Client ID stored in this browser."); render(); } }),
            S.tokens() ? TD.h("button", { "class": "btn", text: "Disconnect", onclick: function () { S.logout(); render(); } })
              : TD.h("button", { "class": "btn spotify", html: TD.icons.spotifyG + " Connect Spotify", disabled: !S.clientId(), onclick: function () { S.login(); } })
          ]));
          main.appendChild(TD.h("div", { "class": "muted", style: "margin-top:14px;font-size:12.5px", text: "Status: " + (S.connected ? "connected as " + (S.me ? (S.me.display_name || S.me.id) : "…") : S.tokens() ? "signed in, player not ready yet" : "not connected") + (TD.embedded ? " · inside tdplay.site the sign-in opens in a pop-up window" : "") }));
        }
        if (state.tab === "youtube") {
          var Y = TD.yt;
          main.appendChild(TD.h("h2", { text: "YouTube account" }));
          main.appendChild(TD.h("p", { "class": "muted", html: "Sign in with Google to play your own playlists and liked videos in the Player, and to like / save / subscribe from it. The sign-in itself lives in <b>Player → YouTube</b>; this is just where the Client ID is kept." }));
          main.appendChild(TD.h("ol", { "class": "muted", style: "padding-left:20px;font-size:13.5px;line-height:1.7", html:
            '<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">console.cloud.google.com</a> → create a project (any name).<br>' +
            "APIs &amp; Services → <b>Enable APIs</b> → <b>YouTube Data API v3</b>.<br>" +
            "OAuth consent screen → External → app name + your email → <b>Test users</b>: add your Google account.<br>" +
            "Credentials → Create credentials → <b>OAuth client ID</b> → Web application → Authorized JavaScript origins: <code>https://mircix.github.io</code> (and <code>http://localhost:8787</code> for local runs) → copy the <b>Client ID</b>." }));
          var ycid = TD.h("input", { "class": "input", type: "text", value: Y.clientId(), placeholder: "xxxxxxxx.apps.googleusercontent.com", spellcheck: "false", style: "font-family:var(--mono)" });
          main.appendChild(field("Client ID", ycid));
          main.appendChild(TD.h("div", { "class": "pill-row" }, [
            TD.h("button", { "class": "btn primary", text: "Save", onclick: function () { Y.setClientId(ycid.value); TD.notify("Saved", "Google Client ID stored in this browser."); render(); } }),
            Y.signedIn ? TD.h("button", { "class": "btn", text: "Sign out", onclick: function () { Y.signOut(); render(); } })
              : TD.h("button", { "class": "btn yt", html: TD.icons.youtube + " Sign in with Google", disabled: !Y.clientId(), onclick: function () { Y.signIn().then(render).catch(function (e) { TD.notify("YouTube sign-in", e.message); }); } })
          ]));
          main.appendChild(TD.h("div", { "class": "muted", style: "margin-top:14px;font-size:12.5px", text: "Status: " + (Y.signedIn ? "signed in as " + ((Y.me && Y.me.title) || "…") : "not signed in") }));
        }
        if (state.tab === "look") {
          main.appendChild(TD.h("h2", { text: "Wallpaper" }));
          var walls = [["aurora", "Aurora", "radial-gradient(circle at 20% 30%,rgba(255,43,43,.6),transparent 50%),radial-gradient(circle at 80% 60%,rgba(255,92,240,.4),transparent 50%),#07070c"], ["neon", "Neon", "radial-gradient(circle at 20% 30%,rgba(255,43,43,.9),transparent 50%),radial-gradient(circle at 80% 60%,rgba(177,255,255,.6),transparent 50%),#07070c"], ["cyan", "Ice", "radial-gradient(circle at 20% 30%,rgba(177,255,255,.6),transparent 50%),radial-gradient(circle at 80% 60%,rgba(40,120,255,.5),transparent 50%),#07070c"], ["black", "Black", "#07070c"], ["art", "Now playing", "linear-gradient(135deg,#333,#111)"]];
          var cur = TD.store.get("wall", "aurora");
          main.appendChild(TD.h("div", { "class": "walls" }, walls.map(function (w) { return TD.h("div", { "class": "wall" + (cur === w[0] ? " on" : ""), style: "background:" + w[2], onclick: function () { TD.setWall(w[0]); render(); } }, [TD.h("span", { text: w[1] })]); })));
          main.appendChild(TD.h("div", { "class": "hint", text: "“Now playing” blurs the current song's artwork behind your windows." }));
          main.appendChild(TD.h("h2", { text: "Accent", style: "margin-top:20px" }));
          var acc = TD.store.get("accent", "red");
          main.appendChild(TD.h("div", { "class": "swatches" }, [["red", "#ff2b2b"], ["pink", "#ff5cf0"], ["cyan", "#b1ffff"], ["gold", "#ffd166"], ["green", "#1ed760"]].map(function (a) { return TD.h("div", { "class": "sw" + (acc === a[0] ? " on" : ""), style: "background:" + a[1], title: a[0], onclick: function () { TD.setAccent(a[0]); render(); } }); })));
          main.appendChild(TD.h("h2", { text: "Full screen", style: "margin-top:20px" }));
          var fs = TD.h("input", { type: "checkbox", checked: !!TD.store.get("fullscreenOnOpen", true), onchange: function (e) { TD.store.set("fullscreenOnOpen", e.target.checked); if (e.target.checked) TD.armFullscreen(); } });
          main.appendChild(TD.h("label", { style: "display:flex;gap:8px;align-items:center" }, [fs, "Ask to go full screen when TDPlay OS opens"]));
          main.appendChild(TD.h("div", { "class": "hint", text: "Browsers only allow full screen after a click, so the OS asks instead of just doing it. Esc leaves full screen; the ⤢ button in the top bar toggles it any time." }));
          main.appendChild(TD.h("h2", { text: "Motion", style: "margin-top:20px" }));
          var rm = TD.h("input", { type: "checkbox", checked: !!TD.store.get("reduceMotion", false), onchange: function (e) { TD.store.set("reduceMotion", e.target.checked); document.documentElement.classList.toggle("reduce-motion", e.target.checked); } });
          main.appendChild(TD.h("label", { style: "display:flex;gap:8px;align-items:center" }, [rm, "Reduce motion (still wallpaper)"]));
          main.appendChild(TD.h("h2", { text: "Windows", style: "margin-top:20px" }));
          main.appendChild(TD.h("button", { "class": "btn", text: "Forget saved window positions", onclick: function () { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("tdos:win:") === 0) localStorage.removeItem(k); }); TD.notify("Done", "Windows will open centred again."); } }));
        }
        if (state.tab === "data") {
          var C = TD.catalog;
          main.appendChild(TD.h("h2", { text: "Catalog" }));
          main.appendChild(TD.h("dl", { "class": "kv" }, [
            TD.h("dt", { text: "Source" }), TD.h("dd", { html: '<a href="' + TD.esc(TD.store.get("dataUrl") || TD.DATA_URL) + '" target="_blank" rel="noopener">' + TD.esc(TD.store.get("dataUrl") || TD.DATA_URL) + "</a>" }),
            TD.h("dt", { text: "Built" }), TD.h("dd", { text: (C.meta.generated || "").replace("T", " ").replace("Z", " UTC") }),
            TD.h("dt", { text: "Pages" }), TD.h("dd", { text: String(C.meta.pageCount) }),
            TD.h("dt", { text: "Songs" }), TD.h("dd", { text: String(C.items.length) + " (" + C.playable.length + " with video)" }),
            TD.h("dt", { text: "Months" }), TD.h("dd", { text: C.months.length + " · latest " + C.latest().key })]));
          main.appendChild(TD.h("p", { "class": "muted", style: "font-size:13px", html: "The index rebuilds itself every 6 hours from tdplay.site's sitemap (GitHub Actions in <a href='https://github.com/mircix/tdplay-search' target='_blank' rel='noopener'>mircix/tdplay-search</a>). New months appear here automatically — just restart the OS." }));
          main.appendChild(TD.h("div", { "class": "pill-row" }, [
            TD.h("button", { "class": "btn primary", text: "Reload catalog", onclick: function () { location.reload(); } }),
            TD.h("button", { "class": "btn", text: "Reset TDPlay OS", onclick: function () { if (confirm("Forget all settings, Spotify sign-in and window positions?")) { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("tdos:") === 0) localStorage.removeItem(k); }); location.reload(); } } })]));
        }
        if (state.tab === "about") { TD.open("about"); state.tab = "spotify"; renderSide(); render(); }
      }
      renderSide(); render();
      win.setTab = function (t) { state.tab = t; renderSide(); render(); };
    },
    resume: function (win, params) { if (params && params.tab) win.setTab(params.tab); }
  });
})(window.TD);
