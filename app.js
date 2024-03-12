import express from "express";
import userRoutes from "./routers/userRoutes.js";
import authRoutes from "./routers/authRoutes.js";
import taskRoutes from "./routers/taskRoutes.js";
import { authenticateJWT } from "./middleware/authMiddleware.js";
import { NotFoundError } from "./expressError";

const app = express();

app.use(express.json());
app.use(authenticateJWT);

/** Mount each individual router into the main application. */
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/task", taskRoutes);

/** Handle 404 errors -- this matches everything */
app.use(function (req, res, next) {
  return next(new NotFoundError());
});

/** Generic error handler; anything unhandled goes here. */
app.use(function (err, req, res, next) {
  return res.status(err.status).json({
    error: { err },
  });
});

export default app;
