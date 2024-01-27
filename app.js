import express from "express";
import userRoutes from "./routers/userRoutes.js";

const app = express();

app.use(express.json());

/** Mount each individual router into the main application. */
app.use("/user", userRoutes);

/** Generic error handler; anything unhandled goes here. */
app.use(function (err, req, res, next) {
  return res.status(err.status).json({
    error: { err },
  });
});

export default app;
