require("dotenv").config();
const mongoose = require("mongoose");
const logger = require("./utils/logger.js");
const express = require("express");
const helmet = require("helmet");
const { configureCors } = require("./config/corsConfig.js");
const { rateLimit } = require("express-rate-limit");
//----------------------
const { RateLimiterRedis } = require("rate-limiter-flexible");
//-----IO Redis
const Redis = require("ioredis");
//----
const { RedisStore } = require("rate-limit-redis");
const routes = require("./routes/identity-service.js");
const errorHandler = require("./middleware/errorHandler.js");

//---------------------------------------------------------------
//--creating express app
const app = express();
const PORT = process.env.PORT || 4001;
// connect to DB  (best practice to create separate module)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    //start logger for DB connection
    logger.info("Connected to mongodb");
  })
  .catch((error) => logger.error("Mongo connection error ", error));
//--------------------------------------------------------------------------

//--------create a IORedis---client--------------
const redisClient = new Redis(process.env.REDIS_URL);

//-- middleware
//use helmet to secure express server
app.use(helmet());
//use custom cors
app.use(configureCors());
//json reading
app.use(express.json());

//-- logger info
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body: ${req.body}`);
  next();
});

//--- DDos ptotection and rate limiting
//rate-limiter-flexible  --client
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient, //store current client session
  keyPrefix: "middleware", // "key" in Redis DB to distinguish data from other info
  points: 10, //request in amount of time (duration)
  duration: 1, //1 second
});

app.use((req, res, next) => {
  //get request form client ip-address
  //if error: logger error then send response
  //status 429 too many requests
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});

//IP based rate limiting for sensitive endpoints (express-rate-limit)
const sensitiveEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//apply this sensitiveEndpointdLimiter to our routes
//add to other routes
app.use("/api/auth/register", sensitiveEndpointLimiter);

//Routes
app.use("/api/auth/", routes);

//error handler
app.use(errorHandler);

//create server connection
app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`);
});

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at, ", promise, "reason:", reason);
});
