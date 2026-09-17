/* About */
(function (TD) {
  "use strict";
  TD.register({
    id: "about", name: "About TDPlay OS", desc: "", icon: TD.icons.about, width: 560, height: 330, hidden: true,
    mount: function (win) {
      var C = TD.catalog;
      win.body.appendChild(TD.h("div", { "class": "about" }, [
        TD.h("img", { src: "assets/logo.png", alt: "" }),
        TD.h("div", {}, [
          TD.h("h1", { html: "TDPlay <em>OS</em>" }),
          TD.h("div", { "class": "ver", text: "Version " + TD.VERSION + " · catalog " + (C.meta.generated || "").slice(0, 10) }),
          TD.h("p", { "class": "muted", style: "margin:10px 0", text: "A music desktop built on every song ever featured on tdplay.site — " + C.items.length + " songs, " + C.months.length + " months, " + C.artists.length + " artists." }),
          TD.h("div", { "class": "pill-row" }, [
            TD.h("a", { "class": "btn sm", href: TD.SITE, target: "_blank", rel: "noopener", html: TD.icons.ext + " tdplay.site" }),
            TD.h("a", { "class": "btn sm", href: "https://github.com/mircix/tdplay-os", target: "_blank", rel: "noopener", html: TD.icons.ext + " Source" }),
            TD.h("button", { "class": "btn sm", text: "Keyboard shortcuts", onclick: function () { TD.notify("Shortcuts", "⌘K or / search · space play/pause · ⇧← ⇧→ prev/next · ⌘W close window", { ms: 8000 }); } })
          ])
        ])
      ]));
    }
  });
})(window.TD);
