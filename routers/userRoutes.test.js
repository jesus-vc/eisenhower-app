import request from "supertest";
import app from "../app";
import crypto from "crypto";
import { pool } from "../db/db.js";
import { v4 as uuidv4 } from "uuid";
import { getFakeUserId, getFakeCategoryId, getFakeTaskId } from "../utils/testHelpers.js";

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
beforeEach(async () => {
  client = await commonBeforeEach();
});

afterEach(async () => {
  await commonAfterEach(client);
});
afterAll(commonAfterAll);

/************************************** Reusable functions and variables */
let client;
let user1, user2, user3;
let customCategory1, customCategory2, customCategory3;
let defaultCategory1, defaultCategory2, defaultCategory3;
let uiTaskId1, uiTaskId2, uiTaskId3;

async function fetchGlobalData() {
  const userIds = await pool.query(
    "SELECT id FROM users ORDER BY first_name ASC"
  );

  [user1, user2, user3] = userIds.rows.map((row) => row.id);

  const uiTaskIds = await pool.query(
    `SELECT
      tasks.ui_task_id, tasks.note
    FROM
        tasks
    JOIN 
      users
    ON 
      tasks.fk_user_id = users.id
   ORDER BY
      tasks.note ASC`
  );

  [uiTaskId1, uiTaskId2, uiTaskId3] = uiTaskIds.rows.map(
    (row) => row.ui_task_id
  );

  const customCategoryIds = await pool.query(
    `SELECT categories.ui_category_id
     FROM categories
     JOIN users ON categories.fk_user_id = users.id
     WHERE categories.is_default = false
     ORDER BY categories.name ASC`
  );

  [customCategory1, customCategory2, customCategory3] =
    customCategoryIds.rows.map((row) => row.ui_category_id);

  const defaultCategoryIds = await pool.query(
    `SELECT categories.ui_category_id
     FROM categories
     JOIN users ON categories.fk_user_id = users.id
     WHERE categories.is_default = true
     ORDER BY users.first_name ASC`
  );

  [defaultCategory1, defaultCategory2, defaultCategory3] =
    defaultCategoryIds.rows.map((row) => row.ui_category_id);
}

beforeAll(async () => {
  await fetchGlobalData();
});

/************************************** GET /user/:userId/tasks */

