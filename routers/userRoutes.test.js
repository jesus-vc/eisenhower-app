import request from "supertest";
import app from "../app";
import pool from "../db/db.js";

beforeAll(async () => await pool.query("DELETE FROM users"));
beforeEach(async () => await pool.query("BEGIN"));
afterEach(async () => await pool.query("ROLLBACK"));
afterAll(async () => await pool.end());

/************************************** POST /user/register */

describe("POST /user/regiser", function () {
  it("works with valid data for anon", async function () {
    const resp = await request(app).post("/user/register").send({
      firstName: "Lawrence",
      lastName: "O",
      email: "lawrenceo@fakemail.com",
      password: "nigeriaRules",
      phone: "1213213213",
    });

    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      email: "OTP sent",
    });
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

  // it("sends an e-mail containing an account activation link", async function () {});

  //E-mail Must not be already be in 'pending' or 'registered'

  //
});
