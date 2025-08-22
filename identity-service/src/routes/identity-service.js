const express = require("express");
const {
  registerUser,
  loginUser,
  refreshTokenUser,
  logoutUser,
} = require("../controllers/identity-controller.js");

const router = express.Router();

//routes
// register
router.post("/register", registerUser);
// login
router.post("/login", loginUser);
// refreshToken
router.post("/refresh-token", refreshTokenUser);
// logout
router.post("/logout", logoutUser);

//---
module.exports = router;
