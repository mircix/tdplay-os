/* Runs inside instagram.com when it is in the side panel. Instagram's app sometimes resolves a tap in its
   own bottom bar (or the first load) to its "Sorry, this page isn't available" screen, even though the page
   is fine — a real load of the same address renders it. This only reports; the panel decides what to do. */
(function () {
  if (window.top === window.self) return;                    // an ordinary tab — nothing to do with us
  if (location.pathname.indexOf("/embed") > -1) return;      // Instagram's own post embeds

  function missing() {
    if (/page not found/i.test(document.title)) return true;
    var el = document.querySelector("main") || document.body;
    var t = el ? (el.textContent || "").slice(0, 2000) : "";  // textContent, so this costs no layout
    return /isn.t available/i.test(t) && /link you followed/i.test(t);   // both lines, so a caption can't trip it
  }

  try { chrome.runtime.sendMessage({ igAlive: location.pathname }); } catch (e) { }   // the panel notes we're here

  var reported = "";
  setInterval(function () {
    var where = location.pathname + location.search;
    if (!missing()) { reported = ""; return; }           // fine again — a later failure here is worth reporting
    if (reported === where) return;                          // already told the panel about this one
    reported = where;
    try { chrome.runtime.sendMessage({ igError: where }); } catch (e) { }
  }, 700);
})();
