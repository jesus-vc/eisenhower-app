import { jest } from "@jest/globals";
import request from "supertest";
import app from "../app";
import { REGISTRATION_TTL } from "../config.js";

import {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} from "./_testCommon";

/************************************** Mocks */
/** Mock sendEmailRegistration fn to avoid sending external emails
 * and to capture arguments sent to the fn.
 * This fn is called on backend by the /user/register route */
jest.mock("../utils/email.js");
import sendEmailRegistration from "../utils/email.js";
const fakeResp = {
  Success: "Successfully emailed registration link!",
};
sendEmailRegistration.mockReturnValue(fakeResp);

/************************************** Hooks */

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** Reusable functions */

const registerUser = async () => {
  const newUser = {
    firstName: "Lawrence",
    lastName: "O",
    phone: "1213213213",
    email: "test@test.com",
    password: "nigeriaRules",
  };

  // Capture args sent to sendEmailRegistration
  let plainTextToken, userId;
  sendEmailRegistration.mockImplementation((args) => {
    plainTextToken = args.plainTextToken;
    userId = args.id;
    return fakeResp;
  });

  const respRegister = await request(app).post("/user/register").send(newUser);
  expect(respRegister.statusCode).toEqual(200);

  return { plainTextToken, userId };
};

/************************************** POST /user/register */

describe("POST /user/register", function () {
  it("works with valid data for anon", async function () {
    const resp = await request(app).post("/user/register").send({
      firstName: "Lawrence",
      lastName: "O",
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
      phone: "1213213213",
    });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual(fakeResp);
  });

  it("returns error if duplicate account", async function () {
    const newUser = {
      firstName: "Lawrence",
      lastName: "O",
      phone: "1213213213",
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
    };

    const resp1 = await request(app).post("/user/register").send(newUser);
    expect(resp1.statusCode).toEqual(200);

    const resp2 = await request(app).post("/user/register").send(newUser);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.err.message).toEqual(
      `Your ${newUser.email} is already registered or pending registration.`
    );
  });

  it("returns bad request with missing field: lastName", async function () {
    const resp = await request(app).post("/user/register").send({
      firstName: "Lawrence",
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
      phone: "1213213213",
    });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.err.message).toEqual('"lastName" is required');
  });

  it("returns bad request with missing field: email", async function () {
    const resp = await request(app).post("/user/register").send({
      firstName: "Lawrence",
      lastName: "O",
      password: "nigeriaRules",
      phone: "1213213213",
    });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.err.message).toEqual('"email" is required');
  });

  it("returns bad request with invalid e-mail data", async function () {
    const resp = await request(app).post("/user/register").send({
      firstName: "Lawrence",
      lastName: "O",
      email: "not-an-email",
      password: "nigeriaRules",
      phone: "1213213213",
    });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.err.message).toEqual(
      '"email" must be a valid email'
    );
  });

  it("returns bad request with invalid phone data", async function () {
    const resp = await request(app).post("/user/register").send({
      firstName: "Lawrence",
      lastName: "O",
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
      phone: "not-a-number",
    });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.error.err.message).toEqual(
      "Phone number must have 10 digits."
    );
  });
});

/************************************** POST /user/verify */

describe("POST /user/verify", function () {
  it("works if valid token", async function () {
    const { plainTextToken, userId } = await registerUser();

    const respValidToken = await request(app).post(
      `/user/verify?token=${plainTextToken}&id=${userId}`
    );

    expect(respValidToken.statusCode).toEqual(302);
    expect(respValidToken.text).toEqual("Found. Redirecting to /auth/login");
  });

  it("returns error if token has invalid length", async function () {
    const invalidToken = "fakeToken";
    const invalidId = "f";

    const resp = await request(app).post(
      `/user/verify?token=${invalidToken}&id=${invalidId}`
    );
    expect(resp.statusCode).toEqual(400);

    expect(resp.body.error.err.message).toEqual(
      "Your registration link does not exist. Ensure the original link we e-mailed you has not been modified."
    );
  });

  it("returns error and emails new token for expired token", async function () {
    const { plainTextToken, userId } = await registerUser();

    const expiredTime = new Date(
      Date.now() + (REGISTRATION_TTL + 1) * 60 * 1000
    );

    jest.spyOn(Date, "now").mockReturnValueOnce(expiredTime);

    const respInvalidToken = await request(app).post(
      `/user/verify?token=${plainTextToken}&id=${userId}`
    );

    expect(respInvalidToken.statusCode).toEqual(400);

    expect(respInvalidToken.body.error.err.message).toEqual(
      "Your registration link is expired. We've emailed you a new registration token."
    );

    /** New token sent should be different from original token */
    const tokensEmailed = sendEmailRegistration.mock.calls.filter(
      (arr) => arr[0].id === userId
    );
    expect(tokensEmailed[0][0].plainTextToken).not.toEqual(
      tokensEmailed[1][0].plainTextToken
    );

    jest.spyOn(Date, "now").mockRestore();
  });

  it("returns error if token does not exist for user id", async function () {
    const { plainTextToken, userId } = await registerUser();

    const invalidUserId = userId + 1;

    const respInvalidToken = await request(app).post(
      `/user/verify?token=${plainTextToken}&id=${invalidUserId}`
    );

    expect(respInvalidToken.statusCode).toEqual(400);

    expect(respInvalidToken.body.error.err.message).toEqual(
      "Your registration link does not exist. Ensure the original link we e-mailed you has not been modified."
    );
  });

  it("returns error if token does not match hashed token in storage", async function () {
    const { plainTextToken, userId } = await registerUser();

    /** Invalidate original token by inversing it. */
    const invalidToken = plainTextToken.split("").reverse().join("");

    const respInvalidToken = await request(app).post(
      `/user/verify?token=${invalidToken}&id=${userId}`
    );

    expect(respInvalidToken.statusCode).toEqual(400);

    expect(respInvalidToken.body.error.err.message).toEqual(
      "Your registration link does not exist. Ensure the original link we e-mailed you has not been modified."
    );
  });
});
