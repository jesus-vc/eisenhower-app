import pool from "../db/db.js";
import Task from "./taskModel.js";
import { NotFoundError } from "../expressError.js";
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

/************************************** global data for tests */

let user1;
let user2;
let user3;
let task1;
let task2;
let task3;

/** //PEER
 * Lawrence, I am experimenting with how to retreive data from a DB that needs to be globally available to all tests in a single test file.
 *
 * Could you help me compare two approaches I've tried thus far?
 *
 * Approach #1:
 * Below is a describe function ("hooks to get global data") with a single test to retrieve and store the data in global variables.
 * PRO: Only 1 db call is made for the entire test file.
 * CON: When executing individual tests in the file via the 'test.only' method, the describe hook below also has to be marked with describe.only or test.only as well. To me this seems hacky and could be confusing to another programmer when attempting to run individual tests.
 *
 * Aprroach #2:
 * In the taskRoutes.test.js test suite, I took a different approach. Around line 32 under "Reusable functions", I created reusable functions which are called repeated by each test that requires the DB data.
 * PRO: Executing individual tests via the 'test.only' method is cleaner since the resuable functions and tests are coupled.
 * CON: Less efficient and unscalable, since adding more tests increases DB calls.
 *
 * Do you think there are more elegant/effective solutions? I'd like to find a way where only 1 DB call is needed for the entire test file without having to use a describe block as in approach #1.
 */

describe("hooks to get global data", function () {
  test("get user and task ids", async function () {
    const userIds = await pool.query("SELECT id FROM users ORDER BY id ASC");
    user1 = userIds.rows[0].id;
    user2 = userIds.rows[1].id;
    user3 = userIds.rows[2].id;

    const taskIds = await pool.query("SELECT id FROM tasks ORDER BY id ASC");
    task1 = taskIds.rows[0].id;
    task2 = taskIds.rows[1].id;
    task3 = taskIds.rows[2].id;
  });
});

/************************************** getAll */

