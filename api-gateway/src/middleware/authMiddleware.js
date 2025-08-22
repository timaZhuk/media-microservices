const logger = require("../utils/logger.js");
const jwt = require("jsonwebtoken");

//---------------------------------------
const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  //Bearer RKGlgkhkl88wskejaehgjJHfjhTHJGV857kgjg
  //[Bearer, RKGlgkhkl88wskejaehgjJHfjhTHJGV857kgjg]
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    logger.warn("API -> Access attempt without token!");
    return res.status(401).json({
      success: false,
      message: "API: Authentication required",
    });
  }
  // --- verify the Token ----
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn("Invalid token!");
      return res.status(429).json({
        success: false,
        message: "Invalid token!",
      });
    }
    //(decoded token payload) add user to request
    req.user = user;
    next();
  });
};

// ----
module.exports = { validateToken };
