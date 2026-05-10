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
})();
