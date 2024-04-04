import { jest } from "@jest/globals";
import request from "supertest";
import app from "../app";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} from "./_testCommon";

/************************************** Mocks */
/** Mock sendEmailRegistration fn to avoid sending external emails
 * and to capture arguments sent to the fn.
 * This fn is invoked on the backend for every request to /user/register*/
jest.mock("../utils/email.js");
import sendEmailRegistration from "../utils/email.js";
const fakeResp = {
  Success: "Successfully emailed registration link!",
};

/************************************** Hooks */

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** Reusable functions and variables */

const newUser = {
  firstName: "user",
  lastName: "lastname",
  phone: "1213213213",
  email: "test@test.com",
  password: "mypassword",
};

let plainTextToken, id;

const registerUser = async () => {
  /** Capture args sent to sendEmailRegistration */
  sendEmailRegistration.mockImplementation((args) => {
    plainTextToken = args.plainTextToken;
    id = args.id;
    return fakeResp;
  });

  const respRegister = await request(app).post("/user/register").send(newUser);
  expect(respRegister.statusCode).toEqual(200);

  const respVerify = await request(app).post(
    `/user/verify?token=${plainTextToken}&id=${id}`
  );

  expect(respVerify.statusCode).toEqual(302);
  expect(respVerify.text).toEqual("Found. Redirecting to /auth/login");
};

/************************************** POST /auth/login */

describe("POST /auth/login", function () {
  it("returns auth token with valid email and password", async function () {
    await registerUser();

    const respLogin = await request(app).post("/auth/login").send({
      email: newUser.email,
      password: newUser.password,
    });
    const token = respLogin.body.token;

    expect(respLogin.statusCode).toEqual(200);
    expect(jwt.decode(token)).toEqual({
      email: newUser.email,
      exp: expect.any(Number),
      iat: expect.any(Number),
      isAdmin: false,
    });
  });

  it("returns error with invalid password", async function () {
    await registerUser();

    const invalidPw = newUser.password + "1";
    const respLogin = await request(app).post("/auth/login").send({
      email: newUser.email,
      password: invalidPw,
    });
    expect(respLogin.statusCode).toEqual(400);

    expect(respLogin.body.error.err.message).toEqual("Invalid user/password.");
  });

  it("returns error with invalid email", async function () {
    await registerUser();

    const invalidEmail = "test2@test.com";
    const respLogin = await request(app).post("/auth/login").send({
      email: invalidEmail,
      password: newUser.password,
    });
    expect(respLogin.statusCode).toEqual(400);

    expect(respLogin.body.error.err.message).toEqual("Invalid user/password.");
  });

  it("returns schema error with malformed email", async function () {
    const invalidEmail = "test2test.com";
    const respLogin = await request(app).post("/auth/login").send({
      email: invalidEmail,
      password: newUser.password,
    });
    expect(respLogin.statusCode).toEqual(400);

    expect(respLogin.body.error.err.message).toEqual(
      '"email" must be a valid email'
    );
  });

  it("returns schema errors for email and password threshold violations", async function () {
    await registerUser();

    const longString = crypto.randomBytes(31).toString("hex"); //string lenth = 62
    const longEmail = `${longString}@test.com`;
    const resp1 = await request(app).post("/auth/login").send({
      email: longEmail,
      password: newUser.password,
    });
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.err.message).toEqual(
      '"email" length must be less than or equal to 60 characters long'
    );

    const shortEmail = `t@y.co`;
    const resp2 = await request(app).post("/auth/login").send({
      email: shortEmail,

      password: newUser.password,
    });
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.err.message).toEqual(
      '"email" length must be at least 8 characters long'
    );

    const shortPw = `123`;
    const resp3 = await request(app).post("/auth/login").send({
      email: newUser.email,
      password: shortPw,
    });
    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.err.message).toEqual(
      '"password" length must be at least 5 characters long'
    );

    const longPw = `${longString}@test.com`; //string lenth = 73
    const resp4 = await request(app).post("/auth/login").send({
      email: newUser.email,
      password: longPw,
    });
    expect(resp4.statusCode).toEqual(400);
    expect(resp4.body.error.err.message).toEqual(
      '"password" length must be less than or equal to 30 characters long'
    );
  });
});
