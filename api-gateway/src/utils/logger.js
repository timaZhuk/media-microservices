const winston = require("winston");

//custom logging system for API-GATEWAY

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(), // --- time when log is created
    winston.format.errors({ stack: true }), //stack errors
    winston.format.splat(), // --- string interpolation
    winston.format.json() // ---  format JSON
  ),
  defaultMeta: { service: "api-gateway" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    //create a files for error.logs and for combined logs
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

//--module
module.exports = logger;
