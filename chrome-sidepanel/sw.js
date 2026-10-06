/* TDPlay OS — Instagram side panel: the toolbar button opens the panel. The framing rule lives in panel.js. */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(function () { });
