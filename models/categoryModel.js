import { pool } from "../db/db.js";
import { NotFoundError } from "../expressError.js";
import { buildQueryUpdateCategory } from "./helpers.js";

export default class Category {
  /** Get all categories given userId
   *
   * Returns [{ categoryId, name }, ...]
   *
   * Does not throw an error if no categories are found, as the existence of the `userId`
   * is verified by the authentication middleware. */

  static async getAll(userId) {
    const allCategories = await pool.query(
      `SELECT 
        categories.ui_category_id AS "categoryId", 
        categories.name AS "categoryName" 
        FROM 
          categories 
        WHERE 
          categories.fk_user_id = $1
      `,
      [userId]
    );

    return allCategories.rows;
  }

  /** Update a category's name.
   *
   * Required fields: { categoryId, userId, newData }.
   *
   * Required newData field: {categoryName}
   *
   * Fields not allowed: {fk_user_id}
   *
   * Returns { categoryId, userId, categoryName }
   *
   * Throws NotFoundError if categoryId not found. **/

  static async update({ categoryId, userId, ...newData }) {
    const jsToSql = {
      categoryId: "ui_category_id",
      userId: "fk_user_id",
      categoryName: "name",
    };

    const sqlToJs = {
      ui_category_id: `ui_category_id AS "categoryId"`,
      fk_user_id: `fk_user_id AS "userId"`,
      name: `name AS "categoryName"`,
    };

    const updateClause = "UPDATE categories";

    const whereClause = `WHERE ${jsToSql.categoryId}='${categoryId}' AND ${jsToSql.userId}='${userId}'`;

    const { setClause, setValues, returnStmt } = buildQueryUpdateCategory({
      newData,
      jsToSql,
      sqlToJs,
    });

    const updatedCategory = await pool.query(
      `${updateClause} ${setClause} ${whereClause} ${returnStmt}`,
      setValues
    );

    if (!updatedCategory.rows[0]) {
      throw new NotFoundError(`Invalid categoryId.`);
    }

    return updatedCategory.rows[0];
  }

  /** Deletes given task from database
   *
   * Returns undefined
   *
   * Throws NotFoundError if taskId not found. **/

  static async delete({ categoryId, userId }) {
    const result = await pool.query(
      `DELETE
           FROM categories
           WHERE ui_category_id = $1 AND fk_user_id = $2 AND is_default = false
           RETURNING ui_category_id`,
      [categoryId, userId]
    );

    const deletedCategory = result.rows[0];

    if (!deletedCategory) throw new NotFoundError(`Invalid categoryId.`);
  }

  /** Create a new category
   *
   * Required fields { userId, categoryName }
   *
   * Returns {categoryId, userId, categoryName, default }
   *
   * Does not throw error if no userId found, given the authentication middleware veries the existence of the userId **/

  static async create({ userId, categoryName }) {
    const jsToSql = {
      userId: "fk_user_id",
      categoryName: "name",
      categoryId: "ui_category_id",
      default: "is_default",
    };

    const sqltoJs = {
      fk_user_id: "userId",
      name: "categoryName",
      ui_category_id: "categoryId",
      is_default: "default",
    };

    const newCategory = await pool.query(
      `INSERT 
        into categories 
          (${jsToSql.userId},
          ${jsToSql.categoryName})
        VALUES ($1, $2)
        RETURNING 
          ${jsToSql.userId} AS "${sqltoJs.fk_user_id}",
          ${jsToSql.categoryName} AS "${sqltoJs.name}",
          ${jsToSql.categoryId} AS "${sqltoJs.ui_category_id}",
          ${jsToSql.default} AS ${sqltoJs.is_default} 
          `,
      [userId, categoryName]
    );

    if (!newCategory) {
      throw new NotFoundError(`Invalid userId or failed to create category.`);
    }
    return newCategory.rows[0];
  }
}
