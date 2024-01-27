/** Shared config for application; can be required many places. */

/** Speed up bcrypt during tests, since the algorithm safety isn't being tested. */
export const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === "test" ? 1 : 12;

export const PORT = +process.env.PORT || 3001;
