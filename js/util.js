/* TDPlay OS — shared helpers, event bus, storage, icons */
window.TD = window.TD || {};
(function (TD) {
  "use strict";

  TD.VERSION = "1.0.0";
  TD.SITE = "https://tdplay.site";
  TD.DATA_URL = "https://mircix.github.io/tdplay-search/data.json";
  TD.SEARCH_URL = "https://mircix.github.io/tdplay-search/";
  TD.embedded = (function () { try { return window.top !== window.self; } catch (e) { return true; } })();   // running inside tdplay.site
  TD.standaloneUrl = function () { return location.origin + location.pathname.replace(/index\.html$/, ""); };

  // ---------------------------------------------------------------- dom
  TD.h = function (tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.indexOf("on") === 0 && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "dataset") Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
      else el.setAttribute(k, v === true ? "" : v);
    });
    if (children != null) (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  };
  TD.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  TD.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  TD.svg = function (paths, attrs) {
    var a = Object.assign({ viewBox: "0 0 24 24" }, attrs || {});
    var s = '<svg xmlns="http://www.w3.org/2000/svg"';
    Object.keys(a).forEach(function (k) { s += " " + k + '="' + a[k] + '"'; });
    return s + ">" + paths + "</svg>";
  };

  // ---------------------------------------------------------------- text
  var TRANSLIT = { "ø": "o", "ł": "l", "đ": "d", "ð": "d", "þ": "th", "æ": "ae", "œ": "oe", "ß": "ss", "ı": "i", "ħ": "h", "ŧ": "t" };
  function stripMarks(s) { try { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) { return s; } }
  TD.norm = function (s) {
    s = stripMarks(String(s || "").toLowerCase());
    s = s.replace(/[øłđðþæœßıħŧ]/g, function (c) { return TRANSLIT[c] || c; });
    return s.replace(/[‘’ʼ]/g, "'").replace(/[^\p{L}\p{N}'&+#]+/gu, " ").replace(/\s+/g, " ").trim();
  };
  TD.tokens = function (q) { return TD.norm(q).split(" ").filter(Boolean); };
  TD.foldKeepLength = function (text) {
    var out = "";
    for (var i = 0; i < text.length; i++) {
      var c = stripMarks(text[i].toLowerCase()); c = TRANSLIT[c] || c;
      out += c ? c[0] : text[i].toLowerCase();
    }
    return out;
  };
  TD.highlight = function (text, toks) {
    if (!toks || !toks.length) return TD.esc(text);
    var lower = TD.foldKeepLength(String(text)), ranges = [];
    toks.forEach(function (t) {
      var from = 0, idx;
      while (t.length >= 2 && (idx = lower.indexOf(t, from)) !== -1) { ranges.push([idx, idx + t.length]); from = idx + t.length; }
    });
    if (!ranges.length) return TD.esc(text);
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var out = "", pos = 0;
    ranges.forEach(function (r) { if (r[0] < pos) return; out += TD.esc(text.slice(pos, r[0])) + "<mark>" + TD.esc(text.slice(r[0], r[1])) + "</mark>"; pos = r[1]; });
    return out + TD.esc(text.slice(pos));
  };
  TD.splitCaption = function (caption) {
    // "Artist - Title (Official Video)" -> {artist, title}
    var c = String(caption || ""), seps = [" - ", " – ", " — ", " | "];
    for (var i = 0; i < seps.length; i++) {
      var p = c.indexOf(seps[i]);
      if (p > 0 && p <= 45) return { artist: c.slice(0, p).trim(), title: c.slice(p + seps[i].length).trim() };
    }
    return { artist: "", title: c };
  };
  TD.cleanTitle = function (t) {
    return String(t || "").replace(/\s*[\(\[]\s*(official|offical)[^\)\]]*[\)\]]\s*/ig, " ").replace(/\s*\|\s*official.*$/i, "").replace(/\s{2,}/g, " ").trim();
  };
  TD.domain = function (url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  };
  TD.favicon = function (url, size) {
    var d = TD.domain(url); if (!d) return "";
    return "https://www.google.com/s2/favicons?sz=" + (size || 64) + "&domain=" + encodeURIComponent(d);
  };
  TD.thumb = function (it, big) {
    if (it.yt) return "https://i.ytimg.com/vi/" + it.yt + "/" + (big ? "hqdefault" : "mqdefault") + ".jpg";
    if (it.thumb) return it.thumb.indexOf("sp:") === 0 ? "https://i.scdn.co/image/" + it.thumb.slice(3) : it.thumb;
    return "";
  };
  TD.fmtTime = function (ms) {
    var s = Math.max(0, Math.floor((ms || 0) / 1000)), m = Math.floor(s / 60); s = s % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  };
  TD.plural = function (n, w) { return n + " " + w + (n === 1 ? "" : "s"); };
  TD.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  TD.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  TD.debounce = function (fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; };
  TD.isMobile = function () { return window.innerWidth <= 720; };
  TD.spotifyUri = function (url) {
    var m = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist)\/([A-Za-z0-9]+)/.exec(url || "");
    return m ? "spotify:" + m[1] + ":" + m[2] : "";
  };
  TD.spotifyEmbed = function (url) {
    var m = /open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist)\/([A-Za-z0-9]+)/.exec(url || "");
    return m ? "https://open.spotify.com/embed/" + m[1] + "/" + m[2] + "?utm_source=generator&theme=0" : "";
  };
  TD.appleEmbed = function (url) {
    if (!url) return "";
    return url.replace(/^https?:\/\/music\.apple\.com\//, "https://embed.music.apple.com/").replace(/(\?|&)ls=1/, "$1");
  };

  // ---------------------------------------------------------------- store / bus
  TD.store = {
    get: function (k, d) { try { var v = localStorage.getItem("tdos:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("tdos:" + k, JSON.stringify(v)); } catch (e) { } },
    del: function (k) { try { localStorage.removeItem("tdos:" + k); } catch (e) { } }
  };
  var listeners = {};
  TD.bus = {
    on: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return function () { TD.bus.off(ev, fn); }; },
    off: function (ev, fn) { listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; }); },
    emit: function (ev, data) { (listeners[ev] || []).slice().forEach(function (f) { try { f(data); } catch (e) { console.error(ev, e); } }); }
  };

  // ---------------------------------------------------------------- icons
  var G = function (id, c1, c2) { return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>'; };
  var tile = function (id, c1, c2, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + G(id, c1, c2) +
      '<rect x="2" y="2" width="60" height="60" rx="15" fill="url(#' + id + ')"/>' +
      '<rect x="2" y="2" width="60" height="60" rx="15" fill="none" stroke="rgba(255,255,255,.25)"/>' +
      '<path d="M12 2h40a10 10 0 0 1 10 10v6H2v-6A10 10 0 0 1 12 2z" fill="rgba(255,255,255,.12)"/>' + inner + "</svg>";
  };
  TD.icons = {
    home: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="15" fill="#0b0b12" stroke="rgba(255,255,255,.22)"/><image href="assets/logo.png" x="6" y="6" width="52" height="52" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 12px)"/></svg>',
    library: tile("gLib", "#2a2a3d", "#101018", '<rect x="14" y="16" width="14" height="14" rx="3" fill="#b1ffff"/><rect x="36" y="16" width="14" height="14" rx="3" fill="#ff5cf0"/><rect x="14" y="36" width="14" height="14" rx="3" fill="#ffd166"/><rect x="36" y="36" width="14" height="14" rx="3" fill="#ff2b2b"/>'),
    player: tile("gPl", "#ff3b3b", "#a10d1c", '<circle cx="32" cy="32" r="18" fill="rgba(0,0,0,.28)"/><path d="M27 22l14 10-14 10z" fill="#fff"/>'),
    spotify: tile("gSp", "#1ed760", "#0f7a37", '<circle cx="32" cy="32" r="20" fill="#0b0b12"/><path d="M20 27.5c8-2.5 17-1.5 24 3M22 33.5c6.5-2 13.5-1 19 2.5M24 39c5-1.5 10-.8 14 1.7" fill="none" stroke="#1ed760" stroke-width="3.2" stroke-linecap="round"/>'),
    apple: tile("gAp", "#fc5c7d", "#c0153e", '<path d="M39 17l-13 3v22a6 6 0 1 1-4-5.5V22.5l17-4V38a6 6 0 1 1-4-5.5z" fill="#fff"/>'),
    artists: tile("gAr", "#5b5bff", "#1f1f8a", '<circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="3"/><path d="M16 32h32M32 16c6 6 6 26 0 32M32 16c-6 6-6 26 0 32" fill="none" stroke="#fff" stroke-width="2.4"/>'),
    browser: tile("gBr", "#40e0d0", "#12706a", '<rect x="14" y="16" width="36" height="32" rx="6" fill="#0b0b12"/><rect x="14" y="16" width="36" height="9" rx="4" fill="rgba(255,255,255,.2)"/><circle cx="19" cy="20.5" r="1.6" fill="#ff5f57"/><circle cx="24" cy="20.5" r="1.6" fill="#febc2e"/><circle cx="29" cy="20.5" r="1.6" fill="#28c840"/><path d="M22 34h20M22 40h13" stroke="#40e0d0" stroke-width="2.5" stroke-linecap="round"/>'),
    terminal: tile("gTe", "#2b2b38", "#0a0a10", '<path d="M18 22l10 10-10 10" fill="none" stroke="#1ed760" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 42h14" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'),
    stats: tile("gSt", "#ffd166", "#c47f00", '<rect x="16" y="34" width="8" height="14" rx="2" fill="#0b0b12"/><rect x="28" y="24" width="8" height="24" rx="2" fill="#0b0b12"/><rect x="40" y="16" width="8" height="32" rx="2" fill="#0b0b12"/>'),
    settings: tile("gSe", "#8e8ea0", "#3a3a48", '<circle cx="32" cy="32" r="8" fill="none" stroke="#fff" stroke-width="3.5"/><path d="M32 12v7M32 45v7M12 32h7M45 32h7M18 18l5 5M41 41l5 5M18 46l5-5M41 23l5-5" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>'),
    radio: tile("gRa", "#ff5cf0", "#7a1a80", '<circle cx="32" cy="32" r="6" fill="#fff"/><path d="M22 22a14 14 0 0 0 0 20M42 22a14 14 0 0 1 0 20M16 16a22 22 0 0 0 0 32M48 16a22 22 0 0 1 0 32" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'),
    about: tile("gAb", "#ff2b2b", "#2a0a10", '<text x="32" y="43" text-anchor="middle" font-family="Oswald,Impact,sans-serif" font-size="30" fill="#fff">TD</text>'),
    keepup: tile("gKu", "#ff2b2b", "#5a0a12", '<rect x="16" y="20" width="32" height="24" rx="6" fill="#fff"/><path d="M29 26l9 6-9 6z" fill="#ff2b2b"/>'),
    // brand glyphs for link buttons (24px)
    youtube: TD.svg('<path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/>'),
    spotifyG: TD.svg('<path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.5 17.3a.75.75 0 0 1-1 .25c-2.8-1.7-6.4-2.1-10.6-1.15a.75.75 0 1 1-.33-1.46c4.6-1.05 8.5-.6 11.65 1.33.35.22.46.68.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.3c-3.2-2-8.1-2.55-11.9-1.4a.94.94 0 1 1-.55-1.8c4.35-1.32 9.75-.68 13.44 1.6.44.27.58.86.3 1.3zm.13-3.4C15.26 8.35 8.9 8.13 5.23 9.25a1.13 1.13 0 1 1-.65-2.16c4.2-1.28 11.2-1.03 15.63 1.6a1.13 1.13 0 0 1-1.15 1.94z"/>'),
    appleG: TD.svg('<path d="M18.7 2.5v13.1a3.4 3.4 0 1 1-2-3.1V6.7L9.3 8.3v9.3a3.4 3.4 0 1 1-2-3.1V5.4a1 1 0 0 1 .8-1l9.4-2.1a1 1 0 0 1 1.2 1z"/>'),
    site: TD.svg('<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-3a15.5 15.5 0 0 0-1.3-5.5A8 8 0 0 1 18.9 11zM12 4c.9 1.2 1.7 3.7 1.9 7h-3.8c.2-3.3 1-5.8 1.9-7zM5.1 11a8 8 0 0 1 4.3-5.5A15.5 15.5 0 0 0 8.1 11h-3zm0 2h3a15.5 15.5 0 0 0 1.3 5.5A8 8 0 0 1 5.1 13zm6.9 7c-.9-1.2-1.7-3.7-1.9-7h3.8c-.2 3.3-1 5.8-1.9 7zm2.6-1.5a15.5 15.5 0 0 0 1.3-5.5h3a8 8 0 0 1-4.3 5.5z"/>'),
    play: TD.svg('<path d="M8 5v14l11-7z"/>'),
    pause: TD.svg('<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'),
    next: TD.svg('<path d="M6 6l8 6-8 6zM16 6h2v12h-2z"/>'),
    prev: TD.svg('<path d="M18 6l-8 6 8 6zM6 6h2v12H6z"/>'),
    shuffleG: TD.svg('<path d="M17 4l4 3-4 3V8h-2.5L9 16H4v-2h4L13.5 6H17V4zM4 8h4l1.6 2.3-1.2 1.8L7 10H4V8zm11 6h2v-2l4 3-4 3v-2h-3l-2.2-3.2 1.2-1.8L15 14z"/>'),
    repeatG: TD.svg('<path d="M7 7h10V4l4 3.5L17 11V9H9v4H7V7zm10 10H7v3l-4-3.5L7 13v2h8v-4h2v6z"/>'),
    ext: TD.svg('<path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3zM5 5h5v2H7v10h10v-3h2v5H5V5z"/>'),
    search: TD.svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', { fill: "none", stroke: "currentColor", "stroke-width": "2.2", "stroke-linecap": "round" }),
    back: TD.svg('<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
    fwd: TD.svg('<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
    reload: TD.svg('<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
    star: TD.svg('<path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z"/>')
  };
  TD.linkIcons = function (it, cls) {
    var out = [];
    var L = function (href, c, ic, title) {
      out.push(TD.h("a", { href: href, target: "_blank", rel: "noopener", "class": c, title: title, html: ic, onclick: function (e) { e.stopPropagation(); } }));
    };
    if (it.yt) L("https://www.youtube.com/watch?v=" + it.yt, "l-youtube", TD.icons.youtube, "Watch on YouTube");
    else if (it.youtube) L(it.youtube, "l-youtube", TD.icons.youtube, "Watch on YouTube");
    if (it.apple) L(it.apple, "l-apple", TD.icons.appleG, "Apple Music");
    if (it.spotify) L(it.spotify, "l-spotify", TD.icons.spotifyG, "Spotify");
    if (it.site) L(it.site, "l-site", TD.icons.site, "Artist website");
    return TD.h("div", { "class": cls || "links" }, out);
  };
})(window.TD);
