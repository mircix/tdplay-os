/* TDPlay OS — shared UI pieces for track cards, rows and the track context menu */
(function (TD) {
  "use strict";
  var UI = TD.ui = {};

  UI.captionHtml = function (it, toks) {
    if (it.artist) return "<b>" + TD.highlight(it.artist, toks) + "</b> — " + TD.highlight(it.title, toks);
    return TD.highlight(it.caption, toks);
  };

  UI.card = function (it, opts) {
    opts = opts || {};
    var th = TD.thumb(it, opts.hero);
    var el = TD.h("div", { "class": "card" + (opts.hero ? " hero" : ""), dataset: { id: it.id } }, [
      TD.h("div", { "class": "th", style: th ? "background-image:url(" + th + ")" : "" }, [
        it.featured && !opts.noFeat ? TD.h("span", { "class": "feat", text: "Featured" }) : null,
        TD.h("span", { "class": "play", html: it.yt ? TD.icons.play : TD.icons.ext })
      ]),
      TD.h("div", { "class": "b" }, [
        opts.hero ? TD.h("div", { "class": "kicker", text: "Featured · " + it.month.title }) : null,
        TD.h("div", { "class": "cap", html: UI.captionHtml(it, opts.toks) }),
        TD.h("div", { "class": "meta" }, [
          it.initials ? TD.h("span", { "class": "ini", text: it.initials, title: it.artist || "", onclick: function (e) { e.stopPropagation(); if (it.artistKey) TD.open("artists", { artist: it.artistKey }); } }) : null,
          opts.showMonth ? TD.h("span", { "class": "muted", text: it.month.key + (it.page ? " · PG." + it.page.page : "") }) : null,
          TD.linkIcons(it)
        ])
      ])
    ]);
    el.addEventListener("click", function () { UI.play(it, opts); });
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); UI.menu(e, it, opts); });
    return el;
  };

  UI.row = function (it, opts) {
    opts = opts || {};
    var th = TD.thumb(it);
    var el = TD.h("div", { "class": "row" + (opts.compact ? " compact" : ""), dataset: { id: it.id } }, [
      TD.h("span", { "class": "n", text: opts.n != null ? String(opts.n) : "" }),
      opts.compact ? null : TD.h("div", { "class": "th", style: th ? "background-image:url(" + th + ")" : "" }),
      TD.h("div", { "class": "t" }, [
        TD.h("div", { "class": "cap", html: UI.captionHtml(it, opts.toks) }),
        TD.h("div", { "class": "sub" }, [
          it.initials ? TD.h("span", { "class": "ini", text: it.initials }) : null,
          TD.h("span", { text: it.month.title + (it.page && opts.showPage !== false ? " · PG." + it.page.page : "") }),
          it.featured ? TD.h("span", { "class": "chip feat", text: "Featured" }) : null
        ])
      ]),
      TD.linkIcons(it)
    ]);
    el.addEventListener("click", function () { UI.play(it, opts); });
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); UI.menu(e, it, opts); });
    return el;
  };

  UI.play = function (it, opts) {
    opts = opts || {};
    if (opts.onPick) return opts.onPick(it);
    if (!it.yt) {
      // no video on this slot (early Wix pages): go to Spotify / Apple / the site
      if (it.spotify && TD.spotify.connected) return TD.spotify.playLink(it.spotify).then(function () { TD.open("spotify"); }).catch(function (e) { TD.notify("Spotify", e.message); });
      if (it.spotify) return TD.open("spotify", { link: it.spotify, item: it });
      if (it.apple) return TD.open("apple", { link: it.apple, item: it });
      return window.open(it.url, "_blank");
    }
    var list = opts.list || [it], idx = list.indexOf(it);
    TD.player.play(list, idx < 0 ? 0 : idx, { label: opts.label || "" });
  };

  UI.menu = function (e, it, opts) {
    opts = opts || {};
    var items = [{ head: it.artist || it.caption }];
    if (it.yt) {
      items.push({ label: "Play", icon: TD.icons.play, fn: function () { UI.play(it, opts); } });
      items.push({ label: "Play next", fn: function () { TD.player.playNext(it); } });
      items.push({ label: "Add to queue", fn: function () { TD.player.enqueue(it); } });
    }
    if (it.spotify) items.push({ label: TD.spotify.connected ? "Play on Spotify" : "Open in Spotify app", icon: TD.icons.spotifyG, fn: function () { TD.open("spotify", { link: it.spotify, item: it, autoplay: true }); } });
    if (it.apple) items.push({ label: "Open in Apple Music app", icon: TD.icons.appleG, fn: function () { TD.open("apple", { link: it.apple, item: it }); } });
    items.push("-");
    if (it.artistKey) items.push({ label: "Artist: " + (TD.catalog.artistByKey[it.artistKey] || {}).name, icon: TD.icons.artists, fn: function () { TD.open("artists", { artist: it.artistKey }); } });
    if (it.site) items.push({ label: "Open artist website", icon: TD.icons.site, fn: function () { TD.open("browser", { url: it.site, title: it.artist }); } });
    if (it.month && it.month.key) items.push({ label: "Open " + it.month.title, icon: TD.icons.home, fn: function () { TD.open("home", { month: it.month.key, page: it.page ? it.page.page : 1 }); } });
    items.push({ label: it.external ? "Watch on YouTube" : "Show on tdplay.site", icon: TD.icons.ext, fn: function () { window.open(it.url, "_blank"); } });
    if (TD.yt.signedIn && it.yt) items = items.concat(["-", { label: "Like on YouTube", icon: TD.icons.youtube, fn: function () { TD.yt.like(it.yt).then(function () { TD.notify("Liked on YouTube", it.caption, { img: TD.thumb(it) }); }).catch(function (e) { TD.notify("YouTube", e.message); }); } },
      { label: "Add to a YouTube playlist…", icon: TD.icons.youtube, fn: function () { TD.ytPickPlaylist(it); } }]);
    if (opts.extra) items = items.concat(opts.extra(it));
    TD.menu(e.clientX, e.clientY, items);
  };

  UI.grid = function (items, opts) {
    opts = opts || {}; opts.list = opts.list || items;
    var g = TD.h("div", { "class": "grid" });
    items.forEach(function (it) { g.appendChild(UI.card(it, opts)); });
    return g;
  };
  UI.rows = function (items, opts) {
    opts = opts || {}; opts.list = opts.list || items;
    var g = TD.h("div", { "class": "rows" });
    items.forEach(function (it, i) { g.appendChild(UI.row(it, Object.assign({ n: i + 1 }, opts))); });
    return g;
  };
  UI.playButtons = function (items, label, link) {
    var playable = items.filter(function (it) { return it.yt; });
    var b = [
      TD.h("button", { "class": "btn primary", html: TD.icons.play + " Play all", disabled: !playable.length, onclick: function () { TD.player.play(items, 0, { label: label }); } }),
      TD.h("button", { "class": "btn", html: TD.icons.shuffleG + " Shuffle", disabled: !playable.length, onclick: function () { TD.player.play(TD.shuffle(items), 0, { label: label, keepOrder: true }); } })
    ];
    if (items.some(function (it) { return it.spotify; })) b.push(TD.h("button", { "class": "btn spotify", html: TD.icons.spotifyG + " Spotify", title: TD.spotify.connected ? "Play these on Spotify" : "Open in the Spotify app", onclick: function () { TD.open("spotify", { items: items, label: label, link: link || "", autoplay: true }); } }));
    return b;
  };
  // keep "playing" highlight in sync everywhere
  TD.bus.on("player:state", function (P) {
    var cur = P.current();
    Array.prototype.forEach.call(document.querySelectorAll(".card.playing,.row.playing"), function (el) { if (!cur || el.dataset.id !== cur.id) el.classList.remove("playing"); });
    if (cur && P.state !== "idle") Array.prototype.forEach.call(document.querySelectorAll('[data-id="' + CSS.escape(cur.id) + '"]'), function (el) { el.classList.add("playing"); });
  });
})(window.TD);
