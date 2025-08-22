const Joi = require("joi");

// ---CREATE POST VALIDATION----------------------
const validateCreatePost = (data) => {
  const schema = Joi.object({
    // --- post content
    content: Joi.string().min(3).max(4000).required(),
    mediaIds: Joi.array(),
  });
  return schema.validate(data);
};

//----
module.exports = { validateCreatePost };