describe("getAll", function () {
  it("returns expected tasks and fields per user", async function () {
    //TODO Delete once I review with Lawrence the hooks section above.
    // const allTasks = await pool.query("SELECT id FROM users");
    // const user1 = allTasks.rows[0].id;
    // const user2 = allTasks.rows[1].id;
    // const user3 = allTasks.rows[2].id;
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
        deadlineDate: "1111-01-01",
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
    ]);

    expect(tasks3).toEqual([]);
  });

  it("does not expose unecessary data", async function () {
    const unnecessaryFields = "userId";
    //TODO Delete once I review with Lawrence the hooks section above.
    // const allTasks = await pool.query("SELECT id FROM users");
    // const user1 = allTasks.rows[0].id;
    // const user2 = allTasks.rows[1].id;
    // const user3 = allTasks.rows[2].id;

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

/************************************** getByFilters */

describe("getByFilters", function () {
  it("returns expected tasks and fields for user 1", async function () {
    const tasksByTitle = await Task.getByFilters({
      title: "Task 1",
      userId: user1,
    });
    expect(tasksByTitle).toEqual([
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
        deadlineDate: "1111-01-01",
      },
    ]);

    const tasksByIncomplete = await Task.getByFilters({
      completed: false,
      userId: user1,
    });
    expect(tasksByIncomplete).toEqual([
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
        deadlineDate: "1111-01-01",
      },
    ]);

    const tasksByDeadline = await Task.getByFilters({
      deadlineDate: "1111-01-01",
      userId: user1,
    });
    expect(tasksByDeadline).toEqual([
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
        deadlineDate: "1111-01-01",
      },
    ]);

    const tasksByAll = await Task.getByFilters({ userId: user1 });
    expect(tasksByAll).toEqual([
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
        deadlineDate: "1111-01-01",
      },
    ]);

    const tasksByMultiple1 = await Task.getByFilters({
      priority: "now",
      completed: true,
      userId: user1,
      deadlineDate: "1111-01-01",
      title: "Task 1",
    });
    expect(tasksByMultiple1).toEqual([]);

    const tasksByMultiple2 = await Task.getByFilters({
      priority: "now",
      completed: false,
      userId: user1,
      deadlineDate: "1111-01-01",
      title: "Task 1",
    });
    expect(tasksByMultiple2).toEqual([
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
        deadlineDate: "1111-01-01",
      },
    ]);

    const tasksByMultiple3 = await Task.getByFilters({
      priority: "now",
      completed: false,
      userId: user1,
      deadlineDate: "1111-01-01",
      title: "Task 13",
    });
    expect(tasksByMultiple3).toEqual([]);
  });

  it("returns expected tasks and fields for user 2", async function () {
    const tasksByCompleted = await Task.getByFilters({
      completed: true,
      userId: user2,
    });
    expect(tasksByCompleted).toEqual([
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
    ]);

    const tasksByIncomplete = await Task.getByFilters({
      completed: false,
      userId: user2,
    });
    expect(tasksByIncomplete).toEqual([
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
        deadlineDate: "2222-02-02",
      },
    ]);

    const tasksByDeadline = await Task.getByFilters({
      deadlineDate: "2222-2-2",
      userId: user2,
    });
    expect(tasksByDeadline).toEqual([
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
        deadlineDate: "2222-02-02",
      },
    ]);
  });

  it("returns expected tasks and fields for user 3", async function () {
    const tasksByCompleted = await Task.getByFilters({
      completed: true,
      userId: user3,
    });
    const tasksByIncomplete = await Task.getByFilters({
      completed: false,
      userId: user3,
    });

    expect(tasksByCompleted).toEqual([]);
    expect(tasksByIncomplete).toEqual([]);

    await Task.create({
      userId: user3,
      title: "Task 4",
      urgent: false,
      important: false,
    });
    const tasksByPriority = await Task.getByFilters({
      priority: "avoid",
      userId: user3,
    });
    expect(tasksByPriority).toEqual([
      {
        taskId: expect.any(Number),
        title: "Task 4",
        urgent: false,
        important: false,
        priority: "avoid",
        timebox: null,
        completed: false,
        note: null,
        category: null,
        deadlineDate: null,
      },
    ]);

    const tasksByMultiple = await Task.getByFilters({
      priority: "avoid",
      completed: true,
      userId: user3,
    });
    expect(tasksByMultiple).toEqual([]);

    const tasksByAll = await Task.getByFilters({ userId: user3 });
    expect(tasksByAll).toEqual([
      {
        taskId: expect.any(Number),
        title: "Task 4",
        urgent: false,
        important: false,
        priority: "avoid",
        timebox: null,
        completed: false,
        note: null,
        category: null,
        deadlineDate: null,
      },
    ]);

    const tasksByDeadline = await Task.getByFilters({
      userId: user3,
      deadlineDate: null,
    });
    expect(tasksByDeadline).toEqual([
      {
        taskId: expect.any(Number),
        title: "Task 4",
        urgent: false,
        important: false,
        priority: "avoid",
        timebox: null,
        completed: false,
        note: null,
        category: null,
        deadlineDate: null,
      },
    ]);
  });

  /** This error should be thrown by authentication middleware at the router level **/
  it("does not throw error if no userid found", async function () {
    const tasksByTitle = await Task.getByFilters({
      userId: 0, //assuming userId 0 does not exist.
    });
    expect(tasksByTitle).toEqual([]);
  });
});

/************************************** create */

