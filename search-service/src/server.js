require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");

const errorHandler = require("./middleware/errorHandler.js");
const logger = require("./utils/logger.js");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq.js");

const searchRoutes = require("./routes/search-routes.js");
const {
  handlePostCreated,
  handlePostDeleted,
} = require("./eventHandlers/search-event-handlers.js");

// ---- creating app ----
const app = express();
const PORT = process.env.PORT || 4004;

//connect to mongodb
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => logger.info("Connected to mongodb"))
  .catch((e) => logger.error("Mongo connection error"));

//-----create client with ioredis
const redisClient = new Redis(process.env.REDIS_URL);

//middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body. ${req.body}`);
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

app.use("/api/search/posts", sensitiveEndpointLimiter);

// ---- routes -----
app.use("/api/search", searchRoutes);

//error handler
app.use(errorHandler);

async function startServer() {
  try {
    //make connection
    await connectToRabbitMQ();

    //consume the events / subscribe to the events
    await consumeEvent("post.created", handlePostCreated);

    //consume event post.deleted --> delete data from DB with PostId
    await consumeEvent("post.deleted", handlePostDeleted);

    //create server and connect to server
    app.listen(PORT, () => {
      logger.info(`SEARCH Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start search service", error);
    process.exit(1);
  }
}

startServer();

//unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at ", promise, "reason:", reason);
});
