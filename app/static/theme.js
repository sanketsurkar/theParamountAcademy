/* Runs before the page paints, so there's no flash of the wrong theme. */
(function () {
  try {
    var t = localStorage.getItem("tpa-theme");
    if (t === "dark" || t === "light") document.documentElement.dataset.theme = t;
  } catch (e) {}
})();