describe("create", function () {
  it("creates expected task using required fields", async function () {
    const newTask1 = await Task.create({
      userId: user1,
      title: "Task 1",
      urgent: true,
      important: true,
    });
    expect(newTask1).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      title: "Task 1",
      urgent: true,
      important: true,
      priority: "now",
      timebox: null,
      completed: false,
      note: null,
      category: null,
      deadlineDate: null,
    });
    const newTask2 = await Task.create({
      userId: user1,
      title: "Task 2",
      urgent: true,
      important: false,
    });
    expect(newTask2).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      title: "Task 2",
      urgent: true,
      important: false,
      priority: "delegate",
      timebox: null,
      completed: false,
      note: null,
      category: null,
      deadlineDate: null,
    });
    const newTask3 = await Task.create({
      userId: user1,
      title: "Task 3",
      urgent: false,
      important: true,
    });
    expect(newTask3).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      title: "Task 3",
      urgent: false,
      important: true,
      priority: "schedule",
      timebox: null,
      completed: false,
      note: null,
      category: null,
      deadlineDate: null,
    });
    const newTask4 = await Task.create({
      userId: user1,
      title: "Task 4",
      urgent: false,
      important: false,
    });
    expect(newTask4).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      title: "Task 4",
      urgent: false,
      important: false,
      priority: "avoid",
      timebox: null,
      completed: false,
      note: null,
      category: null,
      deadlineDate: null,
    });
  });

  it("creates expected task using optional fields", async function () {
    const newTask1 = await Task.create({
      userId: user1,
      title: "Task 1",
      urgent: true,
      important: true,
      timebox: 30,
      note: "Note 1",
      category: "Finances",
      deadlineDate: "1111-01-01",
    });

    expect(newTask1).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      title: "Task 1",
      urgent: true,
      important: true,
      priority: "now",
      timebox: 30,
      completed: false,
      note: "Note 1",
      category: "Finances",
      deadlineDate: "1111-01-01",
    });

    const newTask2 = await Task.create({
      userId: user1,
      title: "Task 2",
      urgent: true,
      important: true,
      deadlineDate: "1111-01-01",
    });

    expect(newTask2).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      title: "Task 2",
      urgent: true,
      important: true,
      priority: "now",
      timebox: null,
      completed: false,
      note: null,
      category: null,
      deadlineDate: "1111-01-01",
    });

    const newTask3 = await Task.create({
      userId: user1,
      title: "Task 3",
      urgent: true,
      important: true,
      note: "Note 3",
    });

    expect(newTask3).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      title: "Task 3",
      urgent: true,
      important: true,
      priority: "now",
      timebox: null,
      completed: false,
      note: "Note 3",
      category: null,
      deadlineDate: null,
    });
  });
});

/************************************** update */

describe("update", function () {
  it("updates title successfully", async function () {
    const updatedTitle = await Task.update({
      taskId: task1,
      title: "Task New Title",
    });
    expect(updatedTitle).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      title: "Task New Title",
    });
  });

  it("updates deadline successfully", async function () {
    const updatedDeadline = await Task.update({
      taskId: task1,
      deadlineDate: "4444-4-4",
    });
    expect(updatedDeadline).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      deadlineDate: "4444-04-04",
    });
    const updatedDeadlineNull = await Task.update({
      taskId: task1,
      deadlineDate: null,
    });
    expect(updatedDeadlineNull).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      deadlineDate: null,
    });
  });

  it("updates task's priority based on 'important' and 'urgent' values", async function () {
    const updatedUrgent = await Task.update({
      taskId: task1,
      urgent: false,
    });
    expect(updatedUrgent).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      urgent: false,
      priority: "schedule",
    });

    const updatedImportant = await Task.update({
      taskId: task1,
      important: false,
    });
    expect(updatedImportant).toEqual({
      taskId: expect.any(Number),
      userId: user1,
      important: false,
      priority: "avoid",
    });
  });

  it("updates all allowed fields simultaneously", async function () {
    const updatedTask = await Task.update({
      taskId: task3,
      deadlineDate: "4444-4-4",
      urgent: true,
      important: true,
      timebox: 500,
      category: "Workouts",
      title: "Newest Title",
      note: "Newest Note",
      completed: true,
    });

    expect(updatedTask).toEqual({
      taskId: task3,
      userId: user2,
      title: "Newest Title",
      urgent: true,
      important: true,
      priority: "now",
      timebox: 500,
      completed: true,
      note: "Newest Note",
      category: "Workouts",
      deadlineDate: "4444-04-04",
    });
  });

  it("returns error for invalid taskId", async function () {
    const fakeTaskId = Task.update({
      taskId: 11,
      deadlineDate: "4444-4-4",
      urgent: false,
      important: false,
      timebox: "500",
      category: "Workouts",
      title: "Newest Title",
      note: "New Note",
      completed: true,
    });

    await expect(fakeTaskId).rejects.toThrow(NotFoundError);
    await expect(fakeTaskId).rejects.toThrow(`Invalid taskId.`);
  });

  it("returns error and cancels entire update operation if attempting to update userId ", async function () {
    const taskBefore = await pool.query("Select * from tasks where id=$1", [
      task1,
    ]);

    const updateUserId = Task.update({
      taskId: task1,
      user_id: user3,
      title: "newer newer title",
    });

    await expect(updateUserId).rejects.toThrow(
      `Updating user_id column is not allowed.`
    );

    const taskAfter = await pool.query("Select * from tasks where id=$1", [
      task1,
    ]);

    expect(taskBefore).toEqual(taskAfter);
  });
});

