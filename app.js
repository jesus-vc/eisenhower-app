import express from "express";
import userRoutes from "./routers/userRoutes.js";
import authRoutes from "./routers/authRoutes.js";
import { authenticateJWT } from "./middleware/authMiddleware.js";
import { NotFoundError } from "./expressError.js";

const app = express();

app.use(express.json());
app.use(authenticateJWT);

/** Mount each individual router into the main application. */
app.use("/auth", authRoutes);
app.use("/user", userRoutes);

/** Handle 404 errors -- this handles requests that do not match any routes above */
app.use(function (req, res, next) {
  return next(new NotFoundError());
});

app.use(function (err, req, res, next) {
  let status;
  let message;

  if (!err.status) {
    status = 500;
    message = "Unexpected error occurred. Please try again.";
  } else {
    status = err.status;
    message = err.message;
  }

  return res.status(status).json({
    error: { message, status },
  });
});

export default app;
