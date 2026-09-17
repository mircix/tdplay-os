/* TDPlay OS — YouTube playback engine. One player iframe for the whole OS, positioned over the
 * Player window's video slot, or docked as a picture-in-picture mini player when that window is closed. */
(function (TD) {
  "use strict";
  var P = TD.player = { queue: [], index: -1, state: "idle", shuffle: false, repeat: false, ready: false, radioMode: null };
  var yt = null, layer, host, pip, pipSlot, slot = null, slotWin = null, apiLoading = false, pendingPlay = null, raf = 0, errStreak = 0;
  var $ = function (id) { return document.getElementById(id); };

  P.current = function () { return P.queue[P.index] || null; };
  P.hasTrack = function () { return !!P.current(); };

  function loadApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (apiLoading) return apiLoading;
    apiLoading = new Promise(function (resolve) {
      window.onYouTubeIframeAPIReady = function () { resolve(); };
      var s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
    });
    return apiLoading;
  }
  function ensurePlayer() {
    if (yt) return Promise.resolve(yt);
    return loadApi().then(function () {
      return new Promise(function (resolve) {
        var div = document.createElement("div"); host.appendChild(div);
        yt = new YT.Player(div, {
          width: "100%", height: "100%",
          playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, origin: location.origin, enablejsapi: 1 },
          events: {
            onReady: function () { P.ready = true; resolve(yt); },
            onStateChange: onState,
            onError: onError
          }
        });
      });
    });
  }
  function onState(e) {
    var s = e.data;
    if (s === YT.PlayerState.ENDED) { P.state = "ended"; errStreak = 0; if (P.repeat && P.queue.length === 1) yt.playVideo(); else P.next(true); }
    else if (s === YT.PlayerState.PLAYING) { P.state = "playing"; errStreak = 0; startTick(); }
    else if (s === YT.PlayerState.PAUSED) { P.state = "paused"; }
    else if (s === YT.PlayerState.BUFFERING) { P.state = "buffering"; }
    else if (s === YT.PlayerState.CUED) { P.state = "cued"; }
    emit();
  }
  function onError(e) {
    var it = P.current();
    errStreak++;
    if (it) TD.notify("Can't play this one here", it.caption + " (YouTube says: " + (e.data === 150 || e.data === 101 ? "embedding disabled" : "error " + e.data) + ")", { img: TD.thumb(it), ms: 3000 });
    if (errStreak < 6 && P.index < P.queue.length - 1) setTimeout(function () { P.next(true); }, 400);
    else { P.state = "error"; emit(); }
  }
  function emit() { TD.bus.emit("player:state", P); updateTopbar(); updateMediaSession(); }
  function startTick() {
    cancelAnimationFrame(raf);
    var last = 0;
    var loop = function (t) {
      if (t - last > 500 && yt && yt.getCurrentTime) { last = t; TD.bus.emit("player:tick", { t: yt.getCurrentTime() || 0, d: yt.getDuration() || 0 }); }
      if (P.state === "playing") raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- public controls
  P.play = function (items, startIndex, opts) {
    opts = opts || {};
    var list = (items || []).filter(function (it) { return it && it.yt; });
    if (!list.length) { TD.notify("Nothing playable", "None of these have a YouTube video."); return; }
    P.radioMode = opts.radio || null;
    P.queue = P.shuffle && !opts.keepOrder ? TD.shuffle(list) : list.slice();
    P.index = 0;
    if (startIndex != null && !P.shuffle) P.index = Math.max(0, Math.min(list.length - 1, startIndex));
    else if (startIndex != null && P.shuffle) { var first = list[startIndex]; P.queue = [first].concat(P.queue.filter(function (x) { return x !== first; })); }
    P.queueLabel = opts.label || "";
    load();
    if (opts.from !== "player" && !P.windowOpen()) showPip(true);
    TD.bus.emit("player:queue", P);
  };
  P.playNow = function (it) { P.play([it]); };
  P.playNext = function (it) { if (!it.yt) return; if (P.index < 0) return P.play([it]); P.queue.splice(P.index + 1, 0, it); TD.bus.emit("player:queue", P); TD.notify("Playing next", it.caption, { img: TD.thumb(it), ms: 2200 }); };
  P.enqueue = function (items) {
    var list = (Array.isArray(items) ? items : [items]).filter(function (it) { return it.yt; });
    if (!list.length) return;
    if (P.index < 0) return P.play(list);
    P.queue = P.queue.concat(list); TD.bus.emit("player:queue", P);
    TD.notify("Added to queue", TD.plural(list.length, "song"), { img: TD.thumb(list[0]), ms: 2200 });
  };
  P.jump = function (i) { if (i < 0 || i >= P.queue.length) return; P.index = i; load(); };
  P.next = function (auto) {
    if (P.radioMode && P.index >= P.queue.length - 3) P.queue = P.queue.concat(TD.catalog.random(20, P.radioMode.filter));
    if (P.index < P.queue.length - 1) { P.index++; load(); }
    else if (P.repeat && P.queue.length) { P.index = 0; load(); }
    else if (auto) { P.state = "ended"; emit(); }
  };
  P.prev = function () {
    if (yt && yt.getCurrentTime && yt.getCurrentTime() > 4) { yt.seekTo(0, true); return; }
    if (P.index > 0) { P.index--; load(); }
  };
  P.toggle = function () {
    if (!yt || !P.hasTrack()) return;
    if (P.state === "playing" || P.state === "buffering") yt.pauseVideo(); else yt.playVideo();
  };
  P.pause = function () { if (yt && yt.pauseVideo) yt.pauseVideo(); };
  P.stop = function () {
    if (yt && yt.stopVideo) yt.stopVideo();
    P.queue = []; P.index = -1; P.state = "idle"; P.radioMode = null;
    showPip(false); layer.hidden = true; emit(); TD.bus.emit("player:queue", P);
  };
  P.seek = function (frac) { if (yt && yt.getDuration) yt.seekTo(frac * yt.getDuration(), true); };
  P.setVolume = function (v) { if (yt && yt.setVolume) yt.setVolume(v); TD.store.set("volume", v); };
  P.getVolume = function () { return yt && yt.getVolume ? yt.getVolume() : TD.store.get("volume", 100); };
  P.toggleShuffle = function () { P.shuffle = !P.shuffle; TD.store.set("shuffle", P.shuffle); if (P.shuffle && P.queue.length > 1) { var cur = P.current(); P.queue = [cur].concat(TD.shuffle(P.queue.filter(function (x) { return x !== cur; }))); P.index = 0; } TD.bus.emit("player:queue", P); emit(); };
  P.toggleRepeat = function () { P.repeat = !P.repeat; TD.store.set("repeat", P.repeat); emit(); };
  P.remove = function (i) { if (i === P.index) return; P.queue.splice(i, 1); if (i < P.index) P.index--; TD.bus.emit("player:queue", P); };
  P.radio = function (opts) {
    opts = opts || {};
    var filter = opts.filter || null;
    var list = TD.catalog.random(40, filter);
    P.play(list, 0, { radio: { label: opts.label || "TDPlay Radio", filter: filter }, label: opts.label || "TDPlay Radio", keepOrder: true });
    TD.notify(opts.label || "TDPlay Radio", "Endless shuffle from " + (opts.desc || "everything ever featured"), { icon: TD.icons.radio });
  };

  function load() {
    var it = P.current(); if (!it) return;
    P.state = "loading"; emit(); TD.bus.emit("player:queue", P);
    layer.hidden = false;
    ensurePlayer().then(function () {
      var v = TD.store.get("volume"); if (v != null) yt.setVolume(v);
      yt.loadVideoById(it.yt);
      position();
    });
    TD.store.set("lastPlayed", { id: it.id, t: Date.now() });
    if (TD.store.get("wall") === "art") $("wp-art").style.backgroundImage = "url(" + TD.thumb(it, true) + ")";
  }

  // ---------------------------------------------------------------- placement (window slot vs pip)
  P.attach = function (slotEl, win) { slot = slotEl; slotWin = win; showPip(false); position(); win.on("resize", position); win.on("close", function () { P.detach(win); }); };
  P.detach = function (win) {
    if (slotWin !== win) return;
    slot = null; slotWin = null;
    if (P.hasTrack() && P.state !== "idle") showPip(true); else layer.hidden = true;
  };
  P.windowOpen = function () { return !!slotWin && !slotWin.minimized; };
  function showPip(on) {
    pip.hidden = !on;
    layer.classList.toggle("pipmode", on); layer.classList.toggle("inwin", !on);
    position();
  }
  function position() {
    if (layer.hidden) return;
    var r;
    if (slot && slotWin && !slotWin.minimized) r = slot.getBoundingClientRect();
    else if (!pip.hidden) r = pipSlot.getBoundingClientRect();
    else { layer.style.left = "-9999px"; layer.style.top = "0"; layer.style.width = "320px"; layer.style.height = "180px"; return; }  // minimized: keep audio, park offscreen
    layer.style.left = r.left + "px"; layer.style.top = r.top + "px"; layer.style.width = r.width + "px"; layer.style.height = r.height + "px";
  }
  P.reposition = position;

  // ---------------------------------------------------------------- top bar / media session
  function updateTopbar() {
    var it = P.current(), now = $("tb-now");
    if (!it || P.state === "idle") { now.hidden = true; document.title = "TDPlay OS"; return; }
    now.hidden = false;
    $("tb-now-art").src = TD.thumb(it);
    $("tb-now-title").textContent = it.artist || it.caption;
    $("tb-now-sub").textContent = it.artist ? it.title : it.month.title;
    $("tb-now-toggle").textContent = (P.state === "playing" || P.state === "buffering" || P.state === "loading") ? "❚❚" : "▶";
    $("pip-toggle").textContent = $("tb-now-toggle").textContent;
    document.title = (P.state === "playing" ? "▶ " : "") + it.caption + " — TDPlay OS";
  }
  function updateMediaSession() {
    if (!("mediaSession" in navigator)) return;
    var it = P.current(); if (!it) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: it.title || it.caption, artist: it.artist || "TDPlay", album: it.month.title, artwork: [{ src: TD.thumb(it, true), sizes: "480x360", type: "image/jpeg" }] });
      navigator.mediaSession.playbackState = P.state === "playing" ? "playing" : "paused";
    } catch (e) { }
  }

  P.init = function () {
    layer = $("yt-layer"); host = $("yt-host"); pip = $("pip"); pipSlot = $("pip-slot");
    P.shuffle = !!TD.store.get("shuffle", false); P.repeat = !!TD.store.get("repeat", false);
    $("pip-open").addEventListener("click", function () { TD.open("player"); });
    $("pip-toggle").addEventListener("click", P.toggle);
    $("pip-next").addEventListener("click", function () { P.next(); });
    $("pip-close").addEventListener("click", P.stop);
    pipSlot.addEventListener("click", function () { TD.open("player"); });
    // drag the pip around by its bar
    var bar = pip.querySelector(".pip-bar"), st = null;
    bar.addEventListener("pointerdown", function (e) { if (e.target.closest("button")) return; st = { x: e.clientX, y: e.clientY, r: pip.getBoundingClientRect() }; bar.setPointerCapture(e.pointerId); });
    bar.addEventListener("pointermove", function (e) { if (!st) return; pip.style.right = "auto"; pip.style.bottom = "auto"; pip.style.left = (st.r.left + e.clientX - st.x) + "px"; pip.style.top = (st.r.top + e.clientY - st.y) + "px"; position(); });
    bar.addEventListener("pointerup", function () { st = null; }); bar.addEventListener("pointercancel", function () { st = null; });
    window.addEventListener("resize", position);
    TD.bus.on("wm:minimize", function (w) { if (w === slotWin) { showPip(true); } });
    TD.bus.on("wm:restore", function (w) { if (w === slotWin) { showPip(false); } });
    TD.bus.on("wm:focus", function () { requestAnimationFrame(position); });
    // keep the layer glued to its slot while windows move
    setInterval(function () { if (!layer.hidden && slot) position(); }, 120);
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", P.toggle); navigator.mediaSession.setActionHandler("pause", P.toggle);
        navigator.mediaSession.setActionHandler("nexttrack", function () { P.next(); }); navigator.mediaSession.setActionHandler("previoustrack", P.prev);
      } catch (e) { }
    }
  };
})(window.TD);
