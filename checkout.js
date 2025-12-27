/* =======================
   STA Stripe Cart (global)
   - Stores cart in localStorage so badge works across pages
   - Works with injected sta-header.html (scripts inside injected HTML do NOT run)
   - Requires backend endpoint:
     POST /api/create-checkout-session  { items: [{ price: "price_xxx", quantity: 1 }] }
   ======================= */

(function () {
  const KEY = "sta_cart_v1";

  function readCart() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(items) {
    try {
      localStorage.setItem(KEY, JSON.stringify(items || []));
    } catch (e) {}
  }

  function countItems(items) {
    return (items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }

  function money(n) {
    const num = Number(n || 0);
    return `$${num.toFixed(2)}`;
  }

  // For display only (Stripe priceId -> show the ID if no name)
  function itemLabel(it) {
    return it.name || it.title || it.sku || it.price || it.priceId || "Item";
  }

  function renderCart() {
    const list = document.getElementById("sta-cart-list");
    const badge = document.getElementById("sta-cart-count");
    if (badge) badge.textContent = String(countItems(readCart()));

    if (!list) return;

    const items = readCart();

    if (!items.length) {
      list.innerHTML = `<div style="padding:14px;color:#5b606b;font-weight:700;">Your cart is empty.</div>`;
      return;
    }

    list.innerHTML = items
      .map((it, idx) => {
        const qty = Number(it.quantity) || 1;
        const img = it.image ? `<img src="${it.image}" alt="" style="width:54px;height:54px;object-fit:cover;border-radius:10px;border:1px solid #eee;background:#f7f7f7;" />` : "";
        return `
          <div class="sta-cartrow" data-idx="${idx}" style="display:flex;gap:12px;align-items:center;padding:12px;border:1px solid #eee;border-radius:14px;margin:10px 0;background:#fff;">
            ${img}
            <div style="flex:1;min-width:0;">
              <div style="font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${itemLabel(it)}</div>
              ${it.variant ? `<div style="color:#5b606b;font-size:12px;font-weight:700;">${it.variant}</div>` : ``}
              ${it.unitAmount ? `<div style="color:#111;font-size:12px;font-weight:900;">${money((Number(it.unitAmount) || 0) / 100)}</div>` : ``}
            </div>

            <div style="display:flex;align-items:center;gap:8px;">
              <button type="button" data-dec class="sta-qbtn" style="width:34px;height:34px;border-radius:10px;border:1px solid #e6e6e6;background:#fff;font-weight:900;cursor:pointer;">−</button>
              <div style="min-width:18px;text-align:center;font-weight:900;">${qty}</div>
              <button type="button" data-inc class="sta-qbtn" style="width:34px;height:34px;border-radius:10px;border:1px solid #e6e6e6;background:#fff;font-weight:900;cursor:pointer;">+</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function openCart() {
    const modal = document.getElementById("sta-cart-modal");
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("sta-cart-open");
    renderCart();
  }

  function closeCart() {
    const modal = document.getElementById("sta-cart-modal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("sta-cart-open");
  }

  async function checkoutCart() {
    const items = readCart();

    if (!items.length) {
      alert("Your cart is empty.");
      return;
    }

    // IMPORTANT: server expects `price` (NOT priceId / price_id) for Stripe line_items
    const payload = {
      items: items.map((it) => ({
        price: it.price || it.priceId,
        quantity: Number(it.quantity) || 1,
      })),
    };

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.url) throw new Error("Checkout session did not return { url }");
      window.location.href = data.url;
    } catch (err) {
      console.error("Checkout failed:", err);
      alert(
        "Couldn’t start Stripe checkout for the cart.\n\n" +
          "Make sure /api/create-checkout-session exists on your deployment (Vercel serverless) and returns { url }.\n\n" +
          "Details: " +
          (err && err.message ? err.message : String(err))
      );
    }
  }

  // Public helper so merch page can add items from anywhere:
  // window.STACart.add({ price, priceId, quantity, name, image, variant, unitAmount })
  function addToCart(item) {
    if (!item || (!item.price && !item.priceId)) return;

    const price = item.price || item.priceId;
    const cart = readCart();
    const existing = cart.find((x) => (x.price || x.priceId) === price && (x.variant || "") === (item.variant || ""));

    if (existing) {
      existing.quantity = (Number(existing.quantity) || 0) + (Number(item.quantity) || 1);
      // keep best metadata
      existing.name = existing.name || item.name;
      existing.image = existing.image || item.image;
      existing.unitAmount = existing.unitAmount || item.unitAmount;
      existing.variant = existing.variant || item.variant;
    } else {
      cart.push({
        price,
        priceId: price,
        quantity: Number(item.quantity) || 1,
        name: item.name,
        image: item.image,
        variant: item.variant,
        unitAmount: item.unitAmount, // optional cents
      });
    }

    writeCart(cart);
    renderCart();
  }

  function clearCart() {
    writeCart([]);
    renderCart();
  }

  function changeQty(idx, delta) {
    const cart = readCart();
    const it = cart[idx];
    if (!it) return;

    const next = (Number(it.quantity) || 0) + delta;
    if (next <= 0) cart.splice(idx, 1);
    else it.quantity = next;

    writeCart(cart);
    renderCart();
  }

  function bindOnce() {
    const cartBtn = document.getElementById("sta-cart-btn");
    const modal = document.getElementById("sta-cart-modal");
    const clearBtn = document.getElementById("sta-cart-clear");
    const checkoutBtn = document.getElementById("sta-cart-checkout");
    const list = document.getElementById("sta-cart-list");

    if (!cartBtn || !modal || !clearBtn || !checkoutBtn || !list) return false;

    // open
    cartBtn.addEventListener("click", openCart);

    // close (x button / click backdrop)
    document.addEventListener("click", (e) => {
      if (e.target && e.target.matches("[data-cart-close]")) closeCart();
      if (e.target === modal) closeCart();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCart();
    });

    // qty buttons
    list.addEventListener("click", (e) => {
      const row = e.target.closest("[data-idx]");
      if (!row) return;
      const idx = Number(row.getAttribute("data-idx"));
      if (e.target.matches("[data-inc]")) changeQty(idx, +1);
      if (e.target.matches("[data-dec]")) changeQty(idx, -1);
    });

    clearBtn.addEventListener("click", clearCart);
    checkoutBtn.addEventListener("click", checkoutCart);

    // initial badge
    renderCart();
    return true;
  }

  // Because header is injected with fetch(), we need to wait until its DOM exists.
  function boot() {
    if (bindOnce()) return;

    const host = document.getElementById("sta-nav") || document.body;
    const obs = new MutationObserver(() => {
      if (bindOnce()) obs.disconnect();
    });
    obs.observe(host, { childList: true, subtree: true });

    // also fallback timer
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (bindOnce() || tries > 80) clearInterval(iv);
    }, 200);
  }

  // expose helper
  window.STACart = { add: addToCart, open: openCart, close: closeCart, clear: clearCart, read: readCart };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // If cart changes in another tab, keep badge in sync
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) renderCart();
  });
})();
