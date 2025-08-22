const express = require("express");
const multer = require("multer");

const {
  uploadMedia,
  getAllMedias,
} = require("../controllers/media-controller.js");
const { authenticateRequest } = require("../middleware/authMiddleware.js");
const logger = require("../utils/logger.js");

const router = express.Router();

//configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
}).single("file");

router.use(authenticateRequest);

//routes
// upload file
router.post(
  "/upload",

  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("Multer error while uploading file", err);
        return res.status(400).json({
          message: "Multer error while uploading",
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("Unknown error while uploading file", err);
        return res.status(500).json({
          message: "Unknown error while uploading file",
          error: err.message,
          stack: err.stack,
        });
      } //else if end
      //No file in request

      if (!req.file) {
        return res.status(400).json({
          message: "No file is found!!",
        });
      }

      next();
    }); //upload end;
  },
  uploadMedia
);

//GET All medias
router.get("/get", getAllMedias);

//----------------
module.exports = router;
