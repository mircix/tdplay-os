var f = document.getElementById("f");
var IG = "https://www.instagram.com/", OS = "https://mircix.github.io/tdplay-os/?embed=1";

// Instagram refuses to be framed (X-Frame-Options / CSP frame-ancestors). Lift that only for frames that
// belong to no tab — this panel's — so instagram.com stays unframeable on every website. Session rules
// vanish on browser restart and extension reload, so the panel (re)adds it before loading anything.
var FRAMEABLE = {
  id: 1,
  priority: 1,
  action: {
    type: "modifyHeaders",
    responseHeaders: ["x-frame-options", "frame-options", "content-security-policy", "content-security-policy-report-only",
      "cross-origin-opener-policy", "cross-origin-embedder-policy", "cross-origin-resource-policy"]
      .map(function (h) { return { header: h, operation: "remove" }; })
  },
  condition: { requestDomains: ["instagram.com"], resourceTypes: ["sub_frame"], tabIds: [-1] }   // -1 = chrome.tabs.TAB_ID_NONE
};
var ready = chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [FRAMEABLE.id], addRules: [FRAMEABLE] })
  .catch(function (e) { console.error("Instagram side panel: couldn't add the framing rule", e); });

// Asking for the page the frame is already pointed at has to land you back on it even when you've browsed
// deeper inside the panel (a profile, a reel, a search). Navigating the frame itself does that without
// piling up history — a cross-origin frame can still be sent somewhere, it just can't be read.
function nav(url) {
  if (f.getAttribute("src") === url) {
    try { f.contentWindow.location.replace(url); return; } catch (e) { }
    f.removeAttribute("src");                                   // last resort: let the assignment below load it fresh
  }
  f.src = url;
}

var fix = document.getElementById("fix");

function go(url, btn) {
  fix.hidden = true;
  ready.then(function () { nav(url); });
  [].forEach.call(document.querySelectorAll(".bar button[data-go]"), function (b) { b.classList.toggle("on", b === btn); });
  document.getElementById("tdplay").classList.toggle("on", url === OS);
}
// an Instagram path ("", "reels/", "mitch_tdp/", "p/<id>/") — never anywhere but instagram.com
function openPath(path) {
  var u; try { u = new URL(path || "", IG); } catch (e) { return; }
  if (u.origin !== new URL(IG).origin) return;
  var btn = [].filter.call(document.querySelectorAll(".bar button[data-go]"), function (b) { return IG + b.dataset.go === u.href; })[0] || null;
  go(u.href, btn);
}
[].forEach.call(document.querySelectorAll("button[data-go]"), function (b) {
  b.addEventListener("click", function () { go(IG + b.dataset.go, b); });
});
document.getElementById("reload").addEventListener("click", function () { nav(f.getAttribute("src") || IG); });
document.getElementById("tdplay").addEventListener("click", function () {
  go((f.getAttribute("src") || "").indexOf("tdplay-os") > -1 ? IG : OS, null);
});

// Instagram clicked in TDPlay OS (sw.js stores the request): a fresh one on opening, or any while open
var win = chrome.windows.getCurrent().then(function (w) { return w.id; }, function () { return null; });
function forMe(g, wid) { return g && (g.windowId == null || wid == null || g.windowId === wid); }
function onTDPlayOS() { return (f.getAttribute("src") || "").indexOf("tdplay-os") > -1; }

// Opening the panel starts at Home — unless TDPlay OS just asked for somewhere in particular.
function opened() {
  Promise.all([win, chrome.storage.session.get("go")]).then(function (r) {
    var g = r[1].go;
    if (forMe(g, r[0]) && Date.now() - g.at < 10000) openPath(g.path); else openPath("");
  });
}
opened();

// Chrome usually rebuilds this page each time the panel opens, which runs the line above. When it keeps the
// page instead, the panel comes back exactly where it was left — three profiles deep from last time. So treat
// coming back after a long while away as a fresh open too; a quick switch away and back keeps your place.
var hiddenAt = 0;
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState !== "visible") { hiddenAt = Date.now(); return; }
  var away = Date.now() - hiddenAt;
  if (!hiddenAt || away < 300000 || onTDPlayOS()) return;      // 5 minutes
  hiddenAt = 0;
  opened();
});
chrome.storage.onChanged.addListener(function (ch, area) {
  if (area !== "session" || !ch.go || !ch.go.newValue) return;
  win.then(function (wid) { if (forMe(ch.go.newValue, wid)) openPath(ch.go.newValue.path); });
});

// recover.js reports from inside the frame when Instagram's app lands on "Sorry, this page isn't available"
// — which it does to pages that are perfectly fine, including a tap in its own bottom bar. A real load of the
// same address renders it, so do that once; if the same page comes back wrong, say so instead of looping.
var retried = {};
function fixBar(where) {
  fix.hidden = false;
  document.getElementById("fix-reload").onclick = function () { retried[where] = 0; openPath(where); };
  document.getElementById("fix-tab").onclick = function () {
    try { chrome.tabs.create({ url: new URL(where, IG).href }); } catch (e) { }
    fix.hidden = true;
  };
}
chrome.runtime.onMessage.addListener(function (msg) {
  if (!msg || typeof msg.igError !== "string") return;
  var where = msg.igError, now = Date.now();
  if (retried[where] && now - retried[where] < 60000) { fixBar(where); return; }
  retried[where] = now;
  openPath(where);
});
