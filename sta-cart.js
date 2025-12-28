/* ===== STA CART (Global) ===== */
(function () {
  const CART_KEY = "sta_cart";

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const cart = raw ? JSON.parse(raw) : [];
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function normalizeItem(item) {
    // Support older keys: img vs image
    const img = item.img || item.image || item.imageUrl || "";
    return {
      id: String(item.id || item.sku || item.key || item.name || "item"),
      name: String(item.name || "STA Item"),
      img: String(img || ""),
      qty: Math.max(1, parseInt(item.qty || 1, 10) || 1),
      price: item.price != null ? Number(item.price) : null,
    };
  }

  function getCount(cart) {
    return cart.reduce((sum, it) => sum + (it.qty || 0), 0);
  }

  function setBadge(count) {
    const badge = document.getElementById("sta-cart-count");
    if (badge) badge.textContent = String(count);
  }

  function openModal() {
    const modal = document.getElementById("sta-cart-modal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    const modal = document.getElementById("sta-cart-modal");
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function renderCart() {
    const list = document.getElementById("sta-cart-list");
    if (!list) return;

    const cart = readCart().map(normalizeItem);
    writeCart(cart); // rewrite normalized

    setBadge(getCount(cart));

    if (!cart.length) {
      list.innerHTML = `
        <div style="padding:14px; color:#5b606b; font-weight:750;">
          Your cart is empty.
        </div>
      `;
      return;
    }

    list.innerHTML = cart
      .map((it) => {
        const safeImg = it.img || "";
        const safePrice =
          typeof it.price === "number" && !Number.isNaN(it.price) ? `$${it.price.toFixed(2)}` : "";
        return `
          <div class="sta-cartrow" data-id="${encodeURIComponent(it.id)}">
            <img src="${safeImg}" alt="${escapeHtml(it.name)}" onerror="this.style.display='none'">
            <div class="sta-cartmeta">
              <div class="sta-cartname">${escapeHtml(it.name)}</div>
              <div class="sta-cartsub">${safePrice || " "}</div>
            </div>
            <div class="sta-cartqty">
              <button class="sta-qbtn" type="button" data-qty="-1" aria-label="Decrease quantity">−</button>
              <div class="sta-qnum">${it.qty}</div>
              <button class="sta-qbtn" type="button" data-qty="+1" aria-label="Increase quantity">+</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function updateQty(id, delta) {
    const cart = readCart().map(normalizeItem);
    const item = cart.find((x) => x.id === id);
    if (!item) return;

    item.qty = Math.max(1, (item.qty || 1) + delta);
    writeCart(cart);
    renderCart();
  }

  function clearCart() {
    writeCart([]);
    renderCart();
  }

  // Public API in case you want to call from pages after adding items
  window.STA_CART = {
    refresh: renderCart,
    add(item) {
      const cart = readCart().map(normalizeItem);
      const n = normalizeItem(item);
      const existing = cart.find((x) => x.id === n.id);

      if (existing) existing.qty += n.qty;
      else cart.push(n);

      writeCart(cart);
      renderCart();
    },
  };

  function bindOnce() {
    // Open
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#sta-cart-btn");
      if (!btn) return;
      renderCart();
      openModal();
    });

    // Close (X or click backdrop)
    document.addEventListener("click", (e) => {
      if (e.target.matches("[data-cart-close]")) closeModal();
      const modal = e.target.closest("#sta-cart-modal");
      if (modal && e.target === modal) closeModal();
    });

    // Qty buttons
    document.addEventListener("click", (e) => {
      const qbtn = e.target.closest(".sta-cartrow [data-qty]");
      if (!qbtn) return;
      const row = e.target.closest(".sta-cartrow");
      if (!row) return;

      const id = decodeURIComponent(row.getAttribute("data-id") || "");
      const delta = qbtn.getAttribute("data-qty") === "+1" ? 1 : -1;
      updateQty(id, delta);
    });

    // Clear
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#sta-cart-clear")) return;
      clearCart();
    });

    // Keep badge synced if cart changes in another tab
    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY) renderCart();
    });
  }

  // Run after DOM ready (works even if header is injected later)
  document.addEventListener("DOMContentLoaded", () => {
    bindOnce();
    // Poll lightly until header inject exists, then sync badge once
    const start = Date.now();
    const t = setInterval(() => {
      if (document.getElementById("sta-cart-count")) {
        clearInterval(t);
        renderCart();
      }
      if (Date.now() - start > 5000) clearInterval(t);
    }, 60);
  });
})();
