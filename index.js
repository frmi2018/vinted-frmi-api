// Package dotenv
require("dotenv").config();

// Package express
const express = require("express");
const app = express();

// Package express-formidable
const formidable = require("express-formidable");
app.use(formidable());

// Package cors
const cors = require("cors");
app.use(cors());

// Package Mongoose
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

// Cloudinary
const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Package Stripe (https://stripe.com/fr)
const stripe = require("stripe")(process.env.STRIPE_SK);

// import des routes
const userRoutes = require("./routes/user");
app.use(userRoutes);
const offerRoutes = require("./routes/offer");
app.use(offerRoutes);

// -----

// -----

app.post("/payment", async (req, res) => {
  const stripeToken = req.fields.stripeToken;
  // -----
  // TODO
  // récupérer :
  // id de l'acheteur
  // prix de l'objet (convertir en centime x100)
  // nom de l'objet
  // -----

  // Créer la transaction
  try {
    const response = await stripe.charges.create({
      amount: 100,
      currency: "eur",
      description: "La description du produit acheté",
      // Envoi du token
      source: stripeToken,
    });
    // console.log(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
  res.json({ message: "Payment" });
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the vinted-frmi-api" });
});

app.all("*", (req, res) => {
  res.status(404).json({ message: "Page not Found" });
});

const port = 4000;
app.listen(port, () => {
  console.log(`Server has started, listening on ${port}`);
});
