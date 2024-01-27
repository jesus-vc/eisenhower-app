/** The database adapter file that abstracts the communication between application code and the database,
 * and provides a consistent interface for interacting with the database. */

import pg from "pg";

const pool = new pg.Pool({
  host: "localhost", // default Postgres host
  port: 5432, // default Postgres port
  database: "eisenhower_test",
});

export default pool;
