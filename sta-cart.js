/* ===== STA CART (Global + Stripe Checkout) ===== */
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
    const img = item.img || item.image || item.imageUrl || "";
    return {
      id: String(item.id || item.sku || item.key || item.name || "item"),
      name: String(item.name || "STA Item"),
      img: String(img || ""),
      qty: Math.max(1, parseInt(item.qty || 1, 10) || 1),

      // IMPORTANT: persist Stripe price id
      priceId: String(item.priceId || item.price_id || item.price || item.stripePriceId || ""),

      // optional display price (not used for Stripe)
      displayPrice: item.displayPrice != null ? String(item.displayPrice) : "",
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

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
        const priceLine = it.displayPrice ? escapeHtml(it.displayPrice) : " ";
        return `
          <div class="sta-cartrow" data-id="${encodeURIComponent(it.id)}">
            <img src="${safeImg}" alt="${escapeHtml(it.name)}" onerror="this.style.display='none'">
            <div class="sta-cartmeta">
              <div class="sta-cartname">${escapeHtml(it.name)}</div>
              <div class="sta-cartsub">${priceLine}</div>
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

  async function stripeCheckoutFromCart() {
    // only items that actually have Stripe priceId
    const cart = readCart().map(normalizeItem);
    const items = cart
      .filter((x) => x.priceId && x.qty > 0)
      .map((x) => ({ priceId: x.priceId, quantity: x.qty }));

    if (!items.length) {
      alert("Your cart is empty.");
      return;
    }

    const btn = document.getElementById("sta-cart-checkout");
    if (btn) {
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
    }

    try {
      const r = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await r.json().catch(() => ({}));
      const url = data.url || data.checkoutUrl || data.checkout_url;

      if (!r.ok || !url) throw new Error(data.error || `Checkout failed (${r.status})`);
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert(err?.message || "Stripe checkout failed");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
      }
    }
  }

  // Public API
  window.STA_CART = {
    refresh: renderCart,
    add(item) {
      const cart = readCart().map(normalizeItem);
      const n = normalizeItem(item);
      const existing = cart.find((x) => x.id === n.id);

      if (existing) {
        existing.qty += n.qty;
        // keep these updated
        existing.name = n.name || existing.name;
        existing.img = n.img || existing.img;
        existing.priceId = n.priceId || existing.priceId;
        existing.displayPrice = n.displayPrice || existing.displayPrice;
      } else {
        cart.push(n);
      }

      writeCart(cart);
      renderCart();
    },
  };

  function bindOnce() {
    // Open cart
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

    // Stripe checkout (THIS is the important new hook)
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#sta-cart-checkout")) return;
      stripeCheckoutFromCart();
    });

    // Keep badge synced if cart changes in another tab
    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY) renderCart();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindOnce();
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
