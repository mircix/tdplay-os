/* TDPlay OS — window manager, dock, top bar, menus, launcher, toasts */
(function (TD) {
  "use strict";
  var apps = {}, order = [];          // app registry
  var wins = {}, zTop = 10, focused = null, nextId = 1;
  var $ = function (id) { return document.getElementById(id); };
  var desktop, windowsEl, dockEl, topApp;

  TD.register = function (app) { apps[app.id] = app; if (order.indexOf(app.id) < 0) order.push(app.id); };
  TD.app = function (id) { return apps[id]; };
  TD.apps = function () { return order.map(function (id) { return apps[id]; }); };
  TD.wins = function () { return Object.keys(wins).map(function (k) { return wins[k]; }); };

  // ---------------------------------------------------------------- windows
  function area() {
    var r = windowsEl.getBoundingClientRect();
    return { w: r.width, h: r.height - (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--dock")) || 74) - 6 };
  }
  function cascade(w, h) {
    var a = area(), n = Object.keys(wins).length;
    var x = Math.max(10, Math.round((a.w - w) / 2) + (n % 6) * 26), y = Math.max(8, Math.round((a.h - h) / 2) + (n % 6) * 22);
    if (x + w > a.w - 10) x = Math.max(10, a.w - w - 10);
    if (y + h > a.h - 6) y = Math.max(6, a.h - h - 6);
    return { x: x, y: y };
  }

  TD.open = function (appId, params) {
    var app = apps[appId];
    if (!app) { TD.notify("Unknown app", appId); return null; }
    params = params || {};
    if (app.single !== false) {
      var existing = TD.wins().filter(function (w) { return w.app === app; })[0];
      if (existing) {
        if (existing.minimized) existing.restore();
        existing.focus();
        if (app.resume) app.resume(existing, params);
        return existing;
      }
    }
    var a = area();
    var w = Math.min(app.width || 860, a.w - 20), h = Math.min(app.height || 600, a.h - 12);
    var pos = TD.store.get("win:" + app.id);
    var xy = cascade(w, h);
    if (pos && pos.w && !TD.isMobile()) { w = Math.min(pos.w, a.w - 20); h = Math.min(pos.h, a.h - 12); xy = { x: Math.max(0, Math.min(pos.x, a.w - w)), y: Math.max(0, Math.min(pos.y, a.h - h)) }; }

    var win = { id: nextId++, app: app, params: params, minimized: false, maxed: false, _rect: { x: xy.x, y: xy.y, w: w, h: h }, _handlers: {} };
    var el = TD.h("div", { "class": "win", tabindex: "-1" });
    var lights = TD.h("div", { "class": "win-lights" }, [
      TD.h("button", { "class": "l-close", title: "Close", onclick: function (e) { e.stopPropagation(); win.close(); } }),
      TD.h("button", { "class": "l-min", title: "Minimize", onclick: function (e) { e.stopPropagation(); win.minimize(); } }),
      TD.h("button", { "class": "l-max", title: "Zoom", onclick: function (e) { e.stopPropagation(); win.toggleMax(); } })
    ]);
    var iconEl = TD.h("span", { "class": "win-icon", html: app.icon });
    var nameEl = TD.h("div", { "class": "win-name", text: app.name });
    var tools = TD.h("div", { "class": "win-tools" });
    var title = TD.h("div", { "class": "win-title", ondblclick: function () { win.toggleMax(); } }, [lights, iconEl, nameEl, tools]);
    var body = TD.h("div", { "class": "win-body" });
    el.appendChild(title); el.appendChild(body);
    el.appendChild(TD.h("div", { "class": "win-resize" }));
    ["e", "s", "w"].forEach(function (d) { el.appendChild(TD.h("div", { "class": "win-edge " + d, dataset: { dir: d } })); });
    win.el = el; win.body = body; win.titleEl = nameEl; win.tools = tools;
    win.setTitle = function (t) { nameEl.textContent = t || app.name; if (focused === win) topApp.textContent = t || app.name; };
    win.addTool = function (label, title, fn) { var b = TD.h("button", { html: label, title: title, onclick: function (e) { e.stopPropagation(); fn(e); } }); tools.appendChild(b); return b; };
    win.on = function (ev, fn) { (win._handlers[ev] = win._handlers[ev] || []).push(fn); };
    win.emit = function (ev, d) { (win._handlers[ev] || []).forEach(function (f) { f(d); }); };
    win.focus = function () {
      if (focused === win && el.classList.contains("focused")) return;
      if (focused) focused.el.classList.remove("focused");
      focused = win; el.classList.add("focused"); el.style.zIndex = ++zTop;
      if (zTop > 40) {                                   // keep windows under the top bar (50) and dock (60): renumber from 10
        var sorted = TD.wins().sort(function (a, b) { return (parseInt(a.el.style.zIndex, 10) || 0) - (parseInt(b.el.style.zIndex, 10) || 0); });
        zTop = 10; sorted.forEach(function (w) { w.el.style.zIndex = ++zTop; });
      }
      topApp.textContent = nameEl.textContent;
      TD.bus.emit("wm:focus", win);
    };
    win.applyRect = function () {
      if (win.maxed) { el.style.left = "0"; el.style.top = "0"; el.style.width = "100%"; el.style.height = "calc(100% - var(--dock) - 14px)"; }
      else { var r = win._rect; el.style.left = r.x + "px"; el.style.top = r.y + "px"; el.style.width = r.w + "px"; el.style.height = r.h + "px"; }
      win.emit("resize");
    };
    win.toggleMax = function () { win.maxed = !win.maxed; el.classList.toggle("maxed", win.maxed); win.applyRect(); win.focus(); };
    win.minimize = function () {
      win.minimized = true; el.classList.add("closing");
      setTimeout(function () { el.hidden = true; el.classList.remove("closing"); }, 150);
      TD.bus.emit("wm:minimize", win);
      if (focused === win) { focused = null; topApp.textContent = "TDPlay OS"; var top = topWin(); if (top) top.focus(); }
    };
    win.restore = function () { win.minimized = false; el.hidden = false; win.focus(); win.emit("resize"); TD.bus.emit("wm:restore", win); };
    win.close = function () {
      if (app.unmount) { try { app.unmount(win); } catch (e) { console.error(e); } }
      win.emit("close");
      el.classList.add("closing");
      delete wins[win.id];
      setTimeout(function () { el.remove(); }, 160);
      if (focused === win) { focused = null; topApp.textContent = "TDPlay OS"; var top = topWin(); if (top) top.focus(); }
      TD.bus.emit("wm:close", win);
      updateDock();
    };
    win.save = function () { if (!win.maxed && !TD.isMobile()) TD.store.set("win:" + app.id, win._rect); };

    el.addEventListener("pointerdown", function () { win.focus(); }, true);
    makeDraggable(win, title);
    makeResizable(win);
    wins[win.id] = win;
    windowsEl.appendChild(el);
    if (TD.isMobile()) { win.maxed = true; el.classList.add("maxed"); }
    win.applyRect();
    win.focus();
    try { app.mount(win, params); } catch (e) { console.error(e); body.appendChild(TD.h("div", { "class": "empty", text: "This app crashed: " + e.message })); }
    updateDock();
    TD.bus.emit("wm:open", win);
    return win;
  };
  function topWin() {
    var best = null, z = -1;
    TD.wins().forEach(function (w) { if (!w.minimized) { var zz = parseInt(w.el.style.zIndex || 0, 10); if (zz > z) { z = zz; best = w; } } });
    return best;
  }
  TD.focusedWin = function () { return focused; };
  TD.closeAll = function () { TD.wins().forEach(function (w) { w.close(); }); };

  function makeDraggable(win, handle) {
    var start = null;
    handle.addEventListener("pointerdown", function (e) {
      if (e.button !== 0 || e.target.closest("button") || TD.isMobile()) return;
      if (win.maxed) return;
      start = { x: e.clientX, y: e.clientY, rx: win._rect.x, ry: win._rect.y };
      handle.setPointerCapture(e.pointerId);
      win.el.classList.add("dragging");
    });
    handle.addEventListener("pointermove", function (e) {
      if (!start) return;
      var a = area();
      win._rect.x = Math.max(-win._rect.w + 80, Math.min(a.w - 60, start.rx + e.clientX - start.x));
      win._rect.y = Math.max(0, Math.min(a.h - 30, start.ry + e.clientY - start.y));
      win.applyRect();
    });
    var end = function (e) { if (!start) return; start = null; win.el.classList.remove("dragging"); win.save(); try { handle.releasePointerCapture(e.pointerId); } catch (x) { } };
    handle.addEventListener("pointerup", end); handle.addEventListener("pointercancel", end);
  }
  function makeResizable(win) {
    var grips = [win.el.querySelector(".win-resize")].concat(Array.prototype.slice.call(win.el.querySelectorAll(".win-edge")));
    grips.forEach(function (g) {
      var dir = g.dataset.dir || "se", start = null;
      g.addEventListener("pointerdown", function (e) {
        if (win.maxed || TD.isMobile()) return;
        e.stopPropagation();
        start = { x: e.clientX, y: e.clientY, r: Object.assign({}, win._rect) };
        g.setPointerCapture(e.pointerId); win.el.classList.add("resizing");
      });
      g.addEventListener("pointermove", function (e) {
        if (!start) return;
        var dx = e.clientX - start.x, dy = e.clientY - start.y, r = win._rect, minW = win.app.minWidth || 340, minH = win.app.minHeight || 220;
        if (dir === "se" || dir === "e") r.w = Math.max(minW, start.r.w + dx);
        if (dir === "se" || dir === "s") r.h = Math.max(minH, start.r.h + dy);
        if (dir === "w") { var nw = Math.max(minW, start.r.w - dx); r.x = start.r.x + (start.r.w - nw); r.w = nw; }
        win.applyRect();
      });
      var end = function (e) { if (!start) return; start = null; win.el.classList.remove("resizing"); win.save(); try { g.releasePointerCapture(e.pointerId); } catch (x) { } };
      g.addEventListener("pointerup", end); g.addEventListener("pointercancel", end);
    });
  }

  // ---------------------------------------------------------------- dock
  function updateDock() {
    Array.prototype.forEach.call(dockEl.querySelectorAll(".dock-item"), function (b) {
      var id = b.dataset.app;
      b.classList.toggle("running", TD.wins().some(function (w) { return w.app.id === id; }));
    });
  }
  TD.buildDock = function () {
    TD.clear(dockEl);
    var pinned = (TD.store.get("dock") || ["home", "library", "player", "spotify", "apple", "artists", "browser", "radio", "terminal", "stats", "settings"]);
    pinned.forEach(function (id, i) {
      var app = apps[id]; if (!app) return;
      if (id === "terminal" || id === "radio") dockEl.appendChild(TD.h("div", { "class": "dock-sep" }));
      var b = TD.h("button", { "class": "dock-item", dataset: { app: id }, "aria-label": app.name }, [
        TD.h("span", { "class": "ic", html: app.icon }), TD.h("span", { "class": "lbl", text: app.name }), TD.h("span", { "class": "run" })]);
      b.addEventListener("click", function () {
        var open = TD.wins().filter(function (w) { return w.app === app; });
        if (open.length && open.every(function (w) { return w.minimized; })) { open.forEach(function (w) { w.restore(); }); return; }
        if (open.length && focused && focused.app === app && open.length === 1 && !TD.isMobile()) { open[0].minimize(); return; }
        if (open.length) { open[open.length - 1].focus(); return; }
        b.classList.add("bounce"); setTimeout(function () { b.classList.remove("bounce"); }, 520);
        TD.open(id);
      });
      b.addEventListener("contextmenu", function (e) { e.preventDefault(); dockMenu(e, app); });
      dockEl.appendChild(b);
    });
    updateDock();
  };
  function dockMenu(e, app) {
    var items = [{ label: "Open " + app.name, fn: function () { TD.open(app.id); } }];
    var open = TD.wins().filter(function (w) { return w.app === app; });
    if (open.length) items.push({ label: "Close", fn: function () { open.forEach(function (w) { w.close(); }); } });
    if (app.menu) items = items.concat(app.menu());
    TD.menu(e.clientX, e.clientY - 10, items, true);
  }

  // ---------------------------------------------------------------- context menu
  var menuEl;
  TD.menu = function (x, y, items, above) {
    TD.clear(menuEl);
    items.forEach(function (it) {
      if (it === "-") { menuEl.appendChild(TD.h("hr")); return; }
      if (it.head) { menuEl.appendChild(TD.h("div", { "class": "mh", text: it.head })); return; }
      var b = TD.h("button", { html: (it.icon ? '<span class="mi" style="width:16px;height:16px;display:inline-flex">' + it.icon + "</span>" : "") + TD.esc(it.label) + (it.k ? '<span class="k">' + TD.esc(it.k) + "</span>" : "") });
      b.addEventListener("click", function () { TD.closeMenu(); it.fn && it.fn(); });
      menuEl.appendChild(b);
    });
    menuEl.hidden = false;
    var r = menuEl.getBoundingClientRect();
    var mx = Math.min(x, window.innerWidth - r.width - 8), my = above ? y - r.height : Math.min(y, window.innerHeight - r.height - 8);
    menuEl.style.left = Math.max(4, mx) + "px"; menuEl.style.top = Math.max(4, my) + "px";
  };
  TD.closeMenu = function () { menuEl.hidden = true; };

  // ---------------------------------------------------------------- dialogs
  // TD.dialog({ icon, title, body, buttons: [{label, primary, fn}], check: {label, fn} }) → the overlay element
  TD.dialog = function (o) {
    var ov = TD.h("div", { "class": "dialog-ov" });
    var close = function () { ov.classList.add("out"); setTimeout(function () { ov.remove(); }, 180); };
    var checkEl = o.check ? TD.h("input", { type: "checkbox" }) : null;
    var box = TD.h("div", { "class": "dialog glass" }, [
      o.icon ? TD.h("div", { "class": "dialog-icon", html: o.icon }) : null,
      TD.h("div", { "class": "dialog-title", html: o.title || "" }),
      o.body ? TD.h("div", { "class": "dialog-body", html: o.body }) : null,
      checkEl ? TD.h("label", { "class": "dialog-check" }, [checkEl, o.check.label]) : null,
      TD.h("div", { "class": "dialog-btns" }, (o.buttons || []).map(function (b) {
        return TD.h("button", { "class": "btn" + (b.primary ? " primary" : ""), text: b.label, onclick: function (e) { if (o.check && checkEl.checked) o.check.fn(); close(); if (b.fn) b.fn(e); } });
      }))
    ]);
    ov.appendChild(box);
    ov.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.getElementById("desktop").appendChild(ov);
    var first = box.querySelector(".btn.primary") || box.querySelector(".btn"); if (first) first.focus();
    ov.close = close;
    return ov;
  };

  // ---------------------------------------------------------------- toasts
  TD.notify = function (title, body, opts) {
    opts = opts || {};
    var t = TD.h("div", { "class": "toast" }, [
      opts.img ? TD.h("img", { src: opts.img, alt: "" }) : TD.h("span", { "class": "ic", html: opts.icon || TD.icons.about }),
      TD.h("div", { style: "min-width:0;flex:1" }, [TD.h("b", { text: title }), body ? TD.h("span", { text: body }) : null])
    ]);
    if (opts.onclick) { t.style.cursor = "pointer"; t.addEventListener("click", function () { opts.onclick(); kill(); }); }
    $("toasts").appendChild(t);
    var kill = function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 220); };
    setTimeout(kill, opts.ms || 4200);
    return t;
  };

  // ---------------------------------------------------------------- launcher (⌘K)
  var launcher, lInput, lResults, lSel = 0, lItems = [];
  TD.launcher = function (q) {
    launcher.hidden = false; lInput.value = q || ""; lInput.focus(); renderLauncher();
  };
  TD.closeLauncher = function () { launcher.hidden = true; };
  function renderLauncher() {
    var q = lInput.value.trim(), C = TD.catalog; lItems = []; lSel = 0; TD.clear(lResults);
    var add = function (head, arr) {
      if (!arr.length) return;
      lResults.appendChild(TD.h("div", { "class": "lr-h", text: head }));
      arr.forEach(function (x) {
        var row = TD.h("div", { "class": "lr" }, [
          TD.h("span", { "class": "ico", html: x.img ? '<img src="' + TD.esc(x.img) + '" alt="">' : x.icon }),
          TD.h("div", { "class": "t" }, [TD.h("b", { html: x.title }), TD.h("span", { html: x.sub || "" })]),
          x.k ? TD.h("span", { "class": "k", text: x.k }) : null]);
        var idx = lItems.length; lItems.push({ el: row, fn: x.fn });
        row.addEventListener("click", function () { TD.closeLauncher(); x.fn(); });
        row.addEventListener("mousemove", function () { setSel(idx); });
        lResults.appendChild(row);
      });
    };
    var qn = TD.norm(q);
    var appHits = TD.apps().filter(function (a) { return !a.hidden && (!qn || TD.norm(a.name).indexOf(qn) !== -1 || (a.keywords || "").indexOf(qn) !== -1); })
      .map(function (a) { return { icon: a.icon, title: TD.esc(a.name), sub: a.desc || "", k: "app", fn: function () { TD.open(a.id); } }; });
    if (!qn) {
      add("Apps", appHits);
      if (C.ready) add("Jump to", [
        { icon: TD.icons.home, title: TD.esc(C.latest().title), sub: "Latest month", fn: function () { TD.open("home", { month: C.latest().key }); } },
        { icon: TD.icons.radio, title: "TDPlay Radio", sub: "Shuffle everything ever featured", fn: function () { TD.player.radio(); } },
        { icon: TD.icons.stats, title: "Surprise me", sub: "One random song", fn: function () { TD.player.play([TD.pick(C.playable)]); } }
      ]);
      return;
    }
    add("Apps", appHits.slice(0, 3));
    if (!C.ready) return;
    var r = C.search(q, 8);
    add("Months", r.months.slice(0, 4).map(function (M) {
      return { icon: TD.icons.home, title: TD.highlight(M.title, r.toks), sub: TD.plural(M.count, "song") + " · " + M.pages.length + " pages", k: "open", fn: function () { TD.open("home", { month: M.key }); } };
    }));
    add("Artists", r.artists.slice(0, 4).map(function (A) {
      return { img: A.site ? TD.favicon(A.site, 64) : (A.latest ? TD.thumb(A.latest) : ""), icon: TD.icons.artists, title: TD.highlight(A.name, r.toks), sub: TD.plural(A.count, "song") + (A.domain ? " · " + A.domain : ""), k: "artist", fn: function () { TD.open("artists", { artist: A.key }); } };
    }));
    add("Songs", r.items.map(function (it) {
      return { img: TD.thumb(it), icon: TD.icons.player, title: TD.highlight(it.caption, r.toks), sub: TD.esc(it.month.title + (it.initials ? " · " + it.initials : "")), k: it.yt ? "play" : "open", fn: function () { if (it.yt) TD.player.play([it], 0, { from: "search" }); else TD.open("home", { month: it.month.key, page: it.page.page }); } };
    }));
    if (!lItems.length) lResults.appendChild(TD.h("div", { "class": "launcher-empty", html: "Nothing for <b>" + TD.esc(q) + "</b>" }));
    setSel(0);
  }
  function setSel(i) {
    if (!lItems.length) return;
    lSel = (i + lItems.length) % lItems.length;
    lItems.forEach(function (x, j) { x.el.classList.toggle("sel", j === lSel); });
    lItems[lSel].el.scrollIntoView({ block: "nearest" });
  }

  // ---------------------------------------------------------------- init
  TD.wm = { init: function () {
    desktop = $("desktop"); windowsEl = $("windows"); dockEl = $("dock"); topApp = $("tb-app"); menuEl = $("menu");
    launcher = $("launcher"); lInput = $("launcher-input"); lResults = $("launcher-results");
    lInput.addEventListener("input", TD.debounce(renderLauncher, 60));
    lInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSel(lSel + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setSel(lSel - 1); }
      else if (e.key === "Enter") { e.preventDefault(); if (lItems[lSel]) { TD.closeLauncher(); lItems[lSel].fn(); } }
      else if (e.key === "Escape") { TD.closeLauncher(); }
    });
    launcher.addEventListener("pointerdown", function (e) { if (e.target === launcher) TD.closeLauncher(); });
    document.addEventListener("pointerdown", function (e) { if (!menuEl.hidden && !menuEl.contains(e.target)) TD.closeMenu(); }, true);
    window.addEventListener("resize", function () { TD.wins().forEach(function (w) { w.applyRect(); }); });
    // clock
    var clock = $("tb-clock");
    var tick = function () { var d = new Date(); clock.textContent = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + "  " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }); };
    tick(); setInterval(tick, 15000);
    $("tb-search").addEventListener("click", function () { TD.launcher(); });
    $("tb-full").addEventListener("click", function () {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      var p = document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen() : Promise.reject();
      if (TD.embedded) Promise.resolve(p).catch(function () { window.open(TD.standaloneUrl(), "_blank"); });
    });
    if (TD.embedded) {
      $("tb-full").title = "Full screen (or open TDPlay OS in its own tab)";
      var ext = TD.h("button", { "class": "tb-btn", title: "Open TDPlay OS in its own tab", html: TD.icons.ext.replace("<svg", '<svg style="fill:currentColor;stroke:none"') , onclick: function () { window.open(TD.standaloneUrl(), "_blank"); } });
      $("tb-full").parentNode.insertBefore(ext, $("tb-full"));
    }
    $("tb-logo").addEventListener("click", function (e) {
      var r = e.currentTarget.getBoundingClientRect();
      TD.menu(r.left, r.bottom + 4, [
        { label: "About TDPlay OS", fn: function () { TD.open("about"); } }, "-",
        { label: "Search…", k: "⌘K", fn: function () { TD.launcher(); } },
        { label: "Settings", fn: function () { TD.open("settings"); } }, "-",
        TD.embedded ? { label: "Open TDPlay OS in its own tab", icon: TD.icons.ext, fn: function () { window.open(TD.standaloneUrl(), "_blank"); } } : { label: "Open tdplay.site", icon: TD.icons.ext, fn: function () { window.open(TD.SITE, "_blank"); } },
        { label: "TDPlay Search", icon: TD.icons.ext, fn: function () { window.open(TD.SEARCH_URL, "_blank"); } }, "-",
        { label: "Close all windows", fn: function () { TD.closeAll(); } },
        { label: "Restart", fn: function () { location.reload(); } }
      ]);
    });
    $("tb-now").addEventListener("click", function (e) { if (!e.target.closest("button")) TD.open("player"); });
    $("tb-now-toggle").addEventListener("click", function () { TD.player.toggle(); });
    $("tb-now-next").addEventListener("click", function () { TD.player.next(); });
    // desktop context menu
    $("wallpaper").addEventListener("contextmenu", function (e) {
      e.preventDefault();
      TD.menu(e.clientX, e.clientY, [
        { label: "Change wallpaper…", fn: function () { TD.open("settings", { tab: "look" }); } },
        { label: "Play something random", fn: function () { TD.player.play([TD.pick(TD.catalog.playable)]); } },
        { label: "TDPlay Radio", fn: function () { TD.player.radio(); } }, "-",
        { label: "About TDPlay OS", fn: function () { TD.open("about"); } }
      ]);
    });
    // keyboard
    document.addEventListener("keydown", function (e) {
      var inField = /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || "")) || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); launcher.hidden ? TD.launcher() : TD.closeLauncher(); return; }
      if (e.key === "Escape") { if (!launcher.hidden) TD.closeLauncher(); else if (!menuEl.hidden) TD.closeMenu(); return; }
      if (inField) return;
      if (e.key === "/" ) { e.preventDefault(); TD.launcher(); }
      else if (e.key === " ") { if (TD.player.hasTrack()) { e.preventDefault(); TD.player.toggle(); } }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w") { if (focused) { e.preventDefault(); focused.close(); } }
      else if (e.key === "MediaTrackNext" || (e.shiftKey && e.key === "ArrowRight")) TD.player.next();
      else if (e.key === "MediaTrackPrevious" || (e.shiftKey && e.key === "ArrowLeft")) TD.player.prev();
    });
  } };
})(window.TD);
