/* Stats — TDPlay by the numbers */
(function (TD) {
  "use strict";
  TD.register({
    id: "stats", name: "Stats", desc: "TDPlay by the numbers", icon: TD.icons.stats, width: 900, height: 680, keywords: "stats numbers charts",
    mount: function (win) {
      var C = TD.catalog, main = TD.h("div", { "class": "app-main" });
      var withSite = C.artists.filter(function (a) { return a.site; }).length;
      var tiles = [[C.items.length, "songs"], [C.months.length, "months"], [C.artists.length, "artists"], [withSite, "artist sites"], [C.featured.length, "featured"], [C.years[C.years.length - 1].year + "–" + String(C.years[0].year).slice(2), "years"]];
      main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h1", { html: "By the <em>numbers</em>" }), TD.h("span", { "class": "muted", text: "Index built " + (C.meta.generated || "").replace("T", " ").slice(0, 16) + " UTC" })]));
      main.appendChild(TD.h("div", { "class": "stat-tiles" }, tiles.map(function (t) { return TD.h("div", { "class": "stat" }, [TD.h("div", { "class": "v", text: String(t[0]) }), TD.h("div", { "class": "l", text: t[1] })]); })));
      function bars(title, rows, max, fmt, onclick) {
        main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: title })]));
        var box = TD.h("div", { style: "display:grid;grid-template-columns:minmax(120px,220px) 1fr 50px;gap:6px 12px;align-items:center;font-size:13.5px" });
        rows.forEach(function (r) {
          box.appendChild(TD.h("div", { style: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:" + (onclick ? "pointer" : "default"), text: r.label, title: r.label, onclick: onclick ? function () { onclick(r); } : null }));
          box.appendChild(TD.h("div", { "class": "bar" }, [TD.h("i", { style: "width:" + (r.v / max * 100) + "%" })]));
          box.appendChild(TD.h("div", { "class": "muted", style: "text-align:right;font-family:var(--mono);font-size:12px", text: fmt ? fmt(r.v) : String(r.v) }));
        });
        main.appendChild(box);
      }
      var top = C.artists.slice(0, 15).map(function (A) { return { label: A.name, v: A.count, A: A }; });
      bars("Most featured artists", top, top[0].v, null, function (r) { TD.open("artists", { artist: r.A.key }); });
      var years = C.years.slice().reverse().map(function (Y) { return { label: String(Y.year), v: Y.items.length, Y: Y }; });
      bars("Songs per year", years, Math.max.apply(null, years.map(function (y) { return y.v; })), null, function (r) { TD.open("library", { sel: "y:" + r.Y.year }); });
      var months = C.months.slice(0, 24).reverse().map(function (M) { return { label: M.key, v: M.count, M: M }; });
      bars("Last 24 months", months, Math.max.apply(null, months.map(function (m) { return m.v; })), null, function (r) { TD.open("home", { month: r.M.key }); });
      var byMonthName = {}; C.months.forEach(function (M) { byMonthName[M.name] = (byMonthName[M.name] || 0) + M.count; });
      var mn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(function (n) { return { label: n, v: byMonthName[n] || 0 }; });
      bars("Busiest calendar months (all years)", mn, Math.max.apply(null, mn.map(function (m) { return m.v; })));
      var links = [["YouTube", C.items.filter(function (i) { return i.yt; }).length], ["Spotify", C.items.filter(function (i) { return i.spotify; }).length], ["Apple Music", C.items.filter(function (i) { return i.apple; }).length], ["Artist site", C.items.filter(function (i) { return i.site; }).length]].map(function (l) { return { label: l[0], v: l[1] }; });
      bars("Songs with a link to…", links, C.items.length, function (v) { return Math.round(v / C.items.length * 100) + "%"; });
      var tld = {}; C.artists.forEach(function (A) { if (A.domain) { var t = A.domain.split(".").pop(); tld[t] = (tld[t] || 0) + 1; } });
      var tlds = Object.keys(tld).map(function (k) { return { label: "." + k, v: tld[k] }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 10);
      bars("Artist website domains", tlds, tlds[0].v);
      win.body.appendChild(main);
    }
  });
})(window.TD);
