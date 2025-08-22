const { deleteMediaFromCloudinary } = require("../utils/cloudinary.js");
const logger = require("../utils/logger.js");
const Media = require("../models/Media.js");

//Post deleted -->eventHendler-->mediaId sources deleted-->
const handlePostDeleted = async (event) => {
  console.log("Event media: ", event);
  const { postId, mediaIds } = event;
  try {
    if (!mediaIds.length !== 0) {
      //  --- get array of _id from Mongo DB in mediaIds array
      const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });
      // --- loop through the media array
      for (const media of mediaToDelete) {
        //delete a file from cloudinary
        await deleteMediaFromCloudinary(media.publicId);
        //delete a file from MongoDB
        await Media.findByIdAndDelete(media._id);
        logger.info(
          `Deleted media ${media._id} associated with this deleted post ${postId}`
        );
      }
    } else {
      logger.info(`Post ${postId} was deleted with no media attached`);
    }
  } catch (error) {
    logger.error("Error occured while media deletion", error);
  }
};

//exports
module.exports = {
  handlePostDeleted,
};
