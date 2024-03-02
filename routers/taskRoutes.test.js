import { jest } from "@jest/globals";
import request from "supertest";
import app from "../app";
import pool from "../db/db.js";

import {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
  adminToken,
} from "./_testCommon";

/************************************** Hooks */

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** Reusable functions */
//TODO replace with a future /users route that returns userIds.
const getUserIds = async () => {
  const ids = await pool.query(`SELECT id FROM users ORDER BY id ASC`);
  return ids.rows;
};

/************************************** GET /task/:userId */

describe("GET /task/:userId", function () {
  it("unauthorized for anon", async function () {
    const userIds = await getUserIds();
    const respTasks = await request(app).get(`/task/${userIds[0].id}`);
    expect(respTasks.statusCode).toEqual(401);
    expect(respTasks.body.error.err.message).toEqual("Unauthorized");
  });

  it("ok for admin and returns correct data", async function () {
    const userIds = await getUserIds();
    const user1 = userIds[0].id;
    const user2 = userIds[1].id;
    const user3 = userIds[2].id;

    const respTasks1 = await request(app)
      .get(`/task/${user1}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks1.statusCode).toEqual(200);
    expect(respTasks1.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          description: "Task 1",
          importance: "high",
          urgency: "high",
          timebox: 30,
          completed: false,
        },
      ],
    });

    const respTasks2 = await request(app)
      .get(`/task/${user2}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks2.statusCode).toEqual(200);
    expect(respTasks2.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          description: "Task 2",
          importance: "medium",
          urgency: "medium",
          timebox: 60,
          completed: false,
        },
        {
          taskId: expect.any(Number),
          description: "Task 3",
          importance: "low",
          urgency: "low",
          timebox: 90,
          completed: true,
        },
      ],
    });

    const respTasks3 = await request(app)
      .get(`/task/${user3}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks3.statusCode).toEqual(200);
    expect(respTasks3.body).toEqual({
      tasks: [],
    });
  });

  it("ok for correct users", async function () {
    const userIds = await getUserIds();
    const user1 = userIds[0].id;
    const user2 = userIds[1].id;

    const respTasks1 = await request(app)
      .get(`/task/${user1}`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(respTasks1.statusCode).toEqual(200);
    expect(respTasks1.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          description: "Task 1",
          importance: "high",
          urgency: "high",
          timebox: 30,
          completed: false,
        },
      ],
    });

    const respTasks2 = await request(app)
      .get(`/task/${user2}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(respTasks2.statusCode).toEqual(200);
    expect(respTasks2.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          description: "Task 2",
          importance: "medium",
          urgency: "medium",
          timebox: 60,
          completed: false,
        },
        {
          taskId: expect.any(Number),
          description: "Task 3",
          importance: "low",
          urgency: "low",
          timebox: 90,
          completed: true,
        },
      ],
    });
  });

  it("unauthorized for incorrect user and non-admin", async function () {
    const userIds = await getUserIds();
    const user1 = userIds[0].id;
    const user2 = userIds[1].id;

    const respTasks1 = await request(app)
      .get(`/task/${user1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(respTasks1.statusCode).toEqual(401);

    const respTasks2 = await request(app)
      .get(`/task/${user2}`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(respTasks2.statusCode).toEqual(401);
  });

  it("returns empty array for admin if userId does not exist", async function () {
    const respTasks = await request(app)
      .get(`/task/1`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks.statusCode).toEqual(200);
    expect(respTasks.body).toEqual({
      tasks: [],
    });
  });

  it("fails: invalid 'userId' input", async function () {
    const respTasks = await request(app)
      .get(`/task/DROP`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(respTasks.status).toBe(400);
    expect(respTasks.body.error.err.message).toBe('"userId" must be a number');
  });

  //TODO review and possibly change this test once I decide on using query parameters and how other routers will impact this route.
  it("returns 404 if no userId provided", async function () {
    const respTasks = await request(app).get(`/task/`);
    expect(respTasks.status).toBe(404);
  });
});
