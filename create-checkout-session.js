import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const VERSION = "sta-cart-debug-v1";

export default async function handler(req, res) {
  // stop any caching weirdness
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed", version: VERSION });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const items = body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing items[]", version: VERSION, got: body });
    }

    // ✅ ALWAYS convert incoming items to Stripe's required format
    const line_items = items.map((it) => ({
      price: it.price ?? it.priceId ?? it.priceid,
      quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
    }));

    if (line_items.some((li) => !li.price)) {
      return res.status(400).json({
        error: "Item missing price/priceId",
        version: VERSION,
        items,
        line_items,
      });
    }

    // 🔥 log exactly what we're about to send to Stripe
    console.log("CHECKOUT_VERSION", VERSION);
    console.log("LINE_ITEMS_TO_STRIPE", JSON.stringify(line_items));

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items, // <-- Stripe only ever sees { price, quantity }
      success_url: `${origin}/success.html`,
      cancel_url: `${origin}/merch.html`,
    });

    return res.status(200).json({ url: session.url, version: VERSION });
  } catch (e) {
    console.error("STRIPE_ERROR", e);
    return res.status(400).json({ error: e?.message || "Stripe error", version: VERSION });
  }
}
