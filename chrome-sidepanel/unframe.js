/* Runs first in Instagram's own page inside the panel: tells its frame-busting code that it is the
   top window, so it renders instead of trying to navigate the panel away. */
(function () {
  if (window.top === window.self) return;                 // a real tab — leave it alone
  try {
    Object.defineProperty(window, "top", { get: function () { return window.self; }, configurable: true });
    Object.defineProperty(window, "parent", { get: function () { return window.self; }, configurable: true });
    Object.defineProperty(window, "frameElement", { get: function () { return null; }, configurable: true });
  } catch (e) { }
})();
