/* TDPlay OS — catalog: loads the tdplay-search index and builds months / items / artists */
(function (TD) {
  "use strict";
  var MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  var C = TD.catalog = { ready: false, months: [], monthByKey: {}, items: [], artists: [], artistByKey: {}, years: [], featured: [], meta: {} };

  // Year playlists + "Keep up with" channels from the tdplay.site home page
  C.yearPlaylists = [
    { year: 2026, spotify: "https://open.spotify.com/playlist/4Ddx0f9yGMiU8nhUGAOGnM", apple: "https://music.apple.com/gb/playlist/tdplay26/pl.u-55D6vZ3FVa759v" },
    { year: 2025, spotify: "https://open.spotify.com/playlist/7oCZepFuV7PYWLUracKV8I", apple: "https://music.apple.com/gb/playlist/tdplay25/pl.u-MDAWb86Fq7jMy6" },
    { year: 2024, spotify: "https://open.spotify.com/playlist/2srDbrCD0QiZKS5U4SE5ZG", apple: "https://music.apple.com/gb/playlist/tdplay24/pl.u-4Jom8B2um9rLB8" },
    { year: 2023, spotify: "https://open.spotify.com/playlist/5xVxMB7iIJ7gLDVa7A0RMJ", apple: "https://music.apple.com/gb/playlist/tdplay23/pl.u-06oxMMNuo6DgdK" },
    { year: 2022, spotify: "https://open.spotify.com/playlist/1xIHazeYuH0ip0cqU0cAkp", apple: "https://music.apple.com/gb/playlist/tdplay22/pl.u-zPyLY5RFxRj0z3" },
    { year: 2021, spotify: "https://open.spotify.com/playlist/3HLCWLIXQLtUVCEHFzbIFM", apple: "https://music.apple.com/gb/playlist/tdplay21/pl.u-r2yBYAkFjWNXgB" },
    { year: 2020, spotify: "https://open.spotify.com/playlist/0v6l1QuxFJ3jioCbVNZjSQ", apple: "https://music.apple.com/gb/playlist/tdplay20/pl.u-zPyLBygIxRj0z3" },
    { year: 2019, spotify: "https://open.spotify.com/playlist/50vOt5cHXJeY44umCmANKQ", apple: "https://music.apple.com/gb/playlist/tdplay19/pl.u-zPyLBoXFxRj0z3" },
    { year: 2018, spotify: "https://open.spotify.com/playlist/4fHAaaxdJohH8PqqCNICWz", apple: "https://music.apple.com/gb/playlist/tdplay18/pl.u-XkD0YmphZejPV5" }
  ];
  C.keepUp = [
    { name: "The Kelly Clarkson Show", url: "https://www.youtube.com/@kellyclarksonshow", handle: "@kellyclarksonshow" },
    { name: "Zach Sang Show", url: "https://www.youtube.com/@zachsangshow", handle: "@zachsangshow" },
    { name: "Call Her Daddy", url: "https://www.youtube.com/@callherdaddy", handle: "@callherdaddy" },
    { name: "WITN Pod with Sasha Pieterse", url: "https://www.youtube.com/@sashapieterse", handle: "@sashapieterse" },
    { name: "TDPlay on YouTube", url: "https://www.youtube.com/@MitchTDP", handle: "@MitchTDP" }
  ];

  function parseMonth(label) {
    var m = /^([a-z]+)'(\d\d)$/i.exec(label || "");
    if (!m) return null;
    var name = m[1].toLowerCase(), idx = MONTHS.indexOf(name);
    if (idx < 0 && name === "xmas") idx = 12;                  // the Christmas specials sort after December
    if (idx < 0) return null;
    return { name: idx === 12 ? "Xmas" : m[1][0].toUpperCase() + name.slice(1), idx: idx, year: 2000 + parseInt(m[2], 10), sort: (2000 + parseInt(m[2], 10)) * 13 + idx };
  }
  C.monthAliases = function (label) {
    var m = /^([a-z]+)'(\d\d)$/i.exec(label || "");
    if (!m) return [TD.norm(label)];
    var name = m[1].toLowerCase(), yy = m[2], yyyy = "20" + yy, ab = name.slice(0, 3);
    var out = [name + " " + yy, ab + " " + yy, name + " " + yyyy, ab + " " + yyyy, name + "'" + yy, ab + "'" + yy, name, yyyy];
    if (name === "xmas") out = out.concat(["christmas " + yy, "christmas " + yyyy, "christmas", "xmas"]);
    return out;
  };

  // -------------------------------------------------------------- load
  C.load = function (onProgress) {
    var url = TD.store.get("dataUrl") || TD.DATA_URL;
    onProgress = onProgress || function () { };
    return fetch(url, { cache: "default" }).then(function (r) {
      if (!r.ok) throw new Error("data.json " + r.status);
      var total = parseInt(r.headers.get("content-length") || "0", 10);
      if (!r.body || !total) { onProgress(.4, "Downloading catalog…"); return r.json(); }
      var reader = r.body.getReader(), chunks = [], got = 0;
      return (function pump() {
        return reader.read().then(function (res) {
          if (res.done) {
            var buf = new Uint8Array(got), off = 0;
            chunks.forEach(function (c) { buf.set(c, off); off += c.length; });
            return JSON.parse(new TextDecoder().decode(buf));
          }
          chunks.push(res.value); got += res.value.length;
          onProgress(Math.min(.85, got / total * .85), "Downloading catalog… " + Math.round(got / 1024) + " KB");
          return pump();
        });
      })();
    }).then(function (data) {
      onProgress(.9, "Indexing " + data.itemCount + " songs…");
      build(data);
      onProgress(1, "Ready");
      C.ready = true;
      TD.bus.emit("catalog:ready", C);
      return C;
    });
  };

  // "https://www.linktr.ee/Artist/" -> "linktr.ee/artist" (host + path, so shared platforms don't merge everyone)
  function siteKey(url) {
    try { var u = new URL(url); return (u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/+$/, "")).toLowerCase(); } catch (e) { return TD.norm(url); }
  }
  // Group items into artists. A website usually identifies an artist, but label / aggregator pages
  // (a record label, a K-pop profile site) are shared by many — those are split by the artist name instead.
  function groupArtists(items, artists) {
    var bySite = {};
    items.forEach(function (it) { if (it.siteKey) (bySite[it.siteKey] = bySite[it.siteKey] || []).push(it); });
    var keyOf = {};                                            // item.id -> artist key
    Object.keys(bySite).forEach(function (sk) {
      var list = bySite[sk], names = {}, total = 0;
      list.forEach(function (it) { if (it.artist) { var n = TD.norm(it.artist); names[n] = (names[n] || 0) + 1; total++; } });
      // the curated initials on each card are the reliable signal: one artist -> one set of initials
      var inis = {}, itotal = 0;
      list.forEach(function (it) { if (it.initials) { var c = TD.norm(it.initials).replace(/\s+/g, ""); inis[c] = (inis[c] || 0) + 1; itotal++; } });
      var topIni = Object.keys(inis).sort(function (a, b) { return inis[b] - inis[a]; })[0];
      var shared = Object.keys(inis).length >= 3 && inis[topIni] / itotal < 0.6;
      list.forEach(function (it) { keyOf[it.id] = shared ? (it.artist ? "n:" + TD.norm(it.artist) : "s:" + sk) : "s:" + sk; });
    });
    // items with no site join a site group whose dominant name matches, else group by name
    var nameToSite = {};
    Object.keys(bySite).forEach(function (sk) {
      var names = {}; bySite[sk].forEach(function (it) { if (it.artist && keyOf[it.id] === "s:" + sk) { var n = TD.norm(it.artist); names[n] = (names[n] || 0) + 1; } });
      Object.keys(names).forEach(function (n) { if (names[n] >= 2 && !nameToSite[n]) nameToSite[n] = "s:" + sk; });
    });
    items.forEach(function (it) {
      var k = keyOf[it.id];
      if (!k) { var n = it.artist ? TD.norm(it.artist) : ""; k = n ? (nameToSite[n] || "n:" + n) : ""; }
      if (!k) return;
      it.artistKey = k;
      var A = artists[k] || (artists[k] = { key: k, site: "", names: {}, inis: {}, items: [], first: it.month, last: it.month });
      if (it.artist) A.names[it.artist] = (A.names[it.artist] || 0) + 1;
      if (it.initials) A.inis[it.initials] = (A.inis[it.initials] || 0) + 1;
      if (!A.site && it.site) A.site = it.site;
      A.items.push(it);
      if (it.month.sort < A.first.sort) A.first = it.month;
      if (it.month.sort > A.last.sort) A.last = it.month;
    });
  }

  // Name for a website whose captions never repeat an artist name: the longest word run that most captions share.
  var JUNK = { official: 1, video: 1, music: 1, lyric: 1, lyrics: 1, audio: 1, cover: 1, rock: 1, by: 1, ft: 1, feat: 1, with: 1, live: 1, version: 1, visualizer: 1, acoustic: 1, remix: 1, mv: 1, the: 1, a: 1, an: 1, and: 1, x: 1, of: 1, from: 1, on: 1, in: 1, new: 1, single: 1, song: 1, performance: 1, session: 1, sessions: 1 };
  function commonName(items) {
    var caps = items.map(function (it) { return TD.tokens(it.caption); }), counts = {};
    caps.forEach(function (toks) {
      var seen = {};
      for (var n = 1; n <= 4; n++) for (var i = 0; i + n <= toks.length; i++) {
        if (JUNK[toks[i]] || JUNK[toks[i + n - 1]] || /^\d+$/.test(toks[i])) continue;
        var g = toks.slice(i, i + n).join(" "); if (seen[g]) continue; seen[g] = 1; counts[g] = (counts[g] || 0) + 1;
      }
    });
    var best = null, bestN = 0, need = Math.max(2, Math.ceil(items.length * 0.6));
    Object.keys(counts).forEach(function (g) { var n = g.split(" ").length; if (counts[g] >= need && (n > bestN || (n === bestN && counts[g] > counts[best]))) { best = g; bestN = n; } });
    if (!best) return "";
    // recover the original casing from a caption that contains it
    for (var k = 0; k < items.length; k++) {
      var cap = items[k].caption, folded = TD.foldKeepLength(cap), idx = folded.indexOf(best);
      if (idx !== -1) return cap.slice(idx, idx + best.length).replace(/[\)\]]+$/, "").trim();
    }
    return best;
  }

  // -------------------------------------------------------------- build
  function build(data) {
    C.meta = { generated: data.generated, pageCount: data.pageCount, itemCount: data.itemCount, site: data.site };
    var months = {}, items = [], artists = {}, ord = 0;
    (data.pages || []).forEach(function (p) {
      var pm = parseMonth(p.month);
      if (!pm) return;                                          // menu / year pages carry no songs
      var mk = p.month;
      var M = months[mk] || (months[mk] = { key: mk, label: mk, name: pm.name, year: pm.year, idx: pm.idx, sort: pm.sort,
        title: "TDPlay -" + mk, pages: [], items: [], playlists: {}, source: p.source || "hostinger", url: "" });
      var page = { slug: p.slug, url: p.url, name: p.name, page: p.page || 1, items: [], source: p.source || "hostinger", month: M };
      M.pages.push(page);
      if (p.playlists) Object.keys(p.playlists).forEach(function (k) { if (p.playlists[k] && !M.playlists[k]) M.playlists[k] = p.playlists[k]; });
      if (page.page === 1 || !M.url) M.url = p.url;
      (p.items || []).forEach(function (raw, i) {
        if (!raw.yt && !raw.thumb && !raw.spotify && !raw.apple) return;
        var sc = TD.splitCaption(raw.caption || "");
        var artist = (raw.artist && raw.artist.trim()) || sc.artist;
        var title = raw.artist && raw.artist.trim() ? (raw.title || "") : sc.title;
        // wix rows sometimes put "Title" in artist and "Artist [Official Video]" in title; trust the caption split when it looks like that
        if (raw.artist && /official|video|audio|lyric/i.test(raw.title || "") && sc.artist) { artist = sc.artist; title = sc.title; }
        var it = {
          id: p.slug + "/" + (raw.yt || raw.anchor || i), ord: ord++,
          yt: raw.yt || "", caption: raw.caption || raw.title || "", artist: artist, title: TD.cleanTitle(title || raw.caption || ""),
          initials: raw.initials || "", site: raw.site || "", apple: raw.apple || "", spotify: raw.spotify || "", youtube: raw.youtube || "",
          thumb: raw.thumb || "", anchor: raw.anchor || "", featured: !!raw.featured, alt: raw.alt || "",
          page: page, month: M, slot: i
        };
        it.url = p.url + (it.yt ? "?v=" + it.yt : "") + (it.anchor ? "#" + it.anchor : "");
        page.items.push(it); M.items.push(it); items.push(it);
        if (it.featured) C.featured.push(it);
        it.siteKey = it.site ? siteKey(it.site) : "";
      });
    });
    groupArtists(items, artists);
    C.months = Object.keys(months).map(function (k) { return months[k]; }).sort(function (a, b) { return b.sort - a.sort; });
    C.months.forEach(function (M) { M.pages.sort(function (a, b) { return a.page - b.page; }); M.count = M.items.length; C.monthByKey[M.key] = M; });
    C.items = items;
    C.years = [];
    var ymap = {};
    C.months.forEach(function (M) {
      var Y = ymap[M.year] || (ymap[M.year] = { year: M.year, months: [], items: [] });
      Y.months.push(M); Y.items = Y.items.concat(M.items);
    });
    C.years = Object.keys(ymap).map(function (y) { return ymap[y]; }).sort(function (a, b) { return b.year - a.year; });
    C.artists = Object.keys(artists).map(function (k) {
      var A = artists[k];
      var best = Object.keys(A.names).sort(function (a, b) { return A.names[b] - A.names[a] || a.length - b.length; })[0];
      if (best && A.names[best] < 2 && A.items.length >= 2) best = commonName(A.items) || best;   // e.g. '"Song" - Artist (Rock Cover by First To Eleven)' on every card
      var ini = Object.keys(A.inis).sort(function (a, b) { return A.inis[b] - A.inis[a]; })[0] || "";
      if (!best) best = ini ? ini : (A.site ? TD.domain(A.site) : "Unknown");
      A.name = best; A.initials = ini; A.count = A.items.length;
      A.norm = TD.norm(best); A.domain = A.site ? TD.domain(A.site) : "";
      A.items.sort(function (a, b) { return b.month.sort - a.month.sort || a.ord - b.ord; });
      A.latest = A.items[0];
      return A;
    }).sort(function (a, b) { return b.count - a.count || a.norm.localeCompare(b.norm); });
    C.artists.forEach(function (A) { C.artistByKey[A.key] = A; });
    C.playable = items.filter(function (it) { return it.yt; });
    buildSearch();
  }

  // -------------------------------------------------------------- search (ported from search.js)
  var docs = [], monthDocs = [];
  function buildSearch() {
    docs = []; monthDocs = [];
    C.months.forEach(function (M) {
      var text = TD.norm(M.title) + " " + C.monthAliases(M.key).join(" ");
      monthDocs.push({ month: M, text: text });
      M.items.forEach(function (it) {
        docs.push({ it: it, cap: TD.norm(it.caption), ini: TD.norm(it.initials), art: TD.norm(it.artist), alt: TD.norm(it.alt), text: text });
      });
    });
  }
  function has(hay, t) {
    if (/^\d+$/.test(t)) return (" " + hay + " ").indexOf(" " + t + " ") !== -1;
    if (t.length <= 3) return (" " + hay).indexOf(" " + t) !== -1;
    return hay.indexOf(t) !== -1;
  }
  function score(d, toks, qn) {
    var s = 0;
    for (var k = 0; k < toks.length; k++) {
      var t = toks[k], hit = 0;
      if (d.ini && d.ini === t) hit = 60;
      else if (has(d.cap, t)) { hit = 20; if (d.art && has(d.art, t)) hit += 15; if (d.cap.indexOf(t) === 0 || d.cap.indexOf(" " + t) !== -1) hit += 6; }
      else if (d.alt && has(d.alt, t)) hit = 16;
      else if (has(d.text, t)) hit = 4;
      if (!hit) return 0;
      s += hit;
    }
    if (qn.length > 2 && d.cap.indexOf(qn) !== -1) s += 25;
    if (qn.length > 2 && d.cap.indexOf(qn) === 0) s += 30;
    if (qn && d.art === qn) s += 40;
    if (d.it.featured) s += 3;
    if (d.ini && d.ini === qn) s += 40;
    return s;
  }
  C.search = function (q, limit) {
    var toks = TD.tokens(q), qn = TD.norm(q);
    if (!toks.length) return { items: [], months: [], artists: [], toks: [] };
    var res = [];
    for (var i = 0; i < docs.length; i++) { var s = score(docs[i], toks, qn); if (s > 0) res.push({ it: docs[i].it, s: s }); }
    var strict = res.filter(function (r) { return r.s > 4 * toks.length + 3; });   // page/month-only hits (incl. the featured bonus) don't count as real matches
    if (strict.length) res = strict;
    res.sort(function (a, b) { return b.s - a.s || a.it.ord - b.it.ord; });
    var months = monthDocs.filter(function (md) { return toks.every(function (t) { return has(md.text, t); }); }).map(function (md) { return md.month; });
    var artists = C.artists.filter(function (A) { return toks.every(function (t) { return has(A.norm, t) || (A.initials && TD.norm(A.initials) === t); }); }).slice(0, 12);
    return { items: limit ? res.slice(0, limit).map(function (r) { return r.it; }) : res.map(function (r) { return r.it; }), total: res.length, months: months, artists: artists, toks: toks };
  };
  C.findMonth = function (q) {
    var qn = TD.norm(q);
    if (!qn) return null;
    for (var i = 0; i < C.months.length; i++) if (C.monthAliases(C.months[i].key).indexOf(qn) !== -1) return C.months[i];
    var r = C.search(q); return r.months[0] || null;
  };
  C.findArtist = function (q) {
    var qn = TD.norm(q); if (!qn) return null;
    var exact = C.artists.filter(function (A) { return A.norm === qn || TD.norm(A.initials) === qn; })[0];
    if (exact) return exact;
    return C.artists.filter(function (A) { return A.norm.indexOf(qn) !== -1; })[0] || null;
  };
  C.latest = function () { return C.months[0]; };
  // sites.json: which artist websites allow being framed (built by tools/probe_sites.py)
  C.sites = null;
  C.loadSites = function () {
    return fetch("sites.json", { cache: "default" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { C.sites = j && j.sites || {}; TD.bus.emit("sites:ready"); }).catch(function () { C.sites = {}; });
  };
  C.frameable = function (url) {                     // true / false / undefined (unknown)
    if (!C.sites) return undefined;
    var e = C.sites[TD.domain(url).toLowerCase()];
    return e ? !!e.f : undefined;
  };
  C.siteUrl = function (url) {                       // https-upgraded (a plain-http frame would be blocked on the https:// OS anyway)
    return url.replace(/^http:\/\//, "https://");
  };
  C.random = function (n, filter) {
    var pool = filter ? C.playable.filter(filter) : C.playable;
    return TD.shuffle(pool).slice(0, n || 50);
  };
})(window.TD);
