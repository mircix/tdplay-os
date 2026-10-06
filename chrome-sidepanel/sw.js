/* TDPlay OS — Instagram side panel: the toolbar button opens the panel, and Instagram's own
   "I'm in a frame, break out" check is neutralised inside the panel's frame. */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function () { });

chrome.runtime.onInstalled.addListener(function () {
  chrome.scripting.registerContentScripts([{
    id: "ig-unframe",
    matches: ["https://*.instagram.com/*"],
    allFrames: true,
    matchOriginAsFallback: true,
    runAt: "document_start",
    world: "MAIN",
    js: ["unframe.js"]
  }]).catch(function () { });
});
