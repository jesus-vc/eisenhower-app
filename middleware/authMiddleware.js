/** Convenience middleware to handle common auth cases in routes. */

import pool from "../db/db.js";

import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../config.js";
import { UnauthorizedError } from "../expressError.js";

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

/** Middleware to use when user must be an admin or match the :userId value.
 *
 * Returns true or raises new UnauthorizedError(). */
export async function ensureCorrectUser(userId, resLocals) {
  if (!resLocals.user.isAdmin) {
    const user = await pool.query("SELECT email FROM users WHERE id=$1", [
      userId,
    ]);
    if (resLocals.user.email !== user.rows[0].email) {
      throw new UnauthorizedError();
    }
  }
  return true;
}
