var f = document.getElementById("f");
var IG = "https://www.instagram.com/", OS = "https://mircix.github.io/tdplay-os/?embed=1";
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
