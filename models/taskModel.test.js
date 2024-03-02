import pool from "../db/db.js";
import Task from "./taskModel.js";
import {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} from "./_testCommon";

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** get */

describe("get", function () {
  it("returns expected tasks and fields per user", async function () {
    const result = await pool.query("SELECT id FROM users");
    const user1 = result.rows[0].id;
    const user2 = result.rows[1].id;
    const user3 = result.rows[2].id;

    const tasks1 = await Task.getAll(user1);
    const tasks2 = await Task.getAll(user2);
    const tasks3 = await Task.getAll(user3);

    expect(tasks1).toEqual([
      {
        taskId: expect.any(Number),
        description: "Task 1",
        importance: "high",
        urgency: "high",
        timebox: 30,
        completed: false,
      },
    ]);

    expect(tasks2).toEqual([
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
    ]);

    expect(tasks3).toEqual([]);
  });

  it("does not expose unecessary data", async function () {
    const unnecessaryFields = "userId";
    const result = await pool.query("SELECT id FROM users");
    const user1 = result.rows[0].id;
    const user2 = result.rows[1].id;
    const user3 = result.rows[2].id;

    const tasks1 = await Task.getAll(user1);
    const tasks2 = await Task.getAll(user2);
    const tasks3 = await Task.getAll(user3);

    const objectsReturned = [...tasks1, ...tasks2, ...tasks3];

    const fieldsReturned = [];
    for (const obj of objectsReturned) {
      fieldsReturned.push(...Object.keys(obj));
    }

    expect(fieldsReturned).not.toContain(unnecessaryFields);
  });
});
