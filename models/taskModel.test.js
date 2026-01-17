import { pool } from "../db/db.js";
import Task from "./taskModel.js";
import { NotFoundError, BadRequestError } from "../expressError.js";
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

let user1, user2, user3;
let uiTaskId1, uiTaskId2, uiTaskId3;
let customCategory1, customCategory2, customCategory3;
let defaultCategory1, defaultCategory2, defaultCategory3;

const expectedTaskId = expect.stringMatching(/^TA-[a-f0-9\-]{36}$/);
const expectedCategoryId = expect.stringMatching(/^CA-[a-f0-9\-]{36}$/);

/** //NICE-TO-HAVE revisit in the future - As adviced by Lawrence, use Mock functions instead. Mock database data/queries.
 * 1. At route level, test for results (status code and payload returned)
 *  2. At model layer, I already tested db, so the db can be mocked at router level.
 *
 * Additional Notes:
 *
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
// describe.only("hooks to get global data", function () {
//   test("get ids", async function () {
//     const userIds = await pool.query("SELECT id FROM users ORDER BY id ASC");
//     user1 = userIds.rows[0].id;
//     user2 = userIds.rows[1].id;
//     user3 = userIds.rows[2].id;

//     const taskIds = await pool.query("SELECT id FROM tasks ORDER BY id ASC");
//     task1 = taskIds.rows[0].id;
//     task2 = taskIds.rows[1].id;
//     task3 = taskIds.rows[2].id;

//     const categoryIds = await pool.query(
//       "SELECT ui_category_id FROM categories ORDER BY ui_category_id ASC"
//     );
//     customCategory1 = categoryIds.rows[0].ui_category_id;
//     customCategory2 = categoryIds.rows[1].ui_category_id;
//     customCategory3 = categoryIds.rows[2].ui_category_id;
//   });
// });

*/

