import pool from "../db/db.js";

export default class Task {
  /** Get a task by taskId
   *
   * Returns {description, importance, urgency, timebox, completed }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(taskId) {}

  /** Get all tasks by userId
   *
   * Returns [{ taskId, description, importance, urgency, timebox, completed }, ...]
   **/

  static async getAll(userId) {
    const tasks = await pool.query(
      `SELECT id AS "taskId", description, importance, urgency, timebox, completed
      FROM tasks
      WHERE user_id=$1
      `,
      [userId]
    );

    return tasks.rows;
  }

  /** Create a new task (from data) for a user
   *
   * 'Data' must include: { userId, description, importance, urgency, timebox }
   *
   * Returns {taskId, userId, description, importance, urgency, timebox }
   *
   **/

  static async create({
    userId,
    description,
    importance,
    urgency,
    timebox,
    completed,
  }) {}

  /** Update a task with 'data'.
   *
   * This is a "partial update" where only provided 'data' fields will be changed.
   *
   * 'Data' can include: { description, importance, urgency, timebox, completed }.
   *
   * A task's 'user_id' cannot be updated.
   *
   * Returns { taskId, userId, description, importance, urgency, timebox, completed }
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