describe("GET /user/:userId/tasks", function () {
  it("unauthorized for anon", async function () {
    const respTasks = await request(app).get(`/user/${user1}/tasks`);
    expect(respTasks.statusCode).toEqual(401);
    expect(respTasks.body.error.message).toEqual("Unauthorized");
  });

  it("ok for admin and returns correct data", async function () {
    const respTasks1 = await request(app)
      .get(`/user/${user1}/tasks?cats=true`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks1.statusCode).toEqual(200);
    expect(respTasks1.body).toEqual(
      expect.objectContaining({
        tasks: expect.arrayContaining([
          {
            taskId: uiTaskId1,
            title: "Task 1",
            timebox: 30,
            completed: false,
            note: "Note 1",
            categoryId: customCategory1,
            deadlineDate: "1111-01-01",
          },
        ]),
        categories: expect.arrayContaining([
          { categoryId: defaultCategory1, categoryName: "Ideas" },
          { categoryId: customCategory1, categoryName: "New Cat 1" },
        ]),
      })
    );

    const respTasks2 = await request(app)
      .get(`/user/${user1}/tasks`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks2.statusCode).toEqual(200);
    expect(respTasks2.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId1,
          title: "Task 1",
          timebox: 30,
          completed: false,
          note: "Note 1",
          categoryId: customCategory1,
          deadlineDate: "1111-01-01",
        },
      ],
    });

    const respTasks3 = await request(app)
      .get(`/user/${user2}/tasks?cats=true`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks3.statusCode).toEqual(200);
    expect(respTasks3.body).toEqual(
      expect.objectContaining({
        tasks: expect.arrayContaining([
          {
            taskId: uiTaskId2,
            title: "Task 2",
            timebox: 60,
            completed: false,
            note: "Note 2",
            categoryId: customCategory2,
            deadlineDate: "2222-02-02",
          },
          {
            taskId: uiTaskId3,
            title: "Task 3",
            timebox: 90,
            completed: true,
            note: "Note 3",
            categoryId: customCategory3,
            deadlineDate: "3333-03-03",
          },
        ]),
        categories: expect.arrayContaining([
          { categoryId: defaultCategory2, categoryName: "Ideas" },
          { categoryId: customCategory2, categoryName: "New Cat 2" },
          { categoryId: customCategory3, categoryName: "New Cat 3" },
        ]),
      })
    );

    const respTasks4 = await request(app)
      .get(`/user/${user2}/tasks`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks4.statusCode).toEqual(200);
    expect(respTasks4.body).toEqual({
      tasks: expect.arrayContaining([
        {
          taskId: uiTaskId2,
          title: "Task 2",
          timebox: 60,
          completed: false,
          note: "Note 2",
          categoryId: customCategory2,
          deadlineDate: "2222-02-02",
        },
        {
          taskId: uiTaskId3,
          title: "Task 3",
          timebox: 90,
          completed: true,
          note: "Note 3",
          categoryId: customCategory3,
          deadlineDate: "3333-03-03",
        },
      ]),
    });

    const respTasks5 = await request(app)
      .get(`/user/${user3}/tasks?cats=true`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks5.statusCode).toEqual(200);
    expect(respTasks5.body).toEqual(
      expect.objectContaining({
        tasks: [],
        categories: [{ categoryId: defaultCategory3, categoryName: "Ideas" }],
      })
    );

    const respTasks6 = await request(app)
      .get(`/user/${user3}/tasks`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks6.statusCode).toEqual(200);
    expect(respTasks6.body).toEqual(
      expect.objectContaining({
        tasks: [],
      })
    );
  });

  it("ok for correct users", async function () {
    //NICE-TO-HAVE Once I refactor using mocked databases, this is where I should be calling the mocked DB by injecting a fake database into the Model.

    const respTasks1 = await request(app)
      .get(`/user/${user1}/tasks?cats=true`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(respTasks1.statusCode).toEqual(200);
    expect(respTasks1.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId1,
          title: "Task 1",
          timebox: 30,
          completed: false,
          note: "Note 1",
          categoryId: customCategory1,
          deadlineDate: "1111-01-01",
        },
      ],
      categories: [
        { categoryId: defaultCategory1, categoryName: "Ideas" },
        { categoryId: customCategory1, categoryName: "New Cat 1" },
      ],
    });

    const respTasks2 = await request(app)
      .get(`/user/${user2}/tasks?cats=true`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(respTasks2.statusCode).toEqual(200);
    expect(respTasks2.body).toEqual(
      expect.objectContaining({
        tasks: expect.arrayContaining([
          {
            taskId: uiTaskId2,
            title: "Task 2",
            timebox: 60,
            completed: false,
            note: "Note 2",
            categoryId: customCategory2,
            deadlineDate: "2222-02-02",
          },
          {
            taskId: uiTaskId3,
            title: "Task 3",
            timebox: 90,
            completed: true,
            note: "Note 3",
            categoryId: customCategory3,
            deadlineDate: "3333-03-03",
          },
        ]),
        categories: expect.arrayContaining([
          { categoryId: defaultCategory2, categoryName: "Ideas" },
          { categoryId: customCategory2, categoryName: "New Cat 2" },
          { categoryId: customCategory3, categoryName: "New Cat 3" },
        ]),
      })
    );
  });

  it("unauthorized for incorrect user and non-admin", async function () {
    const respTasks1 = await request(app)
      .get(`/user/${user1}/tasks`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(respTasks1.statusCode).toEqual(401);

    const respTasks2 = await request(app)
      .get(`/user/${user2}/tasks`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(respTasks2.statusCode).toEqual(401);
  });

  it("returns empty array for admin if userId does not exist", async function () {
    const res1 = await request(app)
      .get(`/user/${getFakeUserId()}/tasks`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(res1.statusCode).toEqual(404);
    expect(res1.body.error.message).toEqual("Not Found");

    const res2 = await request(app)
      .get(`/user/${getFakeUserId()}/tasks?cats=true`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(res2.statusCode).toEqual(404);
    expect(res2.body.error.message).toEqual("Not Found");
  });

  it("fails: invalid 'userId' input", async function () {
    const respTasks = await request(app)
      .get(`/user/DROP/tasks/`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(respTasks.status).toBe(400);
    expect(respTasks.body.error.message).toBe('"userId" must be a valid UUID');
  });

  it("returns 404 if no userId provided", async function () {
    const respTasks = await request(app).get(`/user/tasks/`);
    expect(respTasks.status).toBe(404);
  });
});

/************************************** GET /user/:userId/tasks/{query filters} */

describe("GET /user/:userId/tasks/{query filters}", function () {
  it("returns tasks by 'title' filter for correct user", async function () {
    let query = "title=Task 3";
    const res1 = await request(app)
      .get(`/user/${user2}/tasks?${query}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(res1.statusCode).toEqual(200);
    expect(res1.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId3,
          title: "Task 3",
          timebox: 90,
          completed: true,
          note: "Note 3",
          categoryId: customCategory3,
          deadlineDate: "3333-03-03",
        },
      ],
    });

    const res2 = await request(app)
      .get(`/user/${user2}/tasks?cats=true&${query}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(res2.statusCode).toEqual(200);
    expect(res2.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId3,
          title: "Task 3",
          timebox: 90,
          completed: true,
          note: "Note 3",
          categoryId: customCategory3,
          deadlineDate: "3333-03-03",
        },
      ],
      categories: expect.arrayContaining([
        { categoryId: defaultCategory2, categoryName: "Ideas" },
        { categoryId: customCategory2, categoryName: "New Cat 2" },
        { categoryId: customCategory3, categoryName: "New Cat 3" },
      ]),
    });

    query = "title=Task 2";

    const res3 = await request(app)
      .get(`/user/${user2}/tasks?${query}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(res3.statusCode).toEqual(200);
    expect(res3.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId2,
          title: "Task 2",
          timebox: 60,
          completed: false,
          note: "Note 2",
          categoryId: customCategory2,
          deadlineDate: "2222-02-02",
        },
      ],
    });

    const res4 = await request(app)
      .get(`/user/${user2}/tasks?cats=true&${query}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(res4.statusCode).toEqual(200);
    expect(res4.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId2,
          title: "Task 2",
          timebox: 60,
          completed: false,
          note: "Note 2",
          categoryId: customCategory2,
          deadlineDate: "2222-02-02",
        },
      ],
      categories: expect.arrayContaining([
        { categoryId: defaultCategory2, categoryName: "Ideas" },
        { categoryId: customCategory2, categoryName: "New Cat 2" },
        { categoryId: customCategory3, categoryName: "New Cat 3" },
      ]),
    });
  });

  // Re-enable tasks if deprecated /priority path is reactivated
  // it("returns tasks by 'priority' filter for correct user", async function () {
  //   const query1 = "priority=delegate";
  //   const queryDelegate = await request(app)
  //     .get(`/user/${user2}/tasks?${query1}`)
  //     .set("authorization", `Bearer ${await u2Token}`);
  //   expect(queryDelegate.statusCode).toEqual(200);
  //   expect(queryDelegate.body).toEqual({
  //     tasks: [
  //       {
  //         taskId: uiTaskId2,
  //         title: "Task 2",

  //         timebox: 60,
  //         completed: false,
  //         note: "Note 2",
  //         categoryId: customCategory2,
  //         deadlineDate: "2222-02-02",
  //       },
  //     ],
  //   });

  //   const query2 = "priority=avoid";
  //   const queryAvoid = await request(app)
  //     .get(`/user/${user2}/tasks?${query2}`)
  //     .set("authorization", `Bearer ${await u2Token}`);
  //   expect(queryAvoid.statusCode).toEqual(200);
  //   expect(queryAvoid.body).toEqual({
  //     tasks: [
  //       {
  //         taskId: uiTaskId3,
  //         title: "Task 3",

  //         timebox: 90,
  //         completed: true,
  //         note: "Note 3",
  //         categoryId: customCategory3,
  //         deadlineDate: "3333-03-03",
  //       },
  //     ],
  //   });
  // });

  it("returns empty response if no results found and no categories requested", async function () {
    const query1 = "title=FakeTitle";

    const queryAvoid = await request(app)
      .get(`/user/${user2}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryAvoid.statusCode).toEqual(200);
    expect(queryAvoid.body).toEqual({
      tasks: [],
    });
  });

  it("returns tasks by 'deadline' filter for correct user", async function () {
    const query1 = "deadlineDate=1111-01-01";
    const queryDeadline1 = await request(app)
      .get(`/user/${user1}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(queryDeadline1.statusCode).toEqual(200);
    expect(queryDeadline1.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId1,
          title: "Task 1",

          timebox: 30,
          completed: false,
          note: "Note 1",
          categoryId: customCategory1,
          deadlineDate: "1111-01-01",
        },
      ],
    });

    const query2 = "deadlineDate=3333-03-03";
    const queryDeadline2 = await request(app)
      .get(`/user/${user2}/tasks?${query2}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryDeadline2.statusCode).toEqual(200);
    expect(queryDeadline2.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId3,
          title: "Task 3",

          timebox: 90,
          completed: true,
          note: "Note 3",
          categoryId: customCategory3,
          deadlineDate: "3333-03-03",
        },
      ],
    });
  });

  it("returns tasks by 'completed' filter for correct user", async function () {
    const query1 = "completed=true";
    const queryCompleted1 = await request(app)
      .get(`/user/${user2}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryCompleted1.statusCode).toEqual(200);
    expect(queryCompleted1.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId3,
          title: "Task 3",

          timebox: 90,
          completed: true,
          note: "Note 3",
          categoryId: customCategory3,
          deadlineDate: "3333-03-03",
        },
      ],
    });

    const query2 = "completed=false";
    const queryCompleted2 = await request(app)
      .get(`/user/${user2}/tasks?${query2}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryCompleted2.statusCode).toEqual(200);
    expect(queryCompleted2.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId2,
          title: "Task 2",

          timebox: 60,
          completed: false,
          note: "Note 2",
          categoryId: customCategory2,
          deadlineDate: "2222-02-02",
        },
      ],
    });
  });

  it("okay for admin", async function () {
    const query1 = "title=Task 3";
    const queryTitle1 = await request(app)
      .get(`/user/${user2}/tasks?${query1}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(queryTitle1.statusCode).toEqual(200);
    expect(queryTitle1.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId3,
          title: "Task 3",
          timebox: 90,
          completed: true,
          note: "Note 3",
          categoryId: customCategory3,
          deadlineDate: "3333-03-03",
        },
      ],
    });

    const queryTitle2 = await request(app)
      .get(`/user/${user3}/tasks?${query1}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(queryTitle2.statusCode).toEqual(200);
    expect(queryTitle2.body).toEqual({
      tasks: [],
    });

    const query3 = "deadlineDate=3333-03-03";
    const queryDeadline = await request(app)
      .get(`/user/${user2}/tasks?${query3}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(queryDeadline.statusCode).toEqual(200);
    expect(queryDeadline.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId3,
          title: "Task 3",

          timebox: 90,
          completed: true,
          note: "Note 3",
          categoryId: customCategory3,
          deadlineDate: "3333-03-03",
        },
      ],
    });
  });

  it("returns UnauthorizedError for non-admin user if userId does not exist", async function () {
    const query1 = "title=Task 3";
    const queryTitle1 = await request(app)
      .get(`/user/${getFakeUserId()}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(queryTitle1.statusCode).toEqual(401);
    expect(queryTitle1.body.error.message).toEqual("Unauthorized");
  });

  it("returns NotFoundError error for admin user if userId does not exist", async function () {
    const query1 = "title=Task 3";
    const queryTitle1 = await request(app)
      .get(`/user/${getFakeUserId()}/tasks?${query1}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(queryTitle1.statusCode).toEqual(404);
    expect(queryTitle1.body.error.message).toEqual("Not Found");
  });

  it("returns unauthorized for incorrect user and non-admin", async function () {
    const query1 = "title=Task 1";
    const res1 = await request(app)
      .get(`/user/${user1}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(res1.statusCode).toEqual(401);
    expect(res1.body.error.message).toEqual("Unauthorized");

    const query2 = "deadlineDate=1111-01-01";
    const res2 = await request(app)
      .get(`/user/${user1}/tasks?${query2}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(res2.statusCode).toEqual(401);
    expect(res2.body.error.message).toEqual("Unauthorized");

    const query3 = "deadlineDate=2222-02-02";
    const res3 = await request(app)
      .get(`/user/${user2}/tasks?${query3}`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(res3.statusCode).toEqual(401);
    expect(res3.body.error.message).toEqual("Unauthorized");

    const res4 = await request(app)
      .get(`/user/${user2}/tasks?cats=true&${query3}`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(res4.statusCode).toEqual(401);
    expect(res4.body.error.message).toEqual("Unauthorized");
  });

  it("fails: invalid inputs (misspellings, case sensitivity, and non-existing fields", async function () {
    const query1 = "timebox=60";
    const res1 = await request(app)
      .get(`/user/${user2}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(res1.statusCode).toEqual(400);
    expect(res1.body.error.message).toEqual('"timebox" is not allowed');

    const query2 = "category=Finances";
    const res2 = await request(app)
      .get(`/user/${user2}/tasks?${query2}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(res2.statusCode).toEqual(400);
    expect(res2.body.error.message).toEqual('"category" is not allowed');

    const query3 = "priorities=now";
    const res3 = await request(app)
      .get(`/user/${user2}/tasks?${query3}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(res3.statusCode).toEqual(400);
    expect(res3.body.error.message).toEqual('"priorities" is not allowed');

    const query4 = "deadlineDate=111-11-1111";
    const res4 = await request(app)
      .get(`/user/${user2}/tasks?${query4}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(res4.statusCode).toEqual(400);
    expect(res4.body.error.message).toEqual(
      '"deadlineDate" must be in YYYY-MM-DD format'
    );

    const query5 = "deadlineDate=33-3";
    const res5 = await request(app)
      .get(`/user/${user2}/tasks?${query5}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(res5.statusCode).toEqual(400);
    expect(res5.body.error.message).toEqual(
      '"deadlineDate" must be in YYYY-MM-DD format'
    );

    const query6 = "deadlineDate=03-03-3333";
    const res6 = await request(app)
      .get(`/user/${user2}/tasks?${query6}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(res6.statusCode).toEqual(400);
    expect(res6.body.error.message).toEqual(
      '"deadlineDate" must be in YYYY-MM-DD format'
    );

    const query7 = "DeadlineDate=1111-01-01";
    const res7 = await request(app)
      .get(`/user/${user1}/tasks?${query7}`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(res7.statusCode).toEqual(400);
    expect(res7.body.error.message).toEqual('"DeadlineDate" is not allowed');
  });

  it("fails: invalid inputs based on threshold violations", async function () {
    const query1 = "title=TooLongTitleExceeding30Characters";
    const queryTitle = await request(app)
      .get(`/user/${user2}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryTitle.statusCode).toEqual(400);
    expect(queryTitle.body.error.message).toEqual(
      '"title" length must be less than or equal to 30 characters long'
    );
  });

  it("returns all tasks for user if no query filters provided", async function () {
    const query1 = "";
    const queryNoFilters = await request(app)
      .get(`/user/${user2}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryNoFilters.statusCode).toEqual(200);
    expect(queryNoFilters.body).toEqual({
      tasks: [
        {
          taskId: uiTaskId2,
          title: "Task 2",
          timebox: 60,
          completed: false,
          note: "Note 2",
          categoryId: customCategory2,
          deadlineDate: "2222-02-02",
        },
        {
          taskId: uiTaskId3,
          title: "Task 3",
          timebox: 90,
          completed: true,
          note: "Note 3",
          categoryId: customCategory3,
          deadlineDate: "3333-03-03",
        },
      ],
    });
  });
});

/************************************** POST user/:userId/tasks { taskData } */

describe("POST user/:userId/tasks { taskData }", function () {
  const taskIdRegex =
    /^TA-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it("creates new task with just required fields for admin and non-admin user", async function () {
    const task1 = {
      title: "New Task 1",
    };
    const resp1 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(201);

    expect(resp1.body).toEqual({
      task: {
        taskId: expect.stringMatching(taskIdRegex),
        userId: user2,
        title: "New Task 1",
        timebox: null,
        completed: false,
        note: null,
        categoryId: defaultCategory2,
        deadlineDate: null,
      },
    });

    const task2 = {
      title: "New Task 2",
    };
    const resp2 = await request(app)
      .post(`/user/${user3}/tasks`)
      .send(task2)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(201);
    expect(resp2.body).toEqual({
      task: {
        taskId: expect.stringMatching(taskIdRegex),
        userId: user3,
        title: "New Task 2",
        timebox: null,
        completed: false,
        note: null,
        categoryId: defaultCategory3,
        deadlineDate: null,
      },
    });
  });

  it("creates new task with optional fields for admin and non-admin user", async function () {
    const task1 = {
      title: "New Task 1",
      timebox: 9,
      note: "New Note",
      deadlineDate: "2024-07-02",
    };

    const resp1 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(201);
    expect(resp1.body).toEqual({
      task: {
        taskId: expect.stringMatching(taskIdRegex),
        userId: user2,
        title: "New Task 1",
        completed: false,
        timebox: 9,
        note: "New Note",
        categoryId: defaultCategory2,
        deadlineDate: "2024-07-02",
      },
    });

    const task2 = {
      title: "New Task 2",
      timebox: 90,
      note: "New Note 2",
      deadlineDate: "2030-07-02",
    };

    const resp2 = await request(app)
      .post(`/user/${user3}/tasks`)
      .send(task2)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(201);
    expect(resp2.body).toEqual({
      task: {
        taskId: expect.stringMatching(taskIdRegex),
        userId: user3,
        title: "New Task 2",
        timebox: 90,
        note: "New Note 2",
        categoryId: defaultCategory3,
        completed: false,
        deadlineDate: "2030-07-02",
      },
    });
  });

  it("returns 400 error for empty request body", async function () {
    const task1 = {};
    const resp1 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(400);
  });

  it("throws UnauthorizedError to non-admin user for non-existing userId", async function () {
    const task1 = {
      title: "New Task 1",
    };
    const resp1 = await request(app)
      .post(`/user/${getFakeUserId()}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws NotFoundError to admin user for non-existing userId", async function () {
    const task1 = {
      title: "New Task 1",
    };
    const resp1 = await request(app)
      .post(`/user/${getFakeUserId()}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to non-admin and incorrect user", async function () {
    const task1 = {
      title: "New Task 1",
    };
    const resp1 = await request(app)
      .post(`/user/${user3}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to unauthenticated user", async function () {
    const task1 = {
      title: "New Task 1",
    };
    const resp1 = await request(app).post(`/user/${user3}/tasks`).send(task1);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("returns schema error (BadRequestError) for missing fields", async function () {
    const task1 = {
      // title: "New Task 1", // missing field
    };
    const resp1 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual('"title" is required');
  });

  it("returns schema error (BadRequestError) based on misspelling, non-existing fields, case sensisitivity", async function () {
    const task1 = {
      Title: "New Task 1",
    };
    const resp1 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual('"title" is required');

    const task2 = {
      title: "New Task 1",
      categoryName: "New Category",
    };
    const resp2 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task2)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual('"categoryName" is not allowed');

    const task3 = {
      title: "New Task 1",
      admin: true,
    };
    const resp3 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task3)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.message).toEqual('"admin" is not allowed');

    const task4 = {
      title: "TooLongTitleExceeding30Characters",
    };
    const resp4 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task4)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp4.statusCode).toEqual(400);
    expect(resp4.body.error.message).toEqual(
      '"title" length must be less than or equal to 30 characters long'
    );
    const task5 = {
      title: "T",
    };
    const resp5 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task5)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp5.statusCode).toEqual(400);
    expect(resp5.body.error.message).toEqual(
      '"title" length must be at least 3 characters long'
    );
  });

  it("returns schema error (BadRequestError) based on threshold violations", async function () {
    const task1 = {
      title: "TooLongTitleExceeding30Characters",
    };

    const resp1 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      '"title" length must be less than or equal to 30 characters long'
    );

    const buffer = crypto.randomBytes(300);
    const longNote = buffer.toString("hex"); //string length = 600
    const task2 = {
      title: "Title 1",
      note: longNote,
    };

    const resp2 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task2)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      '"note" length must be less than or equal to 500 characters long'
    );

    const malformedCategory = getFakeCategoryId() + getFakeCategoryId();

    const task3 = {
      title: "Title 1",
      categoryId: malformedCategory,
    };

    const resp3 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task3)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.message).toEqual(
      '"categoryId" must be in the format "CA-UUID"'
    );

    const task4 = {
      title: "Title 1",
      categoryId: "N",
    };

    const resp4 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task4)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp4.statusCode).toEqual(400);
    expect(resp4.body.error.message).toEqual(
      '"categoryId" must be in the format "CA-UUID"'
    );

    const task5 = {
      title: "Title 1",

      note: "",
    };

    const resp5 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task5)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp5.statusCode).toEqual(400);
    expect(resp5.body.error.message).toEqual(
      '"note" is not allowed to be empty'
    );

    const task6 = {
      title: "Title 1",

      timebox: 0,
    };

    const resp6 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task6)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp6.statusCode).toEqual(400);
    expect(resp6.body.error.message).toEqual(
      '"timebox" must be a positive number'
    );

    const task7 = {
      title: "Title 1",

      timebox: 601,
    };

    const resp7 = await request(app)
      .post(`/user/${user2}/tasks`)
      .send(task7)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp7.statusCode).toEqual(400);
    expect(resp7.body.error.message).toEqual(
      '"timebox" must be less than or equal to 600'
    );
  });

  it("fails: 'userId' input too large", async function () {
    const task1 = {
      title: "New Task 1",
    };

    const malformedUserId = getFakeUserId() + getFakeUserId();

    const resp = await request(app)
      .post(`/user/${malformedUserId}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe('"userId" must be a valid UUID');
  });
});

/************************************** PATCH user/:userId/tasks/:taskId { newData } */
describe("PATCH user/:userId/tasks/:taskId { newData }", function () {
  it("updates task for admin and non-admin user", async function () {
    const updatedTask1 = {
      title: "Updated Task 1",
      timebox: 450,
      completed: true,
      note: "Updated Note 1",
      categoryId: defaultCategory1,
      deadlineDate: "2024-09-01",
    };

    const resp1 = await request(app)
      .patch(`/user/${user1}/tasks/${uiTaskId1}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(201);
    expect(resp1.body).toEqual({
      task: {
        taskId: uiTaskId1,
        userId: user1,
        title: "Updated Task 1",
        timebox: 450,
        completed: true,
        note: "Updated Note 1",
        categoryId: defaultCategory1,
        deadlineDate: "2024-09-01",
      },
    });

    const updatedTask2 = {
      title: "Updated Task 2",
      timebox: 50,
      completed: true,
      deadlineDate: "2024-09-09",
    };
    const resp2 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId2}/`)
      .send(updatedTask2)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp2.statusCode).toEqual(201);
    expect(resp2.body).toEqual({
      task: {
        taskId: uiTaskId2,
        userId: user2,
        title: "Updated Task 2",
        timebox: 50,
        completed: true,
        deadlineDate: "2024-09-09",
      },
    });

    const updatedTask3 = {
      deadlineDate: "2035-09-09",
    };
    const resp3 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask3)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp3.statusCode).toEqual(201);
    expect(resp3.body).toEqual({
      task: {
        taskId: uiTaskId3,
        userId: user2,
        deadlineDate: updatedTask3.deadlineDate,
      },
    });

    const updatedTask4 = {
      note: "New Note 4",
    };
    const resp4 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask4)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp4.statusCode).toEqual(201);
    expect(resp4.body).toEqual({
      task: {
        taskId: uiTaskId3,
        userId: user2,
        note: "New Note 4",
      },
    });
  });

  it("uses last instance if duplicate keys", async function () {
    const updatedTask1 = {
      title: "Updated Task 1",
      title: "Updated Task 2",
      title: "Updated Task 3",
      title: "Updated Task 4",
      timebox: 450,
      completed: true,
      note: "Updated Note 1",
      categoryId: defaultCategory1,
      deadlineDate: "2024-09-01",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1}/tasks/${uiTaskId1}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(201);
    expect(resp1.body).toEqual({
      task: {
        taskId: uiTaskId1,
        userId: user1,
        title: "Updated Task 4",
        timebox: 450,
        completed: true,
        note: "Updated Note 1",
        categoryId: defaultCategory1,
        deadlineDate: "2024-09-01",
      },
    });
  });

  it("returns BadRequestError reponse for no updated fields", async function () {
    const updatedTask = {};
    const resp1 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      "Empty request to update a task is not allowed."
    );
  });

  it("throws UnauthorizedError to non-admin user for non-existing taskId", async function () {
    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1}/tasks/${getFakeTaskId()}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await u1Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws NotFoundError to admin user for non-existing taskId", async function () {
    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1}/111/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to non-admin and incorrect user for existing taskId", async function () {
    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1}/tasks/${uiTaskId1}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to non-admin and incorrect user for non-existing taskId", async function () {
    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1}/tasks/${getFakeTaskId()}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to unauthenticated user", async function () {
    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1}/tasks/${uiTaskId1}/`)
      .send(updatedTask1);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws BadRequestError to admin user for taskId and userId mismatch", async function () {
    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1}/tasks/${uiTaskId3}`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      "userId supplied does not match the owner of the taskId supplied."
    );

    const updatedTask2 = {
      deadlineDate: "2035-09-09",
      categoryId: defaultCategory2,
    };

    const resp2 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId1}/`)
      .send(updatedTask2)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      "userId supplied does not match the owner of the taskId supplied."
    );
  });

  it("throws appropriate errors to admin and non-admin users for categoryId mismatch", async function () {
    const updatedTask1 = {
      deadlineDate: "2035-09-09",
      categoryId: defaultCategory3,
    };

    const resp1 = await request(app)
      .patch(`/user/${user1}/tasks/${uiTaskId1}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      "userId supplied does not match the owner of the categoryId supplied."
    );

    const resp2 = await request(app)
      .patch(`/user/${user1}/tasks/${uiTaskId1}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp2.statusCode).toEqual(401);
    expect(resp2.body.error.message).toEqual("Unauthorized");
  });

  it("returns BadRequestError if 'user_id' or 'userId' fields are in request body", async function () {
    const updatedTask1 = {
      userId: 1111,
      title: "Updated Task",
    };

    const resp1 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual('"userId" is not allowed');
    const updatedTask2 = {
      user_id: 1111,
      title: "Updated Task",
    };

    const resp2 = await request(app)
      .patch(`/user/${user1}/tasks/${uiTaskId1}/`)
      .send(updatedTask2)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual('"user_id" is not allowed');
  });

  it("returns schema error (BadRequestError) based on misspelling, non-existing fields, and case sensisitivity", async function () {
    const updatedTask1 = {
      Title: "Updated Task",
    };
    const resp1 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual('"Title" is not allowed');

    const updatedTask2 = {
      admin: true,
    };
    const resp2 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask2)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual('"admin" is not allowed');

    const updatedTask3 = {
      completed: "yes",
    };
    const resp3 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask3)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.message).toEqual('"completed" must be a boolean');

    const updatedTask4 = {
      urrgent: true,
    };
    const resp4 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask4)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp4.statusCode).toEqual(400);
    expect(resp4.body.error.message).toEqual('"urrgent" is not allowed');
  });

  it("returns schema error (BadRequestError) based threshold violations", async function () {
    const updatedTask1 = {
      title: "TooLongTitleExceeding30Characters",
    };

    const resp1 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      '"title" length must be less than or equal to 30 characters long'
    );

    const buffer = crypto.randomBytes(300);
    const longNote = buffer.toString("hex"); //string length = 600
    const updatedTask2 = {
      note: longNote,
    };
    const resp2 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask2)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      '"note" length must be less than or equal to 500 characters long'
    );

    const malformedCategory = getFakeCategoryId() + getFakeCategoryId();

    const updatedTask3 = {
      categoryId: malformedCategory,
    };
    const resp3 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask3)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.message).toEqual(
      '"categoryId" must be in the format "CA-UUID"'
    );

    const updatedTask4 = {
      categoryId: "N",
    };
    const resp4 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask4)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp4.statusCode).toEqual(400);
    expect(resp4.body.error.message).toEqual(
      '"categoryId" must be in the format "CA-UUID"'
    );
    const updatedTask5 = {
      note: "",
    };
    const resp5 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask5)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp5.statusCode).toEqual(400);
    expect(resp5.body.error.message).toEqual(
      '"note" is not allowed to be empty'
    );

    const updatedTask6 = {
      timebox: 0,
    };
    const resp6 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask6)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp6.statusCode).toEqual(400);
    expect(resp6.body.error.message).toEqual(
      '"timebox" must be a positive number'
    );
    const updatedTask7 = {
      timebox: "601",
    };
    const resp7 = await request(app)
      .patch(`/user/${user2}/tasks/${uiTaskId3}/`)
      .send(updatedTask7)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp7.statusCode).toEqual(400);
    expect(resp7.body.error.message).toEqual(
      '"timebox" must be less than or equal to 600'
    );
  });

  it("fails: 'userId' input is invalid", async function () {
    const updatedTask = {
      title: "Updated Task 1",
    };
    const malformedUserId = getFakeUserId() + getFakeUserId();
    const resp = await request(app)
      .patch(`/user/${malformedUserId}}/tasks/${uiTaskId1}/`)
      .send(updatedTask)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe('"userId" must be a valid UUID');
  });

  it("fails: 'taskId' input too large", async function () {
    const updatedTask = {
      title: "Updated Task 1",
    };

    const malformedTaskId = getFakeTaskId() + getFakeTaskId();

    const resp = await request(app)
      .patch(`/user/${user2}/tasks/${malformedTaskId}/`)
      .send(updatedTask)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe(
      '"taskId" must be in the format "TA-UUID"'
    );
  });
});

// Re-enable tests if deprecated /priority path ever becomes active.
/************************************** PATCH user/:userId/tasks/:taskId/priority { newData } */
// describe("PATCH user/:userId/tasks/:taskId/priority { newData }", function () {
//   it("updates task for admin and non-admin user", async function () {
//     const [user1, user2, user3] = await getUserIds();
//     const [task1, task2, task3] = await getTaskIds();
//     const resp1 = await request(app)
//       .patch(`/user/${user1.id}/tasks/${task1.id}/priority`)
//       .send({
//         priority: "delegate",
//       })
//       .set("authorization", `Bearer ${await adminToken}`);
//     expect(resp1.statusCode).toEqual(201);
//     expect(resp1.body).toEqual({
//       task: {
//         taskId: task1.id,
//         userId: user1.id,
//         urgent: true,
//         important: false,
//         priority: "delegate",
//       },
//     });

//     const resp2 = await request(app)
//       .patch(`/user/${user1.id}/tasks/${task1.id}/priority`)
//       .send({
//         priority: "avoid",
//       })
//       .set("authorization", `Bearer ${await u1Token}`);
//     expect(resp2.statusCode).toEqual(201);
//     expect(resp2.body).toEqual({
//       task: {
//         taskId: task1.id,
//         userId: user1.id,
//         urgent: false,
//         important: false,
//         priority: "avoid",
//       },
//     });

//     const resp3 = await request(app)
//       .patch(`/user/${user2.id}/tasks/${task2.id}/priority`)
//       .send({
//         priority: "schedule",
//       })
//       .set("authorization", `Bearer ${await u2Token}`);
//     expect(resp3.statusCode).toEqual(201);
//     expect(resp3.body).toEqual({
//       task: {
//         taskId: task2.id,
//         userId: user2.id,
//         urgent: false,
//         important: true,
//         priority: "schedule",
//       },
//     });

//     const resp4 = await request(app)
//       .patch(`/user/${user2.id}/tasks/${task3.id}/priority`)
//       .send({
//         priority: "now",
//       })
//       .set("authorization", `Bearer ${await adminToken}`);
//     expect(resp4.statusCode).toEqual(201);
//     expect(resp4.body).toEqual({
//       task: {
//         taskId: task3.id,
//         userId: user2.id,
//         urgent: true,
//         important: true,
//         priority: "now",
//       },
//     });
//   });

//   it("returns 404 NotFoundError reponses for no userId and/or taskID provided", async function () {
//     const [user1, user2, user3] = await getUserIds();
//     const [task1, task2, task3] = await getTaskIds();

//     const resp1 = await request(app)
//       .patch(`/user/${user1.id}/tasks/`)
//       .send({
//         priority: "delegate",
//       })
//       .set("authorization", `Bearer ${await adminToken}`);
//     expect(resp1.statusCode).toEqual(404);

//     const resp3 = await request(app)
//       .patch(`/user/tasks/${task3.id}/priority`)
//       .send({
//         priority: "avoid",
//       })
//       .set("authorization", `Bearer ${await adminToken}`);
//     expect(resp3.statusCode).toEqual(404);
//   });

//   it("throws UnauthorizedError to non-admin user for non-existing taskId", async function () {
//     const [user1, user2, user3] = await getUserIds();

//     const resp1 = await request(app)
//       .patch(`/user/${user1.id}/tasks/111/priority`)
//       .send({
//         priority: "delegate",
//       })
//       .set("authorization", `Bearer ${await u2Token}`);
//     expect(resp1.statusCode).toEqual(401);
//     expect(resp1.body.error.message).toEqual("Unauthorized");
//   });

//   it("throws NotFoundError to admin user for non-existing taskId", async function () {
//     const [user1, user2, user3] = await getUserIds();
//     const [task1, task2, task3] = await getTaskIds();
//     const resp1 = await request(app)
//       .patch(`/user/${user1.id}/tasks/111/priority`)
//       .send({
//         priority: "delegate",
//       })
//       .set("authorization", `Bearer ${await adminToken}`);
//     expect(resp1.statusCode).toEqual(404);
//     expect(resp1.body.error.message).toEqual("Not Found");
//   });

//   it("throws NotFoundError to admin user for non-existing userId", async function () {
//     const [user1, user2, user3] = await getUserIds();
//     const [task1, task2, task3] = await getTaskIds();
//     const resp1 = await request(app)
//       .patch(`/user/111/${task1.id}/priority`)
//       .send({
//         priority: "delegate",
//       })
//       .set("authorization", `Bearer ${await adminToken}`);
//     expect(resp1.statusCode).toEqual(404);
//     expect(resp1.body.error.message).toEqual("Not Found");
//   });

//   it("throws UnauthorizedError to admin user for non-existing userId", async function () {
//     const [user1, user2, user3] = await getUserIds();
//     const [task1, task2, task3] = await getTaskIds();
//     const resp1 = await request(app)
//       .patch(`/user/111/tasks/${task1.id}/priority`)
//       .send({
//         priority: "delegate",
//       })
//       .set("authorization", `Bearer ${await u1Token}`);
//     expect(resp1.statusCode).toEqual(401);
//     expect(resp1.body.error.message).toEqual("Unauthorized");
//   });

//   it("throws UnauthorizedError to non-admin and incorrect user", async function () {
//     const [user1, user2, user3] = await getUserIds();
//     const [task1, task2, task3] = await getTaskIds();
//     const resp1 = await request(app)
//       .patch(`/user/${user2.id}/tasks/${task2.id}/priority`)
//       .send({
//         priority: "delegate",
//       })
//       .set("authorization", `Bearer ${await u1Token}`);
//     expect(resp1.statusCode).toEqual(401);
//     expect(resp1.body.error.message).toEqual("Unauthorized");
//   });

//   it("throws UnauthorizedError to unauthenticated user", async function () {
//     const [user1, user2, user3] = await getUserIds();
//     const [task1, task2, task3] = await getTaskIds();
//     const resp1 = await request(app)
//       .patch(`/user/${user2.id}/tasks/${task2.id}/priority`)
//       .send({
//         priority: "delegate",
//       });
//     expect(resp1.statusCode).toEqual(401);
//     expect(resp1.body.error.message).toEqual("Unauthorized");
//   });

//   it("returns NotFoundError to admin if userId and taskId path parameter positions are switched", async function () {
//     const [user1, user2, user3] = await getUserIds();
//     const [task1, task2, task3] = await getTaskIds();
//     const resp1 = await request(app)
//       .patch(`/user/${task2.id}/tasks/${user2.id}/priority`)
//       .send({
//         priority: "delegate",
//       })
//       .set("authorization", `Bearer ${await adminToken}`);

//     expect(resp1.statusCode).toEqual(404);
//     expect(resp1.body.error.message).toEqual("Not Found");
//   });

//   it("returns UnauthorizedError to non-admin if userId and taskId path parameter positions are switched", async function () {
//     const [user1, user2, user3] = await getUserIds();
//     const [task1, task2, task3] = await getTaskIds();
//     const resp1 = await request(app)
//       .patch(`/user/${task2.id}/tasks/${user2.id}/priority`)
//       .send({
//         priority: "delegate",
//       })
//       .set("authorization", `Bearer ${await u1Token}`);
//     expect(resp1.statusCode).toEqual(401);
//     expect(resp1.body.error.message).toEqual("Unauthorized");
//   });

//   it("fails: 'userId' input too large", async function () {
//     const resp = await request(app)
//       .patch(`/user/90071992547409924/tasks/1/priority`)
//       .send({
//         priority: "delegate",
//       })
//       .set("authorization", `Bearer ${await adminToken}`);

//     expect(resp.status).toBe(400);
//     expect(resp.body.error.message).toBe('"userId" supplied is too large');
//   });

//   it("fails: 'taskId' input too large", async function () {
//     const resp = await request(app)
//       .patch(`/user/1/tasks/90071992547409924/priority`)
//       .send({
//         priority: "delegate",
//       })
//       .set("authorization", `Bearer ${await adminToken}`);

//     expect(resp.status).toBe(400);
//     expect(resp.body.error.message).toBe('"taskId" supplied is too large');
//   });
// });

/************************************** DELETE user/:userId/tasks/:taskId */

describe("DELETE user/:userId/tasks/:taskId", function () {
  it("deletes task for admin and non-admin user", async function () {
    const resp1 = await request(app)
      .delete(`/user/${user1}/tasks/${uiTaskId1}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(200);
    expect(resp1.body).toEqual({ deleted: `${uiTaskId1}` });

    const resp2 = await request(app)
      .delete(`/user/${user2}/tasks/${uiTaskId3}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(200);
    expect(resp2.body).toEqual({ deleted: `${uiTaskId3}` });
  });

  it("returns NotFoundError if multiple taskIds are passed by admin and non-admin", async function () {
    const resp1 = await request(app)
      .delete(`/user/${user2}/tasks/${uiTaskId3}/${uiTaskId2}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");

    const resp2 = await request(app)
      .delete(`/user/${user2}/tasks/${uiTaskId3}/${uiTaskId2}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp2.statusCode).toEqual(404);
    expect(resp2.body.error.message).toEqual("Not Found");

    const resp3 = await request(app)
      .delete(`/user/${user2}/tasks/${uiTaskId3}/tasks${uiTaskId2}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp3.statusCode).toEqual(404);
    expect(resp3.body.error.message).toEqual("Not Found");
  });

  it("returns NotFoundError reponses to users for no userId and/or taskID provided", async function () {
    const resp1 = await request(app)
      .delete(`/user/${user1}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");

    const resp2 = await request(app)
      .delete(`/user/${user1}/`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp2.statusCode).toEqual(404);
    expect(resp2.body.error.message).toEqual("Not Found");

    const resp3 = await request(app)
      .delete(`/user/${uiTaskId1}/`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp3.statusCode).toEqual(404);
    expect(resp3.body.error.message).toEqual("Not Found");

    const resp4 = await request(app)
      .delete(`/user/${uiTaskId1}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp4.statusCode).toEqual(404);
    expect(resp4.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to non-admin user for non-existing taskId", async function () {
    const resp1 = await request(app)
      .delete(`/user/${user2}/tasks/${getFakeTaskId()}/`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws NotFoundError to admin user for non-existing taskId", async function () {
    const resp2 = await request(app)
      .delete(`/user/${user3}/2222/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(404);
    expect(resp2.body.error.message).toEqual("Not Found");
  });

  it("throws NotFoundError to admin user for non-existing userId", async function () {
    const resp2 = await request(app)
      .delete(`/user/2222/${uiTaskId1}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(404);
    expect(resp2.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to admin user for non-existing userId", async function () {
    const resp2 = await request(app)
      .delete(`/user/${getFakeUserId()}/tasks/${uiTaskId2}/`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp2.statusCode).toEqual(401);
    expect(resp2.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to non-admin and incorrect user", async function () {
    const resp1 = await request(app)
      .delete(`/user/${user1}/tasks/${uiTaskId1}/`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to unauthenticated user", async function () {
    const resp1 = await request(app).delete(
      `/user/${user2}/tasks/${uiTaskId2}/`
    );
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("returns NotFoundError to admin if userId and taskId path parameter positions are switched", async function () {
    const resp1 = await request(app)
      .delete(`/user/${uiTaskId1}/${user1}/tasks`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("returns BadRequestError to non-admin if userId and taskId path parameter positions are switched", async function () {
    const resp1 = await request(app)
      .delete(`/user/${uiTaskId3}/tasks/${user2}/`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual('"userId" must be a valid UUID');
  });

  it("fails: 'userId' input is invalid", async function () {
    const resp = await request(app)
      .delete(`/user/90071992547409924/tasks/1`)
      .send({})
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe('"userId" must be a valid UUID');
  });

  it("fails: 'taskId' input  is invalid", async function () {
    const resp = await request(app)
      .delete(`/user/${user2}/tasks/90071992547409924`)
      .send({})
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe(
      '"taskId" must be in the format "TA-UUID"'
    );
  });
});

/************************************** POST user/:userId/categories { taskData } */

describe("POST user/:userId/categories { taskData }", function () {
  const categoryIdRegex =
    /^CA-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("creates new category with just required fields for admin and non-admin user", async function () {
    const cat1 = {
      categoryName: "New Cat 1",
    };

    const resp1 = await request(app)
      .post(`/user/${user2}/categories`)
      .send(cat1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(201);

    expect(resp1.body).toEqual({
      category: {
        categoryId: expect.stringMatching(categoryIdRegex),
        categoryName: "New Cat 1",
        userId: user2,
        default: false,
      },
    });

    expect(categoryIdRegex.test(resp1.body.category.categoryId)).toBe(true);

    const cat2 = {
      categoryName: "New Cat 1",
    };

    const resp2 = await request(app)
      .post(`/user/${user1}/categories`)
      .send(cat2)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp2.statusCode).toEqual(201);

    expect(resp2.body).toEqual({
      category: {
        categoryId: expect.stringMatching(categoryIdRegex),
        categoryName: "New Cat 1",
        userId: user1,
        default: false,
      },
    });

    expect(categoryIdRegex.test(resp2.body.category.categoryId)).toBe(true);
  });

  it("returns 400 error for empty request body", async function () {
    const cat1 = {};

    const resp1 = await request(app)
      .post(`/user/${user2}/categories/`)
      .send(cat1)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(400);
  });

  it("throws UnauthorizedError to non-admin user for non-existing userId", async function () {
    const cat1 = {
      categoryName: "New Cat 1",
    };

    const resp1 = await request(app)
      .post(`/user/${uuidv4()}/categories`) //assuming uuidv4() generates a non-existet userId
      .send(cat1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws NotFoundError to admin user for non-existent userId", async function () {
    const cat1 = {
      categoryName: "New Cat 1",
    };

    const resp1 = await request(app)
      .post(`/user/${uuidv4()}/categories`) //assuming uuidv4() generates a non-existet userId
      .send(cat1)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to non-admin and incorrect user", async function () {
    const cat1 = {
      categoryName: "New Cat 1",
    };

    const resp1 = await request(app)
      .post(`/user/${user2}/categories`)
      .send(cat1)
      .set("authorization", `Bearer ${await u1Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to unauthenticated user", async function () {
    const cat1 = {
      categoryName: "New Cat 1",
    };

    const resp1 = await request(app)
      .post(`/user/${user2}/categories`)
      .send(cat1);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("returns schema error (BadRequestError) based on misspelling, non-existing fields, case sensisitivity", async function () {
    const cat1 = {
      categoryname: "New Cat 1",
    };

    const resp1 = await request(app)
      .post(`/user/${user2}/categories`)
      .send(cat1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual('"categoryName" is required');

    const cat2 = {
      categoryNames: "New Cat 1",
    };

    const resp2 = await request(app)
      .post(`/user/${user1}/categories`)
      .send(cat2)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual('"categoryName" is required');
  });

  it("returns schema error (BadRequestError) based on threshold violations", async function () {
    const cat1 = {
      categoryName:
        "TooLongStringTooLongStringTooLongStringTooLongStringTooLongStringTooLongStringTooLongStringTooLongStringTooLongString",
    };

    const resp1 = await request(app)
      .post(`/user/${user2}/categories`)
      .send(cat1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      '"categoryName" length must be less than or equal to 50 characters long'
    );

    const cat2 = {
      categoryName: "12",
    };

    const resp2 = await request(app)
      .post(`/user/${user2}/categories`)
      .send(cat2)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      '"categoryName" length must be at least 3 characters long'
    );

    const cat3 = {
      categoryName: "",
    };

    const resp3 = await request(app)
      .post(`/user/${user2}/categories`)
      .send(cat3)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.message).toEqual(
      '"categoryName" is not allowed to be empty'
    );
  });

  it("fails: 'userId' input too large", async function () {
    const cat1 = {
      categoryNames: "New Cat 1",
    };

    const resp = await request(app)
      .post(`/user/90071992547409924/categories`)
      .send(cat1)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe('"userId" must be a valid UUID');
  });
});

/************************************** PATCH user/:userId/categories/:categoryId { newData } */

describe("PATCH user/:userId/categories/:categoryId { newData }", function () {
  it("updates custom categories for admin and non-admin user", async function () {
    let reqBody = {
      categoryName: "Updated Cat 1",
    };

    const res1 = await request(app)
      .patch(`/user/${user1}/categories/${customCategory1}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(res1.statusCode).toEqual(201);
    expect(res1.body).toEqual({
      category: {
        userId: user1,
        categoryName: reqBody.categoryName,
        categoryId: customCategory1,
      },
    });

    reqBody = {
      categoryName: "Updated Cat 2",
    };

    const res2 = await request(app)
      .patch(`/user/${user2}/categories/${customCategory2}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(res2.statusCode).toEqual(201);
    expect(res2.body).toEqual({
      category: {
        userId: user2,
        categoryName: reqBody.categoryName,
        categoryId: customCategory2,
      },
    });

    reqBody = {
      categoryName: "Updated Cat 3",
    };

    const res3 = await request(app)
      .patch(`/user/${user1}/categories/${customCategory1}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u1Token}`);

    expect(res3.statusCode).toEqual(201);
    expect(res3.body).toEqual({
      category: {
        userId: user1,
        categoryName: reqBody.categoryName,
        categoryId: customCategory1,
      },
    });
  });

  it("updates default categories for admin and non-admin user", async function () {
    let reqBody = {
      categoryName: "Updated Cat 1",
    };

    const res1 = await request(app)
      .patch(`/user/${user1}/categories/${defaultCategory1}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(res1.statusCode).toEqual(201);
    expect(res1.body).toEqual({
      category: {
        userId: user1,
        categoryName: reqBody.categoryName,
        categoryId: defaultCategory1,
      },
    });

    reqBody = {
      categoryName: "Updated Cat 2",
    };

    const res2 = await request(app)
      .patch(`/user/${user2}/categories/${defaultCategory2}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(res2.statusCode).toEqual(201);
    expect(res2.body).toEqual({
      category: {
        userId: user2,
        categoryName: reqBody.categoryName,
        categoryId: defaultCategory2,
      },
    });

    reqBody = {
      categoryName: "Updated Cat 3",
    };

    const res3 = await request(app)
      .patch(`/user/${user1}/categories/${defaultCategory1}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u1Token}`);

    expect(res3.statusCode).toEqual(201);
    expect(res3.body).toEqual({
      category: {
        userId: user1,
        categoryName: reqBody.categoryName,
        categoryId: defaultCategory1,
      },
    });
  });

  it("uses last instance if duplicate keys", async function () {
    const reqBody = {
      categoryName: "Updated Cat 1",
      categoryName: "Updated Cat 2",
      categoryName: "Updated Cat 3",
      categoryName: "Updated Cat 4",
    };
    const res1 = await request(app)
      .patch(`/user/${user1}/categories/${defaultCategory1}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(res1.statusCode).toEqual(201);
    expect(res1.body).toEqual({
      category: {
        userId: user1,
        categoryName: "Updated Cat 4",
        categoryId: defaultCategory1,
      },
    });
  });

  it("throws UnauthorizedError to non-admin user for non-existing categoryId", async function () {
    let reqBody = {
      categoryName: "Updated Cat 1",
    };

    const res1 = await request(app)
      .patch(`/user/${user1}/categories/${getFakeCategoryId()}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u1Token}`);

    expect(res1.statusCode).toEqual(401);
    expect(res1.body.error.message).toEqual("Unauthorized");
  });

  it("throws NotFoundError to admin user for non-existing categoryId", async function () {
    let reqBody = {
      categoryName: "Updated Cat 1",
    };

    const res1 = await request(app)
      .patch(`/user/${user1}/categories/${getFakeCategoryId()}`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(res1.statusCode).toEqual(404);
    expect(res1.body.error.message).toEqual("Not Found");

    const res2 = await request(app)
      .patch(`/user/${user2}/categories/${getFakeCategoryId()}`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(res2.statusCode).toEqual(404);
    expect(res2.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to non-admin and incorrect user for existing categoryId", async function () {
    let reqBody = {
      categoryName: "Updated Cat 1",
    };

    const res1 = await request(app)
      .patch(`/user/${user1}/categories/${customCategory1}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(res1.statusCode).toEqual(401);
    expect(res1.body.error.message).toEqual("Unauthorized");

    reqBody = {
      categoryName: "Updated Cat 2",
    };

    const res2 = await request(app)
      .patch(`/user/${user2}/categories/${customCategory3}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u1Token}`);

    expect(res2.statusCode).toEqual(401);
    expect(res2.body.error.message).toEqual("Unauthorized");

    reqBody = {
      categoryName: "Updated Cat 3",
    };

    const res3 = await request(app)
      .patch(`/user/${user3}/categories/${defaultCategory3}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u1Token}`);

    expect(res3.statusCode).toEqual(401);
    expect(res3.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to non-admin and incorrect user for non-existing categoryId", async function () {
    let reqBody = {
      categoryName: "Updated Cat 1",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1}/categories/${getFakeCategoryId()}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to unauthenticated user", async function () {
    let reqBody = {
      categoryName: "Updated Cat 1",
    };
    const resp1 = await request(app)
      .patch(`/user/${user3}/categories/${defaultCategory3}/`)
      .send(reqBody);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws BadRequestError to admin user for categoryId and userId mismatch", async function () {
    let reqBody = {
      categoryName: "Updated Cat 1",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1}/categories/${customCategory3}`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      "userId supplied does not match the owner of the categoryId supplied."
    );

    const resp2 = await request(app)
      .patch(`/user/${user2}/categories/${defaultCategory1}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      "userId supplied does not match the owner of the categoryId supplied."
    );
  });

  it("throws Unauthorized errors to non-admin users for categoryId mismatch", async function () {
    let reqBody = {
      categoryName: "Updated Cat 1",
    };
    const res1 = await request(app)
      .patch(`/user/${user2}/categories/${defaultCategory1}`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u1Token}`);

    expect(res1.statusCode).toEqual(401);
    expect(res1.body.error.message).toEqual("Unauthorized");

    const res2 = await request(app)
      .patch(`/user/${user3}/categories/${customCategory1}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(res2.statusCode).toEqual(401);
    expect(res2.body.error.message).toEqual("Unauthorized");
  });

  it("returns schema error (BadRequestError) based on misspelling, non-existing fields, and case sensisitivity", async function () {
    let reqBody = {
      categoryname: "Updated Cat 1",
    };

    const res1 = await request(app)
      .patch(`/user/${user2}/categories/${customCategory2}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(res1.statusCode).toEqual(400);
    expect(res1.body.error.message).toEqual('"categoryName" is required');

    reqBody = {
      categoryName: "Updated Cat 1",
      id: `${getFakeCategoryId()}`,
    };

    const res2 = await request(app)
      .patch(`/user/${user2}/categories/${defaultCategory2}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(res2.statusCode).toEqual(400);
    expect(res2.body.error.message).toEqual('"id" is not allowed');

    reqBody = {
      categoryName: "Updated Cat 1",
      fk_user_id: user1,
    };

    const res3 = await request(app)
      .patch(`/user/${user2}/categories/${customCategory2}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(res3.statusCode).toEqual(400);
    expect(res3.body.error.message).toEqual('"fk_user_id" is not allowed');
  });

  it("returns schema error (BadRequestError) based threshold violations", async function () {
    let reqBody = {
      categoryName:
        "TooLongTooLongTooLongTooLongTooLongTooLongTooLongTooLongTooLongTooLongTooLong",
    };
    const res1 = await request(app)
      .patch(`/user/${user2}/categories/${uiTaskId3}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(res1.statusCode).toEqual(400);
    expect(res1.body.error.message).toEqual(
      '"categoryName" length must be less than or equal to 50 characters long'
    );
  });

  it("fails: 'userId' input is invalid", async function () {
    let reqBody = {
      categoryName: "Updated Cat 1",
    };

    const malformedUserId = getFakeUserId() + getFakeUserId();

    const res1 = await request(app)
      .patch(`/user/${malformedUserId}}/categories/${customCategory1}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(res1.status).toBe(400);
    expect(res1.body.error.message).toBe('"userId" must be a valid UUID');

    const res2 = await request(app)
      .patch(`/user/${malformedUserId}}/categories/${customCategory1}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(res2.status).toBe(400);
    expect(res2.body.error.message).toBe('"userId" must be a valid UUID');
  });

  it("fails: 'categoryId' input too large", async function () {
    let reqBody = {
      categoryName: "Updated Cat 1",
    };

    const malformedCategoryId = getFakeCategoryId() + getFakeCategoryId();

    const res1 = await request(app)
      .patch(`/user/${user1}/categories/${malformedCategoryId}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(res1.status).toBe(400);
    expect(res1.body.error.message).toBe(
      '"categoryId" must be in the format "CA-UUID"'
    );

    const res2 = await request(app)
      .patch(`/user/${user2}/categories/${malformedCategoryId}/`)
      .send(reqBody)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(res2.status).toBe(400);
    expect(res2.body.error.message).toBe(
      '"categoryId" must be in the format "CA-UUID"'
    );
  });
});

/************************************** DELETE user/:userId/categories/:categoryId */

describe("DELETE user/:userId/categories/:categorId", function () {
  it("deletes custom category for admin and non-admin user", async function () {
    const resp1 = await request(app)
      .delete(`/user/${user1}/categories/${customCategory1}/`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(200);
    expect(resp1.body).toEqual({ deleted: `${customCategory1}` });

    const resp2 = await request(app)
      .delete(`/user/${user2}/categories/${customCategory2}/`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp2.statusCode).toEqual(200);
    expect(resp2.body).toEqual({ deleted: `${customCategory2}` });
  });

  it("returns NotFoundError if multiple categoryIds are passed by admin and non-admin", async function () {
    const resp1 = await request(app)
      .delete(`/user/${user1}/categories/${customCategory1}/${customCategory2}`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");

    const resp2 = await request(app)
      .delete(`/user/${user2}/categories/${customCategory2}/${customCategory1}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(404);
    expect(resp2.body.error.message).toEqual("Not Found");
  });

  it("returns NotFoundError reponses to users for no userId and/or categoryId provided", async function () {
    const resp1 = await request(app)
      .delete(`/user/${user1}/categories`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");

    const resp2 = await request(app)
      .delete(`/user/${user1}/categories`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(404);
    expect(resp2.body.error.message).toEqual("Not Found");

    const resp3 = await request(app)
      .delete(`/user/categories/${customCategory1}/`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp3.statusCode).toEqual(404);
    expect(resp3.body.error.message).toEqual("Not Found");

    const resp4 = await request(app)
      .delete(`/user/categories/${customCategory2}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp4.statusCode).toEqual(404);
    expect(resp4.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to non-admin user for non-existent categoryId", async function () {
    const resp1 = await request(app)
      .delete(`/user/${user2}/categories/CA-${uuidv4()}/`) //assuming this categoryId is non-existent
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws NotFoundError to admin user for non-existing categoryId", async function () {
    const resp1 = await request(app)
      .delete(`/user/${user1}/categories/CA-${uuidv4()}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("throws NotFoundError to admin user for non-existing userId", async function () {
    const resp1 = await request(app)
      .delete(`/user/${uuidv4()}/categories/${customCategory3}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to non-admin user for non-existing userId", async function () {
    const resp1 = await request(app)
      .delete(`/user/${uuidv4()}/categories/${customCategory2}/`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to non-admin and incorrect user", async function () {
    const resp1 = await request(app)
      .delete(`/user/${user1}/categories/${customCategory1}/`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to unauthenticated user", async function () {
    const resp1 = await request(app).delete(
      `/user/${user1}/categories/${customCategory1}/`
    );
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("returns NotFoundError to admin if userId and categoryId path parameter positions are switched", async function () {
    const resp1 = await request(app)
      .delete(`/categories/${customCategory1}/user/${user1}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("returns UnauthorizedError to non-admin if userId and categoryId path parameter positions are switched", async function () {
    const resp1 = await request(app)
      .delete(`/categories/${customCategory1}/user/${user1}/`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });
});
