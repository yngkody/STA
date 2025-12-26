import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { items, success_url, cancel_url } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).send("Missing items");
    }

    // ✅ Accept either {priceId} (your cart) or {price} (Stripe native)
    const line_items = items.map((it) => ({
      price: it.price || it.priceId,
      quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
    }));

    // Guard: if any item is missing a price, fail clearly
    if (line_items.some((li) => !li.price)) {
      return res.status(400).send("One or more items missing price/priceId");
    }

    const origin = req.headers.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: success_url || `${origin}/success.html`,
      cancel_url: cancel_url || `${origin}/merch.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(400).send(e?.message || "Stripe error");
  }
}
