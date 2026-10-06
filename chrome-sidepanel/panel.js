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

function go(url, btn) {
  ready.then(function () { f.src = url; });
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
document.getElementById("reload").addEventListener("click", function () { f.src = f.src; });
document.getElementById("tdplay").addEventListener("click", function () {
  go(f.src.indexOf("tdplay-os") > -1 ? IG : OS, null);
});

// Instagram clicked in TDPlay OS (sw.js stores the request): a fresh one on opening, or any while open
var win = chrome.windows.getCurrent().then(function (w) { return w.id; }, function () { return null; });
function forMe(g, wid) { return g && (g.windowId == null || wid == null || g.windowId === wid); }
Promise.all([win, chrome.storage.session.get("go")]).then(function (r) {
  var g = r[1].go;
  if (forMe(g, r[0]) && Date.now() - g.at < 10000) openPath(g.path); else openPath("");
});
chrome.storage.onChanged.addListener(function (ch, area) {
  if (area !== "session" || !ch.go || !ch.go.newValue) return;
  win.then(function (wid) { if (forMe(ch.go.newValue, wid)) openPath(ch.go.newValue.path); });
});