async function fetchGlobalData() {
  const userIds = await pool.query(
    "SELECT id FROM users ORDER BY first_name ASC"
  );

  [user1, user2, user3] = userIds.rows.map((row) => row.id);

  const uiTaskIds = await pool.query(
    `SELECT tasks.ui_task_id
   FROM tasks 
   JOIN users ON tasks.fk_user_id = users.id 
   ORDER BY users.first_name ASC`
  );

  [uiTaskId1, uiTaskId2, uiTaskId3] = uiTaskIds.rows.map(
    (row) => row.ui_task_id
  );

  const customCategoryIds = await pool.query(
    `SELECT categories.ui_category_id 
     FROM categories 
     JOIN users ON categories.fk_user_id = users.id 
     WHERE categories.is_default = false 
     ORDER BY users.first_name ASC`
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

/************************************** getAll */
describe("getAll", function () {
  it("returns expected tasks and fields per user", async function () {
    const tasks1 = await Task.getAll(user1);
    const tasks2 = await Task.getAll(user2);
    const tasks3 = await Task.getAll(user3);

    expect(tasks1).toEqual([
      {
        taskId: expectedTaskId,
        title: "Task 1",
        timebox: 30,
        completed: false,
        note: "Note 1",
        categoryId: customCategory1,
        deadlineDate: "1111-01-01",
      },
    ]);

    expect(tasks2).toEqual([
      {
        taskId: expectedTaskId,
        title: "Task 2",
        timebox: 60,
        completed: false,
        note: "Note 2",
        categoryId: customCategory2,
        deadlineDate: "2222-02-02",
      },
      {
        taskId: expectedTaskId,
        title: "Task 3",
        timebox: 90,
        completed: true,
        note: "Note 3",
        categoryId: customCategory3,
        deadlineDate: "3333-03-03",
      },
    ]);

    expect(tasks3).toEqual([]);
  });

  it("does not expose unecessary data", async function () {
    const unnecessaryFields = "userId";
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
        taskId: expectedTaskId,
        title: "Task 1",
        timebox: 30,
        completed: false,
        note: "Note 1",
        categoryId: expectedCategoryId,
        deadlineDate: "1111-01-01",
      },
    ]);

    const tasksByIncomplete = await Task.getByFilters({
      completed: false,
      userId: user1,
    });
    expect(tasksByIncomplete).toEqual([
      {
        taskId: expectedTaskId,
        title: "Task 1",
        timebox: 30,
        completed: false,
        note: "Note 1",
        categoryId: expectedCategoryId,
        deadlineDate: "1111-01-01",
      },
    ]);

    const tasksByDeadline = await Task.getByFilters({
      deadlineDate: "1111-01-01",
      userId: user1,
    });
    expect(tasksByDeadline).toEqual([
      {
        taskId: expectedTaskId,
        title: "Task 1",
        timebox: 30,
        completed: false,
        note: "Note 1",
        categoryId: expectedCategoryId,
        deadlineDate: "1111-01-01",
      },
    ]);

    const tasksByDeadline2 = await Task.getByFilters({
      deadlineDate: null,
      userId: user2,
    });
    expect(tasksByDeadline2).toEqual([]);

    const tasksByAll = await Task.getByFilters({ userId: user1 });
    expect(tasksByAll).toEqual([
      {
        taskId: expectedTaskId,
        title: "Task 1",
        timebox: 30,
        completed: false,
        note: "Note 1",
        categoryId: expectedCategoryId,
        deadlineDate: "1111-01-01",
      },
    ]);

    const tasksByMultiple1 = await Task.getByFilters({
      completed: true,
      userId: user1,
      deadlineDate: "1111-01-01",
      title: "Task 1",
    });
    expect(tasksByMultiple1).toEqual([]);

    const tasksByMultiple2 = await Task.getByFilters({
      completed: false,
      userId: user1,
      deadlineDate: "1111-01-01",
      title: "Task 1",
    });
    expect(tasksByMultiple2).toEqual([
      {
        taskId: expectedTaskId,
        title: "Task 1",
        timebox: 30,
        completed: false,
        note: "Note 1",
        categoryId: expectedCategoryId,
        deadlineDate: "1111-01-01",
      },
    ]);

    const tasksByMultiple3 = await Task.getByFilters({
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
        taskId: expectedTaskId,
        title: "Task 3",
        timebox: 90,
        completed: true,
        note: "Note 3",
        categoryId: expectedCategoryId,
        deadlineDate: "3333-03-03",
      },
    ]);

    const tasksByIncomplete = await Task.getByFilters({
      completed: false,
      userId: user2,
    });
    expect(tasksByIncomplete).toEqual([
      {
        taskId: expectedTaskId,
        title: "Task 2",
        timebox: 60,
        completed: false,
        note: "Note 2",
        categoryId: expectedCategoryId,
        deadlineDate: "2222-02-02",
      },
    ]);

    const tasksByDeadline = await Task.getByFilters({
      deadlineDate: "2222-2-2",
      userId: user2,
    });
    expect(tasksByDeadline).toEqual([
      {
        taskId: expectedTaskId,
        title: "Task 2",
        timebox: 60,
        completed: false,
        note: "Note 2",
        categoryId: expectedCategoryId,
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
    });

    const tasksByMultiple1 = await Task.getByFilters({
      deadlineDate: "1111-01-01T07:52:58.000Z",
      completed: false,
      userId: user1,
    });

    expect(tasksByMultiple1).toEqual([
      {
        taskId: expectedTaskId,
        title: "Task 1",
        timebox: 30,
        completed: false,
        note: "Note 1",
        categoryId: customCategory1,
        deadlineDate: "1111-01-01",
      },
    ]);

    const tasksByAll = await Task.getByFilters({ userId: user3 });
    expect(tasksByAll).toEqual([
      {
        taskId: expectedTaskId,
        title: "Task 4",
        timebox: null,
        completed: false,
        note: null,
        categoryId: defaultCategory3,
        deadlineDate: null,
      },
    ]);

    const tasksByDeadline = await Task.getByFilters({
      userId: user3,
      deadlineDate: null,
    });
    expect(tasksByDeadline).toEqual([
      {
        taskId: expectedTaskId,
        title: "Task 4",
        timebox: null,
        completed: false,
        note: null,
        categoryId: defaultCategory3,
        deadlineDate: null,
      },
    ]);
  });

  /** This error should be thrown by authentication middleware at the router level **/
  it("does not throw error if no userid found", async function () {
    const tasksByTitle = await Task.getByFilters({
      userId: "57dd1e52-39e4-4778-a70e-c772a188207e", //assuming this id does not exist.
    });
    expect(tasksByTitle).toEqual([]);
  });
});

