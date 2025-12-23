import express from "express";
import Stripe from "stripe";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { items, success_url, cancel_url } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: items, // [{ price, quantity }]
      success_url,
      cancel_url
    });

    res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    res.status(400).send(e.message);
  }
});

app.listen(3000, () => console.log("Listening on 3000"));
