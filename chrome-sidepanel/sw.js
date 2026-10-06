/* TDPlay OS — Instagram side panel: the toolbar button opens the panel, and so does Instagram in TDPlay OS.
   The framing rule lives in panel.js. */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function () { });

// TDPlay OS (see externally_connectable) asks: { ping } "are you there?", { instagram: "reels/" } "show this".
chrome.runtime.onMessageExternal.addListener(function (msg, sender, reply) {
  if (!msg) return;
  if (msg.ping) { reply({ ok: true }); return; }
  if (typeof msg.instagram !== "string") return;
  var windowId = sender.tab ? sender.tab.windowId : null;   // no tab: TDPlay OS inside the panel itself, already open
  // first thing: Chrome only allows opening the panel while the click in TDPlay OS still counts
  var opened = windowId == null ? Promise.resolve() : chrome.sidePanel.open({ windowId: windowId });
  chrome.storage.session.set({ go: { path: msg.instagram, windowId: windowId, at: Date.now() } });   // the panel picks it up
  opened.then(function () { reply({ ok: true }); }, function (e) { reply({ ok: false, error: e.message }); });
  return true;                                               // reply comes later
});
