import { pool } from "../db/db.js";
import Category from "./categoryModel.js";
import { NotFoundError } from "../expressError.js";
import { v4 as uuidv4 } from "uuid";
import {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} from "./_testCommon.js";

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** global data for tests */

let user1, user2, user3;
let customCategory1, customCategory2, customCategory3;
let defaultCategory1, defaultCategory2, defaultCategory3;

async function fetchGlobalData() {
  const userIds = await pool.query(
    "SELECT id FROM users ORDER BY first_name ASC"
  );

  [user1, user2, user3] = userIds.rows.map((row) => row.id);

  const customCategoryIds = await pool.query(
    `SELECT categories.ui_category_id 
     FROM categories 
     JOIN users ON categories.fk_user_id = users.id 
     WHERE categories.is_default = false 
     ORDER BY users.first_name ASC`
  );

  [customCategory1, customCategory2, customCategory3] =
    customCategoryIds.rows.map((row) => row.ui_category_id);

  const defaultCategoryIds = await pool.query(
    `SELECT categories.ui_category_id
     FROM categories
     JOIN users ON categories.fk_user_id = users.id
     WHERE categories.is_default = true
     ORDER BY users.first_name ASC`
  );

  [defaultCategory1, defaultCategory2, defaultCategory3] =
    defaultCategoryIds.rows.map((row) => row.ui_category_id);
}

beforeAll(async () => {
  await fetchGlobalData();
});

/************************************** getAll */
describe("getAll", function () {
  it("returns expected categories per user", async function () {
    const categories1 = await Category.getAll(user1);
    const categories2 = await Category.getAll(user2);
    const categories3 = await Category.getAll(user3);

    expect(categories1).toEqual([
      {
        categoryId: defaultCategory1,
        categoryName: "Ideas",
      },
      {
        categoryId: customCategory1,
        categoryName: "Finances",
      },
    ]);

    expect(categories2).toEqual([
      {
        categoryId: defaultCategory2,
        categoryName: "Ideas",
      },
      {
        categoryId: customCategory2,
        categoryName: "Health",
      },
    ]);

    expect(categories3).toEqual([
      {
        categoryId: defaultCategory3,
        categoryName: "Ideas",
      },
      {
        categoryId: customCategory3,
        categoryName: "Family",
      },
    ]);
  });

  it("does not expose unecessary data", async function () {
    const unnecessaryFields = ["id"];
    const fieldsReturned = new Set();

    let users = [user1, user2, user3];

    for (const user of users) {
      const categories = await Category.getAll(user);

      for (const obj of categories) {
        Object.keys(obj).forEach((field) => fieldsReturned.add(field));
      }
    }

    unnecessaryFields.forEach((field) => {
      expect(fieldsReturned).not.toContain(field);
    });
  });
});

