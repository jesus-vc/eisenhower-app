import pool from "../db/db.js";
import Auth from "../models/authModel.js";
import bcrypt from "bcrypt";
import { BadRequestError } from "../expressError.js";
import {
  BCRYPT_WORK_FACTOR,
  REGISTRATION_TTL,
  JWT_OPTIONS,
} from "../config.js";
import crypto from "crypto";
import base32Encode from "base32-encode";
import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../config.js";
import sendEmailRegistration from "../utils/email.js";

/** Related functions for users */

export default class User {
  /** Returns userId for email. **/

  static async getId(email) {
    const userId = await pool.query(
      `SELECT id
        FROM users
        WHERE email = $1`,
      [email]
    );

    if (!userId.rows[0]) {
      throw new BadRequestError(`Invalid email.`);
    }

    return userId.rows[0].id;
  }
}
