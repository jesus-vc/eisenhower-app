import request from "supertest";
import app from "../app";
import crypto from "crypto";
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
const getUserIds = async () => {
  const ids = await pool.query(`SELECT id FROM users ORDER BY id ASC`);
  return ids.rows;
};

const getTaskIds = async () => {
  const taskIds = await pool.query("SELECT id FROM tasks ORDER BY id ASC");
  return taskIds.rows;
};
/************************************** GET /user/:userId/tasks */

describe("GET /user/:userId", function () {
  it("unauthorized for anon", async function () {
    const userIds = await getUserIds();
    const respTasks = await request(app).get(`/user/${userIds[0].id}/tasks`);
    expect(respTasks.statusCode).toEqual(401);
    expect(respTasks.body.error.message).toEqual("Unauthorized");
  });

  it("ok for admin and returns correct data", async function () {
    const userIds = await getUserIds();
    const user1 = userIds[0].id;
    const user2 = userIds[1].id;
    const user3 = userIds[2].id;

    const respTasks1 = await request(app)
      .get(`/user/${user1}/tasks`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks1.statusCode).toEqual(200);
    expect(respTasks1.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          title: "Task 1",
          urgent: true,
          important: true,
          priority: "now",
          timebox: 30,
          completed: false,
          note: "Note 1",
          category: " Finances",
          deadlineDate: "1111-01-01",
        },
      ],
    });

    const respTasks2 = await request(app)
      .get(`/user/${user2}/tasks`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks2.statusCode).toEqual(200);
    expect(respTasks2.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          title: "Task 2",
          urgent: true,
          important: false,
          priority: "delegate",
          timebox: 60,
          completed: false,
          note: "Note 2",
          category: " Health",
          deadlineDate: "2222-02-02",
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
          deadlineDate: "3333-03-03",
        },
      ],
    });

    const respTasks3 = await request(app)
      .get(`/user/${user3}/tasks`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(respTasks3.statusCode).toEqual(200);
    expect(respTasks3.body).toEqual({
      tasks: [],
    });
  });

  it("ok for correct users", async function () {
    //REFACTOR Once I refactor using mocked databases, this is where I should be calling the mocked DB by injecting a fake database into the Model.

    const userIds = await getUserIds();
    const user1 = userIds[0].id;
    const user2 = userIds[1].id;

    const respTasks1 = await request(app)
      .get(`/user/${user1}/tasks`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(respTasks1.statusCode).toEqual(200);
    expect(respTasks1.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          title: "Task 1",
          urgent: true,
          important: true,
          priority: "now",
          timebox: 30,
          completed: false,
          note: "Note 1",
          category: " Finances",
          deadlineDate: "1111-01-01",
        },
      ],
    });

    const respTasks2 = await request(app)
      .get(`/user/${user2}/tasks`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(respTasks2.statusCode).toEqual(200);
    expect(respTasks2.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          title: "Task 2",
          urgent: true,
          important: false,
          priority: "delegate",
          timebox: 60,
          completed: false,
          note: "Note 2",
          category: " Health",
          deadlineDate: "2222-02-02",
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
          deadlineDate: "3333-03-03",
        },
      ],
    });
  });

  it("unauthorized for incorrect user and non-admin", async function () {
    const userIds = await getUserIds();
    const user1 = userIds[0].id;
    const user2 = userIds[1].id;

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
    const respTasks = await request(app)
      .get(`/user/1/tasks`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(respTasks.statusCode).toEqual(404);
    expect(respTasks.body.error.message).toEqual("Not Found");
  });

  it("fails: 'userId' input too large", async function () {
    const respTasks = await request(app)
      .get(`/user/90071992547409924/tasks/`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(respTasks.status).toBe(400);
    expect(respTasks.body.error.message).toBe('"userId" supplied is too large');
  });

  it("fails: invalid 'userId' input", async function () {
    const respTasks = await request(app)
      .get(`/user/DROP/tasks/`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(respTasks.status).toBe(400);
    expect(respTasks.body.error.message).toBe('"userId" must be a number');
  });

  it("returns 404 if no userId provided", async function () {
    const respTasks = await request(app).get(`/user/tasks/`);
    expect(respTasks.status).toBe(404);
  });
});
/************************************** GET /user/:userId/tasks/{query filters} */

describe("GET /user/:userId/tasks/{query filters}", function () {
  it("returns tasks by 'title' filter for correct user", async function () {
    const [user1, user2, user3] = await getUserIds();

    const query1 = "title=Task 3";
    const queryTitle1 = await request(app)
      .get(`/user/${user2.id}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryTitle1.statusCode).toEqual(200);
    expect(queryTitle1.body).toEqual({
      tasks: [
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
          deadlineDate: "3333-03-03",
        },
      ],
    });

    const query2 = "title=Task 2";
    const queryTitle2 = await request(app)
      .get(`/user/${user2.id}/tasks?${query2}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryTitle2.statusCode).toEqual(200);
    expect(queryTitle2.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          title: "Task 2",
          urgent: true,
          important: false,
          priority: "delegate",
          timebox: 60,
          completed: false,
          note: "Note 2",
          category: " Health",
          deadlineDate: "2222-02-02",
        },
      ],
    });
  });

  it("returns tasks by 'priority' filter for correct user", async function () {
    const [user1, user2, user3] = await getUserIds();

    const query1 = "priority=delegate";
    const queryDelegate = await request(app)
      .get(`/user/${user2.id}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryDelegate.statusCode).toEqual(200);
    expect(queryDelegate.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          title: "Task 2",
          urgent: true,
          important: false,
          priority: "delegate",
          timebox: 60,
          completed: false,
          note: "Note 2",
          category: " Health",
          deadlineDate: "2222-02-02",
        },
      ],
    });

    const query2 = "priority=avoid";
    const queryAvoid = await request(app)
      .get(`/user/${user2.id}/tasks?${query2}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryAvoid.statusCode).toEqual(200);
    expect(queryAvoid.body).toEqual({
      tasks: [
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
          deadlineDate: "3333-03-03",
        },
      ],
    });
  });

  it("returns empty response if no results found", async function () {
    const [user1, user2, user3] = await getUserIds();

    const query1 = "priority=now";

    const queryAvoid = await request(app)
      .get(`/user/${user2.id}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryAvoid.statusCode).toEqual(200);
    expect(queryAvoid.body).toEqual({
      tasks: [],
    });
  });

  it("returns tasks by 'deadline' filter for correct user", async function () {
    const [user1, user2, user3] = await getUserIds();

    const query1 = "deadlineDate=1111-01-01";
    const queryDeadline1 = await request(app)
      .get(`/user/${user1.id}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(queryDeadline1.statusCode).toEqual(200);
    expect(queryDeadline1.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          title: "Task 1",
          urgent: true,
          important: true,
          priority: "now",
          timebox: 30,
          completed: false,
          note: "Note 1",
          category: " Finances",
          deadlineDate: "1111-01-01",
        },
      ],
    });

    const query2 = "deadlineDate=3333-03-03";
    const queryDeadline2 = await request(app)
      .get(`/user/${user2.id}/tasks?${query2}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryDeadline2.statusCode).toEqual(200);
    expect(queryDeadline2.body).toEqual({
      tasks: [
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
          deadlineDate: "3333-03-03",
        },
      ],
    });
  });

  it("returns tasks by 'completed' filter for correct user", async function () {
    const [user1, user2, user3] = await getUserIds();

    const query1 = "completed=true";
    const queryCompleted1 = await request(app)
      .get(`/user/${user2.id}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryCompleted1.statusCode).toEqual(200);
    expect(queryCompleted1.body).toEqual({
      tasks: [
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
          deadlineDate: "3333-03-03",
        },
      ],
    });

    const query2 = "completed=false";
    const queryCompleted2 = await request(app)
      .get(`/user/${user2.id}/tasks?${query2}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryCompleted2.statusCode).toEqual(200);
    expect(queryCompleted2.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          title: "Task 2",
          urgent: true,
          important: false,
          priority: "delegate",
          timebox: 60,
          completed: false,
          note: "Note 2",
          category: " Health",
          deadlineDate: "2222-02-02",
        },
      ],
    });
  });

  it("okay for admin", async function () {
    const [user1, user2, user3] = await getUserIds();

    const query1 = "title=Task 3";
    const queryTitle1 = await request(app)
      .get(`/user/${user2.id}/tasks?${query1}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(queryTitle1.statusCode).toEqual(200);
    expect(queryTitle1.body).toEqual({
      tasks: [
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
          deadlineDate: "3333-03-03",
        },
      ],
    });

    const queryTitle2 = await request(app)
      .get(`/user/${user3.id}/tasks?${query1}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(queryTitle2.statusCode).toEqual(200);
    expect(queryTitle2.body).toEqual({
      tasks: [],
    });

    const query3 = "deadlineDate=3333-03-03";
    const queryDeadline = await request(app)
      .get(`/user/${user2.id}/tasks?${query3}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(queryDeadline.statusCode).toEqual(200);
    expect(queryDeadline.body).toEqual({
      tasks: [
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
          deadlineDate: "3333-03-03",
        },
      ],
    });
  });

  it("returns UnauthorizedError for non-admin user if userId does not exist", async function () {
    const query1 = "title=Task 3";
    const queryTitle1 = await request(app)
      .get(`/user/111/tasks?${query1}`)
      .set("authorization", `Bearer ${await u1Token}`);

    expect(queryTitle1.statusCode).toEqual(401);
    expect(queryTitle1.body.error.message).toEqual("Unauthorized");
  });

  it("returns NotFoundError error for admin user if userId does not exist", async function () {
    const query1 = "title=Task 3";
    const queryTitle1 = await request(app)
      .get(`/user/111/tasks?${query1}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(queryTitle1.statusCode).toEqual(404);
    expect(queryTitle1.body.error.message).toEqual("Not Found");
  });

  it("returns unauthorized for incorrect user and non-admin", async function () {
    const [user1, user2, user3] = await getUserIds();

    const query1 = "priority=delegate";
    const queryDelegate = await request(app)
      .get(`/user/${user3.id}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryDelegate.statusCode).toEqual(401);
    expect(queryDelegate.body.error.message).toEqual("Unauthorized");

    const query2 = "priority=avoid";
    const queryAvoid = await request(app)
      .get(`/user/${user1.id}/tasks?${query2}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryAvoid.statusCode).toEqual(401);
    expect(queryAvoid.body.error.message).toEqual("Unauthorized");

    const query3 = "priority=avoid";
    const queryAvoid2 = await request(app)
      .get(`/user/${user2.id}/tasks?${query3}`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(queryAvoid2.statusCode).toEqual(401);
    expect(queryAvoid2.body.error.message).toEqual("Unauthorized");
  });

  it("fails: invalid inputs (misspellings, case sensitivity, and non-existing fields", async function () {
    const [user1, user2, user3] = await getUserIds();

    const query1 = "urgent=true";
    const queryUrgent = await request(app)
      .get(`/user/${user2.id}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryUrgent.statusCode).toEqual(400);
    expect(queryUrgent.body.error.message).toEqual('"urgent" is not allowed');

    const query2 = "category=Finances";
    const queryCategory = await request(app)
      .get(`/user/${user2.id}/tasks?${query2}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(queryCategory.statusCode).toEqual(400);
    expect(queryCategory.body.error.message).toEqual(
      '"category" is not allowed'
    );

    const query3 = "priority=immediate";
    const queryPriority = await request(app)
      .get(`/user/${user2.id}/tasks?${query3}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(queryPriority.statusCode).toEqual(400);
    expect(queryPriority.body.error.message).toEqual(
      '"priority" must be one of [now, delegate, schedule, avoid]'
    );

    const query4 = "priorities=now";
    const queryPriorityMisspelled = await request(app)
      .get(`/user/${user2.id}/tasks?${query4}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(queryPriorityMisspelled.statusCode).toEqual(400);
    expect(queryPriorityMisspelled.body.error.message).toEqual(
      '"priorities" is not allowed'
    );

    const query5 = "deadlineDate=111-11-1111";
    const invalidDeadline1 = await request(app)
      .get(`/user/${user2.id}/tasks?${query5}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(invalidDeadline1.statusCode).toEqual(400);
    expect(invalidDeadline1.body.error.message).toEqual(
      '"deadlineDate" must be in YYYY-MM-DD format'
    );

    const query6 = "deadlineDate=33-3";
    const invalidDeadline2 = await request(app)
      .get(`/user/${user2.id}/tasks?${query6}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(invalidDeadline2.statusCode).toEqual(400);
    expect(invalidDeadline2.body.error.message).toEqual(
      '"deadlineDate" must be in YYYY-MM-DD format'
    );

    const query7 = "deadlineDate=03-03-3333";
    const invalidDeadline3 = await request(app)
      .get(`/user/${user2.id}/tasks?${query7}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(invalidDeadline3.statusCode).toEqual(400);
    expect(invalidDeadline3.body.error.message).toEqual(
      '"deadlineDate" must be in YYYY-MM-DD format'
    );

    const query8 = "DeadlineDate=1111-01-01";
    const queryDeadlineUpperCase = await request(app)
      .get(`/user/${user1.id}/tasks?${query8}`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(queryDeadlineUpperCase.statusCode).toEqual(400);
    expect(queryDeadlineUpperCase.body.error.message).toEqual(
      '"DeadlineDate" is not allowed'
    );
  });

  it("fails: invalid inputs based on threshold violations", async function () {
    const [user1, user2, user3] = await getUserIds();
    const query1 = "title=TooLongTitleExceeding30Characters";
    const queryTitle = await request(app)
      .get(`/user/${user2.id}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryTitle.statusCode).toEqual(400);
    expect(queryTitle.body.error.message).toEqual(
      '"title" length must be less than or equal to 30 characters long'
    );
  });

  it("returns all tasks for user if no query filters provided", async function () {
    const [user1, user2, user3] = await getUserIds();

    const query1 = "";
    const queryNoFilters = await request(app)
      .get(`/user/${user2.id}/tasks?${query1}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(queryNoFilters.statusCode).toEqual(200);
    expect(queryNoFilters.body).toEqual({
      tasks: [
        {
          taskId: expect.any(Number),
          title: "Task 2",
          urgent: true,
          important: false,
          priority: "delegate",
          timebox: 60,
          completed: false,
          note: "Note 2",
          category: " Health",
          deadlineDate: "2222-02-02",
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
          deadlineDate: "3333-03-03",
        },
      ],
    });
  });
});

/************************************** POST user/:userId/tasks { taskData } */

describe("POST user/:userId/tasks { taskData }", function () {
  it("creates new task with just required fields for admin and non-admin user", async function () {
    const [user1, user2, user3] = await getUserIds();
    const task1 = {
      title: "New Task 1",
      urgent: true,
      important: false,
    };
    const resp1 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(201);

    expect(resp1.body).toEqual({
      task: {
        taskId: expect.any(Number),
        userId: user2.id,
        title: "New Task 1",
        urgent: true,
        important: false,
        priority: "delegate",
        timebox: null,
        completed: false,
        note: null,
        category: null,
        deadlineDate: null,
      },
    });

    const task2 = {
      title: "New Task 2",
      urgent: false,
      important: false,
    };
    const resp2 = await request(app)
      .post(`/user/${user3.id}/tasks`)
      .send(task2)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(201);
    expect(resp2.body).toEqual({
      task: {
        taskId: expect.any(Number),
        userId: user3.id,
        title: "New Task 2",
        urgent: false,
        important: false,
        priority: "avoid",
        timebox: null,
        completed: false,
        note: null,
        category: null,
        deadlineDate: null,
      },
    });
  });

  it("creates new task with optional fields for admin and non-admin user", async function () {
    const [user1, user2, user3] = await getUserIds();

    const task1 = {
      title: "New Task 1",
      urgent: true,
      important: false,
      timebox: 9,
      note: "New Note",
      category: "New Category",
      deadlineDate: "2024-07-02",
    };

    const resp1 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(201);
    expect(resp1.body).toEqual({
      task: {
        taskId: expect.any(Number),
        userId: user2.id,
        title: "New Task 1",
        urgent: true,
        important: false,
        priority: "delegate",
        completed: false,
        timebox: 9,
        note: "New Note",
        category: "New Category",
        deadlineDate: "2024-07-02",
      },
    });

    const task2 = {
      title: "New Task 2",
      urgent: false,
      important: false,
      timebox: 90,
      note: "New Note 2",
      category: "New Category 2",
      deadlineDate: "2030-07-02",
    };

    const resp2 = await request(app)
      .post(`/user/${user3.id}/tasks`)
      .send(task2)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(201);
    expect(resp2.body).toEqual({
      task: {
        taskId: expect.any(Number),
        userId: user3.id,
        title: "New Task 2",
        urgent: false,
        important: false,
        priority: "avoid",
        timebox: 90,
        note: "New Note 2",
        category: "New Category 2",
        completed: false,
        deadlineDate: "2030-07-02",
      },
    });
  });

  it("returns 400 error for empty rqeuest body", async function () {
    const [user1, user2, user3] = await getUserIds();
    const task1 = {};
    const resp1 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(400);
  });

  it("throws UnauthorizedError to non-admin user for non-existing userId", async function () {
    const task1 = {
      title: "New Task 1",
      urgent: true,
      important: false,
    };
    const resp1 = await request(app)
      .post("/user/111/tasks")
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws NotFoundError to admin user for non-existing userId", async function () {
    const task1 = {
      title: "New Task 1",
      urgent: true,
      important: false,
    };
    const resp1 = await request(app)
      .post("/user/111")
      .send(task1)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to non-admin and incorrect user", async function () {
    const [user1, user2, user3] = await getUserIds();
    const task1 = {
      title: "New Task 1",
      urgent: true,
      important: false,
    };
    const resp1 = await request(app)
      .post(`/user/${user3.id}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to unauthenticated user", async function () {
    const [user1, user2, user3] = await getUserIds();
    const task1 = {
      title: "New Task 1",
      urgent: true,
      important: false,
    };
    const resp1 = await request(app)
      .post(`/user/${user3.id}/tasks`)
      .send(task1);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("returns schema error (BadRequestError) for missing fields", async function () {
    const [user1, user2, user3] = await getUserIds();
    const task1 = {
      title: "New Task 1",
      urgent: true,
      // important: false // missing field
    };
    const resp1 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual('"important" is required');

    const task2 = {
      // title: "New Task 1", // missing field
      urgent: true,
      important: false,
    };
    const resp2 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task2)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual('"title" is required');

    const task3 = {
      title: "New Task 1",
      // urgent: true, // missing field
      important: false,
    };
    const resp3 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task3)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.message).toEqual('"urgent" is required');
  });

  it("returns schema error (BadRequestError) based on misspelling, non-existing fields, case sensisitivity", async function () {
    const [user1, user2, user3] = await getUserIds();

    const task1 = {
      Title: "New Task 1",
      urgent: true,
      important: false,
    };
    const resp1 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual('"title" is required');

    const task2 = {
      title: "New Task 1",
      urgennt: true,
      important: false,
    };
    const resp2 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task2)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual('"urgent" is required');

    const task3 = {
      title: "New Task 1",
      urgent: true,
      important: false,
      admin: true,
    };
    const resp3 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task3)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.message).toEqual('"admin" is not allowed');

    const task4 = {
      title: "TooLongTitleExceeding30Characters",
      urgent: true,
      important: false,
    };
    const resp4 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task4)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp4.statusCode).toEqual(400);
    expect(resp4.body.error.message).toEqual(
      '"title" length must be less than or equal to 30 characters long'
    );
    const task5 = {
      title: "T",
      urgent: true,
      important: false,
    };
    const resp5 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task5)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp5.statusCode).toEqual(400);
    expect(resp5.body.error.message).toEqual(
      '"title" length must be at least 3 characters long'
    );
  });

  it("returns schema error (BadRequestError) based on threshold violations", async function () {
    const [user1, user2, user3] = await getUserIds();

    const task1 = {
      title: "TooLongTitleExceeding30Characters",
      urgent: true,
      important: false,
    };

    const resp1 = await request(app)
      .post(`/user/${user2.id}/tasks`)
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
      urgent: true,
      important: false,
      note: longNote,
    };

    const resp2 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task2)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      '"note" length must be less than or equal to 500 characters long'
    );

    const buffer2 = crypto.randomBytes(8);
    const longCategory = buffer2.toString("hex"); //string length = 16
    const task3 = {
      title: "Title 1",
      urgent: true,
      important: false,
      category: longCategory,
    };

    const resp3 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task3)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.message).toEqual(
      '"category" length must be less than or equal to 15 characters long'
    );

    const task4 = {
      title: "Title 1",
      urgent: true,
      important: false,
      category: "N",
    };

    const resp4 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task4)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp4.statusCode).toEqual(400);
    expect(resp4.body.error.message).toEqual(
      '"category" length must be at least 2 characters long'
    );

    const task5 = {
      title: "Title 1",
      urgent: true,
      important: false,
      note: "",
    };

    const resp5 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task5)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp5.statusCode).toEqual(400);
    expect(resp5.body.error.message).toEqual(
      '"note" is not allowed to be empty'
    );

    const task6 = {
      title: "Title 1",
      urgent: true,
      important: false,
      timebox: 0,
    };

    const resp6 = await request(app)
      .post(`/user/${user2.id}/tasks`)
      .send(task6)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp6.statusCode).toEqual(400);
    expect(resp6.body.error.message).toEqual(
      '"timebox" must be a positive number'
    );

    const task7 = {
      title: "Title 1",
      urgent: true,
      important: false,
      timebox: 601,
    };

    const resp7 = await request(app)
      .post(`/user/${user2.id}/tasks`)
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
      urgent: true,
      important: false,
    };

    const resp = await request(app)
      .post(`/user/90071992547409924/tasks`)
      .send(task1)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe('"userId" supplied is too large');
  });
});

/************************************** PATCH user/:userId/tasks/:taskId { newData } */
describe("PATCH user/:userId/tasks/:taskId { newData }", function () {
  it("updates task for admin and non-admin user", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const updatedTask1 = {
      title: "Updated Task 1",
      urgent: false,
      important: false,
      timebox: 450,
      completed: true,
      note: "Updated Note 1",
      category: "Category Note 1",
      deadlineDate: "2024-09-01",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1.id}/tasks/${task1.id}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(201);
    expect(resp1.body).toEqual({
      task: {
        taskId: task1.id,
        userId: user1.id,
        title: "Updated Task 1",
        urgent: false,
        important: false,
        priority: "avoid",
        timebox: 450,
        completed: true,
        note: "Updated Note 1",
        category: "Category Note 1",
        deadlineDate: "2024-09-01",
      },
    });

    const updatedTask2 = {
      title: "Updated Task 2",
      urgent: true,
      important: true,
      timebox: 50,
      completed: true,
      deadlineDate: "2024-09-09",
    };
    const resp2 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task2.id}/`)
      .send(updatedTask2)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp2.statusCode).toEqual(201);
    expect(resp2.body).toEqual({
      task: {
        taskId: task2.id,
        userId: user2.id,
        title: "Updated Task 2",
        urgent: true,
        important: true,
        priority: "now",
        timebox: 50,
        completed: true,
        deadlineDate: "2024-09-09",
      },
    });

    const updatedTask3 = {
      deadlineDate: "2035-09-09",
    };
    const resp3 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask3)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp3.statusCode).toEqual(201);
    expect(resp3.body).toEqual({
      task: {
        taskId: task3.id,
        userId: user2.id,
        deadlineDate: updatedTask3.deadlineDate,
      },
    });

    const updatedTask4 = {
      note: "New Note 4",
    };
    const resp4 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask4)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp4.statusCode).toEqual(201);
    expect(resp4.body).toEqual({
      task: {
        taskId: task3.id,
        userId: user2.id,
        note: "New Note 4",
      },
    });
  });

  it("uses last instance if duplicate keys", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const updatedTask1 = {
      title: "Updated Task 1",
      title: "Updated Task 2",
      title: "Updated Task 3",
      title: "Updated Task 4",
      urgent: false,
      important: false,
      timebox: 450,
      completed: true,
      note: "Updated Note 1",
      category: "Category Note 1",
      deadlineDate: "2024-09-01",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1.id}/tasks/${task1.id}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(201);
    expect(resp1.body).toEqual({
      task: {
        taskId: task1.id,
        userId: user1.id,
        title: "Updated Task 4",
        urgent: false,
        important: false,
        priority: "avoid",
        timebox: 450,
        completed: true,
        note: "Updated Note 1",
        category: "Category Note 1",
        deadlineDate: "2024-09-01",
      },
    });
  });

  it("returns BadRequestError reponse for no updated fields", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const updatedTask = {};
    const resp1 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      "Empty request to update a task is not allowed."
    );
  });

  it("throws UnauthorizedError to non-admin user for non-existing taskId", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1.id}/tasks/111/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await u1Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws NotFoundError to admin user for non-existing taskId", async function () {
    const [user1, user2, user3] = await getUserIds();
    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1.id}/111/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to non-admin and incorrect user for existing taskId", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1.id}/tasks/${task1.id}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to non-admin and incorrect user for non-existing taskId", async function () {
    const [user1, user2, user3] = await getUserIds();

    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1.id}/tasks/111/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await u2Token}`);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to unauthenticated user", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1.id}/tasks/${task1.id}/`)
      .send(updatedTask1);

    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws BadRequestError to admin user for taskId and userId mismatch", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const updatedTask1 = {
      deadlineDate: "2035-09-09",
    };
    const resp1 = await request(app)
      .patch(`/user/${user1.id}/tasks/${task3.id}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual(
      "userId supplied does not match the owner of the taskId supplied."
    );
  });

  it("returns BadRequestError if 'priority' fields is supplied in request body", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const updatedTask1 = {
      priority: "now",
    };
    const resp1 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual('"priority" is not allowed');
  });

  it("returns BadRequestError if 'user_id' or 'userId' fields are in request body", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const updatedTask1 = {
      userId: 1111,
      title: "Updated Task",
    };

    const resp1 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual('"userId" is not allowed');
    const updatedTask2 = {
      user_id: 1111,
      title: "Updated Task",
    };

    const resp2 = await request(app)
      .patch(`/user/${user1.id}/tasks/${task1.id}/`)
      .send(updatedTask2)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual('"user_id" is not allowed');
  });

  it("returns schema error (BadRequestError) based on misspelling, non-existing fields, and case sensisitivity", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const updatedTask1 = {
      Title: "Updated Task",
    };
    const resp1 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask1)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(400);
    expect(resp1.body.error.message).toEqual('"Title" is not allowed');

    const updatedTask2 = {
      admin: true,
    };
    const resp2 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask2)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual('"admin" is not allowed');

    const updatedTask3 = {
      urgent: "*",
    };
    const resp3 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask3)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.message).toEqual('"urgent" must be a boolean');

    const updatedTask4 = {
      urrgent: true,
    };
    const resp4 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask4)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp4.statusCode).toEqual(400);
    expect(resp4.body.error.message).toEqual('"urrgent" is not allowed');
  });

  it("returns schema error (BadRequestError) based threshold violations", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const updatedTask1 = {
      title: "TooLongTitleExceeding30Characters",
    };

    const resp1 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
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
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask2)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(400);
    expect(resp2.body.error.message).toEqual(
      '"note" length must be less than or equal to 500 characters long'
    );

    const buffer2 = crypto.randomBytes(8);
    const longCategory = buffer2.toString("hex"); //string length = 16
    const updatedTask3 = {
      category: longCategory,
    };
    const resp3 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask3)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp3.statusCode).toEqual(400);
    expect(resp3.body.error.message).toEqual(
      '"category" length must be less than or equal to 15 characters long'
    );

    const updatedTask4 = {
      category: "N",
    };
    const resp4 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask4)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp4.statusCode).toEqual(400);
    expect(resp4.body.error.message).toEqual(
      '"category" length must be at least 2 characters long'
    );
    const updatedTask5 = {
      note: "",
    };
    const resp5 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
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
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
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
      .patch(`/user/${user2.id}/tasks/${task3.id}/`)
      .send(updatedTask7)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp7.statusCode).toEqual(400);
    expect(resp7.body.error.message).toEqual(
      '"timebox" must be less than or equal to 600'
    );
  });
  it("fails: 'userId' input too large", async function () {
    const updatedTask = {
      title: "Updated Task 1",
    };
    const resp = await request(app)
      .patch(`/user/90071992547409924/tasks/1/`)
      .send(updatedTask)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe('"userId" supplied is too large');
  });

  it("fails: 'taskId' input too large", async function () {
    const updatedTask = {
      title: "Updated Task 1",
    };
    const resp = await request(app)
      .patch(`/user/1/tasks/90071992547409924/`)
      .send(updatedTask)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe('"taskId" supplied is too large');
  });
});

/************************************** PATCH user/:userId/tasks/:taskId/priority { newData } */
describe("PATCH user/:userId/tasks/:taskId/priority { newData }", function () {
  it("updates task for admin and non-admin user", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp1 = await request(app)
      .patch(`/user/${user1.id}/tasks/${task1.id}/priority`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(201);
    expect(resp1.body).toEqual({
      task: {
        taskId: task1.id,
        userId: user1.id,
        urgent: true,
        important: false,
        priority: "delegate",
      },
    });

    const resp2 = await request(app)
      .patch(`/user/${user1.id}/tasks/${task1.id}/priority`)
      .send({
        priority: "avoid",
      })
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp2.statusCode).toEqual(201);
    expect(resp2.body).toEqual({
      task: {
        taskId: task1.id,
        userId: user1.id,
        urgent: false,
        important: false,
        priority: "avoid",
      },
    });

    const resp3 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task2.id}/priority`)
      .send({
        priority: "schedule",
      })
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp3.statusCode).toEqual(201);
    expect(resp3.body).toEqual({
      task: {
        taskId: task2.id,
        userId: user2.id,
        urgent: false,
        important: true,
        priority: "schedule",
      },
    });

    const resp4 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task3.id}/priority`)
      .send({
        priority: "now",
      })
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp4.statusCode).toEqual(201);
    expect(resp4.body).toEqual({
      task: {
        taskId: task3.id,
        userId: user2.id,
        urgent: true,
        important: true,
        priority: "now",
      },
    });
  });

  it("returns 404 NotFoundError reponses for no userId and/or taskID provided", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const resp1 = await request(app)
      .patch(`/user/${user1.id}/tasks/`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);

    const resp3 = await request(app)
      .patch(`/user/tasks/${task3.id}/priority`)
      .send({
        priority: "avoid",
      })
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp3.statusCode).toEqual(404);
  });

  it("throws UnauthorizedError to non-admin user for non-existing taskId", async function () {
    const [user1, user2, user3] = await getUserIds();

    const resp1 = await request(app)
      .patch(`/user/${user1.id}/tasks/111/priority`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws NotFoundError to admin user for non-existing taskId", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp1 = await request(app)
      .patch(`/user/${user1.id}/tasks/111/priority`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("throws NotFoundError to admin user for non-existing userId", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp1 = await request(app)
      .patch(`/user/111/${task1.id}/priority`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to admin user for non-existing userId", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp1 = await request(app)
      .patch(`/user/111/tasks/${task1.id}/priority`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to non-admin and incorrect user", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp1 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task2.id}/priority`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to unauthenticated user", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp1 = await request(app)
      .patch(`/user/${user2.id}/tasks/${task2.id}/priority`)
      .send({
        priority: "delegate",
      });
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("returns NotFoundError to admin if userId and taskId path parameter positions are switched", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp1 = await request(app)
      .patch(`/user/${task2.id}/tasks/${user2.id}/priority`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("returns UnauthorizedError to non-admin if userId and taskId path parameter positions are switched", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp1 = await request(app)
      .patch(`/user/${task2.id}/tasks/${user2.id}/priority`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("fails: 'userId' input too large", async function () {
    const resp = await request(app)
      .patch(`/user/90071992547409924/tasks/1/priority`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe('"userId" supplied is too large');
  });

  it("fails: 'taskId' input too large", async function () {
    const resp = await request(app)
      .patch(`/user/1/tasks/90071992547409924/priority`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe('"taskId" supplied is too large');
  });
});

/************************************** DELETE user/:userId/tasks/:taskId */

describe("DELETE user/:userId/tasks/:taskId", function () {
  it("deletes task for admin and non-admin user", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const resp1 = await request(app)
      .delete(`/user/${user1.id}/tasks/${task1.id}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(200);
    expect(resp1.body).toEqual({ deleted: `${task1.id}` });

    const resp2 = await request(app)
      .delete(`/user/${user2.id}/tasks/${task3.id}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(200);
    expect(resp2.body).toEqual({ deleted: `${task3.id}` });
  });

  it("returns NotFoundError if multiple taskIds are passed by admin and non-admin", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp1 = await request(app)
      .delete(`/user/${user2.id}/tasks/${task3.id}/${task2.id}`)
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");

    const resp2 = await request(app)
      .delete(`/user/${user2.id}/tasks/${task3.id}/${task2.id}`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp2.statusCode).toEqual(404);
    expect(resp2.body.error.message).toEqual("Not Found");

    const resp3 = await request(app)
      .delete(`/user/${user2.id}/tasks/${task3.id}/tasks${task2.id}`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp3.statusCode).toEqual(404);
    expect(resp3.body.error.message).toEqual("Not Found");
  });

  it("returns NotFoundError reponses to users for no userId and/or taskID provided", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const resp1 = await request(app)
      .delete(`/user/${user1.id}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");

    const resp2 = await request(app)
      .delete(`/user/${user1.id}/`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp2.statusCode).toEqual(404);
    expect(resp2.body.error.message).toEqual("Not Found");

    const resp3 = await request(app)
      .delete(`/user/${task1.id}/`)
      .set("authorization", `Bearer ${await u1Token}`);
    expect(resp3.statusCode).toEqual(404);
    expect(resp3.body.error.message).toEqual("Not Found");

    const resp4 = await request(app)
      .delete(`/user/${task1.id}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp4.statusCode).toEqual(404);
    expect(resp4.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to non-admin user for non-existing taskId", async function () {
    const [user1, user2, user3] = await getUserIds();

    const resp1 = await request(app)
      .delete(`/user/${user2.id}/tasks/1111/`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws NotFoundError to admin user for non-existing taskId", async function () {
    const [user1, user2, user3] = await getUserIds();
    const resp2 = await request(app)
      .delete(`/user/${user3.id}/2222/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(404);
    expect(resp2.body.error.message).toEqual("Not Found");
  });

  it("throws NotFoundError to admin user for non-existing userId", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp2 = await request(app)
      .delete(`/user/2222/${task1.id}/`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp2.statusCode).toEqual(404);
    expect(resp2.body.error.message).toEqual("Not Found");
  });

  it("throws UnauthorizedError to admin user for non-existing userId", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp2 = await request(app)
      .delete(`/user/1111/tasks/${task2.id}/`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp2.statusCode).toEqual(401);
    expect(resp2.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to non-admin and incorrect user", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const resp1 = await request(app)
      .delete(`/user/${user1.id}/tasks/${task1.id}/`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("throws UnauthorizedError to unauthenticated user", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const resp1 = await request(app).delete(
      `/user/${user2.id}/tasks/${task2.id}/`
    );
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("returns NotFoundError to admin if userId and taskId path parameter positions are switched", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();

    const resp1 = await request(app)
      .delete(`/user/${task1.id}/${user1.id}/tasks`)
      .set("authorization", `Bearer ${await adminToken}`);
    expect(resp1.statusCode).toEqual(404);
    expect(resp1.body.error.message).toEqual("Not Found");
  });

  it("returns UnauthorizedError to non-admin if userId and taskId path parameter positions are switched", async function () {
    const [user1, user2, user3] = await getUserIds();
    const [task1, task2, task3] = await getTaskIds();
    const resp1 = await request(app)
      .delete(`/user/${task3.id}/tasks/${user2.id}/`)
      .set("authorization", `Bearer ${await u2Token}`);
    expect(resp1.statusCode).toEqual(401);
    expect(resp1.body.error.message).toEqual("Unauthorized");
  });

  it("fails: 'userId' input too large", async function () {
    const resp = await request(app)
      .delete(`/user/90071992547409924/tasks/1`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe('"userId" supplied is too large');
  });

  it("fails: 'taskId' input too large", async function () {
    const resp = await request(app)
      .delete(`/user/1/tasks/90071992547409924`)
      .send({
        priority: "delegate",
      })
      .set("authorization", `Bearer ${await adminToken}`);

    expect(resp.status).toBe(400);
    expect(resp.body.error.message).toBe('"taskId" supplied is too large');
  });
});
