/* Instagram — TDPlay's account and featured artists, rendered in the OS's own dark design from Meta's API
 * (via the owner's worker). Personal accounts fall back to Instagram's embed in a phone-shaped window. */
(function (TD) {
  "use strict";
  var TDPLAY_IG = "https://www.instagram.com/mitch_tdp/", OWNER = "mitch_tdp";
  function handle(url) { try { return (new URL(url).pathname.split("/").filter(Boolean)[0] || "").toLowerCase(); } catch (e) { return ""; } }
  function embedUrl(url) {
    var m = /instagram\.com\/(?:[^\/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(url || "");
    return m ? "https://www.instagram.com/" + (m[1] === "reels" ? "reel" : m[1]) + "/" + m[2] + "/embed/captioned/" : "";
  }
  var IGLOGO = function (sz) { return TD.icons.instagram.replace("<svg", '<svg style="width:' + sz + 'px;height:' + sz + 'px;vertical-align:-4px"'); };
  var GLYPH = {
    heart: TD.svg('<path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.2 5 6.7 5c2 0 3.4 1.1 4.3 2.4h2c.9-1.3 2.3-2.4 4.3-2.4 3.5 0 5.5 3.6 4.2 6.8C19.5 16.4 12 21 12 21z"/>'),
    comment: TD.svg('<path d="M4 4h16v12H8l-4 4z"/>'),
    video: TD.svg('<path d="M8 5v14l11-7z"/>'),
    album: TD.svg('<path d="M7 7h12v12H7zM5 5h10v2H7v8H5z"/>'),
    back: TD.icons.back
  };

  // Instagram's profile embed in a portrait window — the fallback for personal accounts
  TD.register({
    id: "igprofile", name: "Instagram", desc: "", icon: TD.icons.instagram, hidden: true, single: false, width: 420, height: 560, minWidth: 340, minHeight: 480,
    mount: function (win, params) {
      var h = (params && params.handle) || OWNER, name = (params && params.name) || "@" + h;
      win.setTitle("@" + h + " — Instagram");
      var body = TD.h("div", { "class": "app", style: "background:#0b0b12" });
      var fr = TD.h("iframe", { "class": "frame", src: "https://www.instagram.com/" + encodeURIComponent(h) + "/embed/", allow: "autoplay; encrypted-media; picture-in-picture", style: "background:#fff;flex:none;height:470px", title: name + " on Instagram" });
      body.appendChild(TD.h("div", { style: "flex:1;min-height:0;overflow:auto;background:#0b0b12" }, [fr]));
      var fit = function () { var w = fr.clientWidth || 420; fr.style.height = Math.round(118 + 2 * (w - 6) / 3 + 10) + "px"; };
      win.on("resize", fit); setTimeout(fit, 0);
      body.appendChild(TD.h("div", { style: "flex:none;display:flex;gap:8px;align-items:center;padding:8px 10px;background:rgba(16,16,24,.98);border-top:1px solid rgba(255,255,255,.1)" }, [
        TD.h("span", { html: IGLOGO(22) }),
        TD.h("div", { style: "flex:1;min-width:0;font-size:13px" }, [TD.h("b", { text: name }), TD.h("div", { "class": "muted", style: "font-size:12px", text: "@" + h + " · personal account — Instagram's own view" })]),
        TD.h("button", { "class": "btn sm", title: "The real Instagram, in a phone-sized window", html: TD.icons.ext + " Open", onclick: function () { TD.phoneWindow("https://www.instagram.com/" + h + "/", "ig-" + h); } })
      ]));
      win.body.appendChild(body);
    }
  });
  TD.openProfile = function (h, name) { TD.open("igprofile", { handle: h, name: name }); };

  TD.register({
    id: "instagram", name: "Instagram", desc: "TDPlay and 180+ artists on Instagram", icon: TD.icons.instagram, width: 1000, height: 720, keywords: "instagram insta ig reels posts social",
    mount: function (win, params) {
      var C = TD.catalog, IG = TD.ig;
      var state = { tab: "tdplay", q: "", post: "", profile: null };            // profile: {user, name, artist}
      var app = TD.h("div", { "class": "app" }), main = TD.h("div", { "class": "app-main", style: "padding:0" });
      var input = TD.h("input", { type: "search", placeholder: "Search artists, or paste a post / reel link…", autocomplete: "off", spellcheck: "false" });
      var tTd = TD.h("button", { "class": "tab on", html: IGLOGO(15) + " TDPlay", onclick: function () { go("tdplay"); } });
      var tAr = TD.h("button", { "class": "tab", text: "Artists", onclick: function () { go("artists"); } });
      var bar = TD.h("div", { "class": "app-toolbar" }, [
        TD.h("div", { "class": "tabs" }, [tTd, tAr]),
        TD.h("div", { "class": "search", style: "flex:1;min-width:180px" }, [TD.h("span", { html: TD.icons.search, style: "display:flex" }), input])
      ]);
      app.appendChild(bar); app.appendChild(main); win.body.appendChild(app);
      var artists = C.artists.filter(function (A) { return A.domain === "instagram.com" && handle(A.site); });
      var byHandle = {}; artists.forEach(function (A) { byHandle[handle(A.site)] = A; });

      input.addEventListener("input", TD.debounce(function () {
        var v = input.value.trim();
        if (embedUrl(v)) { state.post = v; state.q = ""; renderPost(); return; }
        state.post = ""; state.q = v; if (v) { state.tab = "artists"; state.profile = null; } render();
      }, 80));
      input.addEventListener("keydown", function (e) { if (e.key === "Escape") { input.value = ""; state.q = ""; state.post = ""; render(); } });
      function go(tab) { state.tab = tab; state.profile = null; state.post = ""; render(); }
      function setTabs() { tTd.classList.toggle("on", state.tab === "tdplay"); tAr.classList.toggle("on", state.tab === "artists"); }

      // ---------------------------------------------------------- pieces
      function header(P, opts) {
        opts = opts || {};
        var h = P.username, A = opts.artist;
        var head = TD.h("div", { "class": "ig-head" }, [
          TD.h("div", { "class": "ig-avatar", style: P.profile_picture_url ? "background-image:url(" + P.profile_picture_url + ")" : (A && A.latest ? "background-image:url(" + TD.thumb(A.latest) + ")" : "") }),
          TD.h("div", { "class": "ig-who" }, [
            TD.h("div", { "class": "ig-name" }, [TD.h("b", { text: P.name || h }), TD.h("span", { "class": "muted", text: "@" + h })]),
            TD.h("div", { "class": "ig-counts" }, [
              TD.h("span", { html: "<b>" + IG.fmtCount(P.media_count) + "</b> posts" }),
              TD.h("span", { html: "<b>" + IG.fmtCount(P.followers_count) + "</b> followers" }),
              P.follows_count != null ? TD.h("span", { html: "<b>" + IG.fmtCount(P.follows_count) + "</b> following" }) : null]),
            P.biography ? TD.h("div", { "class": "ig-bio", text: P.biography }) : null,
            P.website ? TD.h("a", { "class": "ig-site", href: P.website, target: "_blank", rel: "noopener", text: TD.domain(P.website) || P.website }) : null,
            TD.h("div", { "class": "pill-row", style: "margin-top:10px" }, [
              TD.h("button", { "class": "btn sm", html: TD.icons.ext + " Open on Instagram", onclick: function () { TD.phoneWindow("https://www.instagram.com/" + h + "/", "ig-" + h); } }),
              A ? TD.h("button", { "class": "btn sm primary", html: TD.icons.play + " Play their songs", onclick: function () { TD.player.play(A.items, 0, { label: A.name }); } }) : null,
              A ? TD.h("button", { "class": "btn sm", html: TD.icons.artists.replace("<svg", '<svg style="width:16px;height:16px"') + " Artist card", onclick: function () { TD.open("artists", { artist: A.key }); } }) : null
            ])
          ])
        ]);
        return head;
      }
      function cell(m, onPick) {
        var th = m.media_type === "VIDEO" ? (m.thumbnail_url || m.media_url) : m.media_url;
        return TD.h("div", { "class": "ig-cell", style: th ? "background-image:url(" + th + ")" : "", onclick: function () { onPick(m); } }, [
          m.media_type === "VIDEO" ? TD.h("span", { "class": "ig-badge", html: GLYPH.video }) : m.media_type === "CAROUSEL_ALBUM" ? TD.h("span", { "class": "ig-badge", html: GLYPH.album }) : null,
          TD.h("div", { "class": "ig-hover" }, [
            m.like_count != null ? TD.h("span", { html: GLYPH.heart + " " + IG.fmtCount(m.like_count) }) : null,
            m.comments_count != null ? TD.h("span", { html: GLYPH.comment + " " + IG.fmtCount(m.comments_count) }) : null])
        ]);
      }
      function grid(items, onPick) {
        var g = TD.h("div", { "class": "ig-grid" });
        items.forEach(function (m) { g.appendChild(cell(m, onPick)); });
        return g;
      }
      function profileView(P, opts) {
        // P: {username, name, ..., media:{data, paging}} (owner or discovered)
        var box = TD.h("div", { style: "padding:16px 18px 24px" });
        if (opts.back) box.appendChild(TD.h("button", { "class": "btn sm", style: "margin-bottom:12px", html: GLYPH.back + " " + opts.back, onclick: function () { state.profile = null; render(); } }));
        box.appendChild(header(P, opts));
        var items = (P.media && P.media.data) || (P.data) || [];
        var g = grid(items, function (m) { openPost(m, P); });
        box.appendChild(g);
        var paging = (P.media && P.media.paging) || P.paging;
        var hasMore = function (pg) { return !!(pg && pg.cursors && pg.cursors.after && (pg.next || items.length >= 24)); };
        if (hasMore(paging)) {
          var more = TD.h("button", { "class": "btn", style: "margin-top:14px;width:100%;justify-content:center", text: "Load more", onclick: function () {
            more.disabled = true; more.textContent = "Loading…";
            (opts.owner ? IG.media(paging.cursors.after) : IG.discover(P.username, paging.cursors.after)).then(function (r) {
              var chunk = opts.owner ? r : r.media, arr = (chunk && chunk.data) || [];
              arr.forEach(function (m) { g.appendChild(cell(m, function (mm) { openPost(mm, P); })); });
              paging = chunk && chunk.paging; more.disabled = false; more.textContent = "Load more";
              if (!arr.length || !hasMore(paging)) more.remove();
            }).catch(function (e) { more.disabled = false; more.textContent = "Couldn't load more — " + e.message; });
          } });
          box.appendChild(more);
        }
        return box;
      }
      function openPost(m, P) {
        var ov = TD.h("div", { "class": "ig-post-ov" });
        var kids = m.media_type === "CAROUSEL_ALBUM" && m.children && m.children.data && m.children.data.length ? m.children.data : [m];
        var idx = 0;
        var mediaBox = TD.h("div", { "class": "ig-media" });
        function showMedia() {
          TD.clear(mediaBox);
          var k = kids[idx];
          if (k.media_type === "VIDEO") mediaBox.appendChild(TD.h("video", { src: k.media_url, poster: k.thumbnail_url || "", controls: true, playsinline: true, autoplay: true, muted: false }));
          else mediaBox.appendChild(TD.h("img", { src: k.media_url, alt: "" }));
          if (kids.length > 1) {
            mediaBox.appendChild(TD.h("button", { "class": "ig-nav prev", html: TD.icons.back, onclick: function () { idx = (idx - 1 + kids.length) % kids.length; showMedia(); } }));
            mediaBox.appendChild(TD.h("button", { "class": "ig-nav next", html: TD.icons.fwd, onclick: function () { idx = (idx + 1) % kids.length; showMedia(); } }));
            mediaBox.appendChild(TD.h("div", { "class": "ig-dots" }, kids.map(function (_, i) { return TD.h("i", { "class": i === idx ? "on" : "" }); })));
          }
        }
        showMedia();
        var side = TD.h("div", { "class": "ig-side" }, [
          TD.h("div", { "class": "ig-side-head" }, [
            TD.h("div", { "class": "ig-avatar sm", style: P.profile_picture_url ? "background-image:url(" + P.profile_picture_url + ")" : "" }),
            TD.h("b", { text: "@" + P.username }),
            TD.h("button", { "class": "btn sm", style: "margin-left:auto", text: "✕", onclick: function () { ov.remove(); } })]),
          m.caption ? TD.h("div", { "class": "ig-caption", text: m.caption }) : null,
          TD.h("div", { "class": "ig-meta" }, [
            m.like_count != null ? TD.h("span", { html: GLYPH.heart + " " + IG.fmtCount(m.like_count) + " likes" }) : null,
            m.comments_count != null ? TD.h("span", { html: GLYPH.comment + " " + IG.fmtCount(m.comments_count) }) : null,
            TD.h("span", { "class": "muted", text: IG.fmtDate(m.timestamp) })]),
          TD.h("div", { "class": "ig-comments" }),
          TD.h("div", { "class": "pill-row", style: "margin-top:auto;padding-top:10px" }, [TD.h("button", { "class": "btn sm", html: TD.icons.ext + " Open on Instagram", onclick: function () { TD.phoneWindow(m.permalink, "ig-post"); } })])
        ]);
        ov.appendChild(TD.h("div", { "class": "ig-post" }, [mediaBox, side]));
        ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
        main.appendChild(ov);
        if (P.username === OWNER && m.comments_count) {
          var cbox = side.querySelector(".ig-comments"); cbox.appendChild(TD.h("div", { "class": "dim", text: "Loading comments…" }));
          IG.comments(m.id).then(function (r) {
            TD.clear(cbox);
            (r.data || []).forEach(function (c) { cbox.appendChild(TD.h("div", { "class": "ig-c" }, [TD.h("b", { text: c.username || "" }), " ", TD.h("span", { text: c.text || "" })])); });
          }).catch(function () { TD.clear(cbox); });
        }
      }

      // ---------------------------------------------------------- views
      function render() {
        setTabs(); TD.clear(main); main.scrollTop = 0;
        if (state.post) return renderPost();
        if (state.profile) return renderProfile(state.profile);
        if (state.tab === "tdplay") return renderOwner();
        renderArtists();
      }
      function loading(msg) { return TD.h("div", { "class": "empty", text: msg || "Loading…" }); }
      function renderOwner() {
        win.setTitle("Instagram — @" + OWNER);
        if (!IG.configured()) {
          main.appendChild(TD.h("div", { "class": "empty" }, [
            TD.h("div", { style: "margin-bottom:12px", html: IGLOGO(64) }),
            TD.h("div", { html: "<b>Instagram isn't connected on this TDPlay OS yet.</b>" }),
            TD.h("div", { "class": "dim", style: "margin:8px 0 14px", text: "Until then, artists open in Instagram's own view." }),
            TD.h("button", { "class": "btn", html: IGLOGO(18) + " Open @mitch_tdp", onclick: function () { TD.openProfile(OWNER, "TDPlay"); } })]));
          return;
        }
        var l = loading(); main.appendChild(l);
        Promise.all([IG.me(), IG.media()]).then(function (r) {
          if (state.tab !== "tdplay" || state.profile || state.post) return;
          l.remove(); var P = r[0]; P.media = r[1];
          main.appendChild(profileView(P, { owner: true }));
        }).catch(function (e) {
          l.remove();
          main.appendChild(TD.h("div", { "class": "empty" }, [TD.h("b", { text: "Couldn't load @" + OWNER }), TD.h("div", { "class": "dim", style: "margin:8px 0 14px", text: e.message }),
            TD.h("button", { "class": "btn", html: IGLOGO(18) + " Open @mitch_tdp", onclick: function () { TD.openProfile(OWNER, "TDPlay"); } })]));
        });
      }
      function renderArtists() {
        win.setTitle("Instagram — Artists");
        var qn = TD.norm(state.q);
        var list = qn ? artists.filter(function (A) { return A.norm.indexOf(qn) !== -1 || handle(A.site).indexOf(qn.replace(/\s+/g, "")) !== -1 || TD.norm(A.initials) === qn; }) : artists;
        var box = TD.h("div", { style: "padding:16px 18px 24px" });
        box.appendChild(TD.h("div", { "class": "sec-h", style: "margin-top:0" }, [TD.h("h2", { text: qn ? "Artists matching “" + state.q + "”" : "Artists on Instagram" }), TD.h("span", { "class": "muted", text: TD.plural(list.length, "artist") + (qn ? "" : " · click to open a profile · paste a post link above to view it") })]));
        if (!list.length) box.appendChild(TD.h("div", { "class": "empty", html: "No artist Instagram matches <b>" + TD.esc(state.q) + "</b>." }));
        var g = TD.h("div", { "class": "agrid" });
        list.forEach(function (A) {
          var h = handle(A.site);
          var t = TD.h("div", { "class": "atile", title: "@" + h, onclick: function () { openArtist(A); } }, [
            TD.h("div", { "class": "av th", style: A.latest && TD.thumb(A.latest) ? "background-image:url(" + TD.thumb(A.latest) + ")" : "" }),
            TD.h("div", { "class": "nm", text: A.name }), TD.h("div", { "class": "ct", text: "@" + h })]);
          t.addEventListener("contextmenu", function (e) {
            e.preventDefault();
            TD.menu(e.clientX, e.clientY, [{ head: A.name },
              { label: "Open profile here", icon: TD.icons.instagram, fn: function () { openArtist(A); } },
              { label: "Instagram's own view", icon: TD.icons.instagram, fn: function () { TD.openProfile(h, A.name); } },
              { label: "Real Instagram (phone window)", icon: TD.icons.ext, fn: function () { TD.phoneWindow("https://www.instagram.com/" + h + "/", "ig-" + h); } },
              { label: "Play their songs", icon: TD.icons.play, fn: function () { TD.player.play(A.items, 0, { label: A.name }); } },
              { label: "Artist card", icon: TD.icons.artists, fn: function () { TD.open("artists", { artist: A.key }); } }]);
          });
          g.appendChild(t);
        });
        box.appendChild(g); main.appendChild(box);
      }
      function openArtist(A) {
        var h = handle(A.site);
        if (!IG.configured()) return TD.openProfile(h, A.name);
        state.profile = { user: h, artist: A }; state.tab = "artists"; render();
      }
      function renderProfile(pr) {
        win.setTitle("Instagram — @" + pr.user);
        var l = loading("Loading @" + pr.user + "…"); main.appendChild(l);
        IG.discover(pr.user).then(function (P) {
          if (state.profile !== pr) return;
          l.remove(); main.appendChild(profileView(P, { back: "Artists", artist: pr.artist }));
        }).catch(function (e) {
          if (state.profile !== pr) return;
          l.remove();
          if (e.unavailable) {
            // a personal account: Instagram only exposes those through its own embed
            state.profile = null; render();
            TD.openProfile(pr.user, pr.artist ? pr.artist.name : "@" + pr.user);
            TD.notify("@" + pr.user + " is a personal account", "Showing Instagram's own view instead.", { icon: TD.icons.instagram, ms: 3500 });
            return;
          }
          main.appendChild(TD.h("div", { "class": "empty" }, [TD.h("button", { "class": "btn sm", style: "margin-bottom:12px", html: GLYPH.back + " Artists", onclick: function () { state.profile = null; render(); } }), TD.h("div", { html: "<b>Couldn't load @" + TD.esc(pr.user) + "</b>" }), TD.h("div", { "class": "dim", style: "margin-top:8px", text: e.message }),
            TD.h("button", { "class": "btn", style: "margin-top:14px", html: IGLOGO(18) + " Instagram's own view", onclick: function () { TD.openProfile(pr.user, pr.artist && pr.artist.name); } })]));
        });
      }
      function renderPost() {
        setTabs(); TD.clear(main); win.setTitle("Instagram — post");
        var box = TD.h("div", { style: "padding:16px 18px 24px" });
        box.appendChild(TD.h("div", { "class": "sec-h", style: "margin-top:0" }, [TD.h("h2", { text: "Post" }), TD.h("div", { "class": "right" }, [
          TD.h("button", { "class": "btn sm", html: TD.icons.ext + " Open on Instagram", onclick: function () { TD.phoneWindow(state.post, "ig-post"); } }),
          TD.h("button", { "class": "btn sm", text: "✕", onclick: function () { input.value = ""; state.post = ""; render(); } })])]));
        box.appendChild(TD.h("div", { "class": "embed-wrap", style: "max-width:540px;margin:0 auto" }, [TD.h("iframe", { src: embedUrl(state.post), height: "760", allow: "autoplay; encrypted-media", style: "border-radius:12px;background:#fff" })]));
        main.appendChild(box);
      }
      win.showArtist = function (h) { var A = byHandle[h]; if (A) openArtist(A); else { state.profile = { user: h }; state.tab = "artists"; render(); } };
      render();
      if (params && params.post) { input.value = params.post; state.post = params.post; renderPost(); }
      else if (params && params.handle) win.showArtist(params.handle);
    },
    resume: function (win, params) { if (params && params.handle) win.showArtist(params.handle); }
  });
})(window.TD);
