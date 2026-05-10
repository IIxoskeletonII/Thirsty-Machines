(function () {
  "use strict";

  function moveFocusTo(target) {
    if (!target) return;
    var prevTabIndex = target.getAttribute("tabindex");
    if (prevTabIndex === null) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    target.addEventListener(
      "blur",
      function () {
        if (prevTabIndex === null) target.removeAttribute("tabindex");
      },
      { once: true },
    );
  }

  document.addEventListener("click", function (event) {
    var anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;
    var href = anchor.getAttribute("href");
    if (!href || href === "#") return;
    var target = document.getElementById(href.slice(1));
    if (!target) return;
    moveFocusTo(target);
  });

  // Active-section highlight in the floating pill nav.
  function initActiveNav() {
    var navLinks = document.querySelectorAll(".site-nav a[href^='#']");
    if (!navLinks.length || !("IntersectionObserver" in window)) return;

    var linkByHash = {};
    var sections = [];
    navLinks.forEach(function (link) {
      var hash = link.getAttribute("href");
      if (!hash || hash === "#") return;
      linkByHash[hash.slice(1)] = link;
      var section = document.getElementById(hash.slice(1));
      if (section) sections.push(section);
    });

    var visible = {};
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible[entry.target.id] = entry.isIntersecting
            ? entry.intersectionRatio
            : 0;
        });
        var bestId = null;
        var bestRatio = 0;
        Object.keys(visible).forEach(function (id) {
          if (visible[id] > bestRatio) {
            bestRatio = visible[id];
            bestId = id;
          }
        });
        navLinks.forEach(function (l) { l.classList.remove("is-active"); });
        if (bestId && linkByHash[bestId]) {
          linkByHash[bestId].classList.add("is-active");
        }
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );
    sections.forEach(function (s) { observer.observe(s); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initActiveNav);
  } else {
    initActiveNav();
  }
})();