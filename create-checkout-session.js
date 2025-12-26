import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const VERSION = "cart-checkout-v2-price-mapping";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { items, success_url, cancel_url } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).send("Missing items");
    }

    // Accept price/priceId/priceid defensively
    const line_items = items.map((it) => ({
      price: it.price || it.priceId || it.priceid,
      quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
    }));

    if (line_items.some((li) => !li.price)) {
      return res.status(400).send("One or more items missing price/priceId");
    }

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items, // ✅ ALWAYS uses { price, quantity }
      success_url: success_url || `${origin}/success.html`,
      cancel_url: cancel_url || `${origin}/merch.html`,
    });

    return res.status(200).json({ url: session.url, version: VERSION });
  } catch (e) {
    console.error("checkout error", e);
    return res.status(400).send(e?.message || "Stripe error");
  }
}
