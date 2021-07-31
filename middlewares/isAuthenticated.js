const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      // Garder que le numéro du token
      const token = req.headers.authorization.replace("Bearer ", "");
      // Chercher dans BDD le user qui possède ce token
      const user = await User.findOne({ token: token }).select([
        "account",
        "_id",
      ]);
      if (user) {
        // Ajouter une clé user à l'objet req
        req.user = user;
        return next();
      } else {
        return res.status(401).json({ mesage: "Unauthorized" });
      }
    } else {
      return res.status(401).json({ mesage: "Unauthorized" });
    }
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = isAuthenticated;
