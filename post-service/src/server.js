require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const postRoutes = require("./routes/post-routes.js");
const errorHandler = require("./middleware/errorHandler.js");
const logger = require("./utils/logger.js");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { connectToRabbitMQ } = require("./utils/rabbitmq.js");

//----------------------------------------
//create express app
const app = express();
const PORT = process.env.PORT || 4002;

//connection to Mongo DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info("Connected to mongodb"))
  .catch((error) => logger.error("MongoDB connection error", error));

//-----create client with ioredis
const redisClient = new Redis(process.env.REDIS_URL);

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

//-------
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

//IP based rate limiting for sensitive endpoints (express-rate-limit)
const sensitiveEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 min window for requests
  max: 50, //request per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensetive rate limit point was exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//--- routes -> pass redis client to routes (to request)
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

//add error handler
app.use(errorHandler);

//apply this sensitiveEndpointdLimiter to our routes
//will add not only to create-post
app.use("/api/posts/create-post", sensitiveEndpointLimiter);

// function connected with RabbitMQ
async function startServer() {
  try {
    await connectToRabbitMQ();
    //create server and connect to server
    app.listen(PORT, () => {
      logger.info(`POST Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to server", error);
    process.exit(1);
  }
}

startServer();

//unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at ", promise, "reason:", reason);
});
