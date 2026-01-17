import { pool } from "../db/db.js";

export const prioritizeTask = (urgent, important) => {
  if (urgent) {
    return important ? "now" : "delegate";
  } else {
    return important ? "schedule" : "avoid";
  }
};

export const getUrgentAndImportant = (priority) => {
  const priorityMap = {
    now: { urgent: true, important: true },
    schedule: { urgent: false, important: true },
    delegate: { urgent: true, important: false },
    avoid: { urgent: false, important: false },
  };
  return priorityMap[priority];
};

//NICE-TO-HAVE Consider using Date formatting API over creating this custom removeTimezone fn: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
/** Removes timezone from 'deadlineDate' property.
 *
 * Example:
 * 1111-01-01T07:52:58.000Z -> 1111-01-01
 *
 * This is necessary as the node-postgres client by default converts
 * a DATE type from the database to a JavaScript Date object, which includes a timezone.
 *
 * @param {Array} taskRows - Array of task rows returned from the database.
 * @returns {Array} - The same array of tasks but with the timezone removed from 'deadlineDate'.
 */

export const removeTimezone = (taskRows) => {
  const updatedTaskRows = taskRows.map((object) => {
    if (object.deadlineDate) {
      return {
        ...object,
        deadlineDate: object.deadlineDate.toISOString().split("T")[0],
      };
    }
    return object;
  });
  return updatedTaskRows;
};

// PEER Lawrence, any suggestions for optimizing these subqueries? I have some complexity here due to nested selects.

/** Builds and returns a SQL 'INSERT INTO' clause and values for parameterized task creation queries.
 *
 * @param {Object} createData - The data for the task to be inserted.
 * @param {Object} jsToSql - Object that maps JavaScript property names to SQL column names.
 * @returns {Object} - An object containing the SQL insert statement and values for the query.
 *
 * Example format of 'jsToSql': { userId: "user_id", deadlineDate: "deadline_date" }
 */

export const buildQueryCreateTask = (createData, jsToSql) => {
  const columnNames = [];
  const valueParams = [];
  const valuesArr = [];
  let returnedCategoryParam;

  // Separate categoryId from the rest of the data since it needs special handling.
  const { categoryId = null, ...otherData } = createData;

  Object.entries({ ...otherData, categoryId }).forEach(
    ([key, value], index) => {
      const columnName = jsToSql[key] || key;

      if (key === "categoryId") {
        const baseSelect = `(SELECT id FROM categories WHERE ${jsToSql.userId} = '${createData.userId}'`;
        const baseReturn = `(SELECT ui_category_id FROM categories WHERE ${jsToSql.userId} = '${createData.userId}'`;
        columnNames.push("fk_category_id");

        if (value === null) {
          valueParams.push(`${baseSelect} AND is_default = true)`);
          returnedCategoryParam = `${baseReturn} AND is_default = true)`;
        } else {
          valueParams.push(`${baseSelect} AND ${columnName}=$${index + 1})`);
          returnedCategoryParam = `${baseReturn} AND ${columnName}=$${
            index + 1
          })`;
          valuesArr.push(value);
        }
      } else {
        columnNames.push(columnName);
        valueParams.push(`$${index + 1}`);
        valuesArr.push(value);
      }
    }
  );

  const insertClause = `INSERT INTO tasks (${columnNames.join(", ")})`;
  const valuesClause = `VALUES(${valueParams.join(", ")})`;
  const returnStmt = `RETURNING ui_task_id AS "taskId", fk_user_id AS "userId", title, timebox, completed, note, ${returnedCategoryParam} AS "categoryId", deadline_date AS "deadlineDate"`;

  return {
    insertQuery: `${insertClause} ${valuesClause}`,
    insertValues: valuesArr,
    returnStmt,
  };
};

/** Builds and returns a SQL 'WHERE' clause and values based on provided task filters and userId.
 *
 * @param {Object} taskFilters - Object containing filters for tasks.
 * @param {Number} userId - The userId of the current user.
 * @param {Object} jsToSql - Object for mapping JavaScript property names to SQL column names.
 * @returns {Object} - An object containing the WHERE clause and corresponding values.
 *
 * Example format of 'jsToSql': { userId: "user_id", deadlineDate: "deadline_date" }
 */

