/* STA GitHub Pages: header injection + baseurl rewriting */
(() => {
  // Set this on <html data-base="/REPO"> if hosting at https://USERNAME.github.io/REPO/
  // Leave blank for root hosting (custom domain).
  const BASE = (document.documentElement.getAttribute('data-base') || '').replace(/\/$/, '');

  const isAbsolute = (url) => /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//');

  const baseHref = (path) => {
    if (!path) return path;
    if (isAbsolute(path)) return path;
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${BASE}${p}` || p;
  };

  async function injectHeader() {
    const mount = document.getElementById('site-header');
    if (!mount) return;

    try {
      const res = await fetch(baseHref('sta-header.html'), { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Header fetch failed: ${res.status}`);
      mount.innerHTML = await res.text();
    } catch (err) {
      console.warn('[STA] Header injection failed:', err);
      mount.innerHTML = '';
      return;
    }

    // Rewrite links that declare data-href so they work on repo subpaths
    document.querySelectorAll('[data-href]').forEach((el) => {
      const path = el.getAttribute('data-href');
      if (path) el.setAttribute('href', baseHref(path));
    });
  }

  // Optional: shrink camo strip on scroll
  function bindScrollCamo() {
    const banner = document.querySelector('.sta-banner');
    if (!banner) return;

    const onScroll = () => {
      if (window.scrollY > 10) banner.classList.add('is-scrolled');
      else banner.classList.remove('is-scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  injectHeader().then(bindScrollCamo);
})();
