/* Runs inside TDPlay OS's own pages. Two jobs:
   - mark the page, so the OS knows the panel is installed without having to know the extension's id;
   - relay "open Instagram" to the extension from inside the click that asked for it, because Chrome only
     opens a side panel while a click is still being handled. A DOM event keeps that; a postMessage wouldn't. */
(function () {
  var root = document.documentElement;
  if (!root) return;
  root.setAttribute("data-tdplay-panel", chrome.runtime.id);

  document.addEventListener("tdplay-panel", function (e) {
    var path = root.getAttribute("data-tdplay-path");           // plain DOM: no reading across worlds
    if (path == null && e && typeof e.detail === "string") path = e.detail;
    try { chrome.runtime.sendMessage({ instagram: path || "" }); } catch (err) { }
  }, true);
})();
