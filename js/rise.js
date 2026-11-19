/* Cards rise in as they reach the viewport.

   One observer for the whole app, re-armed whenever a grid is rebuilt — the
   template strip and the run list both re-render in place when you change
   category or finish a capture, so newly created cards need arming too. */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.style.transitionDelay = (e.target.dataset.riseDelay || 0) + "ms";
      e.target.classList.add("in");
    });
  }, { threshold: 0.12 });

  function arm() {
    var cards = document.querySelectorAll(".tpl, .run-card");
    [].forEach.call(cards, function (el, i) {
      if (el.classList.contains("rise")) return;
      el.classList.add("rise");
      el.dataset.riseDelay = Math.min(i, 8) * 45;
      io.observe(el);
    });
  }

  // A grid swap replaces the cards wholesale, so watch for new children
  // rather than trying to hook every render function by name.
  var mo = new MutationObserver(function () { arm(); });
  function watch() {
    ["#tpl-sections", "#run-grid", "#runs-grid"].forEach(function (sel) {
      var n = document.querySelector(sel);
      if (n) mo.observe(n, { childList: true, subtree: true });
    });
    arm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else {
    watch();
  }
  setTimeout(watch, 400);
})();
