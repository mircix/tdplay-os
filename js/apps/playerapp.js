/* Player — the YouTube player window: video, controls, queue, and your YouTube account */
(function (TD) {
  "use strict";
  var CLIENT_HELP = 'In <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud Console</a>: create a project → enable <b>YouTube Data API v3</b> → OAuth consent screen (External, add yourself as a test user) → Credentials → <b>OAuth client ID</b> → Web application → Authorized JavaScript origins: <code>' + TD.esc(location.origin) + '</code>. Copy the Client ID here.';

  // menu of the user's playlists → add one video
  TD.ytPickPlaylist = function (it, x, y) {
    TD.yt.loadPlaylists().then(function (pls) {
      var items = [{ head: "Add to playlist" }].concat(pls.map(function (p) { return { label: p.title + "  (" + p.count + ")", fn: function () {
        TD.yt.addToPlaylist(p.id, it.yt).then(function () { TD.notify("Added to " + p.title, it.caption, { img: TD.thumb(it) }); }).catch(function (e) { TD.notify("YouTube", e.message); });
      } }; }));
      if (!pls.length) items.push({ label: "You have no playlists yet", fn: function () { } });
      TD.menu(x != null ? x : window.innerWidth / 2 - 110, y != null ? y : 120, items);
    }).catch(function (e) { TD.notify("YouTube", e.message); });
  };

  TD.register({
    id: "player", name: "Player", desc: "YouTube player, queue and your YouTube account", icon: TD.icons.player, width: 780, height: 740, minWidth: 380, keywords: "player youtube queue video now playing sign in google account playlists liked",
    mount: function (win, params) {
      var P = TD.player, Y = TD.yt, tab = "queue";
      var body = TD.h("div", { "class": "pl-body" });
      var video = TD.h("div", { "class": "pl-video" }, [TD.h("div", { "class": "ph", text: "Pick a song · press / to search" })]);
      var now = TD.h("div", { "class": "now" }, [TD.h("b", { text: "Nothing playing" }), TD.h("span", { text: "" })]);
      var bPrev = TD.h("button", { "class": "btn icon", html: TD.icons.prev, title: "Previous (⇧←)", onclick: P.prev });
      var bPlay = TD.h("button", { "class": "btn icon primary", html: TD.icons.play, title: "Play / pause (space)", onclick: P.toggle });
      var bNext = TD.h("button", { "class": "btn icon", html: TD.icons.next, title: "Next (⇧→)", onclick: function () { P.next(); } });
      var bShuf = TD.h("button", { "class": "btn icon", html: TD.icons.shuffleG, title: "Shuffle", onclick: P.toggleShuffle });
      var bRep = TD.h("button", { "class": "btn icon", html: TD.icons.repeatG, title: "Repeat", onclick: P.toggleRepeat });
      var bLike = TD.h("button", { "class": "btn icon", html: TD.icons.star, title: "Like on YouTube", hidden: true, onclick: function () { var it = P.current(); if (!it) return; Y.like(it.yt).then(function () { bLike.classList.add("primary"); TD.notify("Liked on YouTube", it.caption, { img: TD.thumb(it) }); }).catch(function (e) { TD.notify("YouTube", e.message); }); } });
      var bAdd = TD.h("button", { "class": "btn icon", html: TD.svg('<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>'), title: "Add to a YouTube playlist", hidden: true, onclick: function (e) { var it = P.current(); if (it) TD.ytPickPlaylist(it, e.clientX - 100, e.clientY + 10); } });
      var seek = TD.h("div", { "class": "seek", title: "Seek" }, [TD.h("i")]);
      var time = TD.h("span", { "class": "sp-time", text: "0:00 / 0:00" });
      var vol = TD.h("input", { "class": "vol", type: "range", min: "0", max: "100", value: String(P.getVolume()), title: "Volume", oninput: function (e) { P.setVolume(parseInt(e.target.value, 10)); } });
      seek.addEventListener("click", function (e) { var r = seek.getBoundingClientRect(); P.seek((e.clientX - r.left) / r.width); });
      var ctl = TD.h("div", { "class": "pl-ctl" }, [bPrev, bPlay, bNext, now, bLike, bAdd, bShuf, bRep, vol]);
      var seekRow = TD.h("div", { "class": "pl-ctl", style: "padding-top:0" }, [seek, time]);
      // Queue | YouTube tabs
      var tQueue = TD.h("button", { "class": "tab on", text: "Queue", onclick: function () { setTab("queue"); } });
      var tYt = TD.h("button", { "class": "tab", html: TD.icons.youtube.replace("<svg", '<svg style="width:15px;height:15px;vertical-align:-3px;margin-right:5px;fill:#ff3d3d"') + "YouTube", onclick: function () { setTab("yt"); } });
      var qLabel = TD.h("span", { "class": "muted" });
      var qRight = TD.h("div", { "class": "right" }, [
        TD.h("button", { "class": "btn sm", html: TD.icons.radio + " Radio", onclick: function () { P.radio(); } }),
        TD.h("button", { "class": "btn sm", text: "Clear", onclick: function () { P.stop(); } })]);
      var qh = TD.h("div", { "class": "pl-qh" }, [TD.h("div", { "class": "tabs" }, [tQueue, tYt]), qLabel, qRight]);
      var queue = TD.h("div", { "class": "pl-queue" });
      var ytPane = TD.h("div", { "class": "pl-queue", hidden: true });
      body.appendChild(video); body.appendChild(ctl); body.appendChild(seekRow); body.appendChild(qh); body.appendChild(queue); body.appendChild(ytPane);
      win.body.appendChild(body);
      P.attach(video, win);

      function setTab(t) { tab = t; body.classList.toggle("yt-tab", t === "yt"); TD.player.reposition(); tQueue.classList.toggle("on", t === "queue"); tYt.classList.toggle("on", t === "yt"); queue.hidden = t !== "queue"; ytPane.hidden = t !== "yt"; qRight.hidden = t !== "queue"; qLabel.hidden = t !== "queue"; if (t === "yt") renderYt(); }
      function renderState() {
        var it = P.current();
        var playing = P.state === "playing" || P.state === "buffering" || P.state === "loading";
        bPlay.innerHTML = playing ? TD.icons.pause : TD.icons.play;
        bShuf.classList.toggle("primary", P.shuffle); bRep.classList.toggle("primary", P.repeat);
        bLike.hidden = bAdd.hidden = !(Y.signedIn && it); bLike.classList.remove("primary");
        video.firstChild.hidden = !!it;
        if (it) { now.firstChild.textContent = it.artist || it.caption; now.lastChild.textContent = (it.artist ? it.title + " · " : "") + it.month.title; win.setTitle("Player — " + (it.artist || it.caption)); }
        else { now.firstChild.textContent = "Nothing playing"; now.lastChild.textContent = "Open Home or Library and pick a song"; win.setTitle("Player"); seek.firstChild.style.width = "0"; time.textContent = "0:00 / 0:00"; }
      }
      function renderQueue() {
        TD.clear(queue);
        qLabel.textContent = P.queue.length ? TD.plural(P.queue.length, "song") + (P.queueLabel ? " · " + P.queueLabel : "") + (P.radioMode ? " · endless" : "") : "";
        if (!P.queue.length) { queue.appendChild(TD.h("div", { "class": "empty", html: "Queue is empty.<br><span class='dim'>Click any song anywhere, start <b>Radio</b>, or play one of your YouTube playlists.</span>" })); return; }
        var cur = P.current();
        P.queue.forEach(function (it, i) {
          var row = TD.ui.row(it, { n: i + 1, list: P.queue, onPick: function () { P.jump(i); }, extra: function () { return ["-", { label: "Remove from queue", fn: function () { P.remove(i); } }]; } });
          if (it === cur) row.classList.add("playing");
          queue.appendChild(row);
        });
        var curEl = queue.querySelector(".playing"); if (curEl) curEl.scrollIntoView({ block: "nearest" });
      }

      // ---- YouTube pane: setup → sign in → your stuff
      var ytView = "playlists";
      function renderYt() {
        TD.clear(ytPane);
        if (!Y.clientId()) {
          var inp = TD.h("input", { "class": "input", type: "text", placeholder: "xxxxxxxx.apps.googleusercontent.com", spellcheck: "false", style: "font-family:var(--mono);font-size:12.5px;width:100%" });
          ytPane.appendChild(TD.h("div", { style: "padding:10px 6px" }, [
            TD.h("h2", { text: "Sign in to YouTube", style: "font-size:20px" }),
            TD.h("p", { "class": "muted", style: "font-size:13.5px;margin:6px 0 10px", text: "Play your own playlists and liked videos here, and like / save / subscribe from the player. Google needs a one-time OAuth Client ID so it knows which app is asking:" }),
            TD.h("p", { "class": "muted", style: "font-size:12.5px;line-height:1.6;margin:0 0 10px", html: CLIENT_HELP }),
            TD.h("div", { "class": "field" }, [TD.h("label", { text: "Google OAuth Client ID" }), inp]),
            TD.h("div", { "class": "pill-row" }, [TD.h("button", { "class": "btn primary", text: "Save & sign in", onclick: function () { if (!inp.value.trim()) return inp.focus(); Y.setClientId(inp.value); renderYt(); doSignIn(); } })])
          ]));
          return;
        }
        if (!Y.signedIn) {
          ytPane.appendChild(TD.h("div", { "class": "empty" }, [
            TD.h("div", { style: "margin-bottom:12px", html: TD.icons.player.replace("<svg", '<svg style="width:64px;height:64px"') }),
            TD.h("button", { "class": "btn yt", style: "font-size:15px;padding:10px 18px", html: TD.icons.youtube + " Sign in with Google", onclick: doSignIn }),
            TD.h("div", { "class": "dim", style: "margin-top:12px;font-size:12.5px" }, [TD.h("span", { text: "Client ID saved · " }), TD.h("a", { href: "#", text: "change", onclick: function (e) { e.preventDefault(); Y.setClientId(""); renderYt(); } })])
          ]));
          return;
        }
        var me = Y.me || {};
        var head = TD.h("div", { style: "display:flex;align-items:center;gap:10px;padding:6px 6px 10px" }, [
          me.avatar ? TD.h("img", { src: me.avatar, alt: "", style: "width:36px;height:36px;border-radius:50%" }) : null,
          TD.h("div", { style: "flex:1;min-width:0" }, [TD.h("b", { text: me.title || "YouTube" }), TD.h("div", { "class": "muted", style: "font-size:12px", text: (me.handle ? me.handle + " · " : "") + (me.subs != null ? TD.plural(parseInt(me.subs, 10), "subscriber") : "") })]),
          TD.h("div", { "class": "tabs" }, [["playlists", "Playlists"], ["liked", "Liked"], ["subs", "Subscriptions"]].map(function (t) { return TD.h("button", { "class": "tab" + (ytView === t[0] ? " on" : ""), text: t[1], onclick: function () { ytView = t[0]; renderYt(); } }); })),
          TD.h("button", { "class": "btn sm", text: "Sign out", onclick: function () { Y.signOut(); renderYt(); renderState(); } })
        ]);
        ytPane.appendChild(head);
        var list = TD.h("div", { "class": "rows" }, [TD.h("div", { "class": "empty", text: "Loading…" })]);
        ytPane.appendChild(list);
        var fail = function (e) { TD.clear(list); list.appendChild(TD.h("div", { "class": "empty", html: "<b>Couldn't load</b><br>" + TD.esc(e.message) + (/(quota|403)/i.test(e.message) ? "<br><span class='dim'>Is YouTube Data API v3 enabled on the project?</span>" : "") })); };
        if (ytView === "playlists") {
          Y.loadPlaylists().then(function (pls) {
            TD.clear(list);
            if (!pls.length) return list.appendChild(TD.h("div", { "class": "empty", text: "No playlists on this account." }));
            pls.forEach(function (p) {
              var row = TD.h("div", { "class": "row" }, [
                TD.h("span", { "class": "n", html: TD.icons.youtube.replace("<svg", '<svg style="width:16px;height:16px;fill:#ff3d3d"') }),
                TD.h("div", { "class": "th", style: p.thumb ? "background-image:url(" + p.thumb + ")" : "" }),
                TD.h("div", { "class": "t" }, [TD.h("div", { "class": "cap", html: "<b>" + TD.esc(p.title) + "</b>" }), TD.h("div", { "class": "sub", text: TD.plural(p.count, "video") })]),
                TD.h("div", { "class": "links" }, [TD.h("a", { "class": "l-youtube", href: "https://www.youtube.com/playlist?list=" + p.id, target: "_blank", rel: "noopener", title: "Open on YouTube", html: TD.icons.ext, onclick: function (e) { e.stopPropagation(); } })])
              ]);
              row.addEventListener("click", function () { playList(p, false); });
              row.addEventListener("contextmenu", function (e) { e.preventDefault(); TD.menu(e.clientX, e.clientY, [{ head: p.title }, { label: "Play", icon: TD.icons.play, fn: function () { playList(p, false); } }, { label: "Shuffle", icon: TD.icons.shuffleG, fn: function () { playList(p, true); } }, { label: "Add to queue", fn: function () { Y.playlistItems(p.id).then(function (items) { P.enqueue(items); }); } }]); });
              list.appendChild(row);
            });
          }).catch(fail);
        } else if (ytView === "liked") {
          Y.likedVideos().then(function (items) {
            TD.clear(list);
            if (!items.length) return list.appendChild(TD.h("div", { "class": "empty", text: "No liked videos." }));
            list.appendChild(TD.h("div", { "class": "pill-row", style: "padding:0 6px 10px" }, TD.ui.playButtons(items, "Liked videos")));
            items.forEach(function (it, i) { list.appendChild(TD.ui.row(it, { n: i + 1, list: items, label: "Liked videos" })); });
          }).catch(fail);
        } else {
          Y.subscriptions().then(function (subs) {
            TD.clear(list);
            if (!subs.length) return list.appendChild(TD.h("div", { "class": "empty", text: "No subscriptions." }));
            var g = TD.h("div", { "class": "agrid" });
            subs.forEach(function (s) {
              g.appendChild(TD.h("div", { "class": "atile", onclick: function () { window.open("https://www.youtube.com/channel/" + s.channelId, "_blank"); } }, [
                TD.h("div", { "class": "av th", style: s.thumb ? "background-image:url(" + s.thumb + ")" : "" }), TD.h("div", { "class": "nm", text: s.title })]));
            });
            list.appendChild(g);
          }).catch(fail);
        }
      }
      function playList(p, shuffle) {
        TD.notify("Loading " + p.title, TD.plural(p.count, "video"), { icon: TD.icons.player, ms: 1500 });
        Y.playlistItems(p.id).then(function (items) {
          if (!items.length) return TD.notify("Empty playlist", p.title);
          P.play(shuffle ? TD.shuffle(items) : items, 0, { from: "player", label: p.title, keepOrder: true }); setTab("queue");
        }).catch(function (e) { TD.notify("YouTube", e.message); });
      }
      function doSignIn() {
        Y.signIn().then(function () { renderYt(); renderState(); }).catch(function (e) { TD.notify("YouTube sign-in", e.message, { icon: TD.icons.player }); renderYt(); });
      }
      var offs = [
        TD.bus.on("player:state", renderState),
        TD.bus.on("player:queue", renderQueue),
        TD.bus.on("yt:state", function () { renderState(); if (tab === "yt") renderYt(); }),
        TD.bus.on("player:tick", function (t) { if (t.d) { seek.firstChild.style.width = (t.t / t.d * 100) + "%"; time.textContent = TD.fmtTime(t.t * 1000) + " / " + TD.fmtTime(t.d * 1000); } })
      ];
      win.on("close", function () { offs.forEach(function (f) { f(); }); });
      win.showYt = function () { setTab("yt"); };
      renderState(); renderQueue();
      if (params && params.items) P.play(params.items, params.index || 0, { from: "player", label: params.label });
      else if (!P.hasTrack() && params && params.autoradio) P.radio();
      if (params && params.tab === "yt") setTab("yt");
    },
    resume: function (win, params) {
      if (params && params.items) TD.player.play(params.items, params.index || 0, { from: "player", label: params.label });
      if (params && params.tab === "yt") win.showYt();
    },
    menu: function () { return ["-", { label: "Your YouTube", fn: function () { TD.open("player", { tab: "yt" }); } }, { label: "TDPlay Radio", fn: function () { TD.player.radio(); } }, { label: "Stop", fn: function () { TD.player.stop(); } }]; }
  });

  // Radio is its own dock icon: stations built from the catalog
  TD.register({
    id: "radio", name: "Radio", desc: "Endless shuffle stations", icon: TD.icons.radio, width: 620, height: 520, keywords: "radio shuffle random stations",
    mount: function (win) {
      var C = TD.catalog, main = TD.h("div", { "class": "app-main" });
      main.appendChild(TD.h("div", { "class": "sec-h" }, [TD.h("h1", { html: "TDPlay <em>Radio</em>" }), TD.h("span", { "class": "muted", text: "Pick a station — it never ends" })]));
      var st = [{ label: "Everything", desc: "all " + C.playable.length + " songs", filter: null },
        { label: "Featured only", desc: "the headline videos", filter: function (it) { return it.featured; } },
        { label: "Hidden gems", desc: "artists featured once", filter: function (it) { return it.artistKey && C.artistByKey[it.artistKey].count === 1; } },
        { label: "Regulars", desc: "artists featured 5+ times", filter: function (it) { return it.artistKey && C.artistByKey[it.artistKey].count >= 5; } }];
      C.years.forEach(function (Y) { st.push({ label: "TDPlay " + Y.year, desc: TD.plural(Y.items.filter(function (i) { return i.yt; }).length, "song"), filter: function (it) { return it.month.year === Y.year; } }); });
      var g = TD.h("div", { "class": "folders" });
      st.forEach(function (s) {
        g.appendChild(TD.h("div", { "class": "folder", onclick: function () { TD.player.radio({ label: s.label + " Radio", desc: s.desc, filter: s.filter }); TD.open("player"); } },
          [TD.h("div", { "class": "fn", html: TD.icons.radio.replace("<svg", '<svg style="width:18px;height:18px;vertical-align:-3px;margin-right:6px"') + TD.esc(s.label) }), TD.h("div", { "class": "fc", text: s.desc })]));
      });
      main.appendChild(g);
      win.body.appendChild(main);
    }
  });
})(window.TD);
