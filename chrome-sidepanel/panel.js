var f = document.getElementById("f");
var IG = "https://www.instagram.com/", OS = "https://mircix.github.io/tdplay-os/?embed=1";

// tell the worker the panel is open (it switches the header rule on) and load Instagram once it says ready
var port = chrome.runtime.connect({ name: "panel" });
var started = false;
port.onMessage.addListener(function (m) { if (m && m.ready && !started) { started = true; f.src = IG; } });
setTimeout(function () { if (!started) { started = true; f.src = IG; } }, 1500);

function go(url, btn) {
  f.src = url;
  [].forEach.call(document.querySelectorAll(".bar button[data-go]"), function (b) { b.classList.toggle("on", b === btn); });
}
[].forEach.call(document.querySelectorAll("button[data-go]"), function (b) {
  b.addEventListener("click", function () { go(IG + b.dataset.go, b); });
});
document.getElementById("reload").addEventListener("click", function () { f.src = f.src; });
document.getElementById("tdplay").addEventListener("click", function () {
  var on = f.src.indexOf("tdplay-os") > -1;
  go(on ? IG : OS, null);
  this.classList.toggle("on", !on);
});
