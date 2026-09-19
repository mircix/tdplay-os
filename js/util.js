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
    var u = url.replace(/^https?:\/\/music\.apple\.com\//, "https://embed.music.apple.com/").replace(/[?&]ls=1(?=&|$)/, "");
    u = u.replace(/[?&]theme=[a-z]+/, "");
    return u + (u.indexOf("?") === -1 ? "?" : "&") + "theme=dark";        // Apple's embed honours theme=dark
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
  // ---- app icons: real brand marks (YouTube / Spotify / Apple Music glyph geometry from Simple Icons, CC0)
  //      and macOS-style tiles for the system apps. 64x64, rounded like an iOS icon.
  var YT_PATH = "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z";
  var SP_PATH = "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z";
  var AM_PATH = "M18.7 2.5v13.1a3.4 3.4 0 1 1-2-3.1V6.7L9.3 8.3v9.3a3.4 3.4 0 1 1-2-3.1V5.4a1 1 0 0 1 .8-1l9.4-2.1a1 1 0 0 1 1.2 1z";
  var SVG64 = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">';
  var tile = function (id, stops, inner, angle) {
    var grad = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="' + (angle === "v" ? "0" : "1") + '" y2="1">' +
      stops.map(function (st, i) { return '<stop offset="' + (i / Math.max(1, stops.length - 1)) + '" stop-color="' + st + '"/>'; }).join("") + "</linearGradient></defs>";
    return SVG64 + grad + '<rect x="0" y="0" width="64" height="64" rx="14.5" fill="url(#' + id + ')"/>' + inner +
      '<rect x=".5" y=".5" width="63" height="63" rx="14" fill="none" stroke="rgba(0,0,0,.35)"/></svg>';
  };
  var poly = function (n, r, cx, cy, fn) { var o = []; for (var i = 0; i < n; i++) o.push(fn(i * Math.PI * 2 / n, r, cx, cy)); return o.join(""); };
  // Safari compass: 72 ticks round the dial, needle red north-east / white south-west
  var safariTicks = poly(72, 23, 32, 32, function (a, r, cx, cy) {
    var long = (Math.round(a / (Math.PI * 2) * 72) % 6) === 0, r0 = long ? r - 4 : r - 2;
    return '<line x1="' + (cx + Math.cos(a) * r0).toFixed(1) + '" y1="' + (cy + Math.sin(a) * r0).toFixed(1) + '" x2="' + (cx + Math.cos(a) * r).toFixed(1) + '" y2="' + (cy + Math.sin(a) * r).toFixed(1) + '" stroke="#fff" stroke-width="' + (long ? 1.2 : .7) + '" stroke-opacity=".9"/>';
  });
  var gear = (function () { var pts = []; for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8, r = i % 2 ? 22 : 17; for (var k = -1; k <= 1; k += 2) { var aa = a + k * (i % 2 ? .13 : .2); pts.push((32 + Math.cos(aa) * r).toFixed(1) + "," + (32 + Math.sin(aa) * r).toFixed(1)); } } return pts; })();
  TD.icons = {
    home: SVG64 + '<rect x="0" y="0" width="64" height="64" rx="14.5" fill="#0b0b12"/><image href="assets/logo.png" x="4" y="4" width="56" height="56" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 12px)"/><rect x=".5" y=".5" width="63" height="63" rx="14" fill="none" stroke="rgba(255,255,255,.18)"/></svg>',
    // Library: dark tile with a 2x2 grid of album tiles in the TDPlay colours
    library: tile("gLi", ["#32323b", "#101015"],
      '<defs><linearGradient id="gLi1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a5a"/><stop offset="1" stop-color="#c2181f"/></linearGradient>' +
      '<linearGradient id="gLi2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7cf3"/><stop offset="1" stop-color="#b52ca4"/></linearGradient>' +
      '<linearGradient id="gLi3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bafcfc"/><stop offset="1" stop-color="#2fb5c4"/></linearGradient>' +
      '<linearGradient id="gLi4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#d9a01e"/></linearGradient></defs>' +
      '<rect x="13" y="13" width="17" height="17" rx="4" fill="url(#gLi1)"/><rect x="34" y="13" width="17" height="17" rx="4" fill="url(#gLi2)"/>' +
      '<rect x="13" y="34" width="17" height="17" rx="4" fill="url(#gLi3)"/><rect x="34" y="34" width="17" height="17" rx="4" fill="url(#gLi4)"/>' +
      '<path d="' + AM_PATH + '" fill="rgba(255,255,255,.92)" transform="translate(16.5 16.5) scale(.42)"/>' +
      '<rect x="13" y="13" width="38" height="38" rx="4" fill="none" stroke="rgba(255,255,255,.08)"/>', "v"),
    // YouTube
    player: tile("gYt", ["#32323b", "#101015"], '<path d="' + YT_PATH + '" fill="#FF0000" transform="translate(11 11) scale(1.75)"/><path d="M9.545 15.568V8.432L15.818 12z" fill="#fff" transform="translate(11 11) scale(1.75)"/>', "v"),
    // Spotify
    spotify: tile("gSp", ["#191414", "#000000"], '<path d="' + SP_PATH + '" fill="#1ED760" transform="translate(11.5 11.5) scale(1.708)"/>', "v"),
    // Apple Music
    apple: tile("gAm", ["#FB5C74", "#FA233B"], '<path d="' + AM_PATH + '" fill="#fff" transform="translate(11 11) scale(1.75)"/>', "v"),
    // Artists: dark music-profile tile — silhouette with a note badge
    artists: tile("gAr", ["#32323b", "#101015"],
      '<circle cx="32" cy="31" r="21" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.12)"/>' +
      '<circle cx="32" cy="24" r="8.5" fill="#f4f4f7"/><path d="M15 50c1.2-10.5 8-16 17-16s15.8 5.5 17 16z" fill="#f4f4f7"/>' +
      '<circle cx="46.5" cy="45.5" r="9.5" fill="#ff2b2b" stroke="#101015" stroke-width="2.5"/>' +
      '<path d="' + AM_PATH + '" fill="#fff" transform="translate(40.2 39.2) scale(.52)"/>', "v"),
    // Safari
    browser: tile("gSa", ["#32323b", "#101015"],
      '<defs><radialGradient id="gSaB" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#37b3ff"/><stop offset="1" stop-color="#0a5ce6"/></radialGradient></defs><circle cx="32" cy="32" r="25" fill="url(#gSaB)"/>' + safariTicks +
      '<path d="M32 32L47.5 16.5 36 36z" fill="#ff3b30"/><path d="M32 32L16.5 47.5 28 28z" fill="#fff"/><path d="M47.5 16.5 36 36 28 28z" fill="#e0261d"/><path d="M16.5 47.5 28 28l8 8z" fill="#dcdce2"/>', "v"),
    // Terminal
    terminal: SVG64 + '<rect x="0" y="0" width="64" height="64" rx="14.5" fill="#1b1b1f"/><path d="M14.5 0h35A14.5 14.5 0 0 1 64 14.5V15H0v-.5A14.5 14.5 0 0 1 14.5 0z" fill="#d8d8dc"/><path d="M16 26l11 9-11 9" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 44h16" stroke="#fff" stroke-width="4" stroke-linecap="round"/><rect x=".5" y=".5" width="63" height="63" rx="14" fill="none" stroke="rgba(0,0,0,.4)"/></svg>',
    // Numbers
    stats: tile("gNu", ["#3fd964", "#1fa64a"], '<rect x="14" y="36" width="9" height="14" rx="1.5" fill="#fff"/><rect x="27.5" y="24" width="9" height="26" rx="1.5" fill="#fff"/><rect x="41" y="14" width="9" height="36" rx="1.5" fill="#fff"/>', "v"),
    // System Settings
    settings: tile("gSe", ["#b4b4ba", "#77777e"], '<polygon points="' + gear.join(" ") + '" fill="#3d3d42"/><circle cx="32" cy="32" r="7.5" fill="#c9c9ce"/>', "v"),
    // Instagram
    instagram: SVG64 + '<defs><radialGradient id="gIg" cx=".3" cy="1.05" r="1.25"><stop offset="0" stop-color="#fdd835"/><stop offset=".25" stop-color="#f9a825"/><stop offset=".5" stop-color="#e91e63"/><stop offset=".78" stop-color="#9c27b0"/><stop offset="1" stop-color="#3f51b5"/></radialGradient></defs>' +
      '<rect x="0" y="0" width="64" height="64" rx="14.5" fill="url(#gIg)"/>' +
      '<rect x="14" y="14" width="36" height="36" rx="10.5" fill="none" stroke="#fff" stroke-width="3.6"/><circle cx="32" cy="32" r="8.6" fill="none" stroke="#fff" stroke-width="3.6"/><circle cx="41.8" cy="22.2" r="2.4" fill="#fff"/>' +
      '<rect x=".5" y=".5" width="63" height="63" rx="14" fill="none" stroke="rgba(0,0,0,.35)"/></svg>',
    // Radio (Apple-style, no single "real" app for this one)
    radio: tile("gRa", ["#c77dff", "#7a2fe0"], '<circle cx="32" cy="34" r="5.5" fill="#fff"/><path d="M21 23a15 15 0 0 0 0 22M43 23a15 15 0 0 1 0 22M14 16a25 25 0 0 0 0 36M50 16a25 25 0 0 1 0 36" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>', "v"),
    about: SVG64 + '<rect x="0" y="0" width="64" height="64" rx="14.5" fill="#0b0b12"/><image href="assets/logo.png" x="4" y="4" width="56" height="56" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 12px)"/></svg>',
    keepup: tile("gKu", ["#32323b", "#101015"], '<path d="' + YT_PATH + '" fill="#FF0000" transform="translate(11 11) scale(1.75)"/><path d="M9.545 15.568V8.432L15.818 12z" fill="#fff" transform="translate(11 11) scale(1.75)"/>', "v"),
    // brand glyphs for link buttons (24px)
    youtube: TD.svg('<path d="' + YT_PATH + '"/>'),
    spotifyG: TD.svg('<path d="' + SP_PATH + '"/>'),
    appleG: TD.svg('<path d="' + AM_PATH + '"/>'),
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
