import { beforeAll, jest } from "@jest/globals";
import request from "supertest";
import app from "../app";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { REGISTRATION_TTL } from "../config.js";
import {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} from "./_testCommon";
import { getFakeUserId } from "../utils/testHelpers.js";

/************************************** Mocks */
/** Mock sendEmailRegistration fn to avoid sending external emails and to capture arguments sent to the fn.
 * sendEmailRegistration is invoked when sending requests to /auth/register */

jest.mock("../utils/email.js");
import sendEmailRegistration from "../utils/email.js";
const fakeResp = {
  accepted: [
    {
      Success: "Successfully emailed registration link!",
    },
  ],
};

/************************************** Reusable functions and variables */

let client;

const registerUser = async ({ newUser, verifyUser = false } = {}) => {
  /** Capture args sent to sendEmailRegistration */
  let plainTextToken, userId;
  sendEmailRegistration.mockImplementationOnce((args) => {
    plainTextToken = args.plainTextToken;
    userId = args.id;
    return fakeResp;
  });

  const respRegister = await request(app).post("/auth/register").send(newUser);
  expect(respRegister.statusCode).toEqual(200);
  if (verifyUser) {
    const respVerify = await request(app).post(
      `/auth/verify?token=${plainTextToken}&id=${userId}`
    );
    expect(respVerify.statusCode).toEqual(200);
  }

  sendEmailRegistration.mockReset();
  return { plainTextToken, userId };
};

/************************************** Hooks */

beforeAll(commonBeforeAll);
beforeEach(async () => {
  client = await commonBeforeEach();
});

afterEach(async () => {
  await commonAfterEach(client);
});

afterAll(commonAfterAll);

/************************************** POST /auth/login */

describe("POST /auth/login", function () {
  let storedPlainTextToken, storedUserId;
  const newUser = {
    firstName: "user",
    lastName: "lastname",
    phone: "1213213213",
    email: "test@test.com",
    password: "mypassword",
  };

  beforeAll(async () => {
    const { plainTextToken, userId } = await registerUser({
      newUser,
      verifyUser: true,
    });
    storedPlainTextToken = plainTextToken;
    storedUserId = userId;
  });

  it("returns auth token with valid email and password", async function () {
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
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      id: storedUserId,
      isAdmin: false,
    });
  });

  it("returns error with invalid password", async function () {
    const invalidPw = newUser.password + "1";
    const respLogin = await request(app).post("/auth/login").send({
      email: newUser.email,
      password: invalidPw,
    });
    expect(respLogin.statusCode).toEqual(400);

    expect(respLogin.body.error.message).toEqual("Invalid credentials.");
  });

  it("returns error with invalid email", async function () {
    const invalidEmail = "test2@test.com";
    const respLogin = await request(app).post("/auth/login").send({
      email: invalidEmail,
      password: newUser.password,
    });
    expect(respLogin.statusCode).toEqual(400);

    expect(respLogin.body.error.message).toEqual("Invalid credentials.");
  });

  it("returns schema error with malformed email", async function () {
    const invalidEmail = "test2test.com";
    const respLogin = await request(app).post("/auth/login").send({
      email: invalidEmail,
      password: newUser.password,
    });
    expect(respLogin.statusCode).toEqual(400);

    expect(respLogin.body.error.message).toEqual(
      '"email" must be a valid email'
    );
  });

  it("returns schema errors for email and password threshold violations", async function () {
    const longString = crypto.randomBytes(31).toString("hex"); //string lenth = 62
    const longEmail = `${longString}@test.com`;
    const resp1 = await request(app).post("/auth/login").send({
      email: longEmail,
      password: newUser.password,
    });
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      '"email" length must be less than or equal to 60 characters long'
    );

    const shortEmail = `t@y.co`;
    const resp2 = await request(app).post("/auth/login").send({
      email: shortEmail,

      password: newUser.password,
    });
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      '"email" length must be at least 8 characters long'
    );

    const shortPw = `123`;
    const resp3 = await request(app).post("/auth/login").send({
      email: newUser.email,
      password: shortPw,
    });
    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.message).toEqual(
      '"password" length must be at least 5 characters long'
    );

    const longPw = `${longString}@test.com`; //string lenth = 73
    const resp4 = await request(app).post("/auth/login").send({
      email: newUser.email,
      password: longPw,
    });
    expect(resp4.statusCode).toEqual(400);
    expect(resp4.body.error.message).toEqual(
      '"password" length must be less than or equal to 30 characters long'
    );
  });
});

