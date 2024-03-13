import { config } from "dotenv";

/** Load the environment variables from the .env file. */
config();

/** Shared config for application; can be required many places. */

/** Speed up bcrypt during tests, since the algorithm safety isn't being tested. */
export const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === "test" ? 1 : 12;

/** Expiration time in minutes for registration links. */
export const REGISTRATION_TTL = process.env.NODE_ENV === "test" ? 1 : 15;

export const PORT = +process.env.PORT || 3001;

/** Expiration is 12 hours */
export const JWT_OPTIONS = { expiresIn: 60 * 60 * 12 };

export const SECRET_KEY = process.env.SECRET_KEY;
