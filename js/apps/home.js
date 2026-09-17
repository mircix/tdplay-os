/* Home — the current TDPlay month, browsable like folders */
(function (TD) {
  "use strict";
  TD.register({
    id: "home", name: "Home", desc: "This month on TDPlay", icon: TD.icons.home, width: 1040, height: 700, keywords: "month home tdplay",
    mount: function (win, params) {
      var C = TD.catalog, state = { month: null, page: 1, view: "month" };
      var app = TD.h("div", { "class": "app" });
      var bar = TD.h("div", { "class": "app-toolbar" });
      var main = TD.h("div", { "class": "app-main" });
      app.appendChild(bar); app.appendChild(main); win.body.appendChild(app);
      win.state = state;

      function go(M, page) { state.view = "month"; state.month = M; state.page = page || 1; render(); }
      function idx() { return C.months.indexOf(state.month); }
      win.go = go;

      function render() {
        TD.clear(bar); TD.clear(main); main.scrollTop = 0;
        // toolbar: years as tabs
        var years = TD.h("div", { "class": "tabs" });
        years.appendChild(TD.h("button", { "class": "tab" + (state.view === "years" ? " on" : ""), text: "All years", onclick: function () { state.view = "years"; render(); } }));
        C.years.forEach(function (Y) {
          years.appendChild(TD.h("button", { "class": "tab" + (state.view === "year" && state.year === Y ? " on" : ""), text: String(Y.year), onclick: function () { state.view = "year"; state.year = Y; render(); } }));
        });
        years.appendChild(TD.h("button", { "class": "tab" + (state.view === "keepup" ? " on" : ""), text: "Keep Up With", onclick: function () { state.view = "keepup"; render(); } }));
        bar.appendChild(years);
        bar.appendChild(TD.h("div", { style: "margin-left:auto" }, [TD.h("button", { "class": "btn sm", html: TD.icons.ext + " tdplay.site", onclick: function () { window.open(state.month && state.view === "month" ? state.month.url : TD.SITE, "_blank"); } })]));
        if (state.view === "years") return renderYears();
        if (state.view === "year") return renderYear(state.year);
        if (state.view === "keepup") return renderKeepUp();
        renderMonth();
      }

      function renderYears() {
        win.setTitle("Home — All years");
        main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h1", { html: "TDPlay <em>Archive</em>" }), TD.h("span", { "class": "muted", text: TD.plural(C.items.length, "song") + " · " + TD.plural(C.months.length, "month") + " · since 2020" })]));
        var f = TD.h("div", { "class": "folders" });
        C.years.forEach(function (Y) {
          f.appendChild(TD.h("div", { "class": "folder", onclick: function () { state.view = "year"; state.year = Y; render(); } }, [
            TD.h("div", { "class": "fn", html: "TDPlay <em>" + Y.year + "</em>" }), TD.h("div", { "class": "fc", text: TD.plural(Y.months.length, "month") + " · " + TD.plural(Y.items.length, "song") })]));
        });
        main.appendChild(f);
        main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: "Year playlists" }), TD.h("span", { "class": "muted", text: "Every month of the year in one playlist" })]));
        var pl = TD.h("div", { "class": "folders" });
        C.yearPlaylists.forEach(function (Y) {
          pl.appendChild(TD.h("div", { "class": "folder" }, [
            TD.h("div", { "class": "fn", html: "TDPlay <em>" + Y.year + "</em>" }),
            TD.h("div", { "class": "pill-row", style: "margin-top:8px" }, [
              TD.h("button", { "class": "btn sm spotify", html: TD.icons.spotifyG, title: "Spotify", onclick: function () { TD.open("spotify", { link: Y.spotify, label: "TDPlay " + Y.year, autoplay: true }); } }),
              TD.h("button", { "class": "btn sm apple", html: TD.icons.appleG, title: "Apple Music", onclick: function () { TD.open("apple", { link: Y.apple, label: "TDPlay " + Y.year }); } })
            ])]));
        });
        main.appendChild(pl);
      }
      function renderYear(Y) {
        win.setTitle("Home — " + Y.year);
        main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h1", { html: "TDPlay <em>" + Y.year + "</em>" }), TD.h("span", { "class": "muted", text: TD.plural(Y.months.length, "month") + " · " + TD.plural(Y.items.length, "song") }),
          TD.h("div", { "class": "right" }, [TD.h("button", { "class": "btn sm", html: TD.icons.shuffleG + " Shuffle " + Y.year, onclick: function () { TD.player.radio({ label: "TDPlay " + Y.year + " Radio", desc: String(Y.year), filter: function (it) { return it.month.year === Y.year; } }); } })])]));
        var f = TD.h("div", { "class": "folders" });
        Y.months.forEach(function (M) {
          f.appendChild(TD.h("div", { "class": "folder", onclick: function () { go(M); } }, [
            TD.h("div", { "class": "fn", html: TD.esc(M.name) + " <em>'" + String(M.year).slice(2) + "</em>" }), TD.h("div", { "class": "fc", text: TD.plural(M.count, "song") + " · " + M.pages.length + " pg" })]));
        });
        main.appendChild(f);
        var feats = Y.items.filter(function (it) { return it.featured; });
        if (feats.length) {
          main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: "Featured in " + Y.year }), TD.h("span", { "class": "muted", text: "The headline video of every page" })]));
          main.appendChild(TD.ui.grid(feats, { showMonth: true, label: "Featured " + Y.year }));
        }
      }
      function renderKeepUp() {
        win.setTitle("Home — Keep Up With");
        main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h1", { html: "Keep <em>Up</em> With" }), TD.h("span", { "class": "muted", text: "Shows and channels TDPlay follows" })]));
        var g = TD.h("div", { "class": "agrid" });
        C.keepUp.forEach(function (k) {
          g.appendChild(TD.h("div", { "class": "atile", onclick: function () { window.open(k.url, "_blank"); } }, [
            TD.h("div", { "class": "av", html: '<img src="' + TD.favicon(k.url, 64) + '" alt="">' }), TD.h("div", { "class": "nm", text: k.name }), TD.h("div", { "class": "ct", text: k.handle })]));
        });
        main.appendChild(g);
      }
      function renderMonth() {
        var M = state.month, i = idx();
        win.setTitle("Home — " + M.title);
        var head = TD.h("div", { "class": "home-head" }, [
          TD.h("div", { "class": "nav" }, [
            TD.h("button", { html: "‹", title: "Newer month", disabled: i <= 0, onclick: function () { go(C.months[i - 1]); } }),
            TD.h("button", { html: "›", title: "Older month", disabled: i >= C.months.length - 1, onclick: function () { go(C.months[i + 1]); } })]),
          TD.h("h1", { html: "TDPlay <em>-" + TD.esc(M.key) + "</em>" }),
          i === 0 ? TD.h("span", { "class": "chip on", text: "Latest" }) : null,
          M.source === "wix" ? TD.h("span", { "class": "chip", text: "Archive", title: "From the 2020–2023 Wix site" }) : null
        ]);
        main.appendChild(head);
        var sub = TD.h("div", { "class": "home-sub" }, [TD.h("span", { text: TD.plural(M.count, "song") + " across " + TD.plural(M.pages.length, "page") })]);
        sub.appendChild(TD.h("span", { "class": "pill-row" }, TD.ui.playButtons(M.items, M.title, M.playlists.spotify).concat([
          M.playlists.apple ? TD.h("button", { "class": "btn apple", html: TD.icons.appleG + " Apple Music", onclick: function () { TD.open("apple", { link: M.playlists.apple, label: M.title + " playlist" }); } }) : null,
          M.playlists.youtube ? TD.h("a", { "class": "btn yt", href: M.playlists.youtube, target: "_blank", rel: "noopener", html: TD.icons.youtube + " YouTube playlist" }) : null
        ])));
        main.appendChild(sub);
        var tabs = TD.h("div", { "class": "tabs", style: "margin:4px 0 12px" });
        M.pages.forEach(function (pg) {
          tabs.appendChild(TD.h("button", { "class": "tab" + (pg.page === state.page ? " on" : ""), text: "PG." + pg.page, onclick: function () { state.page = pg.page; render(); } }));
        });
        tabs.appendChild(TD.h("button", { "class": "tab" + (state.page === "all" ? " on" : ""), text: "All", onclick: function () { state.page = "all"; render(); } }));
        main.appendChild(tabs);
        var items = state.page === "all" ? M.items : (M.pages.filter(function (p) { return p.page === state.page; })[0] || M.pages[0]).items;
        var feat = items.filter(function (it) { return it.featured; })[0];
        var g = TD.h("div", { "class": "grid" });
        if (feat) g.appendChild(TD.ui.card(feat, { hero: true, list: items, label: M.title }));
        items.forEach(function (it) { if (it !== feat) g.appendChild(TD.ui.card(it, { list: items, label: M.title })); });
        main.appendChild(g);
      }
      TD.app("home").resume(win, params);
    },
    resume: function (win, params) {
      var C = TD.catalog;
      if (params && params.month && C.monthByKey[params.month]) win.go(C.monthByKey[params.month], params.page || 1);
      else if (!win.state.month) win.go(C.latest());
    }
  });
})(window.TD);
