const User = require("../models/User.js");

const logger = require("../utils/logger.js");
const {
  validateRegistration,
  validateLogin,
} = require("../utils/validation.js");
const generateTokens = require("../utils/generateToken.js");
const RefreshToken = require("../models/RefreshToken.js");

//--------------Controllers---------------------------------------------
//SIGNUP-- user registration
const registerUser = async (req, res) => {
  //start logger
  logger.info("SIGNUP Registration endpoint hit ...");
  try {
    // --- validate the schema (data from request)
    const { error } = validateRegistration(req.body);
    if (error) {
      //log the error
      logger.warn("SIGNUP Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    //-------get data from request body----
    const { email, password, username } = req.body;
    // --- check if user exist in DB
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("User already exists ");
      return res.status(400).json({
        success: false,
        message: "User already exists ",
      });
    }
    // --- save user data in Mongo DB
    // --- argon2 hashed password and this is a hash string
    user = new User({ username, email, password });
    await user.save();
    logger.warn("User saved successfully", user._id);

    // --- generate access Token and Refresh Token ---
    const { accessToken, refreshToken } = await generateTokens(user);
    console.log("accessToken: ", accessToken);
    console.log("RefreshToken: ", refreshToken);
    res.status(201).json({
      success: true,
      message: "User registered successfully, tokens created Ok",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured: ", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// LOGIN user login
const loginUser = async (req, res) => {
  logger.info("LOGIN endpoint hit....");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("LOGIN Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    //get email, password from request body
    const { email, password } = req.body;
    //get user object fron Mongo DB
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("LOGIN: Invalid user");
      return res.status(400).json({
        success: false,
        message: "LOGIN: Invalid credentials",
      });
    }
    // --- entered password valid or not---
    //  comparePassword in User model (argon2)
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("LOGIN: Invalid password");
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }
    //---create accessToken and refreshToken
    const { accessToken, refreshToken } = await generateTokens(user);
    res.json({
      accessToken,
      refreshToken,
      userId: user._id,
    });

    //---------------------------------
  } catch (error) {
    logger.error("LOGIN error occured", e);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ----  REFRESH TOKEN refresh token
const refreshTokenUser = async (req, res) => {
  logger.info("Refresh Token endpoint hit...");
  try {
    // --1-- get refreshToken from reqest body
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }
    // -2- get the Token from DB
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("RefreshToken: Invalid or expired refresh token");
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    //--3-- create new refresh Token for user

    // get user by user._id in storedToken object
    const user = await User.findById(storedToken.user);

    if (!user) {
      logger.warn("RefreshToken: User is not found");
      return res.status(401).json({
        success: false,
        message: "RefreshToken: User is not found",
      });
    }

    // generate a new RefreshToken and new AccessToken
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    //delete the old refresh token from DB
    await RefreshToken.deleteOne({ _id: storedToken._id });
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
    //----------------------------
  } catch (error) {
    logger.error("Refresh Token error occured", error);
    res.status(500).json({
      success: false,
      message: "Refresh Token: Internal server error",
    });
  }
};

//  LOGOUT logout
const logoutUser = async (req, res) => {
  logger.info("Logout endpoint hit...");
  try {
    // get refreshToken from req body
    const { refreshToken } = req.body;
    //-----------------------------------
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    //delete refreshToken from DB
    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("Refresh token deleted for Logout");

    res.json({
      success: true,
      message: "Logged out successfully",
    });
    //------------------------------
  } catch (error) {
    logger.error("LOGOUT: Error occured");
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ---- exports
module.exports = { registerUser, loginUser, refreshTokenUser, logoutUser };
