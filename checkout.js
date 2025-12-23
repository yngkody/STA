<script>
/**
 * STA centralized Stripe checkout helper
 * - Attach to any button with: data-stripe-checkout + data-price-id
 * - Optional: data-qty, data-success-url, data-cancel-url
 */
(function () {
  const API_BASE = window.STRIPE_API_BASE || "https://YOUR_BACKEND_DOMAIN"; 
  // e.g. https://sta-backend.vercel.app

  async function createCheckoutSession({ items, successUrl, cancelUrl }) {
    const res = await fetch(`${API_BASE}/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        success_url: successUrl || `${location.origin}/success.html`,
        cancel_url: cancelUrl || location.href
      })
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`Checkout failed (${res.status}). ${msg}`);
    }
    return res.json();
  }

  async function handleClick(btn) {
    const priceId = btn.getAttribute("data-price-id");
    const qty = Number(btn.getAttribute("data-qty") || "1");

    if (!priceId) throw new Error("Missing data-price-id on checkout button.");

    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = "Redirecting…";

    try {
      const { url } = await createCheckoutSession({
        items: [{ price: priceId, quantity: qty }],
        successUrl: btn.getAttribute("data-success-url"),
        cancelUrl: btn.getAttribute("data-cancel-url")
      });

      window.location.href = url;
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-stripe-checkout]");
    if (!btn) return;
    e.preventDefault();
    handleClick(btn).catch((err) => {
      console.error(err);
      alert(err.message || "Checkout error. Check console.");
    });
  });
})();
</script>
