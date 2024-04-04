import pool from "../db/db.js";
import User from "./userModel";
import { BadRequestError } from "../expressError.js";

import {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} from "./_testCommon";

/************************************** hooks */

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** global variables */

const newUser = {
  firstName: "Lawrence",
  lastName: "O",
  phone: "1213213213",
  email: "lawrenceo@fakemail.com",
};

/************************************** registerAccount */

describe("registerAccount", function () {
  it("adds new user and hashed password to users table", async function () {
    let addedUser = await User.registerAccount({
      ...newUser,
      password: "nigeriaRules",
    });

    expect(addedUser).toEqual({
      ...newUser,
      id: expect.any(Number),
      plainTextToken: expect.stringMatching(/^.{26}$/),
    });

    const found = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      newUser.email,
    ]);

    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].hashed_password.startsWith("$2b$")).toEqual(true);
  });

  it("bad request with duplicate email", async function () {
    const duplicateAccount = {
      firstName: "U1F",
      lastName: "U1L",
      phone: "1111111111",
      email: "u1@email.com",
      password: "password",
    };

    const registrationPromise = User.registerAccount(duplicateAccount);

    await expect(registrationPromise).rejects.toThrow(
      'duplicate key value violates unique constraint "users_email_key"'
    );
  });
});

/************************************** createRegistrationToken */
describe("createRegistrationToken", function () {
  it("generates token string with length of 26", async function () {
    let token = await User.createRegistrationToken();

    expect(token).toEqual(expect.stringMatching(/^.{26}$/));

    const storedToken = await pool.query("SELECT * FROM tokens_registration");

    expect(storedToken.rows.length).toEqual(1);
    expect(storedToken.rows[0].hashed_token.startsWith("$2b$")).toEqual(true);
  });
});

/************************************** verifyAccount */

describe("verifyAccount", function () {
  it("updates a user's verified status and deletes registration token", async function () {
    await User.registerAccount({
      ...newUser,
      password: "nigeriaRules",
    });

    const addedUser = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      newUser.email,
    ]);

    expect(addedUser.rows[0].verified).toEqual(false);

    const addedToken = await pool.query(
      `SELECT * FROM tokens_registration WHERE fk_user_id = $1`,
      [addedUser.rows[0].id]
    );

    expect(addedToken.rows.length).toEqual(1);

    expect(addedUser.rows[0].verified).toEqual(false);

    await User.verifyAccount(addedUser.rows[0].id);

    const updatedUser = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [newUser.email]
    );

    expect(updatedUser.rows[0].verified).toEqual(true);

    const deletedToken = await pool.query(
      `SELECT * FROM tokens_registration WHERE fk_user_id = $1`,
      [addedUser.rows[0].id]
    );

    expect(deletedToken.rows.length).toEqual(0);
  });
});

/************************************** getId */
describe("getId", function () {
  it("returns a userId for email", async function () {
    const { id: registeredUser } = await User.registerAccount({
      ...newUser,
      password: "nigeriaRules",
    });

    const stordUserId = await User.getId(newUser.email);

    expect(stordUserId).toEqual(registeredUser);
  });

  it("returns error for invalid email", async function () {
    const getIdPromise = User.getId("invalid@email.com");
    await expect(getIdPromise).rejects.toThrow(BadRequestError);
    await expect(getIdPromise).rejects.toThrow(`Invalid email.`);
  });
});
