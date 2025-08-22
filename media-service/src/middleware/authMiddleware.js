const logger = require("../utils/logger.js");

const authenticateRequest = (req, res, next) => {
  //get userId from req.headers from API-GATEWAY service
  const userId = req.headers["x-user-id"];
  if (!userId) {
    logger.warn("Access attemted without user ID");
    return res.status(401).json({
      success: false,
      message: "Authentication required! Please login to continue",
    });
  }

  //add user to req
  req.user = { userId };
  next();
};

//export
module.exports = {
  authenticateRequest,
};
