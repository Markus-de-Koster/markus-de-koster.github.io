
(function () {
  if (window.__slidesConsentInit) return; // avoid double init if script included twice
  window.__slidesConsentInit = true;

  function makeIframe(url) {
    var f = document.createElement("iframe");
    f.setAttribute("loading", "lazy");
    f.setAttribute("allowfullscreen", "");
    f.setAttribute("allow", "autoplay");
    f.setAttribute("referrerpolicy", "no-referrer");
    f.setAttribute("title", "Slides");
    f.src = url;
    return f;
  }

  function loadContainer(container) {
    if (!container) return;
    var url = container.getAttribute("data-slide-url");
    if (!url) return;
    container.textContent = "";            // clear placeholder
    container.appendChild(makeIframe(url)); // insert iframe
  }

  // Event delegation for Accept/Reject buttons
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;

    if (t.classList.contains("slide-accept")) {
      var container = t.closest(".slide-embed");
      try { localStorage.setItem("slideConsent", "true"); } catch (_) {}
      loadContainer(container);
    }

    if (t.classList.contains("slide-reject")) {
      var container2 = t.closest(".slide-embed");
      try { localStorage.setItem("slideConsent", "false"); } catch (_) {}
      var overlay = container2 && container2.querySelector(".slide-consent");
      if (overlay) {
        overlay.innerHTML = "";
        var p = document.createElement("p");
        p.textContent = "Slides not loaded (consent rejected).";
        overlay.appendChild(p);
      }
    }
  });

  // Auto-load on pages where user already consented
  document.addEventListener("DOMContentLoaded", function () {
    var consent = null;
    try { consent = localStorage.getItem("slideConsent"); } catch (_) {}
    if (consent === "true") {
      document.querySelectorAll(".slide-embed").forEach(loadContainer);
    }
  });
})();
