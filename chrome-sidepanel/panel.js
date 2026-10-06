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
// Instagram also answers a *framed* request differently from a tab's: its "Sorry, this page isn't
// available" screen, which is why its own in-page links work and our load of the same address doesn't.
// So the panel's requests say what they are to the person reading them — a normal visit to instagram.com.
var ASNAV = {
  id: 2,
  priority: 1,
  action: {
    type: "modifyHeaders",
    requestHeaders: [
      { header: "referer", operation: "set", value: IG },
      { header: "sec-fetch-site", operation: "set", value: "same-origin" },
      { header: "sec-fetch-dest", operation: "set", value: "document" },
      { header: "sec-fetch-mode", operation: "set", value: "navigate" },
      { header: "sec-fetch-user", operation: "set", value: "?1" }
    ]
  },
  condition: { requestDomains: ["instagram.com"], resourceTypes: ["sub_frame"], tabIds: [-1] }
};
function rule(r, what) {
  return chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [r.id], addRules: [r] })
    .catch(function (e) { console.error("Instagram side panel: couldn't add the " + what + " rule", e); });
}
// separately, so one being refused can't take the other down with it
var ready = Promise.all([rule(FRAMEABLE, "framing"), rule(ASNAV, "navigation")]);

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

var fix = document.getElementById("fix"), fixMsg = document.getElementById("fix-msg"), fixBtns = document.getElementById("fix-btns");

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
document.getElementById("ig").addEventListener("click", function () { openPath(""); });
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
  fixMsg.textContent = "Instagram keeps showing its \u201cpage isn\u2019t available\u201d screen for this one. ";
  fixBtns.hidden = false;
  fix.hidden = false;
  document.getElementById("fix-reload").onclick = function () { retried[where] = 0; openPath(where); };
  document.getElementById("fix-tab").onclick = function () {
    try { chrome.tabs.create({ url: new URL(where, IG).href }); } catch (e) { }
    fix.hidden = true;
  };
}
var watching = false;
chrome.runtime.onMessage.addListener(function (msg) {
  if (msg && msg.igAlive) { watching = true; console.log("TDPlay panel: the Instagram frame is being watched (" + msg.igAlive + ")"); return; }
  if (!msg || typeof msg.igError !== "string") return;
  var where = msg.igError, now = Date.now();
  if (retried[where] && now - retried[where] < 60000) { fixBar(where); return; }
  retried[where] = now;
  openPath(where);
});

// If nothing inside the frame ever reports in, Chrome isn't running recover.js there and nothing can notice
// Instagram's not-available screen for you. Say so once, quietly, rather than leaving you waiting for a
// reload that will never come.
f.addEventListener("load", function () {
  setTimeout(function () {
    if (watching || fix.hidden === false || !/instagram\.com/.test(f.getAttribute("src") || "")) return;
    console.log("TDPlay panel: no reply from inside the Instagram frame \u2014 automatic reloading is off here");
    if (localStorage.getItem("tdos-watchless") === "1") return;
    try { localStorage.setItem("tdos-watchless", "1"); } catch (e) { }
    fixMsg.textContent = "If a page here says it isn't available, press \u27f3 \u2014 it usually loads on the second go.";
    fixBtns.hidden = true;
    fix.hidden = false;
    setTimeout(function () { fix.hidden = true; }, 12000);
  }, 6000);
});

// TDPlay OS running inside this panel (the TDPlay OS button) asking to switch back to Instagram.
window.addEventListener("message", function (e) {
  if (!e.data || typeof e.data.tdplayInstagram !== "string") return;
  if (!/^https:\/\/mircix\.github\.io$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(e.origin)) return;
  openPath(e.data.tdplayInstagram);
});
