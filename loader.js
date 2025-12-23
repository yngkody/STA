// assets/loader.js
(() => {
  // Inject styles once
  const style = document.createElement("style");
  style.textContent = `
    .sta-loader {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      background: #0b0b0c;
      z-index: 999999;
      opacity: 0;
      pointer-events: none;
      transition: opacity .18s ease;
    }
    .sta-loader.is-on {
      opacity: 1;
      pointer-events: auto;
    }
    .sta-loader .spinner {
      width: 44px;
      height: 44px;
      border-radius: 999px;
      border: 3px solid rgba(255,255,255,.2);
      border-top-color: rgba(255,255,255,.95);
      animation: staSpin .8s linear infinite;
    }
    @keyframes staSpin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);

  // Inject loader element
  const loader = document.createElement("div");
  loader.className = "sta-loader";
  loader.innerHTML = `<div class="spinner" aria-label="Loading"></div>`;
  document.documentElement.appendChild(loader);

  const show = () => loader.classList.add("is-on");
  const hide = () => loader.classList.remove("is-on");

  // Hide when page is ready
  window.addEventListener("load", hide);

  // Handle back/forward cache restores (prevents stuck loader)
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) hide();
  });

  // Show loader on internal navigations
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    const href = a.getAttribute("href") || "";
    const target = a.getAttribute("target");

    // ignore new tabs, hash links, mailto, tel, external
    if (target === "_blank") return;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    // same-page no-op
    if (url.href === window.location.href) return;

    show();
  });

  // Optional: also show on programmatic navigation
  window.staShowLoader = show;
  window.staHideLoader = hide;
})();
