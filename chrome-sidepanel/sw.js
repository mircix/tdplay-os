/* TDPlay OS — Instagram side panel: the toolbar button opens the panel, and so does Instagram in TDPlay OS.
   The framing rule lives in panel.js. */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function () { });

// "Show Instagram": from bridge.js in a TDPlay OS page (the usual way — a click there still counts as one
// here, which is what lets the panel open), or straight from the page itself where that is allowed.
function show(msg, sender, reply) {
  if (!msg) return false;
  if (msg.ping) { if (reply) reply({ ok: true }); return false; }
  if (typeof msg.instagram !== "string") return false;
  var windowId = sender && sender.tab ? sender.tab.windowId : null;   // no tab: TDPlay OS inside the panel, already open
  // first thing, while the click still counts
  var opened = windowId == null ? Promise.resolve() : chrome.sidePanel.open({ windowId: windowId });
  chrome.storage.session.set({ go: { path: msg.instagram, windowId: windowId, at: Date.now() } });   // the panel picks it up
  opened.then(function () { if (reply) reply({ ok: true }); },
              function (e) { console.error("Instagram side panel: couldn't open", e); if (reply) reply({ ok: false, error: e.message }); });
  return true;                                                        // reply comes later
}
chrome.runtime.onMessage.addListener(show);
chrome.runtime.onMessageExternal.addListener(show);
