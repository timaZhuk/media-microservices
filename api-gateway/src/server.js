require("dotenv").config();
const logger = require("./utils/logger.js");
const errorHandler = require("./middleware/errorHandler.js");
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");

//rate limiting imports
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
//import for PROXY
const proxy = require("express-http-proxy");

//validation Tiken midleware
const { validateToken } = require("./middleware/authMiddleware.js");

//----------------------------------------------------------------
//create express app
const app = express();
const PORT = process.env.PORT || 4000;
const version = "v1";

//client IORedis
const redisClient = new Redis(process.env.REDIS_URL);

//use middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

//logging middleware
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});
//----------------------------------------------------------------------------
//IP based rate limiting for sensitive endpoints
const ratelimitOptions = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minute window for requests
  max: 100, // max number of req for 15 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP:${req.ip}`);
    res.status(429).json({ success: false, message: "Two many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(ratelimitOptions);

//-----CREATE  A PROXY----------------------------------------------------------
//api-gateway http://localhost:4000/v1/auth/register   ---> 4000
//identity-service --> http://localhost:4001/api/auth/register
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    //replace /v1/auth/register  to /api/auth/register
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  },
};

// ----------IDENTITY SERVICE----------------------
//setting up proxy for our identity service
//targeting -->IDENTITY_SERVICE_URL = http://localhost:4001
app.use(
  `/${version}/auth`,
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from IDENTITY Service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

//------------POST SERVICE------------------
// validateToken--> get from req.headers["authorization"]--> access Token--> add req.user
// "userId" field in access Token in Identity service Token model
app.use(
  `/${version}/posts`,
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      //headers["x-user-id"] --> in POST Service : authMiddleware read this header and
      //retrieve userId
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from POST Service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

//------------MEDIA SERVICE------------------
// validateToken--> get from req.headers["authorization"]--> access Token--> add req.user
// "userId" field in access Token in Identity service Token model

app.use(
  `/${version}/media`,
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Media Service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
    parseReqBody: false,
  })
);

//------------SEARCH SERVICE------------------
// validateToken--> get from req.headers["authorization"]--> access Token--> add req.user
// "userId" field in access Token in search service Token model
app.use(
  `/${version}/search`,
  validateToken,
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      //headers["x-user-id"] --> in SEARCH Service : authMiddleware read this header and
      //retrieve userId
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Search Service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

// ----  error handler ----
app.use(errorHandler);

// ---- create a server
app.listen(PORT, () => {
  logger.info(`API Gateway is running on port ${PORT}`);
  logger.info(
    `IDENTITY Service is running on port ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(
    `POST Service is running on port ${process.env.POST_SERVICE_URL}`
  );
  logger.info(
    `Media Service is running on port ${process.env.MEDIA_SERVICE_URL}`
  );
  logger.info(
    `Search Service is running on port ${process.env.SEARCH_SERVICE_URL}`
  );
  logger.info(`Redis URL ${process.env.REDIS_URL}`);
});
