/* Artists — every artist ever featured, with their website, songs and links */
(function (TD) {
  "use strict";
  TD.register({
    id: "artists", name: "Artists", desc: "2,000+ artists and their websites", icon: TD.icons.artists, width: 1000, height: 700, keywords: "artists websites directory",
    mount: function (win, params) {
      var C = TD.catalog, state = { q: "", sort: "count", artist: null, limit: 120 };
      var app = TD.h("div", { "class": "app" }), main = TD.h("div", { "class": "app-main" });
      var input = TD.h("input", { type: "search", placeholder: "Filter artists…", autocomplete: "off" });
      var back = TD.h("button", { "class": "btn sm", html: TD.icons.back + " All artists", onclick: function () { state.artist = null; render(); } });
      var sortSel = TD.h("select", { "class": "input", style: "padding:6px 10px", onchange: function (e) { state.sort = e.target.value; render(); } }, [
        TD.h("option", { value: "count", text: "Most featured" }), TD.h("option", { value: "az", text: "A – Z" }), TD.h("option", { value: "recent", text: "Recently featured" }), TD.h("option", { value: "first", text: "First featured" })]);
      var bar = TD.h("div", { "class": "app-toolbar" }, [back, TD.h("div", { "class": "search", style: "flex:1;min-width:160px" }, [TD.h("span", { html: TD.icons.search, style: "display:flex" }), input]), sortSel]);
      app.appendChild(bar); app.appendChild(main); win.body.appendChild(app);
      input.addEventListener("input", TD.debounce(function () { state.q = input.value; state.artist = null; state.limit = 120; render(); }, 80));
      win.show = function (key) { state.artist = C.artistByKey[key] || null; render(); };

      function render() {
        TD.clear(main); main.scrollTop = 0; back.hidden = !state.artist;
        if (state.artist) return renderArtist(state.artist);
        win.setTitle("Artists");
        var qn = TD.norm(state.q);
        var list = C.artists.filter(function (A) { return !qn || A.norm.indexOf(qn) !== -1 || TD.norm(A.initials) === qn || (A.domain && A.domain.indexOf(qn) !== -1); });
        if (state.sort === "az") list = list.slice().sort(function (a, b) { return a.norm.localeCompare(b.norm); });
        else if (state.sort === "recent") list = list.slice().sort(function (a, b) { return b.last.sort - a.last.sort || b.count - a.count; });
        else if (state.sort === "first") list = list.slice().sort(function (a, b) { return a.first.sort - b.first.sort || b.count - a.count; });
        main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h1", { html: "<em>Artists</em>" }), TD.h("span", { "class": "muted", text: TD.plural(list.length, "artist") + " · " + TD.plural(C.artists.filter(function (a) { return a.site; }).length, "website") }),
          TD.h("div", { "class": "right" }, [TD.h("button", { "class": "btn sm", html: TD.icons.shuffleG + " Random artist", onclick: function () { state.artist = TD.pick(C.artists); render(); } })])]));
        var g = TD.h("div", { "class": "agrid" });
        list.slice(0, state.limit).forEach(function (A) { g.appendChild(TD.artistTile(A)); });
        main.appendChild(g);
        if (list.length > state.limit) main.appendChild(TD.h("button", { "class": "btn", style: "margin-top:12px;width:100%;justify-content:center", text: "Show more (" + (list.length - state.limit) + " left)", onclick: function () { state.limit += 200; render(); } }));
      }
      function renderArtist(A) {
        win.setTitle("Artists — " + A.name);
        var av = TD.avatar(A, 128); av.className += " atile"; av.style.cssText += "width:84px;height:84px;padding:0;border-radius:50%;cursor:default";
        var avImg = av.querySelector("img"); if (avImg) { avImg.style.width = "48px"; avImg.style.height = "48px"; }
        var head = TD.h("div", { style: "display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:14px" }, [
          av,
          TD.h("div", { style: "flex:1;min-width:200px" }, [
            TD.h("h1", { text: A.name, style: "font-size:32px" }),
            TD.h("div", { "class": "muted", style: "margin-top:2px" }, [
              A.initials ? TD.h("span", { "class": "ini", text: A.initials + "  " }) : null,
              TD.h("span", { text: TD.plural(A.count, "song") + " · first " + A.first.key + (A.last !== A.first ? " · latest " + A.last.key : "") }),
              A.domain ? TD.h("span", { text: " · " + A.domain }) : null]),
            TD.h("div", { "class": "pill-row", style: "margin-top:10px" }, TD.ui.playButtons(A.items, A.name).concat([
              A.site ? TD.h("button", { "class": "btn", html: TD.icons.site + (C.frameable(A.site) === false ? " Website ↗" : " Website"), title: C.frameable(A.site) === false ? "Opens in a new tab — this site doesn't allow embedding" : "Open inside TDPlay OS", onclick: function () { TD.open("browser", { url: A.site, title: A.name }); } }) : null,
              A.items.filter(function (i) { return i.apple; })[0] ? TD.h("button", { "class": "btn apple", html: TD.icons.appleG, title: "Apple Music", onclick: function () { var it = A.items.filter(function (i) { return i.apple; })[0]; TD.open("apple", { link: it.apple, item: it, label: A.name }); } }) : null,
              A.site ? TD.h("a", { "class": "btn sm", href: A.site, target: "_blank", rel: "noopener", html: TD.icons.ext + " Open site" }) : null
            ]))
          ])]);
        main.appendChild(head);
        // months timeline chips
        var months = {}; A.items.forEach(function (it) { months[it.month.key] = it.month; });
        var chips = TD.h("div", { "class": "pill-row", style: "margin-bottom:14px" });
        Object.keys(months).map(function (k) { return months[k]; }).sort(function (a, b) { return b.sort - a.sort; }).forEach(function (M) { chips.appendChild(TD.h("button", { "class": "chip", text: M.key, onclick: function () { TD.open("home", { month: M.key }); } })); });
        main.appendChild(chips);
        main.appendChild(TD.ui.grid(A.items, { showMonth: true, label: A.name }));
      }
      render();
      TD.app("artists").resume(win, params);
    },
    resume: function (win, params) { if (params && params.artist) win.show(params.artist); }
  });
})(window.TD);
