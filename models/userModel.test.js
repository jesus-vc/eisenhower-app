import pool from "../db/db.js";
import User from "./userModel";
import { BadRequestError } from "../expressError.js";

beforeAll(async () => await pool.query("DELETE FROM users"));
beforeEach(async () => await pool.query("BEGIN"));
afterEach(async () => await pool.query("ROLLBACK"));
afterAll(async () => await pool.end());

/************************************** register */

describe("register", function () {
  const newUser = {
    firstName: "Lawrence",
    lastName: "O",
    phone: "1213213213",
    email: "lawrenceo@fakemail.com",
  };

  it("adds new user as unregistered and hashed password", async function () {
    let addedUser = await User.register({
      ...newUser,
      password: "nigeriaRules",
    });
    expect(addedUser).toEqual(newUser);

    const found = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      newUser.email,
    ]);

    expect(found.rows.length).toEqual(1);
    expect(found.rows[0].registered).toEqual(false);
    expect(found.rows[0].hashed_password.startsWith("$2b$")).toEqual(true);
  });

  it("bad request with duplicate email", async function () {
    try {
      await User.register({
        ...newUser,
        password: "password",
      });
      await User.register({
        ...newUser,
        password: "password",
      });
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});
