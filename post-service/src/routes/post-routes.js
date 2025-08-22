const express = require("express");
const {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
} = require("../controllers/post-controller.js");
const { authenticateRequest } = require("../middleware/authMiddleware.js");

const router = express.Router();

//middleware --> this will tell if an user is authenticated or not
router.use(authenticateRequest);

// routes
// CREATE POST
router.post("/create-post", createPost);

//GET All POSTS
router.get("/all-posts", getAllPosts);

//GET Post by id
router.get("/:id", getPost);

//DELETE post by id
router.delete("/:id", deletePost);

// ---
module.exports = router;
