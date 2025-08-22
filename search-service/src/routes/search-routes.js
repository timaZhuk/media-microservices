const express = require("express");
const { searchPostController } = require("../controllers/search-controller.js");
const { authenticateRequest } = require("../middleware/authMiddleware.js");

//--------------------------------------
const router = express.Router();

router.use(authenticateRequest);

//api/search/posts
router.get("/posts", searchPostController);

//export
module.exports = router;
