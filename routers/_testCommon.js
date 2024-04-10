import pool from "../db/db.js";
import User from "../models/userModel.js";
import Task from "../models/taskModel.js";

import config from "../jest.config.js";

export async function commonBeforeAll() {
  /** Must delete data in 'tasks' before users due to foreign key constraint  */
  await pool.query("DELETE FROM tasks");
  await pool.query("DELETE FROM tokens_registration");
  await pool.query("DELETE FROM users");

  const user1 = await User.registerAccount({
    firstName: "U1F",
    lastName: "U1L",
    phone: "1111111111",
    email: "u1@email.com",
    password: "password1",
  });

  const user2 = await User.registerAccount({
    firstName: "U2F",
    lastName: "U2L",
    phone: "2222222222",
    email: "u2@email.com",
    password: "password2",
    verified: "true",
  });

  const user3 = await User.registerAccount({
    firstName: "U3F",
    lastName: "U3L",
    phone: "3333333333",
    email: "u3@email.com",
    password: "password3",
    verified: "true",
  });

  // console.log("id");
  // console.log(user1);
  // console.log("b4");
  // console.log(config);

  // globals: {
  //   testDataRouters: {
  //     user1Id: "",
  //     user2Id: "",
  //     user3Id: "",
  //   },
  // },

  config.globals.testDataRouters.user1Id = user1.id;
  config.globals.testDataRouters.user2Id = user2.id;
  config.globals.testDataRouters.user3Id = user3.id;

  // console.log("after");
  // console.log(config);

  // console.log("config");
  // console.log(config);

  await User.verifyAccount(user1.id);
  await User.verifyAccount(user2.id);
  await User.verifyAccount(user3.id);

  //TODO replace query below with a User.update() method and route solely for admins, once created.
  await pool.query(
    `UPDATE users SET is_admin = true WHERE id IN ($1, $2, $3)`,
    [user1.id, user2.id, user3.id]
  );

  await Task.create({
    userId: user1.id,
    title: "Task 1",
    urgent: true,
    important: true,
    timebox: "30",
    note: "Note 1",
    category: " Finances",
    deadlineDate: "1111-1-1",
  });
  await Task.create({
    userId: user2.id,
    title: "Task 2",
    urgent: true,
    important: false,
    timebox: "60",
    note: "Note 2",
    category: " Health",
    deadlineDate: "2222-2-2",
  });
  const task3 = await Task.create({
    userId: user2.id,
    title: "Task 3",
    urgent: false,
    important: false,
    timebox: "90",
    note: "Note 3",
    category: "Family",
    deadlineDate: "3333-3-3",
  });

  await Task.update({ taskId: task3.taskId, completed: true });
}

export async function commonBeforeEach() {
  await pool.query("BEGIN");
}

export async function commonAfterEach() {
  await pool.query("ROLLBACK");
}

export async function commonAfterAll() {
  await pool.query("DELETE FROM tasks");
  await pool.query("DELETE FROM tokens_registration");
  await pool.query("DELETE FROM users");
  await pool.end();
}

export const u1Token = User.createAuthToken({
  email: "u1@email.com",
  isAdmin: false,
});
export const u2Token = User.createAuthToken({
  email: "u2@email.com",
  isAdmin: false,
});
export const adminToken = User.createAuthToken({
  email: "admin1@email.com",
  isAdmin: true,
});
