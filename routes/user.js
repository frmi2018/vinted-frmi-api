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

const isAuthenticated = require("../middlewares/isAuthenticated");

// Route qui permet de récupérer les infos des membres
router.get("/user", async (req, res) => {
  // vérifier si id est présent
  if (req.query.id) {
    // tous les membres
    if (req.query.id === "admin") {
      try {
        const users = await User.find();
        // vérifier si l'utilisateur existe
        if (users) {
          // préparer la réponse
          const response = [];
          users.forEach((elem, index) => {
            response.push({
              account: elem.account,
              _id: elem._id,
              email: elem.email,
            });
          });
          // répondre au client
          res.json(response);
        } else {
          // Il n'y a pas d'utilisateur...
          res.status(400).json({ message: "Users not found" });
        }
      } catch (error) {
        // erreur requete BDD
        res.status(400).json({ message: error.message });
      }
    } else {
      // uniquement le membre correspondant à id
      try {
        const user = await User.findById(req.query.id);
        // vérifier si l'utilisateur existe
        if (user) {
          // préparer la réponse
          const response = {
            account: user.account,
            _id: user._id,
            email: user.email,
          };
          // répondre au client
          res.json(response);
        } else {
          // Il n'y a pas d'utilisateur...
          res.status(400).json({ message: "Users not found" });
        }
      } catch (error) {
        // erreur requete BDD
        res.status(400).json({ message: error.message });
      }
    }
  } else {
    // il manque id
    res.status(400).json({ error: "Missing parameters" });
  }
});

// User signup
router.post("/user/signup", async (req, res) => {
  const { email, username, phone, password } = req.fields;
  // vérifier la présence de l'email
  if (email) {
    try {
      // Vérifier si email déjà dans BDD
      const user = await User.findOne({ email: email });
      // Vérifier si l'utilisateur existe
      if (user) {
        // si oui, répondre au client et on ne procède pas à l'inscription
        res.status(409).json({ message: "This email already has an account" });
      }
      // sinon, on peut créer un nouveau utilisateur
      if (username && password) {
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
          const avatar = await cloudinary.uploader.upload(
            req.files.avatar.path,
            {
              folder: `/vinted/users/avatar/${newUser.id}`,
            }
          );
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
        // il manque username ou password dans la requete
        res.status(400).json({ message: "Missing parameters" });
      }
    } catch (error) {
      // erreur requete BDD
      res.status(400).json({ message: error.message });
    }
  } else {
    // il manque email dans la requete
    res.status(400).json({ message: "Missing parameters" });
  }
});

// User login
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

/* Update user password */
router.put("/user/update_password", isAuthenticated, async (req, res) => {
  // vérifier la présence de l'ancien et du nouveau password
  console.log(req.fields);
  if (req.fields.previousPassword && req.fields.newPassword) {
    try {
      // vérifier la présence de l'utilisateur
      const user = req.user;
      if (
        SHA256(req.fields.previousPassword + user.salt).toString(encBase64) ===
        user.hash
      ) {
        if (
          SHA256(req.fields.previousPassword + user.salt).toString(
            encBase64
          ) !== SHA256(req.fields.newPassword + user.salt).toString(encBase64)
        ) {
          const salt = uid2(64);
          const hash = SHA256(req.fields.newPassword + salt).toString(
            encBase64
          );
          const token = uid2(64);

          user.salt = salt;
          user.hash = hash;
          user.token = token;
          await user.save();

          // envoyer le mail à l'utlisateur pour le prévenir du changement de son mot de pass
          // const userEmail = user.email;

          // const mg = mailgun({
          //   apiKey: MAILGUN_API_KEY,
          //   domain: MAILGUN_DOMAIN,
          // });

          // const data = {
          //   from: "Airbnb API <postmaster@" + MAILGUN_DOMAIN + ">",
          //   to: userEmail,
          //   subject: "Airbnb - password",
          //   text: `Your password have been successfully modified.`,
          // };

          // mg.messages().send(data, function (error, body) {
          //   if (error) {
          //     res.status(400).json({ error: "An error occurred" });
          //   } else {
          //     res.json({
          //       _id: user._id,
          //       token: user.token,
          //       email: user.email,
          //       account: user.account,
          //       rooms: user.rooms,
          //     });
          //   }
          // });
        } else {
          res.status(400).json({
            error: "Previous password and new password must be different",
          });
        }
      } else {
        res.status(400).json({ error: "Wrong previous password" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    return res.status(400).json({ message: "Missing parameters" });
  }
});

module.exports = router;
