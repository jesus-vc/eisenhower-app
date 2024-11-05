import { pool } from "../db/db.js";
import { NotFoundError, BadRequestError } from "../expressError.js";
import {
  getUrgentAndImportant,
  removeTimezone,
  buildQueryCreateTask,
  buildQueryGetByFilters,
  buildQueryUpdateTask,
} from "./helpers.js";

export default class Task {
  /** Get all tasks given userId
   *
   * Returns [{ taskId, title, timebox, completed, note, category, deadlineDate }, ...]
   *
   * Does not throw error if no userId found, given the authentication middleware veries the existence of the userId **/

  static async getAll(userId) {
    const allTasks = await pool.query(
      `SELECT 
        tasks.ui_task_id AS "taskId", 
        categories.ui_category_id AS "categoryId", 
        tasks.title, 
        tasks.timebox, 
        tasks.completed, 
        tasks.note, 
        tasks.deadline_date AS "deadlineDate"
      FROM
        tasks 
      JOIN
        categories ON tasks.fk_category_id = categories.id 
      WHERE
        tasks.fk_user_id = $1
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
   * Allowed filters { title, completed, deadlineDate}
   *
   * Returns [{ taskId, title, timebox, completed, note, category, deadlineDate }, ...]
   *
   * Does not throw error if no userId found, given the authentication middleware veries the existence of the userId **/

  static async getByFilters({ userId, ...taskFilters }) {
    const jsToSql = {
      userId: "tasks.fk_user_id",
      deadlineDate: "tasks.deadline_date",
      categoryId: "tasks.fk_category_id",
    };

    const selectClause = `
      SELECT
        tasks.ui_task_id AS "taskId", 
        tasks.title,
        tasks.timebox, 
        tasks.completed, 
        tasks.note, 
        categories.ui_category_id AS "categoryId", 
        tasks.deadline_date AS "deadlineDate" 
      FROM
        tasks
      JOIN
        categories ON tasks.fk_category_id = categories.id 
      `;

    const { whereClause, whereValues } = buildQueryGetByFilters({
      taskFilters,
      userId,
      jsToSql,
    });

    const newTask = await pool.query(
      `${selectClause} ${whereClause}`,
      whereValues
    );
    const newTaskUpdated = removeTimezone(newTask.rows);
    return newTaskUpdated;
  }

  /** Create a new task (from 'taskData') for a user
   *
   * Required fields for 'taskData': { userId, title }
   *
   * Optional fields for 'taskData': { timebox, note, categoryId, deadlineDate}
   *
   * categoryId defaults to 'Ideas' category.
   *
   * Returns {taskId, userId, title, timebox, completed, note, categoryId, deadlineDate }
   *
   * Does not throw error if no userId found, given the authentication middleware veries the existence of the userId **/

  static async create(taskData) {
    const jsToSql = {
      userId: "fk_user_id",
      deadlineDate: "deadline_date",
      categoryId: "ui_category_id",
    };

    const { insertQuery, insertValues, returnStmt } = buildQueryCreateTask(
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
   * This is a "partial update" where only provided 'data' fields will be changed.   *
   * 'Data' can include: { title, timebox, completed, note, category, deadline_date }.
   * 'Data' can NOT include: {fk_user_id}
   *
   * Returns { taskId, fieldChanged1, fieldChanged2 ... }
   *
   * Throws NotFoundError if taskId not found.
   * Throws BadRequestError for any other database-level errors. **/

  static async update({ taskId, userId, ...newData }) {
    const jsToSql = {
      taskId: "ui_task_id",
      deadlineDate: "deadline_date",
      categoryId: "ui_category_id",
    };
    const updateClause = "UPDATE tasks";
    const whereClause = `WHERE ui_task_id='${taskId}' AND fk_user_id='${userId}'`;
    const sqlToJs = {
      [jsToSql.deadlineDate]: `${jsToSql.deadlineDate} AS "deadlineDate"`,
    };

    const { setClause, setValues, returnStmt } = buildQueryUpdateTask({
      newData,
      userId,
      jsToSql,
      sqlToJs,
    });

    try {
      const updatedTask = await pool.query(
        `${updateClause} ${setClause} ${whereClause} ${returnStmt}`,
        setValues
      );

      if (!updatedTask.rows[0]) {
        throw new NotFoundError(`Invalid taskId.`);
      }

      const updatedTaskModified = removeTimezone(updatedTask.rows);
      return updatedTaskModified[0];
    } catch (error) {
      throw new BadRequestError(error.message);
    }
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

    const { setClause, setValues, returnStmt } = buildQueryUpdateTask(
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
    const result = await pool.query(
      `DELETE
           FROM tasks
           WHERE ui_task_id = $1
           RETURNING ui_task_id`,
      [taskId]
    );

    const deletedTask = result.rows[0];

    if (!deletedTask) throw new NotFoundError(`Invalid taskId.`);
  }
}
