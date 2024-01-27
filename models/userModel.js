// import * as db from "../db/db.js";

import pool from "../db/db.js";

import bcrypt from "bcrypt";
import { BadRequestError } from "../expressError.js";
import { BCRYPT_WORK_FACTOR } from "../config.js";

/** Related functions for users */

export default class User {
  /** Register user with data.
   *
   * Returns { firstName, lastName, phone, email }
   *
   * Throws BadRequestError on duplicate emails.
   **/
  static async register({ firstName, lastName, phone, email, password }) {
    const duplicateCheck = await pool.query(
      `SELECT email
             FROM users
             WHERE email = $1`,
      [email]
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(
        `Your ${email} is already registered or pending registration`
      );
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await pool.query(
      `INSERT INTO users
             (first_name, last_name, phone, email, hashed_password)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING first_name AS "firstName", last_name AS "lastName", phone, email`,
      [firstName, lastName, phone, email, hashedPassword]
    );

    const user = result.rows[0];

    return user;
  }
}
