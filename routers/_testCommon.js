import pool from "../db/db.js";
import User from "../models/userModel.js";

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

  await User.verifyAccount(user1.id);
  await User.verifyAccount(user2.id);
  await User.verifyAccount(user3.id);

  //TODO replace query below with a User.update() method and route solely for admins, once created.
  await pool.query(
    `UPDATE users SET is_admin = true WHERE id IN ($1, $2, $3)`,
    [user1.id, user2.id, user3.id]
  );

  //TODO replace query below with Task.add() method, once created.
  await pool.query(
    `INSERT INTO tasks(user_id, description, importance, urgency, timebox, completed)
        VALUES ($1, 'Task 1', 'high', 'high', '30', false),
               ($2, 'Task 2', 'medium', 'medium', '60', false),
               ($3, 'Task 3', 'low', 'low', '90', true)`,
    [user1.id, user2.id, user2.id]
  );
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
