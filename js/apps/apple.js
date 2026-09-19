/* Apple Music — month & year playlists and any TDPlay pick, via Apple's embed player */
(function (TD) {
  "use strict";
  TD.register({
    id: "apple", name: "Apple Music", desc: "TDPlay playlists on Apple Music", icon: TD.icons.apple, width: 960, height: 680, keywords: "apple music itunes",
    mount: function (win, params) {
      var C = TD.catalog, state = { link: "", label: "", item: null };
      var app = TD.h("div", { "class": "app" }), split = TD.h("div", { "class": "app-split" });
      var side = TD.h("div", { "class": "app-side" }), main = TD.h("div", { "class": "app-main" });
      var bar = TD.h("div", { "class": "app-toolbar" }, [
        TD.isMobile() ? TD.h("button", { "class": "btn sm", text: "☰", onclick: function () { split.classList.toggle("show-side"); } }) : null,
        TD.h("span", { "class": "muted", style: "font-size:12.5px", text: "Signed in to Apple Music in this browser? Embeds play full songs — otherwise 30-second previews." })
      ]);
      app.appendChild(bar); split.appendChild(side); split.appendChild(main); app.appendChild(split); win.body.appendChild(app);
      function item(label, n, fn, active) { side.appendChild(TD.h("button", { "class": "side-item" + (active ? " active" : ""), onclick: function () { fn(); split.classList.remove("show-side"); } }, [TD.h("span", { text: label }), n != null ? TD.h("span", { "class": "n", text: String(n) }) : null])); }
      function renderSide() {
        TD.clear(side);
        side.appendChild(TD.h("div", { "class": "side-h", text: "Month playlists" }));
        C.months.forEach(function (M) { if (M.playlists.apple) item(M.key, M.count, function () { set(M.playlists.apple, M.title, null, M); }, state.link === M.playlists.apple); });
      }
      function set(link, label, item, month) { state.link = link; state.label = label; state.item = item || null; state.month = month || null; renderSide(); renderMain(); }
      win.set = set;
      function renderMain() {
        TD.clear(main); main.scrollTop = 0;
        if (!state.link) {
          win.setTitle("Apple Music");
          main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: "TDPlay on Apple Music" }), TD.h("span", { "class": "muted", text: "Pick a month playlist" })]));
          var f2 = TD.h("div", { "class": "folders" });
          C.months.filter(function (M) { return M.playlists.apple; }).slice(0, 24).forEach(function (M) { f2.appendChild(TD.h("div", { "class": "folder", onclick: function () { set(M.playlists.apple, M.title, null, M); } }, [TD.h("div", { "class": "fn", html: TD.esc(M.name) + " <em>'" + String(M.year).slice(2) + "</em>" }), TD.h("div", { "class": "fc", text: TD.plural(M.count, "song") })])); });
          main.appendChild(f2);
          return;
        }
        win.setTitle("Apple Music — " + state.label);
        main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: state.label }), TD.h("div", { "class": "right" }, [TD.h("a", { "class": "btn apple", href: state.link, target: "_blank", rel: "noopener", html: TD.icons.appleG + " Open in Apple Music" })])]));
        if (state.item) main.appendChild(TD.h("div", { "class": "muted", style: "margin:-6px 0 10px", text: state.item.caption + " · " + state.item.month.title }));
        var embed = TD.appleEmbed(state.link), single = /[?&]i=\d+/.test(state.link);
        main.appendChild(TD.h("div", { "class": "embed-wrap" }, [TD.h("iframe", { src: embed, height: single ? "175" : "450", allow: "autoplay *; encrypted-media *; fullscreen *; clipboard-write", sandbox: "allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation", style: "border-radius:12px" })]));
        if (state.month) {
          main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: "Songs" }), TD.h("span", { "class": "muted", text: TD.plural(state.month.items.filter(function (i) { return i.apple; }).length, "Apple Music link") })]));
          main.appendChild(TD.ui.rows(state.month.items, { compact: true, onPick: function (it) { if (it.apple) set(it.apple, it.artist || it.caption, it, state.month); else TD.notify("No Apple Music link", it.caption); } }));
        }
      }
      renderSide(); renderMain();
      TD.app("apple").resume(win, params);
    },
    resume: function (win, params) { if (params && params.link) win.set(params.link, params.label || (params.item ? (params.item.artist || params.item.caption) : "Apple Music"), params.item); }
  });
})(window.TD);
