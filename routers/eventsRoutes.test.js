import { pool } from "../db/db.js";
import EventSource from "eventsource";
import { spawn } from "child_process";
import path from "path";
import Category from "../models/categoryModel.js";
import { getFakeUserId } from "../utils/testHelpers.js";
import {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token,
  adminToken,
} from "./_testCommon";

/************************************** Reusable functions */

let client;
let serverProcess;
let user1, user2, user3;
let customCategory1, customCategory2, customCategory3;
let defaultCategory1, defaultCategory2, defaultCategory3;
let uiTaskId1, uiTaskId2, uiTaskId3;
let token1;
let token2;
let tokenAdmin;
const taskIdRegex =
  /^TA-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const baseUrl = "http://localhost:3001/events";

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

const handleError = (clientName) => (error) => {
  console.error(`Error in SSE connection for ${clientName}`, error);
};

beforeAll(async () => {
  await commonBeforeAll();
  await fetchGlobalData();
  token1 = await u1Token;
  token2 = await u2Token;
  tokenAdmin = await adminToken;
  serverProcess = spawn("node", [path.resolve(__dirname, "../server.js")], {
    stdio: "inherit", // This pipes server logs to the console for easier debugging
  });
  // Give the server a moment to start up
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

beforeEach(async () => {
  client = await commonBeforeEach();
});

afterEach(async () => {
  await commonAfterEach(client);
});

afterAll(async () => {
  if (serverProcess) {
    await serverProcess.kill();
  }
  await commonAfterAll();
});

/************************************** GET /events/:userId */
/**
 * //PEER Lawrence
 * Normally, I keep my tests isolated, but these two tests are interdependent:
 *
 * The "successfully sends updates after 'Category'... " test relies on the data changes
 * made in the previous test, "successfully sends updates after 'Task'..."
 *
 * This dependency is due to how pg_notify works in my Server-Sent Events setup. For PostgreSQL to notify clients of data changes,
 * database transactions in a test must be committed. Since a ROLLBACK only clears uncommitted changes, I would need to manually
 * track and delete the committed changes before each test runs.
 *
 * Given that only two tests are involved, I chose to let the second test expect the first test’s data changes for simplicity.
 *
 * Does this approach work for you, or would you suggest an alternative?
 */

describe("/events/:userId", function () {
  it("successfully sends updates after 'Task' table changes to multiple distinct clients", async function () {
    let receivedEventCount = 0;
    const expectedCount = 6;
    const userData = new Map();

    const newData1 = {
      note: "Update 1",
      title: "Updated Title 1",
    };

    const newData2 = {
      note: "Update 2",
      title: "Updated Title 2",
    };

    const newData3 = {
      title: "Task 4",
      timebox: "90",
      note: "Note 4",
      deadlineDate: "4444-4-4",
    };

    userData.set("user1", {
      tasks: expect.arrayContaining([
        expect.objectContaining({
          taskId: uiTaskId1,
          categoryId: customCategory1,
          title: "Updated Title 1",
          timebox: 30,
          completed: false,
          note: "Update 1",
          deadlineDate: "1111-01-01",
        }),
      ]),
      categories: expect.arrayContaining([
        { categoryId: defaultCategory1, categoryName: "Ideas" },
        { categoryId: customCategory1, categoryName: "New Cat 1" },
      ]),
    });
    userData.set("user2", {
      tasks: expect.arrayContaining([
        {
          taskId: uiTaskId2,
          categoryId: customCategory2,
          title: "Updated Title 2",
          timebox: 60,
          completed: false,
          note: "Update 2",
          deadlineDate: "2222-02-02",
        },
        {
          taskId: uiTaskId3,
          categoryId: customCategory3,
          title: "Task 3",
          timebox: 90,
          completed: true,
          note: "Note 3",
          deadlineDate: "3333-03-03",
        },
      ]),
      categories: expect.arrayContaining([
        { categoryId: defaultCategory2, categoryName: "Ideas" },
        { categoryId: customCategory2, categoryName: "New Cat 2" },
        { categoryId: customCategory3, categoryName: "New Cat 3" },
      ]),
    });
    userData.set("user3", {
      tasks: expect.arrayContaining([
        {
          taskId: expect.stringMatching(taskIdRegex),
          categoryId: defaultCategory3,
          title: "Task 4",
          timebox: 90,
          completed: false,
          note: "Note 4",
          deadlineDate: "4444-04-04",
        },
      ]),
      categories: expect.arrayContaining([
        { categoryId: defaultCategory3, categoryName: "Ideas" },
      ]),
    });

    const user1Client1 = new EventSource(
      `${baseUrl}/${user1}?authToken=${token1}`
    );
    const user1Client2 = new EventSource(
      `${baseUrl}/${user1}?authToken=${token1}`
    );
    const user2Client1 = new EventSource(
      `${baseUrl}/${user2}?authToken=${token2}`
    );
    const user2Client2 = new EventSource(
      `${baseUrl}/${user2}?authToken=${token2}`
    );
    const user3Client1 = new EventSource(
      `${baseUrl}/${user3}?authToken=${tokenAdmin}`
    );
    const user3Client2 = new EventSource(
      `${baseUrl}/${user3}?authToken=${tokenAdmin}`
    );

    // Delay to allow connections to establish before further actions
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(user1Client1.readyState).toEqual(EventSource.OPEN);
    expect(user1Client2.readyState).toEqual(EventSource.OPEN);
    expect(user2Client1.readyState).toEqual(EventSource.OPEN);
    expect(user2Client2.readyState).toEqual(EventSource.OPEN);
    expect(user3Client1.readyState).toEqual(EventSource.OPEN);
    expect(user3Client2.readyState).toEqual(EventSource.OPEN);

    const handleEvent = (clientName) => (event) => {
      const data = JSON.parse(event.data);
      receivedEventCount += 1;
      if (receivedEventCount === expectedCount) {
        // Close EventSource connections after receiving expected events
        user1Client1.close();
        user1Client2.close();
        user2Client1.close();
        user2Client2.close();
        user3Client1.close();
        user3Client2.close();
      }
      expect(data).toEqual(expect.objectContaining(userData.get(clientName)));
    };

    // Listen for "data-update" events only
    user1Client1.addEventListener("data-update", handleEvent("user1"));
    user1Client2.addEventListener("data-update", handleEvent("user1"));
    user2Client1.addEventListener("data-update", handleEvent("user2"));
    user2Client2.addEventListener("data-update", handleEvent("user2"));
    user3Client1.addEventListener("data-update", handleEvent("user3"));
    user3Client2.addEventListener("data-update", handleEvent("user3"));

    user1Client1.onerror = handleError("user1Client1");
    user1Client2.onerror = handleError("user1Client2");
    user2Client1.onerror = handleError("user2Client1");
    user2Client2.onerror = handleError("user2Client2");
    user3Client1.onerror = handleError("user3Client1");
    user3Client2.onerror = handleError("user3Client2");

    // Simulate events that should trigger "data-update" events
    await client.query(
      `UPDATE tasks
        SET note=$1, title=$2 
        WHERE ui_task_id=$3 AND fk_user_id=$4`,
      [newData1.note, newData1.title, uiTaskId1, user1]
    );

    await client.query(
      `UPDATE tasks
        SET note=$1, title=$2 
        WHERE ui_task_id=$3 AND fk_user_id=$4`,
      [newData2.note, newData2.title, uiTaskId2, user2]
    );

    await client.query(
      `INSERT INTO tasks (fk_user_id, title, timebox, note, deadline_date, fk_category_id) 
      VALUES($1, $2, $3, $4, $5, (SELECT id FROM categories WHERE fk_user_id = '${user3}' AND is_default = true))`,
      [
        user3,
        newData3.title,
        newData3.timebox,
        newData3.note,
        newData3.deadlineDate,
      ]
    );

    await client.query("COMMIT");

    // Wait for all events to be received
    await new Promise((resolve) => {
      const checkEvents = setInterval(() => {
        if (receivedEventCount === expectedCount) {
          clearInterval(checkEvents);
          resolve();
        }
      }, 100);
    });
  });

  it("successfully sends updates after 'Category' table changes to multiple distinct clients", async function () {
    let receivedEventCount = 0;
    const expectedCount = 6;
    const userData = new Map();

    userData.set("user1", {
      tasks: expect.arrayContaining([
        expect.objectContaining({
          taskId: uiTaskId1,
          categoryId: customCategory1,
          title: "Updated Title 1",
          timebox: 30,
          completed: false,
          note: "Update 1",
          deadlineDate: "1111-01-01",
        }),
      ]),
      categories: expect.arrayContaining([
        { categoryId: defaultCategory1, categoryName: "Ideas" },
        { categoryId: customCategory1, categoryName: "Updated Cat 1" },
      ]),
    });
    userData.set("user2", {
      tasks: expect.arrayContaining([
        {
          taskId: uiTaskId2,
          categoryId: customCategory2,
          title: "Updated Title 2",
          timebox: 60,
          completed: false,
          note: "Update 2",
          deadlineDate: "2222-02-02",
        },
        {
          taskId: uiTaskId3,
          categoryId: customCategory3,
          title: "Task 3",
          timebox: 90,
          completed: true,
          note: "Note 3",
          deadlineDate: "3333-03-03",
        },
      ]),
      categories: expect.arrayContaining([
        { categoryId: defaultCategory2, categoryName: "Ideas" },
        { categoryId: customCategory2, categoryName: "Updated Cat 2" },
        { categoryId: customCategory3, categoryName: "New Cat 3" },
      ]),
    });
    userData.set("user3", {
      tasks: expect.arrayContaining([
        {
          taskId: expect.stringMatching(taskIdRegex),
          categoryId: defaultCategory3,
          title: "Task 4",
          timebox: 90,
          completed: false,
          note: "Note 4",
          deadlineDate: "4444-04-04",
        },
      ]),
      categories: expect.arrayContaining([
        { categoryId: defaultCategory3, categoryName: "Ideas" },
        { categoryId: expect.any(String), categoryName: "Updated Cat 3" },
      ]),
    });

    const user1Client1 = new EventSource(
      `${baseUrl}/${user1}?authToken=${token1}`
    );
    const user1Client2 = new EventSource(
      `${baseUrl}/${user1}?authToken=${token1}`
    );
    const user2Client1 = new EventSource(
      `${baseUrl}/${user2}?authToken=${token2}`
    );
    const user2Client2 = new EventSource(
      `${baseUrl}/${user2}?authToken=${token2}`
    );
    const user3Client1 = new EventSource(
      `${baseUrl}/${user3}?authToken=${tokenAdmin}`
    );
    const user3Client2 = new EventSource(
      `${baseUrl}/${user3}?authToken=${tokenAdmin}`
    );

    // Delay to allow connections to establish before further actions
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(user1Client1.readyState).toEqual(EventSource.OPEN);
    expect(user1Client2.readyState).toEqual(EventSource.OPEN);
    expect(user2Client1.readyState).toEqual(EventSource.OPEN);
    expect(user2Client2.readyState).toEqual(EventSource.OPEN);
    expect(user3Client1.readyState).toEqual(EventSource.OPEN);
    expect(user3Client2.readyState).toEqual(EventSource.OPEN);

    const handleEvent = (clientName) => (event) => {
      const data = JSON.parse(event.data);
      receivedEventCount += 1;
      if (receivedEventCount === expectedCount) {
        // Close EventSource connections after receiving expected events
        user1Client1.close();
        user1Client2.close();
        user2Client1.close();
        user2Client2.close();
        user3Client1.close();
        user3Client2.close();
      }

      expect(data).toEqual(expect.objectContaining(userData.get(clientName)));
    };

    // Listen for "data-update" events only
    user1Client1.addEventListener("data-update", handleEvent("user1"));
    user1Client2.addEventListener("data-update", handleEvent("user1"));
    user2Client1.addEventListener("data-update", handleEvent("user2"));
    user2Client2.addEventListener("data-update", handleEvent("user2"));
    user3Client1.addEventListener("data-update", handleEvent("user3"));
    user3Client2.addEventListener("data-update", handleEvent("user3"));

    user1Client1.onerror = handleError("user1Client1");
    user1Client2.onerror = handleError("user1Client2");
    user2Client1.onerror = handleError("user2Client1");
    user2Client2.onerror = handleError("user2Client2");
    user3Client1.onerror = handleError("user3Client1");
    user3Client2.onerror = handleError("user3Client2");

    await Category.update({
      categoryId: customCategory1,
      userId: user1,
      categoryName: "Updated Cat 1",
    });

    await Category.update({
      categoryId: customCategory2,
      userId: user2,
      categoryName: "Updated Cat 2",
    });

    await Category.create({
      userId: user3,
      categoryName: "Updated Cat 3",
    });

    await client.query("COMMIT");

    // Wait for all events to be received
    await new Promise((resolve) => {
      const checkEvents = setInterval(() => {
        if (receivedEventCount === expectedCount) {
          clearInterval(checkEvents);
          resolve();
        }
      }, 100);
    });
  });

  it("returns 404 to admin for non-existent userId", async function () {
    let fakeUser = getFakeUserId();

    const response = await fetch(
      `${baseUrl}/${fakeUser}?authToken=${tokenAdmin}`
    );

    expect(response.status).toBe(404);

    const user1Client1 = new EventSource(
      `${baseUrl}/${fakeUser}?authToken=${tokenAdmin}`
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(user1Client1.readyState).toEqual(EventSource.CLOSED);

    user1Client1.close();
  });

  it("returns 401 for unauthorized access", async function () {
    const response = await fetch(`${baseUrl}/${user1}?authToken=${token2}`);

    expect(response.status).toBe(401);

    const user1Client1 = new EventSource(
      `${baseUrl}/${user1}?authToken=${token2}`
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(user1Client1.readyState).toEqual(EventSource.CLOSED);

    user1Client1.close();
  });
});

//FIXME-LATER add more tests such as the ones below once I handle more advanced SSE scenarios such as disconnections, efficient updates, etc.
// it("helps disconnected client re-establish SSE connection", async function () {
//   const userId = "testUser";
//   const client = request(app).get(`/events/${userId}`);
//   await client.expect(200);
//   // Simulate client disconnection
//   client.abort();
//   // Re-establish connection
//   const newClient = request(app).get(`/events/${userId}`);
//   await newClient.expect(200);
// });

// it("handles server errors gracefully", async function () {
//   const userId = "errorUser";
//   jest.spyOn(console, "log").mockImplementation(() => {}); // Suppress console.log output
//   const response = await request(app).get(`/events/${userId}`);
//   expect(response.status).toBe(500);
// });
