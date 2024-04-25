import pool from "../db/db.js";
import { NotFoundError } from "../expressError.js";
import {
  prioritizeTask,
  getUrgentAndImportant,
  removeTimezone,
  buildQueryCreateTask,
  buildQueryGetByFilters,
  buildQueryUpdate,
  handlePriorityUpdate,
} from "./helpers.js";

export default class Task {
  /** Get all tasks given userId
   *
   * Returns [{ taskId, title, urgent, important, priority, timebox, completed, note, category, deadlineDate }, ...]
   *
   * Does not throw error if no userId found, given the authentication middleware veries the existence of the userId **/

  static async getAll(userId) {
    const allTasks = await pool.query(
      `SELECT id AS "taskId", title, urgent, important, priority, timebox, completed, note, category, deadline_date AS "deadlineDate"
      FROM tasks
      WHERE user_id=$1
      `,
      [userId]
    );
    const allTasksUpdated = removeTimezone(allTasks.rows);
    return allTasksUpdated;
  }

  /** Get all tasks given filters and userId
   *
   * Required filters {userId}
   *
   * Allowed filters { title, completed, priority, deadlineDate}
   *
   * Returns [{ taskId, title, urgent, important, priority, timebox, completed, note, category, deadlineDate }, ...]
   *
   * Does not throw error if no userId found, given the authentication middleware veries the existence of the userId **/

  static async getByFilters({ userId, ...taskFilters }) {
    const jsToSql = { userId: "user_id", deadlineDate: "deadline_date" };

    const selectClause =
      'SELECT id AS "taskId", title, urgent, important, priority, timebox, completed, note, category, deadline_date AS "deadlineDate" FROM tasks';

    const { whereClause, whereValues } = buildQueryGetByFilters(
      taskFilters,
      userId,
      jsToSql
    );
    const newTask = await pool.query(
      `${selectClause} ${whereClause}`,
      whereValues
    );
    const newTaskUpdated = removeTimezone(newTask.rows);
    return newTaskUpdated;
  }

  /** Create a new task (from 'taskData') for a user
   *
   * Required fields for 'taskData': { userId, title, urgent, important }
   *
   * Optional fields for 'taskData': { timebox, note, category, deadlineDate}
   *
   * Assigns value to 'priority' based on 'urgent' and 'important' values.
   *
   * Returns {taskId, userId, title, urgent, important, priority, timebox, completed, note, category, deadlineDate }
   *
   * Does not throw error if no userId found, given the authentication middleware veries the existence of the userId **/

  static async create(taskData) {
    taskData.priority = prioritizeTask(taskData.urgent, taskData.important);

    const jsToSql = { userId: "user_id", deadlineDate: "deadline_date" };
    const returnStmt = `RETURNING id AS "taskId", user_id AS "userId", title, urgent, important, priority, timebox, completed, note, category, deadline_date AS "deadlineDate"`;

    const { insertQuery, insertValues } = buildQueryCreateTask(
      taskData,
      jsToSql
    );
    const newTask = await pool.query(
      `${insertQuery} ${returnStmt}`,
      insertValues
    );
    const newTaskUpdated = removeTimezone(newTask.rows);
    return newTaskUpdated[0];
  }

  /** Update a task with 'data'.
   *
   * This is a "partial update" where only provided 'data' fields will be changed.
   * Updating 'urgent' or 'important' will modify 'priority'.
   *
   * 'Data' can include: { title, urgent, important, timebox, completed, note, category, deadline_date }.
   * 'Data' can NOT include: {priority, user_id}
   *
   * Returns { taskId, userId, fieldChanged1, fieldChanged2 ... }
   *
   * Throws NotFoundError if taskId not found. **/

  static async update({ taskId, ...newData }) {
    const jsToSql = { taskId: "id", deadlineDate: "deadline_date" };
    const updateClause = "UPDATE tasks";
    const whereClause = `WHERE id=${taskId}`;
    const sqlToJs = { deadline_date: 'deadline_date AS "deadlineDate"' };

    const newPriority = await handlePriorityUpdate(taskId, newData);
    if (newPriority) newData.priority = newPriority;

    const { setClause, setValues, returnStmt } = buildQueryUpdate(
      newData,
      jsToSql,
      sqlToJs
    );
    const updatedTask = await pool.query(
      `${updateClause} ${setClause} ${whereClause} ${returnStmt}`,
      setValues
    );

    if (!updatedTask.rows[0]) {
      throw new NotFoundError(`Invalid taskId.`);
    }

    const updatedTaskModified = removeTimezone(updatedTask.rows);
    return updatedTaskModified[0];
  }

  /** Update a task's 'urgent' and 'important' values based on 'priority' provided
   *
   * Required fields: {priority}
   *
   * Returns { taskId, userId, urgent, important, priority }
   */

  static async updatePriority({ taskId, priority }) {
    const { urgent, important } = getUrgentAndImportant(priority);
    const newData = { urgent, important, priority };
    const jsToSql = { taskId: "id" };
    const sqlToJs = {};
    const updateClause = "UPDATE tasks";
    const whereClause = `WHERE id=${taskId}`;

    const { setClause, setValues, returnStmt } = buildQueryUpdate(
      newData,
      jsToSql,
      sqlToJs
    );

    const updatedTask = await pool.query(
      `${updateClause} ${setClause} ${whereClause} ${returnStmt}`,
      setValues
    );

    if (!updatedTask.rows[0]) {
      throw new NotFoundError(`Invalid taskId.`);
    }
    const updatedTaskModified = removeTimezone(updatedTask.rows);
    return updatedTaskModified[0];
  }

  /** Deletes given task from database
   *
   * Returns undefined
   *
   * Throws NotFoundError if taskId not found. **/

  static async delete(taskId) {
    let result = await pool.query(
      `DELETE
           FROM tasks
           WHERE id = $1
           RETURNING id`,
      [taskId]
    );

    const deletedTask = result.rows[0];

    if (!deletedTask) throw new NotFoundError(`Invalid taskId.`);
  }
}
