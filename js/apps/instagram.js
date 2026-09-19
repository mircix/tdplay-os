/* Instagram — TDPlay's Instagram plus every featured artist who links to theirs; post/reel viewer */
(function (TD) {
  "use strict";
  var TDPLAY_IG = "https://www.instagram.com/mitch_tdp/";
  function handle(url) { try { return (new URL(url).pathname.split("/").filter(Boolean)[0] || "").toLowerCase(); } catch (e) { return ""; } }
  function embedUrl(url) {
    var m = /instagram\.com\/(?:[^\/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(url || "");
    return m ? "https://www.instagram.com/" + (m[1] === "reels" ? "reel" : m[1]) + "/" + m[2] + "/embed/captioned/" : "";
  }
  // A profile in its own portrait, phone-shaped window (Instagram's profile embed is made for framing)
  TD.register({
    id: "igprofile", name: "Instagram", desc: "", icon: TD.icons.instagram, hidden: true, single: false, width: 420, height: 560, minWidth: 340, minHeight: 480,
    mount: function (win, params) {
      var h = (params && params.handle) || "mitch_tdp", name = (params && params.name) || "@" + h;
      win.setTitle("@" + h + " — Instagram");
      // Instagram's embed is white-only (no dark theme exists), so keep it to its real content height and let the OS dark fill the rest
      var body = TD.h("div", { "class": "app", style: "background:#0b0b12" });
      var fr = TD.h("iframe", { "class": "frame", src: "https://www.instagram.com/" + encodeURIComponent(h) + "/embed/", allow: "autoplay; encrypted-media; picture-in-picture", style: "background:#fff;flex:none;height:470px", title: name + " on Instagram" });
      body.appendChild(TD.h("div", { style: "flex:1;min-height:0;overflow:auto;background:#0b0b12" }, [fr]));
      var fit = function () { var w = fr.clientWidth || 420; fr.style.height = Math.round(118 + 2 * (w - 6) / 3 + 10) + "px"; };   // header + 2 rows of 3 square posts
      win.on("resize", fit); setTimeout(fit, 0);
      body.appendChild(TD.h("div", { style: "flex:none;display:flex;gap:8px;align-items:center;padding:8px 10px;background:rgba(16,16,24,.98);border-top:1px solid rgba(255,255,255,.1)" }, [
        TD.h("span", { html: TD.icons.instagram.replace("<svg", '<svg style="width:22px;height:22px"') }),
        TD.h("div", { style: "flex:1;min-width:0;font-size:13px" }, [TD.h("b", { text: name }), TD.h("div", { "class": "muted", style: "font-size:12px", text: "@" + h })]),
        TD.h("button", { "class": "btn sm", title: "The real Instagram, in a phone-sized window", html: TD.icons.ext + " Open", onclick: function () { TD.phoneWindow("https://www.instagram.com/" + h + "/", "ig-" + h); } })
      ]));
      win.body.appendChild(body);
    }
  });
  TD.openProfile = function (h, name) { TD.open("igprofile", { handle: h, name: name }); };

  TD.register({
    id: "instagram", name: "Instagram", desc: "TDPlay and 180+ artists on Instagram", icon: TD.icons.instagram, width: 980, height: 700, keywords: "instagram insta ig reels posts social",
    mount: function (win, params) {
      var C = TD.catalog, state = { q: "", post: "" };
      var app = TD.h("div", { "class": "app" }), main = TD.h("div", { "class": "app-main" });
      var input = TD.h("input", { type: "search", placeholder: "Search artists, or paste a post / reel link…", autocomplete: "off", spellcheck: "false" });
      var bar = TD.h("div", { "class": "app-toolbar" }, [
        TD.h("div", { "class": "search", style: "flex:1;min-width:200px" }, [TD.h("span", { html: TD.icons.search, style: "display:flex" }), input]),
        TD.h("button", { "class": "btn", title: "The real Instagram, in a phone-sized window", html: TD.icons.instagram.replace("<svg", '<svg style="width:18px;height:18px"') + " @mitch_tdp", onclick: function () { TD.phoneWindow(TDPLAY_IG, "ig-mitch_tdp"); } })
      ]);
      app.appendChild(bar); app.appendChild(main); win.body.appendChild(app);
      var artists = C.artists.filter(function (A) { return A.domain === "instagram.com" && handle(A.site); });
      input.addEventListener("input", TD.debounce(function () {
        var v = input.value.trim();
        if (embedUrl(v)) { state.post = v; state.q = ""; } else { state.post = ""; state.q = v; }
        render();
      }, 80));
      input.addEventListener("keydown", function (e) { if (e.key === "Escape") { input.value = ""; state.q = ""; state.post = ""; render(); } });

      function tile(A) {
        var h = handle(A.site);
        var t = TD.h("div", { "class": "atile", title: "@" + h, onclick: function () { TD.openProfile(h, A.name); } }, [
          TD.h("div", { "class": "av th", style: A.latest && TD.thumb(A.latest) ? "background-image:url(" + TD.thumb(A.latest) + ")" : "" }),
          TD.h("div", { "class": "nm", text: A.name }),
          TD.h("div", { "class": "ct", text: "@" + h })
        ]);
        t.addEventListener("contextmenu", function (e) {
          e.preventDefault();
          TD.menu(e.clientX, e.clientY, [{ head: A.name },
            { label: "Open profile here", icon: TD.icons.instagram, fn: function () { TD.openProfile(h, A.name); } },
            { label: "Open real Instagram (phone window)", icon: TD.icons.ext, fn: function () { TD.phoneWindow("https://www.instagram.com/" + h + "/", "ig-" + h); } },
            { label: "Play their songs", icon: TD.icons.play, fn: function () { TD.player.play(A.items, 0, { label: A.name }); } },
            { label: "Artist card", icon: TD.icons.artists, fn: function () { TD.open("artists", { artist: A.key }); } }]);
        });
        return t;
      }
      function render() {
        TD.clear(main); main.scrollTop = 0;
        if (state.post) {
          win.setTitle("Instagram — post");
          main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: "Post" }), TD.h("div", { "class": "right" }, [
            TD.h("button", { "class": "btn sm", html: TD.icons.ext + " Open on Instagram", onclick: function () { TD.phoneWindow(state.post, "ig-post"); } }),
            TD.h("button", { "class": "btn sm", text: "✕", onclick: function () { input.value = ""; state.post = ""; render(); } })])]));
          main.appendChild(TD.h("div", { "class": "embed-wrap", style: "max-width:540px;margin:0 auto" }, [TD.h("iframe", { src: embedUrl(state.post), height: "760", allow: "autoplay; encrypted-media", style: "border-radius:12px;background:#fff" })]));
          return;
        }
        win.setTitle("Instagram");
        var qn = TD.norm(state.q);
        var list = qn ? artists.filter(function (A) { return A.norm.indexOf(qn) !== -1 || handle(A.site).indexOf(qn.replace(/\s+/g, "")) !== -1 || TD.norm(A.initials) === qn; }) : artists;
        if (!qn) {
          // TDPlay's own account up top
          main.appendChild(TD.h("div", { "class": "sp-now", style: "margin-bottom:16px;cursor:pointer", onclick: function () { TD.openProfile("mitch_tdp", "TDPlay"); } }, [
            TD.h("div", { "class": "art", style: "background-image:url(assets/logo.png);border-radius:50%" }),
            TD.h("div", { "class": "t" }, [TD.h("b", { text: "TDPlay" }), TD.h("span", { text: "@mitch_tdp · the monthly picks, on Instagram" }),
              TD.h("div", { "class": "sp-ctl" }, [TD.h("button", { "class": "btn", html: TD.icons.instagram.replace("<svg", '<svg style="width:18px;height:18px"') + " Follow @mitch_tdp", onclick: function (e) { e.stopPropagation(); TD.phoneWindow(TDPLAY_IG, "ig-mitch_tdp"); } })])])
          ]));
        }
        main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h2", { text: qn ? "Artists matching “" + state.q + "”" : "Artists on Instagram" }), TD.h("span", { "class": "muted", text: TD.plural(list.length, "artist") + (qn ? "" : " · click to open a profile here · paste a post link above to view it") })]));
        if (!list.length) { main.appendChild(TD.h("div", { "class": "empty", html: "No artist Instagram matches <b>" + TD.esc(state.q) + "</b>." })); return; }
        var g = TD.h("div", { "class": "agrid" });
        list.forEach(function (A) { g.appendChild(tile(A)); });
        main.appendChild(g);
      }
      render();
      if (params && params.post) { input.value = params.post; state.post = params.post; render(); }
      setTimeout(function () { if (!TD.isMobile()) input.focus(); }, 50);
    }
  });
})(window.TD);