/************************************** create */
describe("create", function () {
  it("creates expected task using default categories", async function () {
    const newTask1 = await Task.create({
      userId: user1,
      title: "Task 1",
    });

    expect(newTask1).toEqual({
      taskId: expectedTaskId,
      userId: user1,
      title: "Task 1",
      timebox: null,
      completed: false,
      note: null,
      categoryId: defaultCategory1,
      deadlineDate: null,
    });

    const newTask2 = await Task.create({
      userId: user2,
      title: "Task 2",
    });

    expect(newTask2).toEqual({
      taskId: expectedTaskId,
      userId: user2,
      title: "Task 2",
      timebox: null,
      completed: false,
      note: null,
      categoryId: defaultCategory2,
      deadlineDate: null,
    });

    const newTask3 = await Task.create({
      userId: user3,
      title: "Task 3",
    });
    expect(newTask3).toEqual({
      taskId: expectedTaskId,
      userId: user3,
      title: "Task 3",
      timebox: null,
      completed: false,
      note: null,
      categoryId: defaultCategory3,
      deadlineDate: null,
    });
  });

  it("creates expected task using custom categories", async function () {
    const newTask1 = await Task.create({
      userId: user1,
      title: "Task 4",
      categoryId: customCategory1,
    });
    expect(newTask1).toEqual({
      taskId: expectedTaskId,
      userId: user1,
      title: "Task 4",
      timebox: null,
      completed: false,
      note: null,
      categoryId: customCategory1,
      deadlineDate: null,
    });

    const newTask2 = await Task.create({
      userId: user2,
      title: "Task 4",
      categoryId: customCategory2,
    });

    expect(newTask2).toEqual({
      taskId: expectedTaskId,
      userId: user2,
      title: "Task 4",
      timebox: null,
      completed: false,
      note: null,
      categoryId: customCategory2,
      deadlineDate: null,
    });

    const newTask3 = await Task.create({
      userId: user3,
      title: "Task 4",
      categoryId: customCategory3,
    });
    expect(newTask3).toEqual({
      taskId: expectedTaskId,
      userId: user3,
      title: "Task 4",
      timebox: null,
      completed: false,
      note: null,
      categoryId: customCategory3,
      deadlineDate: null,
    });
  });
});

