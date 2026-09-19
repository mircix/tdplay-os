/* TDPlay OS — Instagram client (talks to the owner's worker, see worker/README.md) */
(function (TD) {
  "use strict";
  var IG = TD.ig = { state: null };
  var mem = {};
  IG.base = function () { return (TD.store.get("ig:api", "") || (window.TD_CONFIG && TD_CONFIG.igApi) || "").replace(/\/+$/, ""); };
  IG.configured = function () { return !!IG.base(); };
  function get(path) {
    if (!IG.base()) return Promise.reject(new Error("Instagram isn't connected on this TDPlay OS yet."));
    var k = path; if (mem[k] && Date.now() - mem[k].t < 5 * 60e3) return Promise.resolve(mem[k].v);
    return fetch(IG.base() + path, { cache: "no-store" }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 404 && j && j.unavailable) { var e = new Error("personal"); e.unavailable = true; throw e; }
        if (!r.ok) throw new Error(j.message || j.error || ("Instagram service " + r.status));
        mem[k] = { t: Date.now(), v: j }; return j;
      });
    });
  }
  IG.status = function () { return get("/status").then(function (s) { IG.state = s; TD.bus.emit("ig:state", s); return s; }); };
  IG.me = function () { return get("/me"); };
  IG.media = function (after) { return get("/me/media" + (after ? "?after=" + encodeURIComponent(after) : "")); };
  IG.discover = function (username, after) { return get("/discover/" + encodeURIComponent(String(username).toLowerCase()) + (after ? "?after=" + encodeURIComponent(after) : "")); };
  IG.comments = function (id) { return get("/media/" + encodeURIComponent(id) + "/comments"); };
  IG.fmtCount = function (n) { n = Number(n || 0); return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e4 ? Math.round(n / 1e3) + "K" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K" : String(n); };
  IG.fmtDate = function (iso) { try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } };
})(window.TD);
