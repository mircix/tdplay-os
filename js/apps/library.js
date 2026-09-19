/* Library — search and browse every song ever featured */
(function (TD) {
  "use strict";
  TD.register({
    id: "library", name: "Library", desc: "Every song ever featured, searchable", icon: TD.icons.library, width: 1000, height: 680, keywords: "search songs library finder",
    mount: function (win, params) {
      var C = TD.catalog, state = { q: "", sel: "all", limit: 120 };
      var app = TD.h("div", { "class": "app" });
      var split = TD.h("div", { "class": "app-split" });
      var side = TD.h("div", { "class": "app-side" });
      var main = TD.h("div", { "class": "app-main" });
      var input = TD.h("input", { type: "search", placeholder: "Search artists, songs, initials, months…", autocomplete: "off", spellcheck: "false" });
      var searchBox = TD.h("div", { "class": "search" }, [TD.h("span", { html: TD.icons.search, style: "display:flex" }), input]);
      var bar = TD.h("div", { "class": "app-toolbar" }, [
        TD.isMobile() ? TD.h("button", { "class": "btn sm", text: "☰", onclick: function () { split.classList.toggle("show-side"); } }) : null,
        TD.h("div", { style: "flex:1;min-width:200px" }, [searchBox])
      ]);
      app.appendChild(bar); split.appendChild(side); split.appendChild(main); app.appendChild(split); win.body.appendChild(app);
      input.addEventListener("input", TD.debounce(function () { state.q = input.value; state.limit = 120; renderMain(); }, 80));
      input.addEventListener("keydown", function (e) { if (e.key === "Escape") { input.value = ""; state.q = ""; renderMain(); } });
      win.setQuery = function (q) { input.value = q; state.q = q; state.sel = "all"; renderSide(); renderMain(); };
      win.select = function (sel) { state.sel = sel; state.q = ""; input.value = ""; renderSide(); renderMain(); };

      function renderSide() {
        TD.clear(side);
        var item = function (key, label, n, icon) {
          var b = TD.h("button", { "class": "side-item" + (state.sel === key ? " active" : ""), onclick: function () { state.sel = key; state.q = ""; input.value = ""; state.limit = 120; renderSide(); renderMain(); split.classList.remove("show-side"); } },
            [icon ? TD.h("span", { "class": "dot", style: "background:" + icon }) : null, TD.h("span", { text: label }), n != null ? TD.h("span", { "class": "n", text: String(n) }) : null]);
          side.appendChild(b); return b;
        };
        side.appendChild(TD.h("div", { "class": "side-h", text: "Browse" }));
        item("all", "Everything", C.items.length, "var(--red)");
        item("featured", "Featured", C.featured.length, "var(--gold)");
        item("recent", "Latest month", C.latest().count, "var(--cyan)");
        item("nosite", "Hidden gems", null, "var(--pink)");
        side.appendChild(TD.h("div", { "class": "side-h", text: "Years" }));
        C.years.forEach(function (Y) {
          var open = state.sel === "y:" + Y.year || (typeof state.sel === "string" && state.sel.indexOf("m:") === 0 && C.monthByKey[state.sel.slice(2)] && C.monthByKey[state.sel.slice(2)].year === Y.year);
          item("y:" + Y.year, String(Y.year), Y.items.length);
          if (open) Y.months.forEach(function (M) {
            var b = item("m:" + M.key, M.name, M.count); b.style.paddingLeft = "26px";
          });
        });
        side.appendChild(TD.h("div", { "class": "side-h", text: "Artists" }));
        item("artists", "A – Z", C.artists.length);
        item("top", "Most featured", null);
      }
      function heading(t, sub, right) {
        main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { html: t }), sub ? TD.h("span", { "class": "muted", text: sub }) : null, right ? TD.h("div", { "class": "right" }, right) : null]));
      }
      function list(items, opts) {
        opts = opts || {};
        var shown = items.slice(0, state.limit);
        main.appendChild(opts.grid ? TD.ui.grid(shown, Object.assign({ list: items, showMonth: true }, opts)) : TD.ui.rows(shown, Object.assign({ list: items }, opts)));
        if (items.length > shown.length) main.appendChild(TD.h("button", { "class": "btn", style: "margin-top:12px;width:100%;justify-content:center", text: "Show more (" + (items.length - shown.length) + " left)", onclick: function () { state.limit += 200; renderMain(); } }));
      }
      function renderMain() {
        TD.clear(main); main.scrollTop = 0;
        if (state.q.trim()) {
          var r = C.search(state.q);
          win.setTitle("Library — “" + state.q + "”");
          if (r.months.length) {
            var f = TD.h("div", { "class": "folders", style: "margin-bottom:14px" });
            r.months.slice(0, 8).forEach(function (M) { f.appendChild(TD.h("div", { "class": "folder", onclick: function () { TD.open("home", { month: M.key }); } }, [TD.h("div", { "class": "fn", html: TD.highlight(M.title, r.toks) }), TD.h("div", { "class": "fc", text: TD.plural(M.count, "song") })])); });
            main.appendChild(f);
          }
          if (r.artists.length) {
            var ag = TD.h("div", { "class": "pill-row", style: "margin-bottom:14px" });
            r.artists.slice(0, 8).forEach(function (A) { ag.appendChild(TD.h("button", { "class": "chip", html: TD.highlight(A.name, r.toks) + ' <span class="dim">' + A.count + "</span>", onclick: function () { TD.open("artists", { artist: A.key }); } })); });
            main.appendChild(ag);
          }
          heading(r.total ? TD.plural(r.total, "result") : "No songs", r.total ? "" : "Try an artist, a song, initials, or a month like “Aug 26”", r.total ? TD.ui.playButtons(r.items, "Search: " + state.q) : null);
          list(r.items, { toks: r.toks });
          return;
        }
        var sel = state.sel;
        if (sel === "all") { win.setTitle("Library"); heading("Everything", TD.plural(C.items.length, "song") + " · newest first", TD.ui.playButtons(C.items, "Everything")); list(C.items); }
        else if (sel === "featured") { win.setTitle("Library — Featured"); heading("Featured", "The headline video of every page", TD.ui.playButtons(C.featured, "Featured")); list(C.featured, { grid: true }); }
        else if (sel === "recent") { var M0 = C.latest(); win.setTitle("Library — " + M0.title); heading(TD.esc(M0.title), TD.plural(M0.count, "song"), TD.ui.playButtons(M0.items, M0.title)); list(M0.items, { grid: true }); }
        else if (sel === "nosite") { var gems = C.items.filter(function (it) { return it.yt && it.artistKey && C.artistByKey[it.artistKey].count === 1; }); win.setTitle("Library — Hidden gems"); heading("Hidden gems", "Artists featured exactly once", TD.ui.playButtons(TD.shuffle(gems), "Hidden gems")); list(gems); }
        else if (sel.indexOf("y:") === 0) { var Y = C.years.filter(function (y) { return String(y.year) === sel.slice(2); })[0]; win.setTitle("Library — " + Y.year); heading("TDPlay <em>" + Y.year + "</em>", TD.plural(Y.items.length, "song") + " · " + TD.plural(Y.months.length, "month"), TD.ui.playButtons(Y.items, "TDPlay " + Y.year)); list(Y.items); }
        else if (sel.indexOf("m:") === 0) { var M = C.monthByKey[sel.slice(2)]; win.setTitle("Library — " + M.title); heading(TD.esc(M.title), TD.plural(M.count, "song"), TD.ui.playButtons(M.items, M.title).concat([TD.h("button", { "class": "btn", html: TD.icons.home + " Open in Home", onclick: function () { TD.open("home", { month: M.key }); } })])); list(M.items, { grid: true }); }
        else if (sel === "artists" || sel === "top") {
          win.setTitle("Library — Artists");
          var arts = sel === "top" ? C.artists.slice(0, 60) : C.artists.slice().sort(function (a, b) { return a.norm.localeCompare(b.norm); });
          heading(sel === "top" ? "Most featured" : "Artists A – Z", TD.plural(arts.length, "artist"));
          var g = TD.h("div", { "class": "agrid" });
          arts.slice(0, state.limit * 2).forEach(function (A) { g.appendChild(TD.artistTile(A)); });
          main.appendChild(g);
          if (arts.length > state.limit * 2) main.appendChild(TD.h("button", { "class": "btn", style: "margin-top:12px;width:100%;justify-content:center", text: "Show more", onclick: function () { state.limit += 200; renderMain(); } }));
        }
      }
      renderSide(); renderMain();
      TD.app("library").resume(win, params);
      setTimeout(function () { if (!TD.isMobile()) input.focus(); }, 50);
    },
    resume: function (win, params) {
      if (params && params.q != null) win.setQuery(params.q);
      else if (params && params.sel) win.select(params.sel);
    }
  });
  // Artist avatar: the website's favicon, falling back to their latest video still when the site has
  // no real icon (Google answers with a 16px globe) or the request fails.
  TD.avatar = function (A, size) {
    var thumb = A.latest ? TD.thumb(A.latest) : "";
    var av = TD.h("div", { "class": "av" + (A.site ? "" : " th"), style: !A.site && thumb ? "background-image:url(" + thumb + ")" : "" });
    if (A.site) {
      var img = TD.h("img", { src: TD.favicon(A.site, size || 64), alt: "", loading: "lazy" });
      var useThumb = function () { img.remove(); if (thumb) { av.classList.add("th"); av.style.backgroundImage = "url(" + thumb + ")"; } };
      img.addEventListener("error", useThumb);
      img.addEventListener("load", function () { if (img.naturalWidth < 32) useThumb(); });
      av.appendChild(img);
    }
    return av;
  };
  // artist tile shared by Library + Artists
  TD.artistTile = function (A) {
    var av = TD.avatar(A);
    var el = TD.h("div", { "class": "atile", title: A.domain || A.name, onclick: function () { TD.open("artists", { artist: A.key }); } }, [
      av, TD.h("div", { "class": "nm", text: A.name }), TD.h("div", { "class": "ct", text: TD.plural(A.count, "song") + (A.initials ? " · " + A.initials : "") })]);
    el.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      TD.menu(e.clientX, e.clientY, [{ head: A.name },
        { label: "Play all", icon: TD.icons.play, fn: function () { TD.player.play(A.items, 0, { label: A.name }); } },
        { label: "Open artist", icon: TD.icons.artists, fn: function () { TD.open("artists", { artist: A.key }); } },
        A.site ? { label: "Open website", icon: TD.icons.site, fn: function () { TD.open("browser", { url: A.site, title: A.name }); } } : null].filter(Boolean));
    });
    return el;
  };
})(window.TD);