/************************************** update */
describe("update", function () {
  it("updates title successfully", async function () {
    const updatedTitle = await Task.update({
      taskId: uiTaskId1,
      userId: user1,
      title: "Task New Title",
    });
    expect(updatedTitle).toEqual({
      taskId: uiTaskId1,
      title: "Task New Title",
      userId: user1,
    });
  });

  it("updates deadline successfully", async function () {
    const updatedDeadline = await Task.update({
      taskId: uiTaskId1,
      userId: user1,
      deadlineDate: "4444-4-4",
    });
    expect(updatedDeadline).toEqual({
      taskId: expectedTaskId,
      deadlineDate: "4444-04-04",
      userId: user1,
    });
    const updatedDeadlineNull = await Task.update({
      taskId: uiTaskId1,
      userId: user1,
      deadlineDate: null,
    });
    expect(updatedDeadlineNull).toEqual({
      taskId: expectedTaskId,
      deadlineDate: null,
      userId: user1,
    });
  });

  it("updates all allowed fields simultaneously for user 2", async function () {
    const updatedTask = await Task.update({
      taskId: uiTaskId3,
      userId: user2,
      deadlineDate: "4444-4-4",
      timebox: 500,
      categoryId: customCategory2,
      title: "Newest Title for User 2",
      note: "Newest Note for User 2",
      completed: true,
    });

    expect(updatedTask).toEqual({
      taskId: uiTaskId3,
      userId: user2,
      title: "Newest Title for User 2",
      timebox: 500,
      completed: true,
      note: "Newest Note for User 2",
      categoryId: customCategory2,
      deadlineDate: "4444-04-04",
    });
  });

  it("updates all allowed fields simultaneously for user 1", async function () {
    const updatedTask = await Task.update({
      taskId: uiTaskId1,
      userId: user1,
      deadlineDate: "9999-9-9",
      timebox: 100,
      categoryId: customCategory1,
      title: "Newest Title for User 1",
      note: "Newest Note for User 1",
      completed: true,
    });

    expect(updatedTask).toEqual({
      taskId: uiTaskId1,
      userId: user1,
      title: "Newest Title for User 1",
      timebox: 100,
      completed: true,
      note: "Newest Note for User 1",
      categoryId: customCategory1,
      deadlineDate: "9999-09-09",
    });
  });

  it("returns error if attempting to update incorrect userId1", async function () {
    try {
      await Task.update({
        taskId: uiTaskId1,
        userId: user1,
        deadlineDate: "9999-9-9",
        timebox: 180,
        categoryId: customCategory2,
        title: "Newest Title for User 1",
        note: "Newest Note for User 1",
        completed: true,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }
  });

  it("returns error if attempting to update incorrect userId3", async function () {
    try {
      await Task.update({
        taskId: uiTaskId3,
        userId: user3,
        categoryId: customCategory1,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
    }
  });

  it("returns error for invalid taskId", async function () {
    try {
      await Task.update({
        taskId: 11,
        userId: user1,
        deadlineDate: "4444-4-4",
        timebox: "500",
        categoryId: "111",
        title: "Newest Title",
        note: "New Note",
        completed: true,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestError);
      expect(err.message).toBe("Invalid taskId.");
    }
  });

  it("returns custom errors and cancels entire update operation if attempting to update prohibited fileds ", async function () {
    const taskBefore = await pool.query(
      "Select * from tasks where ui_task_id=$1",
      [uiTaskId1]
    );

    const updateFkUserId = Task.update({
      taskId: uiTaskId1,
      userId: user1,
      fk_user_id: user2,
    });

    await expect(updateFkUserId).rejects.toThrow(
      `Updating fk_user_id column is not allowed.`
    );

    const updateUiTaskId = Task.update({
      taskId: uiTaskId1,
      userId: user1,
      ui_task_id: uiTaskId2,
    });

    await expect(updateUiTaskId).rejects.toThrow(
      `Updating user interface Ids is not allowed.`
    );

    const updateTaskId = Task.update({
      taskId: uiTaskId1,
      userId: user1,
      id: "0cb3aa71-fa42-4af7-adbe-a5f58f5d4dd3",
    });

    await expect(updateTaskId).rejects.toThrow(`Cannot update id column.`);

    const taskAfter = await pool.query(
      "Select * from tasks where ui_task_id=$1",
      [uiTaskId1]
    );

    expect(taskBefore).toEqual(taskAfter);
  });
});

/************************************** delete */
describe("delete", function () {
  it("deletes task", async function () {
    await Task.delete(uiTaskId1);

    const tasks = await pool.query("SELECT * FROM tasks WHERE ui_task_id=$1", [
      uiTaskId1,
    ]);

    expect(tasks.rows.length).toEqual(0);
  });

  it("returns error if invalid task", async function () {
    // assumes the TA- id is invalid
    const fakeTaskId = Task.delete("TA-3488dfe8-09f1-4c7e-ad54-b3797d7a58ce");
    await expect(fakeTaskId).rejects.toThrow(NotFoundError);
    await expect(fakeTaskId).rejects.toThrow(`Invalid taskId.`);
  });
});

// Uncomment if updatePriority every becomes a needed functionality.
/************************************** updatePriority */
// describe("updatePriority", function () {
//   it("updates to 'delegate' priority successfully", async function () {
//     const updatedTask1 = await Task.updatePriority({
//       taskId: task1,
//       priority: "delegate",
//     });

//     expect(updatedTask1).toEqual({
//       taskId: task1,
//       userId: user1,
//       urgent: true,
//       important: false,
//       priority: "delegate",
//     });

//     const updatedTask3 = await Task.updatePriority({
//       taskId: task3,
//       priority: "delegate",
//     });

//     expect(updatedTask3).toEqual({
//       taskId: task3,
//       userId: user2,
//       urgent: true,
//       important: false,
//       priority: "delegate",
//     });
//   });

//   it("updates to 'schedule' priority successfully", async function () {
//     const updatedTask1 = await Task.updatePriority({
//       taskId: task1,
//       priority: "schedule",
//     });

//     expect(updatedTask1).toEqual({
//       taskId: task1,
//       userId: user1,
//       // title: "Task 1",
//       urgent: false,
//       important: true,
//       priority: "schedule",
//     });

//     const updatedTask2 = await Task.updatePriority({
//       taskId: task2,
//       priority: "schedule",
//     });

//     expect(updatedTask2).toEqual({
//       taskId: task2,
//       // title: "Task 2",
//       userId: user2,
//       urgent: false,
//       important: true,
//       priority: "schedule",
//     });
//   });

//   it("updates to 'now' priority successfully", async function () {
//     const updatedTask2 = await Task.updatePriority({
//       taskId: task2,
//       priority: "now",
//     });

//     expect(updatedTask2).toEqual({
//       taskId: task2,
//       userId: user2,
//       urgent: true,
//       important: true,
//       priority: "now",
//     });

//     const updatedTask3 = await Task.updatePriority({
//       taskId: task3,
//       priority: "now",
//     });

//     expect(updatedTask3).toEqual({
//       taskId: task3,
//       userId: user2,
//       urgent: true,
//       important: true,
//       priority: "now",
//     });
//   });

//   it("updates to 'avoid' priority successfully", async function () {
//     const updatedTask1 = await Task.updatePriority({
//       taskId: task1,
//       priority: "avoid",
//     });

//     expect(updatedTask1).toEqual({
//       taskId: task1,
//       userId: user1,
//       urgent: false,
//       important: false,
//       priority: "avoid",
//     });

//     const updatedTask2 = await Task.updatePriority({
//       taskId: task2,
//       priority: "avoid",
//     });

//     expect(updatedTask2).toEqual({
//       taskId: task2,
//       userId: user2,
//       urgent: false,
//       important: false,
//       priority: "avoid",
//     });
//   });

//   it("returns error for invalid taskId", async function () {
//     const fakeTaskId = Task.updatePriority({
//       taskId: 11,
//       priority: "delegate",
//     });

//     await expect(fakeTaskId).rejects.toThrow(NotFoundError);
//     await expect(fakeTaskId).rejects.toThrow(`Invalid taskId.`);
//   });
// });
