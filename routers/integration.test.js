import { jest } from "@jest/globals";
import request from "supertest";
import app from "../app";
import jwt from "jsonwebtoken";
import pool from "../db/db.js";

import {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  adminToken,
} from "./_testCommon";

/************************************** Hooks */

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** Mocks */
/** Mock sendEmailRegistration fn to avoid sending external emails
 * and to capture arguments sent to the fn.
 * This fn is called on backend by the /auth/register route */
jest.mock("../utils/email.js");
import sendEmailRegistration from "../utils/email.js";
const fakeResp = {
  accepted: [
    {
      Success: "Successfully emailed registration link!",
    },
  ],
};
sendEmailRegistration.mockReturnValue(fakeResp);

/************************************** User Registration, Login, & Access to Tasks  */

describe("User Registration, Login, & Access to Tasks", () => {
  it("should register, verify, and grant a new non-admin user access to the correct /tasks:userId route", async () => {
    const newUser = {
      firstName: "U8F",
      lastName: "U8L",
      phone: "8888888888",
      email: "u8@email.com",
      password: "password8",
    };

    /** Capture args sent to sendEmailRegistration mock */
    let plainTextToken, userId;
    sendEmailRegistration.mockImplementation((args) => {
      plainTextToken = args.plainTextToken;
      userId = args.id;
      return fakeResp;
    });

    /** Register a user */
    const registerResponse = await request(app)
      .post("/auth/register")
      .send(newUser);

    expect(registerResponse.status).toBe(200);
    expect(registerResponse.body).toEqual(fakeResp.accepted[0]);

    /** Verify the user */
    const verifyResponse = await request(app).post(
      `/auth/verify?token=${plainTextToken}&id=${userId}`
    );
    expect(verifyResponse.status).toBe(200);

    /** Login verified user */
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

    /** Have access to the correct user/:userId/tasks route */
    const respTasks = await request(app)
      .get(`/user/${userId}/tasks`)
      .set("authorization", `Bearer ${await token}`);
    expect(respTasks.statusCode).toEqual(200);
    expect(respTasks.body).toEqual({
      tasks: [],
    });

    /** Unauthorized to access other users' user/:userId/tasks route */
    const otherUserIds = await pool.query(
      `SELECT id FROM users WHERE NOT email=$1 ORDER BY id ASC`,
      [newUser.email]
    );
    const badReq1 = await request(app)
      .get(`/user/${otherUserIds.rows[0].id}/tasks`)
      .set("authorization", `Bearer ${await token}`);
    expect(badReq1.statusCode).toEqual(401);

    const badReq2 = await request(app)
      .get(`/user/${otherUserIds.rows[0].id}/tasks`)
      .set("authorization", `Bearer ${await token}`);
    expect(badReq2.statusCode).toEqual(401);

    const badReq3 = await request(app)
      .get(`/user/${otherUserIds.rows[2].id}/tasks`)
      .set("authorization", `Bearer ${await token}`);
    expect(badReq3.statusCode).toEqual(401);

    /** Admin can access the new /:userId routes */
    const adminReq = await request(app)
      .get(`/user/${userId}/tasks`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(adminReq.statusCode).toEqual(200);
    expect(adminReq.body).toEqual({
      tasks: [],
    });
  });
});
