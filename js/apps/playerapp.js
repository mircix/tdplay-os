/* Player — the YouTube player window with queue */
(function (TD) {
  "use strict";
  TD.register({
    id: "player", name: "Player", desc: "YouTube player with a real queue", icon: TD.icons.player, width: 760, height: 720, minWidth: 380, keywords: "player youtube queue video now playing",
    mount: function (win, params) {
      var P = TD.player;
      var body = TD.h("div", { "class": "pl-body" });
      var video = TD.h("div", { "class": "pl-video" }, [TD.h("div", { "class": "ph", text: "Pick a song · press / to search" })]);
      var now = TD.h("div", { "class": "now" }, [TD.h("b", { text: "Nothing playing" }), TD.h("span", { text: "" })]);
      var bPrev = TD.h("button", { "class": "btn icon", html: TD.icons.prev, title: "Previous (⇧←)", onclick: P.prev });
      var bPlay = TD.h("button", { "class": "btn icon primary", html: TD.icons.play, title: "Play / pause (space)", onclick: P.toggle });
      var bNext = TD.h("button", { "class": "btn icon", html: TD.icons.next, title: "Next (⇧→)", onclick: function () { P.next(); } });
      var bShuf = TD.h("button", { "class": "btn icon", html: TD.icons.shuffleG, title: "Shuffle", onclick: P.toggleShuffle });
      var bRep = TD.h("button", { "class": "btn icon", html: TD.icons.repeatG, title: "Repeat", onclick: P.toggleRepeat });
      var seek = TD.h("div", { "class": "seek", title: "Seek" }, [TD.h("i")]);
      var time = TD.h("span", { "class": "sp-time", text: "0:00 / 0:00" });
      var vol = TD.h("input", { "class": "vol", type: "range", min: "0", max: "100", value: String(P.getVolume()), title: "Volume", oninput: function (e) { P.setVolume(parseInt(e.target.value, 10)); } });
      seek.addEventListener("click", function (e) { var r = seek.getBoundingClientRect(); P.seek((e.clientX - r.left) / r.width); });
      var ctl = TD.h("div", { "class": "pl-ctl" }, [bPrev, bPlay, bNext, now, bShuf, bRep, vol]);
      var seekRow = TD.h("div", { "class": "pl-ctl", style: "padding-top:0" }, [seek, time]);
      var qh = TD.h("div", { "class": "pl-qh" }, [TD.h("span", { text: "Queue" }), TD.h("span", { "class": "muted", id: "" })]);
      var qLabel = qh.lastChild;
      var qRight = TD.h("div", { "class": "right" }, [
        TD.h("button", { "class": "btn sm", html: TD.icons.radio + " Radio", onclick: function () { P.radio(); } }),
        TD.h("button", { "class": "btn sm", text: "Clear", onclick: function () { P.stop(); } })]);
      qh.appendChild(qRight);
      var queue = TD.h("div", { "class": "pl-queue" });
      body.appendChild(video); body.appendChild(ctl); body.appendChild(seekRow); body.appendChild(qh); body.appendChild(queue);
      win.body.appendChild(body);
      P.attach(video, win);

      function renderState() {
        var it = P.current();
        var playing = P.state === "playing" || P.state === "buffering" || P.state === "loading";
        bPlay.innerHTML = playing ? TD.icons.pause : TD.icons.play;
        bShuf.classList.toggle("primary", P.shuffle); bRep.classList.toggle("primary", P.repeat);
        video.firstChild.hidden = !!it;
        if (it) { now.firstChild.textContent = it.artist || it.caption; now.lastChild.textContent = (it.artist ? it.title + " · " : "") + it.month.title; win.setTitle("Player — " + (it.artist || it.caption)); }
        else { now.firstChild.textContent = "Nothing playing"; now.lastChild.textContent = "Open Home or Library and pick a song"; win.setTitle("Player"); seek.firstChild.style.width = "0"; time.textContent = "0:00 / 0:00"; }
      }
      function renderQueue() {
        TD.clear(queue);
        qLabel.textContent = P.queue.length ? TD.plural(P.queue.length, "song") + (P.queueLabel ? " · " + P.queueLabel : "") + (P.radioMode ? " · endless" : "") : "";
        if (!P.queue.length) { queue.appendChild(TD.h("div", { "class": "empty", html: "Queue is empty.<br><span class='dim'>Click any song anywhere, or start <b>Radio</b>.</span>" })); return; }
        var cur = P.current();
        P.queue.forEach(function (it, i) {
          var row = TD.ui.row(it, { n: i + 1, list: P.queue, onPick: function () { P.jump(i); }, extra: function () { return ["-", { label: "Remove from queue", fn: function () { P.remove(i); } }]; } });
          if (it === cur) row.classList.add("playing");
          queue.appendChild(row);
        });
        var curEl = queue.querySelector(".playing"); if (curEl) curEl.scrollIntoView({ block: "nearest" });
      }
      var offs = [
        TD.bus.on("player:state", renderState),
        TD.bus.on("player:queue", renderQueue),
        TD.bus.on("player:tick", function (t) { if (t.d) { seek.firstChild.style.width = (t.t / t.d * 100) + "%"; time.textContent = TD.fmtTime(t.t * 1000) + " / " + TD.fmtTime(t.d * 1000); } })
      ];
      win.on("close", function () { offs.forEach(function (f) { f(); }); });
      renderState(); renderQueue();
      if (params && params.items) P.play(params.items, params.index || 0, { from: "player", label: params.label });
      else if (!P.hasTrack() && params && params.autoradio) P.radio();
    },
    resume: function (win, params) { if (params && params.items) TD.player.play(params.items, params.index || 0, { from: "player", label: params.label }); },
    menu: function () { return ["-", { label: "TDPlay Radio", fn: function () { TD.player.radio(); } }, { label: "Stop", fn: function () { TD.player.stop(); } }]; }
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
