// Import package Express
const express = require("express");
const router = express.Router();

// Import packages pour encrypter le mot de passe
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

// Import package Cloudinary
const cloudinary = require("cloudinary").v2;

// Import modèles
const User = require("../models/User");

// Route qui permmet de récupérer les informations d'un utilisateur en fonction de son id
router.get("/user/member/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const response = {
      _id: user._id,
      username: user.account.username,
      email: user.email,
      phone: user.account.phone,
    };
    if (user.account.avatar) {
      response.avatar = user.account.avatar.secure_url;
    }
    res.json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Route pour créer un nouvel utilisateur
router.post("/user/signup", async (req, res) => {
  const { email, username, phone, password } = req.fields;

  try {
    // Vérifier si email déjà dans BDD
    const user = await User.findOne({ email: email });
    if (user) {
      // si oui, répondre au client et on ne procède pas à l'inscription
      res.status(409).json({ message: "This email already has an account" });
    }
    // sinon, on peut créer un nouveau utilisateur
    if (email && username && password) {
      // 1 Token et mot de pass
      // Générer le token
      const token = uid2(64);
      // Encrypter le mot de pass
      const salt = uid2(64);
      const hash = SHA256(password + salt).toString(encBase64);
      // 2 Créer le nouvel utilisateur
      const newUser = new User({
        email: email,
        account: {
          username: username,
          phone: phone,
        },
        token: token,
        hash: hash,
        salt: salt,
      });

      // upload avatar (optionnel)
      if (req.files.avatar) {
        // envoyer l'image à cloudinary
        const avatar = await cloudinary.uploader.upload(req.files.avatar.path, {
          folder: `/vinted/users/avatar/${newUser.id}`,
        });
        // ajouter image au compte utilisateur
        newUser.account.avatar = avatar;
      }

      // 3 Sauvegarder ce nouvel utilisateur dans la BDD
      await newUser.save();
      // 4 répondre au client
      res.status(200).json({
        _id: newUser._id,
        token: newUser.token,
        account: newUser.account,
      });
    } else {
      // l'utilisateur n'a pas envoyé les informations requises ?
      res.status(400).json({ message: "Missing parameters" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Route pour se connecter au site
router.post("/user/login", async (req, res) => {
  const { email, password } = req.fields;
  try {
    // Vérifier si email dans BDD
    const user = await User.findOne({ email: email });
    if (user) {
      // si oui
      // Vérifier le mot de passe
      const hashToVerify = SHA256(password + user.salt).toString(encBase64);
      if (hashToVerify === user.hash) {
        res.status(200).json({
          _id: user._id,
          token: user.token,
          account: user.account,
        });
      } else {
        // Le mot de passe n'est pas correct ?
        res.status(401).json({
          message: "Wrong email and/or wrong password, please try again",
        });
      }
    } else {
      // L'email n'existe pas dans la BDD ?
      res.status(401).json({
        message: `the mail ${email} is not known, please enter a valid email`,
      });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
