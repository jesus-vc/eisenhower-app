import pool from "../db/db.js";
import { BCRYPT_WORK_FACTOR } from "../config.js";
import bcrypt from "bcrypt";

async function commonBeforeAll() {
  /** Must delete data in 'tasks' before users due to foreign key constraint  */

  await pool.query("DELETE FROM tasks");
  await pool.query("DELETE FROM tokens_registration");
  await pool.query("DELETE FROM users");

  const newUsers = await pool.query(
    `INSERT INTO users(
                          first_name,
                          last_name,
                          phone,
                          email,
                          hashed_password,
                          verified)
    VALUES ('U1F', 'U1L','1111111111', 'u1@email.com', $1, 'true'),
            ('U2F', 'U2L','2222222222', 'u2@email.com', $2, 'true'),
            ('U3F', 'U3L','3333333333', 'u3@email.com', $3, 'true')
    RETURNING id`,
    [
      await bcrypt.hash("password1", BCRYPT_WORK_FACTOR),
      await bcrypt.hash("password2", BCRYPT_WORK_FACTOR),
      await bcrypt.hash("password3", BCRYPT_WORK_FACTOR),
    ]
  );

  await pool.query(
    `INSERT INTO tasks(user_id, description, importance, urgency, timebox, completed)
        VALUES ($1, 'Task 1', 'high', 'high', '30', false),
               ($2, 'Task 2', 'medium', 'medium', '60', false),
               ($3, 'Task 3', 'low', 'low', '90', true)`,
    [newUsers.rows[0].id, newUsers.rows[1].id, newUsers.rows[1].id]
  );
}

async function commonBeforeEach() {
  await pool.query("BEGIN");
}

async function commonAfterEach() {
  await pool.query("ROLLBACK");
}

async function commonAfterAll() {
  await pool.query("DELETE FROM tasks");
  await pool.query("DELETE FROM tokens_registration");
  await pool.query("DELETE FROM users");
  await pool.end();
}

export { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll };
