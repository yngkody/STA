import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const items = body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).send("Missing items[]");
    }

    // ✅ Stripe ONLY accepts `price`, never `priceId`
    const line_items = items.map((it) => ({
      price: it.price || it.priceId || it.priceid,
      quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
    }));

    if (line_items.some((li) => !li.price)) {
      console.log("BAD_ITEMS", items);
      console.log("BAD_LINE_ITEMS", line_items);
      return res.status(400).send("Some items missing price/priceId");
    }

    console.log("LINE_ITEMS_TO_STRIPE", JSON.stringify(line_items));

    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items, // ✅ always correct
      success_url: `${origin}/success.html`,
      cancel_url: `${origin}/merch.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("STRIPE_ERROR", e);
    return res.status(400).send(e?.message || "Stripe error");
  }
}
