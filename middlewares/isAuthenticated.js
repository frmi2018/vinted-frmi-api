const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  if (req.headers.authorization) {
    try {
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
        return res.status(401).json({ message: "Unauthorized" });
      }
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports = isAuthenticated;
