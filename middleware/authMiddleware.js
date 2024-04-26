/** Convenience middleware to handle common auth cases in routes. */

import pool from "../db/db.js";
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../config.js";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from "../expressError.js";

/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the email and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid. */
export function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when user must be logged in.
 *
 * If not logged in, raises Unauthorized. */
export function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware to use when user must be an admin.
 *
 * If not admin, raises Unauthorized. */
export function ensureIsAdmin(req, res, next) {
  try {
    if (res.locals.user.isAdmin === false) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Validates that a user exists.
 *
 * Throws NotFoundError or UnauthorizedError errors based on user role */

export const userExists = (user, res) => {
  // For non-admin users, throw UnauthorizedError to obsfucate the existence and non-existence of other user ids.
  if (!user.rows[0]) {
    if (res.locals.user.isAdmin) throw new NotFoundError();
    else throw new UnauthorizedError();
  }
  return true;
};

/** Validates that a non-admin user has access to the requested user resource
 *
 * Throws UnauthorizedError if unauthorized */

export const userCorrect = (user, res) => {
  // For non-admin users, throw UnauthorizedError to obsfucate the existence and non-existence of other user ids.
  if (!res.locals.user.isAdmin) {
    if (res.locals.user.email !== user.rows[0].email) {
      throw new UnauthorizedError();
    }
  }
  return true;
};

/** Middleware to perform multiple user-related validations
 *
 * Returns next() if validations pass or next(err) if validations fail. */

export const validateUser = async (req, res, next) => {
  try {
    const user = await pool.query("SELECT email FROM users WHERE id=$1", [
      req.params.userId,
    ]);

    if (userExists(user, res) && userCorrect(user, res)) {
      return next();
    }
  } catch (err) {
    return next(err);
  }
};

/** Validates that a task exists.
 *
 * Throws NotFoundError or UnauthorizedError errors based on user role */

export const taskExists = (taskOwner, res) => {
  // For non-admin users, throw UnauthorizedError to obsfucate the existence and non-existence of other user ids.
  if (!taskOwner.rows[0]) {
    if (res.locals.user.isAdmin) throw new NotFoundError();
    else throw new UnauthorizedError();
  }
  return true;
};

/** Validates that the requested task's owner in the DB must match the userId passed in the request
 *
 * Throws NotFoundError or UnauthorizedError errors based on user role */

export const taskCorrect = (taskOwner, res, req) => {
  // For non-admin users, throw UnauthorizedError to obsfucate the existence and non-existence of other user ids.
  if (Number(req.params.userId) !== taskOwner.rows[0].user_id) {
    if (res.locals.user.isAdmin) {
      throw new BadRequestError(
        "userId supplied does not match the owner of the taskId supplied."
      );
    } else {
      throw new UnauthorizedError();
    }
  }
  return true;
};

/**  Middleware to perform multiple task-related validations
 *
 * Middleware to use when user must be an admin or match the :userId value.
 *
 * Returns true or raises throws errors based on type of user. */

export const validateTask = async (req, res, next) => {
  try {
    const taskOwner = await pool.query(
      "SELECT user_id FROM tasks WHERE id=$1",
      [req.params.taskId]
    );

    if (taskExists(taskOwner, res) && taskCorrect(taskOwner, res, req)) {
      return next();
    }
  } catch (err) {
    return next(err);
  }
};
