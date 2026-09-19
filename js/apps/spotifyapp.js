/* Spotify — Premium playback through TDPlay OS (Web Playback SDK) with embed fallback */
(function (TD) {
  "use strict";
  TD.register({
    id: "spotify", name: "Spotify", desc: "Play TDPlay picks on Spotify", icon: TD.icons.spotify, width: 1000, height: 700, keywords: "spotify premium connect",
    mount: function (win, params) {
      var S = TD.spotify, C = TD.catalog, state = { src: null };
      var app = TD.h("div", { "class": "app" }), split = TD.h("div", { "class": "app-split" });
      var side = TD.h("div", { "class": "app-side" }), main = TD.h("div", { "class": "app-main" });
      var bar = TD.h("div", { "class": "app-toolbar" });
      app.appendChild(bar); split.appendChild(side); split.appendChild(main); app.appendChild(split); win.body.appendChild(app);

      // ---- toolbar: connection state
      function renderBar() {
        TD.clear(bar);
        if (TD.isMobile()) bar.appendChild(TD.h("button", { "class": "btn sm", text: "☰", onclick: function () { split.classList.toggle("show-side"); } }));
        if (S.connected) {
          bar.appendChild(TD.h("span", { "class": "chip on", style: "border-color:rgba(30,215,96,.5);background:rgba(30,215,96,.18)", text: "● Connected" + (S.me ? " · " + (S.me.display_name || S.me.id) : "") }));
          bar.appendChild(TD.h("span", { "class": "muted", style: "font-size:12.5px", text: "TDPlay OS shows up as a device in your Spotify apps" }));
          bar.appendChild(TD.h("div", { style: "margin-left:auto" }, [TD.h("button", { "class": "btn sm", text: "Disconnect", onclick: function () { S.logout(); renderBar(); renderMain(); } })]));
        } else if (S.tokens()) {
          bar.appendChild(TD.h("span", { "class": "chip", text: "Connecting…" }));
          bar.appendChild(TD.h("div", { style: "margin-left:auto" }, [TD.h("button", { "class": "btn sm", text: "Disconnect", onclick: function () { S.logout(); renderBar(); renderMain(); } })]));
        } else {
          bar.appendChild(TD.h("button", { "class": "btn spotify", html: TD.icons.spotifyG + " Connect Spotify Premium", onclick: function () { S.login(); } }));
          bar.appendChild(TD.h("span", { "class": "muted", style: "font-size:12.5px", text: "Full tracks, your account, playlists — right here." }));
        }
      }
      // ---- sidebar: months with Spotify playlists, years
      function renderSide() {
        TD.clear(side);
        var item = function (label, n, fn, active) { side.appendChild(TD.h("button", { "class": "side-item" + (active ? " active" : ""), onclick: function () { fn(); split.classList.remove("show-side"); } }, [TD.h("span", { text: label }), n != null ? TD.h("span", { "class": "n", text: String(n) }) : null])); };
        if (state.src && state.src.kind === "items") { side.appendChild(TD.h("div", { "class": "side-h", text: "Now" })); item(state.src.label || "Selection", state.src.items.length, function () { }, true); }
        side.appendChild(TD.h("div", { "class": "side-h", text: "Year playlists" }));
        C.yearPlaylists.forEach(function (Y) { item("TDPlay " + Y.year, null, function () { setSrc({ kind: "link", link: Y.spotify, label: "TDPlay " + Y.year }); }, state.src && state.src.link === Y.spotify); });
        side.appendChild(TD.h("div", { "class": "side-h", text: "Month playlists" }));
        C.months.forEach(function (M) { if (M.playlists.spotify) item(M.key, M.count, function () { setSrc({ kind: "month", month: M, link: M.playlists.spotify, label: M.title }); }, state.src && state.src.link === M.playlists.spotify); });
      }
      function setSrc(src, autoplay) {
        state.src = src; renderSide(); renderMain();
        if (autoplay && S.connected) playSrc();
      }
      function playSrc() {
        var src = state.src; if (!src || !S.connected) return;
        var p = src.link ? S.playLink(src.link) : S.playItems(src.items);
        p.catch(function (e) { TD.notify("Spotify", e.message, { icon: TD.icons.spotify }); });
      }
      // ---- now playing (SDK)
      var nowEl = TD.h("div", { "class": "sp-now", style: "margin-bottom:16px" });
      function renderNow() {
        TD.clear(nowEl);
        if (!S.connected) { nowEl.hidden = true; return; }
        nowEl.hidden = false;
        var st = S.state, tr = st && st.track_window && st.track_window.current_track;
        var art = tr && tr.album.images[0] ? tr.album.images[0].url : "";
        var seek = TD.h("div", { "class": "seek" }, [TD.h("i", { style: st && st.duration ? "width:" + (st.position / st.duration * 100) + "%" : "" })]);
        seek.addEventListener("click", function (e) { if (!st) return; var r = seek.getBoundingClientRect(); S.seek(Math.round((e.clientX - r.left) / r.width * st.duration)); });
        nowEl.appendChild(TD.h("div", { "class": "art", style: art ? "background-image:url(" + art + ")" : "" }));
        nowEl.appendChild(TD.h("div", { "class": "t" }, [
          TD.h("b", { text: tr ? tr.name : "Ready — pick something to play" }),
          TD.h("span", { text: tr ? tr.artists.map(function (a) { return a.name; }).join(", ") + " · " + tr.album.name : "TDPlay OS is your active Spotify device" }),
          TD.h("div", { "class": "sp-ctl" }, [
            TD.h("button", { "class": "btn icon", html: TD.icons.prev, onclick: S.prev }),
            TD.h("button", { "class": "btn icon primary", style: "background:var(--green)", html: st && !st.paused ? TD.icons.pause : TD.icons.play, onclick: S.toggle }),
            TD.h("button", { "class": "btn icon", html: TD.icons.next, onclick: S.next }),
            seek, TD.h("span", { "class": "sp-time", text: st ? TD.fmtTime(st.position) + " / " + TD.fmtTime(st.duration) : "" }),
            TD.h("input", { "class": "vol", type: "range", min: "0", max: "100", value: String(Math.round(TD.store.get("sp:vol", 0.8) * 100)), oninput: function (e) { S.setVolume(parseInt(e.target.value, 10) / 100); } })
          ])
        ]));
      }
      // ---- main
      function renderMain() {
        TD.clear(main); main.scrollTop = 0;
        main.appendChild(nowEl); renderNow();
        var src = state.src;
        if (!src) {
          win.setTitle("Spotify");
          main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: "TDPlay on Spotify" }), TD.h("span", { "class": "muted", text: "Every month and year has a playlist" })]));
          var f = TD.h("div", { "class": "folders" });
          C.yearPlaylists.forEach(function (Y) { f.appendChild(TD.h("div", { "class": "folder", onclick: function () { setSrc({ kind: "link", link: Y.spotify, label: "TDPlay " + Y.year }, true); } }, [TD.h("div", { "class": "fn", html: "TDPlay <em>" + Y.year + "</em>" }), TD.h("div", { "class": "fc", text: "Year playlist" })])); });
          main.appendChild(f);
          main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: "Latest months" })]));
          var f2 = TD.h("div", { "class": "folders" });
          C.months.filter(function (M) { return M.playlists.spotify; }).slice(0, 12).forEach(function (M) { f2.appendChild(TD.h("div", { "class": "folder", onclick: function () { setSrc({ kind: "month", month: M, link: M.playlists.spotify, label: M.title }, true); } }, [TD.h("div", { "class": "fn", html: TD.esc(M.name) + " <em>'" + String(M.year).slice(2) + "</em>" }), TD.h("div", { "class": "fc", text: TD.plural(M.count, "song") })])); });
          main.appendChild(f2);
          return;
        }
        win.setTitle("Spotify — " + (src.label || ""));
        var head = TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: src.label || "Spotify" })]);
        var right = TD.h("div", { "class": "right" }); head.appendChild(right);
        if (S.connected) right.appendChild(TD.h("button", { "class": "btn spotify", html: TD.icons.play + " Play on Spotify", onclick: playSrc }));
        if (src.link) right.appendChild(TD.h("a", { "class": "btn sm", href: src.link, target: "_blank", rel: "noopener", html: TD.icons.ext + " Open in Spotify" }));
        if (S.connected && (src.kind === "items" || src.kind === "month")) {
          var items = src.kind === "month" ? src.month.items : src.items;
          right.appendChild(TD.h("button", { "class": "btn sm", text: "Save as playlist", onclick: function (e) {
            var b = e.currentTarget; b.disabled = true; b.textContent = "Saving…";
            S.createPlaylist((src.label || "TDPlay") + " — TDPlay OS", "Songs from " + (src.label || "TDPlay") + " · tdplay.site", items).then(function (r) {
              b.textContent = "Saved ✓"; TD.notify("Playlist saved", TD.plural(r.count, "track") + " → " + r.playlist.name, { icon: TD.icons.spotify, onclick: function () { window.open(r.playlist.external_urls.spotify, "_blank"); } });
            }).catch(function (err) { b.disabled = false; b.textContent = "Save as playlist"; TD.notify("Couldn't save", err.message, { icon: TD.icons.spotify }); });
          } }));
        }
        main.appendChild(head);
        if (src.item) main.appendChild(TD.h("div", { "class": "muted", style: "margin:-6px 0 10px", text: src.item.caption + " · " + src.item.month.title }));
        // embed when not connected (or for a single link); track list when we have items
        var embed = src.link ? TD.spotifyEmbed(src.link) : "";
        if (embed && (!S.connected || src.kind === "link")) {
          var tall = /\/(album|playlist|artist)\//.test(embed);
          main.appendChild(TD.h("div", { "class": "embed-wrap", style: "margin-bottom:14px" }, [TD.h("iframe", { src: embed, height: tall ? "420" : "152", allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture", loading: "lazy", style: "border-radius:12px" })]));
          if (!S.connected) main.appendChild(TD.h("div", { "class": "muted", style: "font-size:12.5px;margin-bottom:14px", text: "Signed in to Spotify in this browser? The embed plays full songs. Connect Premium above to play through TDPlay OS itself." }));
        }
        var list = src.kind === "items" ? src.items : src.kind === "month" ? src.month.items : null;
        if (list) {
          main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: "Songs" }), TD.h("span", { "class": "muted", text: TD.plural(list.filter(function (i) { return i.spotify; }).length, "Spotify link") })]));
          main.appendChild(TD.ui.rows(list, { compact: true, list: list, onPick: function (it) {
            if (!it.spotify) return TD.notify("No Spotify link", it.caption);
            if (S.connected) S.playLink(it.spotify).catch(function (e) { TD.notify("Spotify", e.message); });
            else setSrc({ kind: "link", link: it.spotify, label: it.artist || it.caption, item: it });
          } }));
        }
      }
      var off = TD.bus.on("spotify:state", function () { renderBar(); renderNow(); });
      win.on("close", off);
      var tickTimer = setInterval(function () { if (S.state && !S.state.paused && !nowEl.hidden) { S.player.getCurrentState().then(function (st) { if (st) { S.state = st; renderNow(); } }); } }, 1000);
      win.on("close", function () { clearInterval(tickTimer); });
      win.setSrc = setSrc;
      renderBar(); renderSide(); renderMain();
      if (S.tokens() && !S.connected) S.connect().then(function () { renderBar(); renderMain(); });
      TD.app("spotify").resume(win, params);
    },
    resume: function (win, params) {
      if (!params) return;
      if (params.items) win.setSrc({ kind: "items", items: params.items, link: params.link || "", label: params.label || "Selection" }, params.autoplay);
      else if (params.link) win.setSrc({ kind: "link", link: params.link, label: params.label || (params.item ? (params.item.artist || params.item.caption) : "Spotify"), item: params.item }, params.autoplay);
    }
  });
})(window.TD);
