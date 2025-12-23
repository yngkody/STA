import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { items, success_url, cancel_url } = req.body || {};

    if (!items?.length) return res.status(400).send("Missing items");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items, // [{ price: "price_xxx", quantity: 1 }]
      success_url: success_url || `${req.headers.origin}/success.html`,
      cancel_url: cancel_url || `${req.headers.origin}/merch.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(400).send(e?.message || "Stripe error");
  }
}