/************************************** update */
describe("update", function () {
  it("updates categoryName successfully", async function () {
    const updatedTitle = await Category.update({
      categoryId: customCategory1,
      userId: user1,
      categoryName: "New Title",
    });
    expect(updatedTitle).toEqual({
      categoryId: expect.any(String),
      userId: user1,
      categoryName: "New Title",
    });
  });

  it("returns error for invalid categoryId", async function () {
    const fakeId1 = Category.update({
      categoryId: Math.floor(Math.random() * 1000),
      userId: user2,
      categoryName: "New Title",
    });

    const fakeId2 = Category.update({
      categoryId: uuidv4(),
      userId: user2,
      categoryName: "New Title",
    });

    await expect(fakeId1).rejects.toThrow(NotFoundError);
    await expect(fakeId1).rejects.toThrow(`Invalid categoryId.`);

    await expect(fakeId2).rejects.toThrow(NotFoundError);
    await expect(fakeId2).rejects.toThrow(`Invalid categoryId.`);
  });

  it("returns error and cancels entire update operation if attempting to update fk_user_id ", async function () {
    const categoryBefore = await pool.query(
      "Select * from categories where fk_user_id=$1",
      [user1]
    );

    const newFkUserId = uuidv4();

    const req = Category.update({
      categoryId: customCategory1,
      userId: user1,
      categoryName: "New Title",
      fk_user_id: newFkUserId,
    });

    await expect(req).rejects.toThrow(
      `Updating fk_user_id column is not allowed.`
    );

    const categoryAfter = await pool.query(
      "Select * from categories where fk_user_id=$1",
      [user1]
    );

    expect(categoryBefore).toEqual(categoryAfter);
  });

  it("returns error and cancels entire update operation if attempting to update is_default ", async function () {
    const categoryBefore = await pool.query(
      "Select * from categories where fk_user_id=$1",
      [user1]
    );

    const req = Category.update({
      categoryId: customCategory1,
      userId: user1,
      categoryName: "New Title",
      is_default: true,
    });

    await expect(req).rejects.toThrow(
      'duplicate key value violates unique constraint "unique_default_category_per_user'
    );

    const categoryAfter = await pool.query(
      "Select * from categories where fk_user_id=$1",
      [user1]
    );

    expect(categoryBefore).toEqual(categoryAfter);
  });

  it("returns error and cancels entire update operation if attempting to update incorrect fk_user_id ", async function () {
    const categoryBefore = await pool.query(
      "Select * from categories where fk_user_id=$1",
      [user2]
    );

    const newFkUserId = uuidv4();

    const req = Category.update({
      categoryId: customCategory1,
      userId: user1,
      categoryName: "New Title",
      fk_user_id: newFkUserId,
    });

    await expect(req).rejects.toThrow(
      `Updating fk_user_id column is not allowed.`
    );

    const categoryAfter = await pool.query(
      "Select * from categories where fk_user_id=$1",
      [user2]
    );

    expect(categoryBefore).toEqual(categoryAfter);
  });
});

/************************************** delete */
describe("delete", function () {
  it("deletes categoryName successfully", async function () {
    await Category.delete({
      categoryId: customCategory1,
      userId: user1,
    });

    const category1 = await pool.query(
      "SELECT * FROM categories WHERE ui_category_id=$1",
      [customCategory1]
    );

    expect(category1.rows.length).toEqual(0);

    await Category.delete({
      categoryId: customCategory2,
      userId: user2,
    });

    const category2 = await pool.query(
      "SELECT * FROM categories WHERE ui_category_id=$1",
      [customCategory2]
    );

    expect(category2.rows.length).toEqual(0);
  });

  it("returns error and cancels entire operation if attempting to delete for incorrect fk_user_id ", async function () {
    const category1 = Category.delete({
      categoryId: customCategory1,
      userId: user2,
    });

    await expect(category1).rejects.toThrow(`Invalid categoryId.`);

    const category2 = Category.delete({
      categoryId: customCategory2,
      userId: user1,
    });

    await expect(category2).rejects.toThrow(`Invalid categoryId.`);
  });

  it("returns error for invalid categoryId", async function () {
    const category1 = Category.delete({
      categoryId: `CA-${uuidv4()}`,
      userId: user2,
    });

    await expect(category1).rejects.toThrow(`Invalid categoryId.`);
  });

  it("returns error and cancels entire operation if attempting to delete default category", async function () {
    const category1 = Category.delete({
      categoryId: defaultCategory1,
      userId: user1,
    });

    await expect(category1).rejects.toThrow(`Invalid categoryId.`);

    const category2 = Category.delete({
      categoryId: defaultCategory2,
      userId: user2,
    });

    await expect(category2).rejects.toThrow(`Invalid categoryId.`);
  });
});

/************************************** create */
describe("create", function () {
  const categoryIdRegex =
    /^CA-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("creates expected category using default categories", async function () {
    const newCategory1 = await Category.create({
      userId: user1,
      categoryName: "New Cat 1",
    });

    expect(newCategory1).toEqual({
      categoryId: expect.any(String),
      categoryName: "New Cat 1",
      userId: user1,
      default: false,
    });

    expect(categoryIdRegex.test(newCategory1.categoryId)).toBe(true);

    const newCategory2 = await Category.create({
      userId: user3,
      categoryName: "New Cat 2",
    });

    expect(newCategory2).toEqual({
      categoryId: expect.any(String),
      categoryName: "New Cat 2",
      userId: user3,
      default: false,
    });

    expect(categoryIdRegex.test(newCategory2.categoryId)).toBe(true);
  });
});
