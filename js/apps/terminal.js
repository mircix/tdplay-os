/* Terminal — a toy shell over the catalog. Try: help, play lolo, month aug 26, radio 2024, neofetch */
(function (TD) {
  "use strict";
  TD.register({
    id: "terminal", name: "Terminal", desc: "play <artist>, month <aug 26>, radio, stats…", icon: TD.icons.terminal, width: 760, height: 520, single: false, keywords: "terminal shell console",
    mount: function (win) {
      var C = TD.catalog, out = TD.h("div", { "class": "term" }), input = TD.h("input", { type: "text", autocomplete: "off", spellcheck: "false", autocapitalize: "off" });
      var hist = TD.store.get("term:hist", []), hi = hist.length, cwd = null;
      var inRow = TD.h("div", { "class": "in ln" }, [TD.h("span", { "class": "p", text: "" }), input]);
      out.appendChild(inRow); win.body.appendChild(out);
      out.addEventListener("click", function () { input.focus(); });
      function prompt() { inRow.firstChild.textContent = "tdplay" + (cwd ? ":" + cwd.key : "") + " $ "; }
      function print(html, cls) { out.insertBefore(TD.h("div", { "class": "ln " + (cls || ""), html: html }), inRow); out.scrollTop = out.scrollHeight; }
      function echo(cmd) { print('<span class="p">' + TD.esc(inRow.firstChild.textContent) + "</span>" + TD.esc(cmd)); }
      function link(label, fn) { var id = "t" + Math.random().toString(36).slice(2); setTimeout(function () { var a = out.querySelector("#" + id); if (a) a.addEventListener("click", function (e) { e.preventDefault(); fn(); }); }, 0); return '<a href="#" id="' + id + '">' + TD.esc(label) + "</a>"; }
      function songLine(it, i) { return '<span class="g">' + (i != null ? String(i + 1).padStart(3) + "  " : "") + "</span>" + link(it.caption, function () { TD.ui.play(it); }) + (it.initials ? ' <span class="m">' + TD.esc(it.initials) + "</span>" : "") + ' <span class="g">' + TD.esc(it.month.key) + "</span>"; }
      var cmds = {
        help: function () { print('<span class="y">TDPlay OS shell</span>\n' + [
          ["help", "this"], ["ls", "list months (or songs in the current month)"], ["cd <month>", "enter a month, e.g. cd aug 26 · cd .. to leave"], ["play <query>", "play the best match (artist, song, initials)"],
          ["play", "play the whole current month"], ["search <q>", "list matches"], ["artist <name>", "artist card"], ["radio [year]", "endless shuffle"], ["random", "one random song"],
          ["next / prev / pause / stop", "transport"], ["queue", "show the queue"], ["open <app>", "home library player spotify apple artists browser stats settings"], ["stats", "numbers"],
          ["neofetch", "you know"], ["clear", "clear screen"], ["exit", "close terminal"]].map(function (r) { return '  <span class="c">' + r[0].padEnd(28) + "</span>" + r[1]; }).join("\n")); },
        ls: function () {
          if (cwd) { cwd.items.forEach(function (it, i) { print(songLine(it, i)); }); return; }
          var cols = C.months.map(function (M) { return link(M.key, function () { cwd = M; prompt(); print('<span class="g">→ ' + TD.esc(M.title) + " · " + M.count + " songs</span>"); }); });
          print(cols.join("   "));
        },
        cd: function (a) { if (!a || a === "..") { cwd = null; prompt(); return; } var M = C.findMonth(a); if (!M) return print('<span class="p">no such month:</span> ' + TD.esc(a)); cwd = M; prompt(); print('<span class="g">' + TD.esc(M.title) + " · " + TD.plural(M.count, "song") + " · " + M.pages.length + " pages · " + link("open in Home", function () { TD.open("home", { month: M.key }); }) + "</span>"); },
        play: function (a) {
          if (!a) { if (cwd) { TD.player.play(cwd.items, 0, { label: cwd.title }); return print('<span class="g">▶ ' + TD.esc(cwd.title) + "</span>"); } if (TD.player.hasTrack()) return TD.player.toggle(); return print("play what? try <span class='c'>play lolo</span>"); }
          var A = C.findArtist(a);
          if (A && TD.norm(a) === A.norm) { TD.player.play(A.items, 0, { label: A.name }); return print('<span class="g">▶ ' + TD.esc(A.name) + " · " + TD.plural(A.items.filter(function (i) { return i.yt; }).length, "song") + "</span>"); }
          var r = C.search(a, 1); if (!r.items.length) return print('<span class="p">nothing found for</span> ' + TD.esc(a));
          TD.player.play([r.items[0]]); print('<span class="g">▶</span> ' + songLine(r.items[0]));
        },
        search: function (a) { if (!a) return print("search what?"); var r = C.search(a, 15); if (!r.items.length) return print('<span class="p">nothing found</span>'); r.items.forEach(function (it, i) { print(songLine(it, i)); }); if (r.total > 15) print('<span class="g">… ' + (r.total - 15) + " more in " + link("Library", function () { TD.open("library", { q: a }); }) + "</span>"); },
        artist: function (a) { var A = C.findArtist(a || ""); if (!A) return print('<span class="p">no artist:</span> ' + TD.esc(a)); print('<span class="y">' + TD.esc(A.name) + "</span>" + (A.initials ? ' <span class="m">' + TD.esc(A.initials) + "</span>" : "") + "\n  " + TD.plural(A.count, "song") + " · first " + A.first.key + " · latest " + A.last.key + (A.site ? "\n  " + link(A.site, function () { TD.open("browser", { url: A.site, title: A.name }); }) : "") + "\n  " + link("open card", function () { TD.open("artists", { artist: A.key }); }) + " · " + link("play all", function () { TD.player.play(A.items, 0, { label: A.name }); })); },
        radio: function (a) { var y = parseInt(a, 10); if (y) { TD.player.radio({ label: "TDPlay " + y + " Radio", desc: String(y), filter: function (it) { return it.month.year === y; } }); } else TD.player.radio(); print('<span class="g">📻 radio on</span>'); },
        random: function () { var it = TD.pick(C.playable); TD.player.play([it]); print('<span class="g">▶</span> ' + songLine(it)); },
        next: function () { TD.player.next(); }, prev: function () { TD.player.prev(); }, pause: function () { TD.player.toggle(); }, stop: function () { TD.player.stop(); print('<span class="g">stopped</span>'); },
        queue: function () { if (!TD.player.queue.length) return print('<span class="g">queue empty</span>'); TD.player.queue.forEach(function (it, i) { print((i === TD.player.index ? '<span class="y">▶</span>' : " ") + songLine(it, i)); }); },
        open: function (a) { var app = TD.app((a || "").toLowerCase()); if (!app) return print('<span class="p">no app:</span> ' + TD.esc(a) + " · apps: " + TD.apps().filter(function (x) { return !x.hidden; }).map(function (x) { return x.id; }).join(" ")); TD.open(app.id); },
        stats: function () { print('<span class="y">TDPlay by the numbers</span>\n  songs     ' + C.items.length + "\n  months    " + C.months.length + " (" + C.years[C.years.length - 1].year + "–" + C.years[0].year + ")\n  artists   " + C.artists.length + "\n  websites  " + C.artists.filter(function (a) { return a.site; }).length + "\n  index     " + TD.esc(C.meta.generated || "") + "\n  " + link("open Stats", function () { TD.open("stats"); })); },
        neofetch: function () {
          var top = C.artists[0];
          var art = ["  ████████╗██████╗ ", "  ╚══██╔══╝██╔══██╗", "     ██║   ██║  ██║", "     ██║   ██║  ██║", "     ██║   ██████╔╝", "     ╚═╝   ╚═════╝ "];
          var info = ["<span class='y'>tdplay</span>@<span class='y'>os</span>", "──────────", "OS: TDPlay OS " + TD.VERSION, "Kernel: tdplay-search index " + (C.meta.generated || "").slice(0, 10), "Uptime: " + Math.round((Date.now() - TD.bootTime) / 60000) + " min", "Songs: " + C.items.length + " · Months: " + C.months.length, "Top artist: " + TD.esc(top.name) + " (" + top.count + ")", "Shell: tdsh 1.0", "Now: " + (TD.player.current() ? TD.esc(TD.player.current().caption) : "silence")];
          print(art.map(function (l, i) { return '<span class="p">' + l + "</span>   " + (info[i] || ""); }).join("\n") + "\n" + info.slice(art.length).map(function (l) { return "                      " + l; }).join("\n"));
        },
        clear: function () { Array.prototype.slice.call(out.querySelectorAll(".ln")).forEach(function (l) { if (l !== inRow) l.remove(); }); },
        exit: function () { win.close(); },
        about: function () { TD.open("about"); },
        whoami: function () { print("a person with excellent taste in music"); },
        sudo: function () { print('<span class="p">nice try.</span> this OS runs on vibes, not root.'); }
      };
      cmds.man = cmds.help; cmds.dir = cmds.ls; cmds.find = cmds.search; cmds.np = function () { var it = TD.player.current(); print(it ? "▶ " + songLine(it) : '<span class="g">nothing playing</span>'); };
      function run(line) {
        var m = /^(\S+)\s*(.*)$/.exec(line.trim()); if (!m) return;
        var c = m[1].toLowerCase(), a = m[2];
        if (cmds[c]) { try { cmds[c](a); } catch (e) { print('<span class="p">error:</span> ' + TD.esc(e.message)); } }
        else if (C.findMonth(line)) cmds.cd(line);
        else print('<span class="p">command not found:</span> ' + TD.esc(c) + ' · try <span class="c">help</span> or <span class="c">play ' + TD.esc(line) + "</span>");
      }
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { var v = input.value; input.value = ""; echo(v); if (v.trim()) { hist.push(v); hist = hist.slice(-100); TD.store.set("term:hist", hist); hi = hist.length; run(v); } }
        else if (e.key === "ArrowUp") { e.preventDefault(); if (hi > 0) { hi--; input.value = hist[hi] || ""; } }
        else if (e.key === "ArrowDown") { e.preventDefault(); if (hi < hist.length) { hi++; input.value = hist[hi] || ""; } }
        else if (e.key === "Tab") { e.preventDefault(); var v = input.value; var k = Object.keys(cmds).filter(function (c) { return c.indexOf(v) === 0; }); if (k.length === 1) input.value = k[0] + " "; else if (k.length) print(k.join("  ")); }
        else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); cmds.clear(); }
        else if (e.key === "c" && e.ctrlKey) { input.value = ""; }
      });
      print('<span class="y">TDPlay OS</span> shell · ' + C.items.length + " songs indexed · type <span class='c'>help</span>");
      prompt(); setTimeout(function () { input.focus(); }, 50);
      win.on("resize", function () { });
    }
  });
})(window.TD);
