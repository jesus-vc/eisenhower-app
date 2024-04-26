import jwt from "jsonwebtoken";
import pool from "../db/db.js";

import { UnauthorizedError, NotFoundError } from "../expressError";
import Auth from "../models/authModel";
import {
  authenticateJWT,
  ensureLoggedIn,
  validateUser,
} from "./authMiddleware";

import { SECRET_KEY } from "../config";

const testJwt = jwt.sign(
  { email: "test@email.com", isAdmin: false },
  SECRET_KEY
);
const badJwt = jwt.sign({ email: "bad@email.com", isAdmin: false }, "wrong");
const adminJwt = jwt.sign(
  { email: "admin@email.com", isAdmin: true },
  SECRET_KEY
);

/************************************** authenticateJWT */

describe("authenticateJWT", function () {
  it("works: via header", function () {
    expect.assertions(2);
    const req = { headers: { authorization: `Bearer ${testJwt}` } };
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({
      user: {
        iat: expect.any(Number),
        email: "test@email.com",
        isAdmin: false,
      },
    });
  });

  it("works: no header", function () {
    expect.assertions(2);
    const req = {};
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });

  it("works: invalid token", function () {
    expect.assertions(2);
    const req = { headers: { authorization: `Bearer ${badJwt}` } };
    const res = { locals: {} };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });
});

/************************************** ensureLoggedIn */

describe("ensureLoggedIn", function () {
  it("works", function () {
    expect.assertions(1);
    const req = {};
    const res = {
      locals: { user: { email: "test@email.com", is_admin: false } },
    };
    const next = function (err) {
      expect(err).toBeFalsy();
    };
    ensureLoggedIn(req, res, next);
  });

  it("unauth if no login", function () {
    expect.assertions(1);
    const req = {};
    const res = { locals: {} };
    const next = function (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
    };
    ensureLoggedIn(req, res, next);
  });
});

/************************************** userExistsAndCorrect */

describe("userExistsAndCorrect", function () {
  let user1;

  beforeAll(async () => {
    await pool.query("DELETE FROM users");
    user1 = await Auth.registerAccount({
      firstName: "U1F",
      lastName: "U1L",
      phone: "1111111111",
      email: "u1@email.com",
      password: "password1",
    });
  });

  afterAll(async () => {
    await pool.query("DELETE FROM users");
    await pool.end();
  });

  it("throws NotFoundError to admin if userId doesn't exist", async function () {
    /** value of userId does not matter since admin status overrides this value in userExistsAndCorrect() fn. */
    const req = { params: { userId: 1111 } };
    const res = {
      locals: { user: { email: "admin@email.com", isAdmin: true } },
    };
    const next = function (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
      expect(err.message).toEqual("Not Found");
    };

    validateUser(req, res, next);
  });

  it("works for correct user without admin access", async function () {
    const req = { params: { userId: user1.id } };
    const res = {
      locals: { user: { email: user1.email, isAdmin: false } },
    };

    const next = function (err) {
      expect(err).toBeFalsy();
    };

    validateUser(req, res, next);
  });

  it("fails for incorrect user without admin access", async function () {
    const req = { params: { userId: user1.id } };
    const res = {
      locals: { user: { email: "u2@email.com", isAdmin: false } },
    };

    const next = function (err) {
      expect(err instanceof UnauthorizedError).toBeTruthy();
      expect(err.message).toEqual("Unauthorized");
    };

    validateUser(req, res, next);
  });
});