export const buildQueryGetByFilters = ({ taskFilters, userId, jsToSql }) => {
  const whereValues = [];
  const whereConditions = [];

  Object.entries({ ...taskFilters, userId }).forEach(([key, value]) => {
    const columnName = jsToSql[key] || key;

    // Special handling for 'deadlineDate' being null value
    if (key === "deadlineDate") {
      whereConditions.push(
        `${columnName} IS NOT DISTINCT FROM $${whereValues.length + 1}`
      );
    } else {
      whereConditions.push(`${columnName}=$${whereValues.length + 1}`);
    }
    whereValues.push(value);
  });

  const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

  return {
    whereClause,
    whereValues,
  };
};

//NICE-TO-HAVE Revisit how to using string interpolation directly in SQL queries to reduce SQL injection vulnerabilities
//NICE-TO-HAVE revisit moving handling of categoId into a helper function to separate concerns and improve reusability and readability.
/** Builds and returns a SQL 'SET' clause and values for parameterized task update queries.
 *
 * @param {Object} newData - The new data to update the task with.
 * @param {Number} userId - The userId of the current user.
 * @param {Object} jsToSql - Object for mapping JavaScript property names to SQL column names.
 * @param {Object} sqlToJs - Object for mapping SQL column names back to JavaScript properties.
 * @returns {Object} - An object containing the SET clause, corresponding values, and the return statement.
 */

export const buildQueryUpdateTask = ({ newData, userId, jsToSql, sqlToJs }) => {
  const setConditions = [];
  const setValues = [];
  const returnFields = [];

  Object.entries(newData).forEach(([key, value], index) => {
    if (key === "categoryId") {
      setConditions.push(
        `fk_category_id = (SELECT id FROM categories WHERE ui_category_id='${value}' AND fk_user_id =$${
          index + 1
        })`
      );
      returnFields.push(
        '(SELECT ui_category_id FROM categories WHERE categories.id = tasks.fk_category_id) AS "categoryId"'
      );
      setValues.push(userId);
    } else {
      const columnName = jsToSql[key] || key;
      setConditions.push(`${columnName}=$${index + 1}`);
      returnFields.push(sqlToJs[columnName] || columnName);
      setValues.push(value);
    }
  });

  const returnStmt = `RETURNING ui_task_id AS "taskId", fk_user_id AS "userId", ${returnFields.join(
    ", "
  )}`;

  const setClause = `SET ${setConditions.join(", ")}`;

  return {
    setClause,
    setValues,
    returnStmt,
  };
};

// Similar to buildQueryUpdateTask but for updating categories specifically.
export const buildQueryUpdateCategory = ({ newData, jsToSql, sqlToJs }) => {
  const setConditions = [];
  const setValues = [];
  const returnFields = [];

  Object.entries({ ...newData }).forEach(([key, value], index) => {
    const columnName = jsToSql[key] || key;
    setConditions.push(`${columnName}=$${index + 1}`);
    returnFields.push(sqlToJs[columnName] || columnName);
    setValues.push(value);
  });

  const returnStmt = `RETURNING ${sqlToJs.ui_category_id}, 
  ${sqlToJs.fk_user_id}, ${returnFields.join(", ")}`;

  const setClause = `SET ${setConditions.join(", ")}`;

  return {
    setClause,
    setValues,
    returnStmt,
  };
};

/** Calculates a task's new 'priority' status if 'urgent' and/or 'important' are included in a request to Task.update().
 *
 * @param {Number} taskId - Number of the task Id.
 * @param {Object} newData - Data object containing the new data.
 *
 * @returns {String} - String of new 'priority' status (e.g. avoid, schedule) */

export const handlePriorityUpdate = async (taskId, newData) => {
  if ("urgent" in newData && "important" in newData) {
    return prioritizeTask(newData.urgent, newData.important);
  } else if ("urgent" in newData || "important" in newData) {
    const storedValues = await pool.query(
      `SELECT urgent, important FROM tasks WHERE id=$1`,
      [taskId]
    );
    const urgent =
      "urgent" in newData ? newData.urgent : storedValues.rows[0].urgent;
    const important =
      "important" in newData
        ? newData.important
        : storedValues.rows[0].important;
    return prioritizeTask(urgent, important);
  }
};
