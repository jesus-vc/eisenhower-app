import pool from "../db/db.js";

export default class Task {
  /** Get a task by taskId
   *
   * Returns {title, urgent, important, priority, timebox, completed }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(taskId) {}

  /** Get all tasks by userId
   *
   * Returns [{ taskId, title, urgent, important, priority, timebox, completed, note, category, deadline }, ...]
   **/

  static async getAll(userId) {
    const tasks = await pool.query(
      `SELECT id AS "taskId", title, urgent, important, priority, timebox, completed, note, category, deadline_date
      FROM tasks
      WHERE user_id=$1
      `,
      [userId]
    );

    //PEER - Lawrence, below, do you prefer I use array.map method instead of for loop? The loop doesn't create a new array, which reduces memory consumption, I believe
    //But I also understand that creating a new array can help reduce unexpected side-effects, especially when dealing with asynchronous programming.

    /**  Remove time from date property. The node-postgres client by default converts a database DATE type to a JavaScript Date object */
    for (let object of tasks.rows) {
      if (object.deadline_date) {
        object.deadline_date = object.deadline_date.toISOString().split("T")[0];
      }
    }

    return tasks.rows;
  }

  /** Create a new task (from data) for a user
   *
   * 'Data' must include: { userId, title, urgent, important }
   *
   * Optional fields: { timebox, note, category, deadline_date}
   *
   * Assigns value to 'priority' based on 'urgent' and 'important' values.
   *
   * Returns {taskId, userId, title, urgent, important, priority, timebox, completed, note, category, deadline }
   *
   **/

  static async create({
    userId,
    title,
    important,
    urgent,
    timebox,
    completed,
  }) {}

  /** Update a task with 'data'.
   *
   * This is a "partial update" where only provided 'data' fields will be changed.
   *
   * 'Data' can include: { title, urgent, important, priority, timebox, completed }.
   *
   * A task's 'user_id' cannot be updated.
   *
   * Returns { taskId, userId, title, urgent, important, priority, timebox, completed }
   *
   * Throws NotFoundError if not found.
   **/

  static async update(taskId, data) {}

  /** Deletes given task from database
   *
   * Returns undefined
   *
   * Throws NotFoundError if job not found.
   **/

  static async delete(taskId) {}
}