/************************************** updatePriority */
describe("updatePriority", function () {
  it("updates to 'delegate' priority successfully", async function () {
    const updatedTask1 = await Task.updatePriority({
      taskId: task1,
      priority: "delegate",
    });

    expect(updatedTask1).toEqual({
      taskId: task1,
      userId: user1,
      urgent: true,
      important: false,
      priority: "delegate",
    });

    const updatedTask3 = await Task.updatePriority({
      taskId: task3,
      priority: "delegate",
    });

    expect(updatedTask3).toEqual({
      taskId: task3,
      userId: user2,
      urgent: true,
      important: false,
      priority: "delegate",
    });
  });

  it("updates to 'schedule' priority successfully", async function () {
    const updatedTask1 = await Task.updatePriority({
      taskId: task1,
      priority: "schedule",
    });

    expect(updatedTask1).toEqual({
      taskId: task1,
      userId: user1,
      // title: "Task 1",
      urgent: false,
      important: true,
      priority: "schedule",
    });

    const updatedTask2 = await Task.updatePriority({
      taskId: task2,
      priority: "schedule",
    });

    expect(updatedTask2).toEqual({
      taskId: task2,
      // title: "Task 2",
      userId: user2,
      urgent: false,
      important: true,
      priority: "schedule",
    });
  });

  it("updates to 'now' priority successfully", async function () {
    const updatedTask2 = await Task.updatePriority({
      taskId: task2,
      priority: "now",
    });

    expect(updatedTask2).toEqual({
      taskId: task2,
      userId: user2,
      urgent: true,
      important: true,
      priority: "now",
    });

    const updatedTask3 = await Task.updatePriority({
      taskId: task3,
      priority: "now",
    });

    expect(updatedTask3).toEqual({
      taskId: task3,
      userId: user2,
      urgent: true,
      important: true,
      priority: "now",
    });
  });

  it("updates to 'avoid' priority successfully", async function () {
    const updatedTask1 = await Task.updatePriority({
      taskId: task1,
      priority: "avoid",
    });

    expect(updatedTask1).toEqual({
      taskId: task1,
      userId: user1,
      urgent: false,
      important: false,
      priority: "avoid",
    });

    const updatedTask2 = await Task.updatePriority({
      taskId: task2,
      priority: "avoid",
    });

    expect(updatedTask2).toEqual({
      taskId: task2,
      userId: user2,
      urgent: false,
      important: false,
      priority: "avoid",
    });
  });

  it("returns error for invalid taskId", async function () {
    const fakeTaskId = Task.updatePriority({
      taskId: 11,
      priority: "delegate",
    });

    await expect(fakeTaskId).rejects.toThrow(NotFoundError);
    await expect(fakeTaskId).rejects.toThrow(`Invalid taskId.`);
  });
});

/************************************** delete */
describe("delete", function () {
  it("deletes task", async function () {
    await Task.delete(task1);

    const tasks = await pool.query("SELECT * FROM tasks WHERE id=$1", [task1]);

    expect(tasks.rows.length).toEqual(0);
  });

  it("returns error if invalid task", async function () {
    const fakeTaskId = Task.delete(11);

    await expect(fakeTaskId).rejects.toThrow(NotFoundError);
    await expect(fakeTaskId).rejects.toThrow(`Invalid taskId.`);
  });
});
