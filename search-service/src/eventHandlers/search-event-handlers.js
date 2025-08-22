const logger = require("../utils/logger.js");
const Search = require("../models/Search.js");

async function handlePostCreated(event) {
  try {
    //create Search object in Mongo DB
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });

    await newSearchPost.save();
    logger.info(`Search post deleted: ${event.postId}`);
  } catch (error) {
    logger.error("Error handling post creation event");
  }
}

//consume event = "post.deleted"
async function handlePostDeleted(event) {
  try {
    await Search.findOneAndDelete({ postId: event.postId });
    logger.info(
      `Search post created: ${
        event.postId
      }, in serching db: ${newSearchPost._id.toString()}`
    );
  } catch (error) {
    logger.error("Error handling post deletion event", error);
  }
}

//----
module.exports = {
  handlePostCreated,
  handlePostDeleted,
};
