const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { items, success_url, cancel_url } = req.body || {};
    if (!items?.length) return res.status(400).send("Missing items");

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items,
      success_url: success_url || `${origin}/success.html`,
      cancel_url: cancel_url || `${origin}/merch.html`,
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(400).send(e.message || "Stripe error");
  }
};
