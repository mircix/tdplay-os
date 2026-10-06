/* TDPlay OS — Instagram side panel.
   The header rule that lets instagram.com render in a frame is OFF by default and only switched on
   while the panel is actually open, so Instagram keeps its normal protection everywhere else. */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function () { });

function ruleset(on) {
  return chrome.declarativeNetRequest.updateEnabledRulesets(
    on ? { enableRulesetIds: ["frameable"] } : { disableRulesetIds: ["frameable"] }
  ).catch(function () { });
}
// the panel opens a port when it loads and the port drops when the panel closes
chrome.runtime.onConnect.addListener(function (port) {
  if (port.name !== "panel") return;
  ruleset(true).then(function () { try { port.postMessage({ ready: true }); } catch (e) { } });
  port.onDisconnect.addListener(function () { ruleset(false); });
});
chrome.runtime.onStartup.addListener(function () { ruleset(false); });

chrome.runtime.onInstalled.addListener(function () {
  ruleset(false);
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
