(function () {
  if (window.__externalEmbedInit) return;
  window.__externalEmbedInit = true;

  function makeIframe(url, title) {
    var f = document.createElement("iframe");
    f.setAttribute("loading", "lazy");
    f.setAttribute("allowfullscreen", "");
    f.setAttribute("allow", "autoplay");
    f.setAttribute("referrerpolicy", "no-referrer");
    f.setAttribute("title", title || "Embedded content");
    f.src = url;
    return f;
  }

  function loadContainer(container) {
    if (!container) return;
    var url = container.getAttribute("data-external-url");
    var title = container.getAttribute("data-title") || "Embedded content";
    if (!url) return;
    container.textContent = "";
    container.appendChild(makeIframe(url, title));
  }

  // Accept / Reject buttons
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;

    if (t.classList.contains("external-accept")) {
      var container = t.closest(".external-embed");
      try { localStorage.setItem("externalEmbedConsent", "true"); } catch (_) {}
      loadContainer(container);
    }

    if (t.classList.contains("external-reject")) {
      var container2 = t.closest(".external-embed");
      try { localStorage.setItem("externalEmbedConsent", "false"); } catch (_) {}
      var overlay = container2 && container2.querySelector(".external-consent");
      if (overlay) {
        overlay.innerHTML = "";
        var p = document.createElement("p");
        p.textContent = "Content not loaded (consent rejected).";
        overlay.appendChild(p);
      }
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    var consent = null;
    try { consent = localStorage.getItem("externalEmbedConsent"); } catch (_) {}
    if (consent === "true") {
      document.querySelectorAll(".external-embed").forEach(loadContainer);
    }
  });
})();
