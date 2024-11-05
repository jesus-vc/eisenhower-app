import { pool } from "../db/db.js";
import Auth from "../models/authModel.js";
import Task from "../models/taskModel.js";
import Category from "../models/categoryModel.js";

export async function commonBeforeAll() {
  // const client = await pool.connect();
  try {
    /** Must delete data in 'tasks' before users due to foreign key constraint  */
    await pool.query("DELETE FROM tasks");
    await pool.query("DELETE FROM tokens_registration");
    await pool.query("DELETE FROM users");

    const user1 = await Auth.registerAccount({
      firstName: "U1F",
      lastName: "U1L",
      phone: "1111111111",
      email: "u1@email.com",
      password: "password1",
    });

    const user2 = await Auth.registerAccount({
      firstName: "U2F",
      lastName: "U2L",
      phone: "2222222222",
      email: "u2@email.com",
      password: "password2",
      verified: "true",
    });

    const user3 = await Auth.registerAccount({
      firstName: "U3F",
      lastName: "U3L",
      phone: "3333333333",
      email: "u3@email.com",
      password: "password3",
      verified: "true",
    });

    await Auth.verifyAccount(user1.id);
    await Auth.verifyAccount(user2.id);
    await Auth.verifyAccount(user3.id);

    //NICE-TO-HAVE Replace query below with a Auth.update() method and route solely for admins, once created.
    // await pool.query(
    //   `UPDATE users SET is_admin = true WHERE id IN ($1, $2, $3)`,
    //   [user1.id, user2.id, user3.id]
    // );
    await pool.query(
      `UPDATE users SET is_admin = true WHERE id IN ($1, $2, $3)`,
      [user1.id, user2.id, user3.id]
    );

    const newCat1 = await Category.create({
      userId: user1.id,
      categoryName: "New Cat 1",
    });

    const newCat2 = await Category.create({
      userId: user2.id,
      categoryName: "New Cat 2",
    });

    const newCat3 = await Category.create({
      userId: user2.id,
      categoryName: "New Cat 3",
    });

    await Task.create({
      userId: user1.id,
      title: "Task 1",
      timebox: "30",
      note: "Note 1",
      categoryId: newCat1.categoryId,
      deadlineDate: "1111-1-1",
    });

    await Task.create({
      userId: user2.id,
      title: "Task 2",
      timebox: "60",
      note: "Note 2",
      categoryId: newCat2.categoryId,
      deadlineDate: "2222-2-2",
    });

    const task3 = await Task.create({
      userId: user2.id,
      title: "Task 3",
      timebox: "90",
      note: "Note 3",
      categoryId: newCat3.categoryId,
      deadlineDate: "3333-3-3",
    });

    await Task.update({
      taskId: task3.taskId,
      userId: user2.id,
      completed: true,
    });
  } catch (error) {
    console.error("Error setting up test data:", error);
  }
}

export async function commonBeforeEach() {
  const client = await pool.connect();
  await client.query("BEGIN");
  jest.spyOn(pool, "query").mockImplementation((text, params) => {
    return client.query(text, params);
  });
  return client;
}

//Auth Routes needs to clean up data made by
export async function commonAfterEach(client) {
  await client.query("ROLLBACK");
  client.release();
}

export async function commonAfterAll() {
  try {
    await pool.query("DELETE FROM tasks");
    await pool.query("DELETE FROM tokens_registration");
    await pool.query("DELETE FROM users");
  } catch (error) {
    console.error("Error cleaning up test data:", err);
  }
}

export const u1Token = Auth.createAuthToken({
  email: "u1@email.com",
  isAdmin: false,
});
export const u2Token = Auth.createAuthToken({
  email: "u2@email.com",
  isAdmin: false,
});
export const adminToken = Auth.createAuthToken({
  email: "admin1@email.com",
  isAdmin: true,
});