/************************************** POST /auth/register */

describe("POST /auth/register", function () {
  beforeAll(() => {
    sendEmailRegistration.mockImplementation((args) => {
      return fakeResp;
    });
  });

  afterAll(() => {
    sendEmailRegistration.mockReset();
  });

  it("works with valid data for anon", async function () {
    const resp = await request(app).post("/auth/register").send({
      firstName: "Lawrence",
      lastName: "O",
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
      phone: "1213213213",
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual(fakeResp.accepted[0]);
  });

  it("returns error if duplicate account", async function () {
    const newUser = {
      firstName: "Lawrence",
      lastName: "O",
      phone: "1213213213",
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
    };

    const resp1 = await request(app).post("/auth/register").send(newUser);
    expect(resp1.statusCode).toEqual(200);

    const resp2 = await request(app).post("/auth/register").send(newUser);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      `Your ${newUser.email} is already registered or pending registration.`
    );
  });

  it("returns bad request with missing field: lastName", async function () {
    const resp = await request(app).post("/auth/register").send({
      firstName: "Lawrence",
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
      phone: "1213213213",
    });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual('"lastName" is required');
  });

  it("returns bad request with missing field: email", async function () {
    const resp = await request(app).post("/auth/register").send({
      firstName: "Lawrence",
      lastName: "O",
      password: "nigeriaRules",
      phone: "1213213213",
    });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual('"email" is required');
  });

  it("returns bad request with invalid e-mail data", async function () {
    const resp = await request(app).post("/auth/register").send({
      firstName: "Lawrence",
      lastName: "O",
      email: "not-an-email",
      password: "nigeriaRules",
      phone: "1213213213",
    });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual('"email" must be a valid email');
  });

  it("returns schema error (BadRequestError) based on first name threshold violations", async function () {
    const resp1 = await request(app).post("/auth/register").send({
      firstName: "",
      lastName: "LN1",
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
      phone: "1213213213",
    });
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      '"firstName" is not allowed to be empty'
    );

    const buffer = crypto.randomBytes(31);
    const longName = buffer.toString("hex"); //string length = 62

    const resp2 = await request(app).post("/auth/register").send({
      firstName: longName,
      lastName: "LN1",
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
      phone: "1213213213",
    });
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      '"firstName" length must be less than or equal to 30 characters long'
    );
  });

  it("returns schema error (BadRequestError) based on last name threshold violations", async function () {
    const resp1 = await request(app).post("/auth/register").send({
      firstName: "FN",
      lastName: "",
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
      phone: "1213213213",
    });
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      '"lastName" is not allowed to be empty'
    );

    const buffer = crypto.randomBytes(31);
    const longSring = buffer.toString("hex"); //string length = 62

    const resp2 = await request(app).post("/auth/register").send({
      firstName: "FN",
      lastName: longSring,
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
      phone: "1213213213",
    });
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      '"lastName" length must be less than or equal to 30 characters long'
    );
  });

  it("returns schema error (BadRequestError) based on email threshold violations", async function () {
    const resp1 = await request(app).post("/auth/register").send({
      firstName: "FN",
      lastName: "LN",
      email: "t@y.co",
      password: "password",
      phone: "1213213213",
    });
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      '"email" length must be at least 8 characters long'
    );

    const buffer = crypto.randomBytes(31);
    const longString = buffer.toString("hex"); //string length = 62

    const resp2 = await request(app)
      .post("/auth/register")
      .send({
        firstName: "FN",
        lastName: "LN",
        email: `${longString}@test.com`,
        password: "password",
        phone: "1213213213",
      });
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      '"email" length must be less than or equal to 60 characters long'
    );
  });

  it("returns schema error (BadRequestError) based on password threshold violations", async function () {
    const resp1 = await request(app).post("/auth/register").send({
      firstName: "FN",
      lastName: "LN",
      email: "u1@email.com",
      password: "123",
      phone: "1213213213",
    });
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      '"password" length must be at least 5 characters long'
    );

    const buffer = crypto.randomBytes(12);
    const longString = buffer.toString("hex"); //string length = 24

    const resp2 = await request(app).post("/auth/register").send({
      firstName: "FN",
      lastName: "LN",
      email: `u1@email.com`,
      password: longString,
      phone: "1213213213",
    });
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      '"password" length must be less than or equal to 20 characters long'
    );
  });

  it("returns schema error (BadRequestError) based on phone threshold violations", async function () {
    const resp1 = await request(app).post("/auth/register").send({
      firstName: "FN",
      lastName: "LN",
      email: "u1@email.com",
      password: "password",
      phone: "12",
    });
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      "Phone number must have 10 digits."
    );

    const buffer = crypto.randomBytes(60);
    const longString = buffer.toString("hex"); //string length = 120

    const resp2 = await request(app).post("/auth/register").send({
      firstName: "FN",
      lastName: "LN",
      email: `u1@email.com`,
      password: "password",
      phone: longString,
    });
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      "Phone number must have 10 digits."
    );
  });
});

