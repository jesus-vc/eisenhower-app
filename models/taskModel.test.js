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
        title: "Task 1",
        urgent: true,
        important: true,
        priority: "now",
        timebox: 30,
        completed: false,
        note: "Note 1",
        category: "Finances",
        deadline_date: "1111-01-01",
      },
    ]);

    expect(tasks2).toEqual([
      {
        taskId: expect.any(Number),
        title: "Task 2",
        urgent: true,
        important: false,
        priority: "delegate",
        timebox: 60,
        completed: false,
        note: "Note 2",
        category: "Health",
        deadline_date: "2222-02-02",
      },
      {
        taskId: expect.any(Number),
        title: "Task 3",
        urgent: false,
        important: false,
        priority: "avoid",
        timebox: 90,
        completed: true,
        note: "Note 3",
        category: "Family",
        deadline_date: "3333-03-03",
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
