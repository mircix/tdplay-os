/* Browser — artist websites inside TDPlay OS (with a graceful way out for sites that refuse frames) */
(function (TD) {
  "use strict";
  TD.register({
    id: "browser", name: "Browser", desc: "Artist websites, inside the OS", icon: TD.icons.browser, width: 1100, height: 740, single: false, keywords: "browser web artist site",
    mount: function (win, params) {
      var C = TD.catalog, hist = [], pos = -1, hintTimer = 0;
      var app = TD.h("div", { "class": "app" });
      var url = TD.h("input", { "class": "input", type: "url", placeholder: "Artist website, or type to search artists…", autocomplete: "off", spellcheck: "false", style: "flex:1;font-family:var(--mono);font-size:13px" });
      var bBack = TD.h("button", { "class": "btn icon sm", html: TD.icons.back, title: "Back", onclick: function () { if (pos > 0) { pos--; load(hist[pos], true); } } });
      var bFwd = TD.h("button", { "class": "btn icon sm", html: TD.icons.fwd, title: "Forward", onclick: function () { if (pos < hist.length - 1) { pos++; load(hist[pos], true); } } });
      var bReload = TD.h("button", { "class": "btn icon sm", html: TD.icons.reload, title: "Reload", onclick: function () { if (frame.src) frame.src = frame.src; } });
      var bHome = TD.h("button", { "class": "btn icon sm", html: TD.icons.artists, title: "Artists start page", onclick: function () { showStart(); } });
      var bExt = TD.h("button", { "class": "btn icon sm", html: TD.icons.ext, title: "Open in a new tab", onclick: function () { if (hist[pos]) window.open(hist[pos], "_blank"); } });
      var bar = TD.h("div", { "class": "app-toolbar", style: "flex-wrap:nowrap" }, [bBack, bFwd, bReload, bHome, url, bExt]);
      var view = TD.h("div", { style: "flex:1;min-height:0;position:relative;display:flex;flex-direction:column" });
      var frame = TD.h("iframe", { "class": "frame", allow: "autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write", referrerpolicy: "no-referrer-when-downgrade", hidden: true });
      var start = TD.h("div", { "class": "app-main" });
      var hint = TD.h("div", { "class": "hint-bar", hidden: true });
      view.appendChild(start); view.appendChild(frame); view.appendChild(hint);
      app.appendChild(bar); app.appendChild(view); win.body.appendChild(app);

      url.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        var v = url.value.trim(); if (!v) return;
        if (/^[a-z]+:\/\//i.test(v) || /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v)) load(/^[a-z]+:\/\//i.test(v) ? v : "https://" + v);
        else { var A = C.findArtist(v); if (A && A.site) load(A.site, false, A.name); else TD.notify("No artist site found", v); }
      });
      url.addEventListener("focus", function () { url.select(); });
      function load(u, noHist, title) {
        clearTimeout(hintTimer);
        if (C.frameable(u) === false) {
          // the site sends X-Frame-Options / CSP: it will never render in here, so don't pretend
          window.open(u, "_blank", "noopener");
          TD.notify(TD.domain(u) + " opened in a new tab", "This site doesn't allow being shown inside other apps.", { icon: TD.icons.browser, ms: 3500 });
          if (!hist.length) showStart();
          return;
        }
        u = C.siteUrl(u);
        if (!noHist) { hist = hist.slice(0, pos + 1); hist.push(u); pos = hist.length - 1; }
        url.value = u; start.hidden = true; frame.hidden = false; hint.hidden = true;
        frame.src = u;
        win.setTitle((title || TD.domain(u)) + " — Browser");
        bBack.disabled = pos <= 0; bFwd.disabled = pos >= hist.length - 1;
        // We can't tell from here whether a site blocks framing; offer the way out after a moment.
        if (C.frameable(u) === true) return;
        hintTimer = setTimeout(function () {
          TD.clear(hint);
          hint.appendChild(TD.h("span", { text: "Blank page? " + TD.domain(u) + " may not allow being shown inside other apps." }));
          hint.appendChild(TD.h("a", { "class": "btn sm", href: u, target: "_blank", rel: "noopener", html: TD.icons.ext + " Open in a new tab" }));
          hint.appendChild(TD.h("button", { "class": "btn sm x", text: "✕", onclick: function () { hint.hidden = true; } }));
          hint.hidden = false;
          setTimeout(function () { hint.hidden = true; }, 9000);
        }, 2500);
      }
      function showStart() {
        clearTimeout(hintTimer); frame.hidden = true; frame.src = "about:blank"; start.hidden = false; hint.hidden = true; url.value = ""; win.setTitle("Browser");
        TD.clear(start);
        start.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h1", { html: "Artist <em>Web</em>" }), TD.h("span", { "class": "muted", text: TD.plural(C.artists.filter(function (a) { return a.site; }).length, "artist website") + " · type an artist name above" })]));
        var sections = [
          { t: "Most featured", list: C.artists.filter(function (a) { return a.site && C.frameable(a.site) !== false; }).slice(0, 24) },
          { t: "Latest month", list: (function () { var seen = {}, out = []; C.latest().items.forEach(function (it) { if (it.artistKey && it.site && !seen[it.artistKey]) { seen[it.artistKey] = 1; out.push(C.artistByKey[it.artistKey]); } }); return out; })() },
          { t: "Random", list: TD.shuffle(C.artists.filter(function (a) { return a.site && C.frameable(a.site) !== false; })).slice(0, 18) }
        ];
        sections.forEach(function (s) {
          start.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: s.t })]));
          var g = TD.h("div", { "class": "agrid" });
          s.list.forEach(function (A) {
            g.appendChild(TD.h("div", { "class": "atile", title: A.domain, onclick: function () { load(A.site, false, A.name); } }, [
              TD.avatar(A), TD.h("div", { "class": "nm", text: A.name }), TD.h("div", { "class": "ct", text: A.domain })]));
          });
          start.appendChild(g);
        });
      }
      win.load = load;
      if (params && params.url) load(params.url, false, params.title); else showStart();
    },
    resume: function (win, params) { if (params && params.url) win.load(params.url, false, params.title); }
  });
})(window.TD);