/************************************** POST /auth/verify */

describe("POST /auth/verify", function () {
  let storedPlainTextToken, storedUserId;
  const newUser = {
    firstName: "user2",
    lastName: "lastname2",
    phone: "1213213213",
    email: "test2@test2.com",
    password: "mypassword2",
  };

  beforeEach(async () => {
    const { plainTextToken, userId } = await registerUser({
      newUser,
      verifyUser: false,
    });
    storedPlainTextToken = plainTextToken;
    storedUserId = userId;
  });

  it("works if valid token", async function () {
    const respValidToken = await request(app).post(
      `/auth/verify?token=${storedPlainTextToken}&id=${storedUserId}`
    );
    expect(respValidToken.statusCode).toEqual(200);
  });

  it("returns error if token has invalid length", async function () {
    const invalidToken = "fakeToken";
    const invalidUserId = getFakeUserId();

    const resp = await request(app).post(
      `/auth/verify?token=${invalidToken}&id=${invalidUserId}`
    );
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.message).toEqual(
      "Your registration link does not exist. Ensure the original link we e-mailed you has not been modified."
    );
  });

  it("returns error and emails new token for expired token", async function () {
    const expiredTime = new Date(
      Date.now() + (REGISTRATION_TTL + 10) * 60 * 1000
    );

    const mockDateNow = jest
      .spyOn(Date, "now")
      .mockImplementation(() => expiredTime);

    const respInvalidToken = await request(app).post(
      `/auth/verify?token=${storedPlainTextToken}&id=${storedUserId}`
    );

    expect(respInvalidToken.statusCode).toEqual(400);

    expect(respInvalidToken.body.error.message).toEqual(
      "Your registration link is expired. We've emailed you a new registration token."
    );

    expect(sendEmailRegistration.mock.calls[0][0].plainTextToken).not.toEqual(
      storedPlainTextToken
    );

    mockDateNow.mockRestore();
  });

  it("returns error if token does not exist for user id", async function () {
    const invalidUserId = getFakeUserId();
    const respInvalidToken = await request(app).post(
      `/auth/verify?token=${storedPlainTextToken}&id=${invalidUserId}`
    );

    expect(respInvalidToken.statusCode).toEqual(400);

    expect(respInvalidToken.body.error.message).toEqual(
      "Your registration link does not exist. Ensure the original link we e-mailed you has not been modified."
    );
  });

  it("returns error if token does not match hashed token in storage", async function () {
    /** Invalidate original token by inversing it. */
    const invalidToken = storedPlainTextToken.split("").reverse().join("");

    const respInvalidToken = await request(app).post(
      `/auth/verify?token=${invalidToken}&id=${storedUserId}`
    );

    expect(respInvalidToken.statusCode).toEqual(400);

    expect(respInvalidToken.body.error.message).toEqual(
      "Your registration link does not exist. Ensure the original link we e-mailed you has not been modified."
    );
  });

  it("fails: 'userId' input is invalid", async function () {
    const resp = await request(app).post(
      `/auth/verify?token=${storedPlainTextToken}&id=${getFakeUserId()}`
    );
    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe(
      `Your registration link does not exist. Ensure the original link we e-mailed you has not been modified.`
    );
  });
});
