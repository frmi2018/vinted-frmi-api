// Import package Express
const express = require("express");
const router = express.Router();
// Import package Cloudinary
const cloudinary = require("cloudinary").v2;
// Import modèles
const Offer = require("../models/Offer");
// Import du middleware isAuthenticated
const isAuthenticated = require("../middlewares/isAuthenticated");

// Route qui nous permet de récupérer une liste d'annonces, en fonction de filtres
// Si aucun filtre n'est envoyé, cette route renverra l'ensemble des annonces
router.get("/offers", async (req, res) => {
  try {
    // création d'un objet dans lequel on va sotcker nos différents filtres
    const filters = {};

    // passage dans différentes conditions pour savoir quel(s) filtre(s) a soumis l'utilisateur
    if (req.query.title) {
      filters.title = new RegExp(req.query.title, "i");
    }
    if (req.query.priceMin) {
      filters.price = {
        $gte: req.query.priceMin,
      };
    }
    if (req.query.priceMax) {
      if (filters.price) {
        filters.price.$lte = req.query.priceMax;
      } else {
        filters.price = {
          $lte: req.query.priceMax,
        };
      }
    }

    // Création d'un objet dans lequel on va stocker le classement des annonces, choisi par l'utilisateur
    let sort = {};

    if (req.query.sort === "date-asc") {
      sort = { created: "asc" };
    } else if (req.query.sort === "date-desc") {
      sort = { created: "desc" };
    } else if (req.query.sort === "price-asc") {
      sort = { price: "asc" };
    } else if (req.query.sort === "price-desc") {
      sort = { price: "desc" };
    }

    // les query sont par défaut des chaînes de caractères
    // les méthodes sort(), skip() et limi() n'acceptent que des nombres
    let page = Number(req.query.page);
    let limit = Number(req.query.limit);

    // Rechercher dans la BDD les annonces qui match avec les query envoyées
    // Notez que l'on peut chaîner les méthodes
    const offers = await Offer.find(filters)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "owner",
        select: "account.username account.phone account.avatar",
      });

    // cette ligne va nous retourner le nombre d'annonces trouvées en fonction des filtres
    const count = await Offer.countDocuments(filters);

    res.json({
      count: count,
      offers: offers,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

// Route qui permmet de récupérer les informations d'une offre en fonction de son id
router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account.username account.phone account.avatar",
    });
    res.json(offer);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

// Route qui permet de poster une nouvelle annonce
router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    // console.log(req.fields);
    // console.log(req.files.picture.path);

    const { title, description, price, condition, city, brand, size, color } =
      req.fields;

    // 1 créer une nouvelle offre
    const newOffer = new Offer({
      product_name: title,
      product_description: description,
      product_price: price,
      product_details: [
        { MARQUE: brand },
        { TAILLE: size },
        { ÉTAT: condition },
        { COULEUR: color },
        { EMPLACEMENT: city },
      ],
      owner: req.user,
    });
    // console.log(newOffer);

    // 2 envoyer l'image à cloudinary
    const result = await cloudinary.uploader.upload(req.files.picture.path, {
      folder: `/vinted/offers/${newOffer._id}`,
    });
    // console.log(result);

    // 3 ajouter image à l'offre
    newOffer.product_image = result;

    // 4 sauvegarder l'offre dans la BDD
    await newOffer.save();

    // 5 répondre au client
    res.status(200).json(newOffer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
