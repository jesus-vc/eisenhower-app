import pool from "../db/db.js";
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

  /** Register a new account for user.
   *
   * Accepts { firstName, lastName, phone, email, password}.
   * Returns { id, firstName, lastName, phone, email, plainTextToken }.
   *
   * Throws BadRequestError on duplicate user emails. **/
  static async registerAccount({
    firstName,
    lastName,
    phone,
    email,
    password,
  }) {
    /**
     * //PEER Lawrence, a new hashed password is created before
     * checking for duplicates at the db level when performing the insert operation.
     * I think this can be memory-expensive, but perhaps this is okay to keep for now. What do you think? */

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await pool.query(
      `INSERT INTO users
             (first_name, last_name, phone, email, hashed_password)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, first_name AS "firstName", last_name AS "lastName", phone, email`,
      [firstName, lastName, phone, email, hashedPassword]
    );

    /** Generate token for e-mail invitation. */
    const plainTextToken = await User.createRegistrationToken(
      result.rows[0].id
    );
    const user = { ...result.rows[0], plainTextToken };

    return user;
  }

  /** Update a new user account's verified status and delete associated token.
   *
   * Returns nothing. **/

  static async verifyAccount(userId) {
    await pool.query(
      `UPDATE users
      SET verified = TRUE
      WHERE id = $1`,
      [userId]
    );

    await pool.query(
      `DELETE FROM tokens_registration
      WHERE fk_user_id = $1`,
      [userId]
    );
  }

  /** Authenticate:
   *
   * Validate user's 'verified' status.
   * Validate user's e-mail and password.
   *
   * Returns boolean. */

  static async authenticate(email, password) {
    const result = await pool.query(
      `SELECT hashed_password, verified
      FROM users
      WHERE email = $1`,
      [email]
    );

    if (!result.rows[0]) {
      throw new BadRequestError(`Invalid user/password.`);
    }

    if (result.rows[0].verified === false) {
      throw new BadRequestError(
        `Your account is still pending registration. Please activate your account by clicking on the registration link emailed to you.`
      );
    }

    return await bcrypt.compare(password, result.rows[0].hashed_password);
  }

  /** Generate and stores a JWT token.
   *
   * Returns a token. **/

  static async createAuthToken(userData) {
    let payload = {
      email: userData.email,
      isAdmin: userData.isAdmin || false,
    };

    return jwt.sign(payload, SECRET_KEY, JWT_OPTIONS);
  }

  /** Generate and stores a token.
   *
   * Returns a token
   *
   * Throws BadRequestError on duplicate emails. **/

  static async createRegistrationToken(userId) {
    /** Generate 16 random bytes using the OS's CSPRNG*/
    const randomBytes = crypto.randomBytes(16);

    const plainTextToken = base32Encode(randomBytes, "RFC4648", {
      padding: false,
    });

    const expirationTimestamp = new Date(
      Date.now() + REGISTRATION_TTL * 60 * 1000
    );

    const hashedToken = await bcrypt.hash(plainTextToken, BCRYPT_WORK_FACTOR);

    await pool.query(
      `INSERT INTO tokens_registration
             (hashed_token, fk_user_id, expiration_timestamp)
             VALUES ($1, $2, $3)
             `,
      [hashedToken, userId, expirationTimestamp]
    );
    return plainTextToken;
  }

  /** Validates a registration token.
   *
   * Returns a boolean (true/false). **/

  static async validToken({ token, id: userId }) {
    const result = await pool.query(
      `SELECT * FROM tokens_registration
      WHERE fk_user_id = $1`,
      [userId]
    );

    if (!result.rows[0]) {
      throw new BadRequestError(
        `Your registration link does not exist. Ensure the original link we e-mailed you has not been modified.`
      );
    }

    const isValid = await bcrypt.compare(token, result.rows[0].hashed_token);

    if (!isValid) {
      throw new BadRequestError(
        `Your registration link does not exist. Ensure the original link we e-mailed you has not been modified.`
      );
    }

    if (Date.now() > result.rows[0].expiration_timestamp) {
      /** Delete expired token */
      await pool.query(
        `DELETE FROM tokens_registration
        WHERE fk_user_id = $1`,
        [userId]
      );

      /** Generate and store new registration token  */
      const newToken = await User.createRegistrationToken(userId);

      /** Email new registration token  */
      const userEmail = await pool.query(
        `SELECT email FROM users
        WHERE id = $1`,
        [userId]
      );

      await sendEmailRegistration({
        id: Number(userId),
        email: userEmail.rows[0].email,
        plainTextToken: newToken,
      });

      //TODO Replace logic below once I create a React button that user has to click to send new token.
      throw new BadRequestError(
        `Your registration link is expired. We've emailed you a new registration token.`
      );
      // throw new BadRequestError(
      //   `Your registration link is expired. If you wish to get a new link, click on 'Send new registration link' button below.`
      // );
    }
    return true;
  }
}

//PEER Lawrence, is it best to move the token-related methods above (createAuthToken, createRegistrationToken, and validToken) to a separate Token class or are they fine here?
