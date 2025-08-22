require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

const errorHandler = require("./middleware/errorHandler.js");
const logger = require("./utils/logger.js");
const mediaRoutes = require("./routes/media-routes.js");

const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");

const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq.js");
const {
  handlePostDeleted,
} = require("./eventHandlers/media-event-handlers.js");

//------- create express app ----------
const app = express();
const PORT = process.env.PORT || 4003;

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

app.use("/api/media/upload", sensitiveEndpointLimiter);

// ---- route to media
app.use("/api/media", mediaRoutes);

//error handler
app.use(errorHandler);

async function satrtServer() {
  try {
    await connectToRabbitMQ();

    //consume all the events
    await consumeEvent("post.deleted", handlePostDeleted);
    //start server
    app.listen(PORT, () => {
      logger.info(`Media Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to server", error);
    process.exit(1);
  }
}
satrtServer();

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason", reason);
});
