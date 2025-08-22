const cors = require("cors");

//configure Cors
const configureCors = () => {
  return cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        `http://localhost:${process.env.PORT}`,
        "https://mysite.com", //production domain
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true); //giving permission so that req can be allowed
      } else {
        callback(new Error("Not allowed by cors"));
      }
    }, //origin end
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept-Version"],
    exposedHeaders: ["X-Total-Count", "Content-Range"],
    credentials: true, //enable support for cookies and pass to the headers
    preflightContinue: false,
    //maxAge avoid send options request multiple times
    maxAge: 600, //cache preflight responses for 10 mins (600 sec)
    optionsSuccessStatus: 204,
  });
};

//---export module
module.exports = { configureCors };
