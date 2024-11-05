import { pool } from "../db/db.js";
import { BCRYPT_WORK_FACTOR } from "../config.js";
import bcrypt from "bcrypt";

async function commonBeforeAll() {
  /** Must delete data in 'tasks' before users due to foreign key constraint  */
  await pool.query("DELETE FROM tasks");
  await pool.query("DELETE FROM tokens_registration");
  await pool.query("DELETE FROM categories");
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

  const newCategories = await pool.query(
    `INSERT INTO categories(
                          fk_user_id, 
                          name)
    VALUES ($1, 'Finances'),
            ($2, 'Health'),
            ($3, 'Family')
    RETURNING id`,
    [newUsers.rows[0].id, newUsers.rows[1].id, newUsers.rows[2].id]
  );

  await pool.query(
    `INSERT INTO tasks(fk_user_id, fk_category_id, title, timebox, completed, note, deadline_date)
        VALUES ($1, $2, 'Task 1', '30', false, 'Note 1', '1111-1-1'),
               ($3, $4, 'Task 2', '60', false, 'Note 2','2222-2-2'),
               ($5, $6, 'Task 3', '90', true, 'Note 3', '3333-3-3')`,
    [
      newUsers.rows[0].id,
      newCategories.rows[0].id,
      newUsers.rows[1].id,
      newCategories.rows[1].id,
      newUsers.rows[1].id,
      newCategories.rows[2].id,
    ]
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
  await pool.query("DELETE FROM categories");
  await pool.query("DELETE FROM users");
  await pool.end();
}

export { commonBeforeAll, commonBeforeEach, commonAfterEach, commonAfterAll };
