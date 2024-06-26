import pool from "../db/db.js";

/** Returns the 'priority' value for a task, based on the 'urgent' and 'important' values.*/

export const prioritizeTask = (urgent, important) => {
  if (urgent) {
    return important ? "now" : "delegate";
  } else {
    return important ? "schedule" : "avoid";
  }
};

/** Returns the 'importance' and 'urgent' values for a task, based on the 'priority' value.*/

export const getUrgentAndImportant = (priority) => {
  const priorityMap = {
    now: { urgent: true, important: true },
    schedule: { urgent: false, important: true },
    delegate: { urgent: true, important: false },
    avoid: { urgent: false, important: false },
  };
  return priorityMap[priority];
};

//TODO Revisit in future: Consider using Date formatting API over creating this custom removeTimezone fn: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat
/** Removes timezone from 'deadlineDate' property.
 *
 * 1111-01-01T07:52:58.000Z -> 1111-01-01
 *
 * This is necessary as the node-postgres client converts
 * by default a DATE data type returned by the database to a JavaScript Date object which appends a timezone. */

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

/** Dynamically builds and returns a SQL 'INSERT INTO' clause and values to perform parameterized queries.
 *
 * @param {Object} createData - The createData object containing SQL input.
 * @param {Object} jsToSql - The jsToSql object for mapping JavaScript query parameters to SQL column names.
 * @returns {Object} - Returns an object with properties for constructing a SQL query.
 *                   - insertQuery (string): The INSERT INTO clause.
 *                   - values (array): Values to be inserted.
 *
 * jsToSql should be formatted as {jsQueryParameter: sqlColumnName}
 *
 * Example -> { userId: "user_id", deadlineDate: "deadline_date" } */

export const buildQueryCreateTask = (createData, jsToSql) => {
  const columnNames = [];
  const valueParams = [];
  const valuesArr = [];

  Object.entries(createData).forEach(([key, value], index) => {
    const columnName = jsToSql[key] || key;
    columnNames.push(columnName);
    valueParams.push(`$${index + 1}`);
    valuesArr.push(value);
  });

  const insertClause = `INSERT INTO tasks(${columnNames.join(", ")})`;
  const valuesClause = `VALUES(${valueParams.join(", ")})`;
  const insertQuery = `${insertClause} ${valuesClause}`;

  return {
    insertQuery,
    insertValues: valuesArr,
  };
};

/** Dynamically builds and returns a SQL 'WHERE' clause and values to perform parameterized queries.
 *
 * @param {Object} taskFilters - Object containing query filters.
 * @param {Number} userId - Number of user id.
 * @param {Object} jsToSql - Object for mapping JavaScript query parameters to SQL column names.
 * @returns {Object} - Returns an object with properties for constructing a SQL query.
 *                   - whereClause (string): The WHERE clause.
 *                   - whereValues (array): Values to be inserted.
 *
 * jsToSql should be formatted as {jsQueryParameter: sqlColumnName}
 *
 * Example -> { userId: "user_id", deadlineDate: "deadline_date" } */

export const buildQueryGetByFilters = (taskFilters, userId, jsToSql) => {
  const whereValues = [];
  const whereConditions = [];

  // Handle deadline_date property having 'null' value

  // Version 1
  let { deadlineDate, ...otherFilters } = taskFilters;
  let finalFilters;

  if (deadlineDate === null) {
    whereConditions.push("deadline_date IS NULL");
    finalFilters = { ...otherFilters };
  } else {
    finalFilters = { ...taskFilters };
  }

  Object.entries({ ...finalFilters, userId }).forEach(([key, value], index) => {
    const columnName = jsToSql[key] || key;
    whereConditions.push(`${columnName}=$${index + 1}`);
    whereValues.push(value);
  });

  const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

  return {
    whereClause,
    whereValues,
  };
};

/** Dynamically builds and returns a SQL 'SET' clause and values to perform parameterized queries.
 *
 * @param {Object} newData - Object containing query filters.
 * @param {Object} jsToSql - Object for mapping JavaScript query parameters to SQL column names.
 * @param {Object} sqlToJs - Object for mapping SQL column names to JavaScript query parameters.

 * @returns {Object} - Returns an object with properties for constructing a SQL query.
 *                   - setClause (string): The SET clause.
 *                   - setValues (array): Values to be inserted.
 *                   - returnStmt (string): Return fields.
 *
 * Format jsToSql as {jsQueryParameter: sqlColumnName}
 * Format sqlToJs as {sqlColumnName: jsQueryParameter}
 * 
 * @example
 * { userId: "user_id", deadlineDate: "deadline_date" } */

export const buildQueryUpdate = (newData, jsToSql, sqlToJs) => {
  const setConditions = [];
  const setValues = [];
  const returnFields = [];

  Object.entries({ ...newData }).forEach(([key, value], index) => {
    const columnName = jsToSql[key] || key;
    setConditions.push(`${columnName}=$${index + 1}`);
    returnFields.push(sqlToJs[columnName] || columnName);
    setValues.push(value);
  });

  const returnStmt = `RETURNING id AS "taskId", user_id AS "userId", ${returnFields.join(
    ", "
  )}`;
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
