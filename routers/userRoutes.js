import { BadRequestError } from "../expressError.js";
import express from "express";
import Task from "../models/taskModel.js";
import Category from "../models/categoryModel.js";
import TaskService from "../services/taskService.js";
import {
	schemaCreateTask,
	schemaGetTask,
	schemaUpdateTaskBody,
	schemaUpdateTaskPath,
	schemaDeleteTask,
	schemaUpdateTaskPriority,
	schemaUpdateCategoryBody,
	schemaUpdateCategoryPath,
	schemaDeleteCategory,
	schemaCreateCategory,
} from "../schemas/taskSchemas.js";
import {
	ensureLoggedIn,
	validateUser,
	validateTask,
	validateCategory,
} from "../middleware/authMiddleware.js";
import { validateSchemas } from "../middleware/validationMiddleware.js";

const router = new express.Router();

//FIXME-LATER If lawrence approves adding service layer, refactor routes as needed to use services.

/** GET /:userId/tasks/ => {tasks: [Task], categories: [Category] | undefined}
 *
 * Get all tasks for a given userId, with optional filters and optional categories.
 *
 * - Filters: { title, completed, deadlineDate }
 * - Returns: an object containing an array of task objects and, optionally, an array of associated categories.
 *   - If `cats` query parameter is true, categories will be included in the response; otherwise, they will be omitted.
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no userID found.
 *
 * Authorization required: logged in as the correct user or admin. */

router.get(
	"/:userId/tasks/",
	ensureLoggedIn,
	validateSchemas([
		{ schema: schemaGetTask, userIdParam: true, reqQuery: true },
	]),
	validateUser,
	async function (req, res, next) {
		try {
			const includeCategories = req.query.cats === "true";
			delete req.query.cats;

			const filters = Object.keys(req.query).length > 0 ? req.query : null;
			const userId = req.params.userId;

			/** // PEER Lawrence, I added this TaskService layer for these reasons:
			 *  - Help me practice leveraging service layers
			 *  - Separate business logic from HTTP request handling in the router, which could make refactoring simpler, especially when dealing with various `req.query` options.
			 *
			 * Does this approach make sense, or should I consider another structure?
			 */

			const data = await TaskService.getTasksWithOptions({
				userId,
				filters,
				includeCategories,
			});

			return res.status(200).json(data);
		} catch (error) {
			// console.log("error from GET /:userId/tasks/");
			next(error);
		}
	}
);

/** POST /:userId/tasks/ { taskData } =>  { task }
 *
 * Creates a new task.
 *
 * - Required fields: { title }
 * - Optional fields: { timebox, note, categoryId, deadlineDate }
 *
 * Returns the newly created task object.
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no userID found
 *
 * Authorization required: logged in as correct user or admin */

router.post(
	"/:userId/tasks/",
	ensureLoggedIn,
	validateSchemas([
		{ schema: schemaCreateTask, userIdParam: true, reqBody: true },
	]),
	validateUser,
	async function (req, res, next) {
		try {
			const task = await Task.create({
				userId: req.params.userId,
				...req.body,
			});
			return res.status(201).json({ task });
		} catch (error) {
			// console.log("error from POST /task/:userId");
			// console.log(error);
			return next(error);
		}
	}
);

/** PATCH /:userId/tasks/:taskId { newData } =>  { task }
 *
 * Updates a task based on fields provided.
 *
 * newData optional fields: { title, timebox, completed, note, categoryId, deadlineDate }.
 *
 * Returns {task: {taskId, userId, fieldChanged1, fieldChanged2 ... }} or BadRequestError if empty request.
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no taskID or userID found
 *
 * Authorization required: logged in as correct user or admin */

router.patch(
	"/:userId/tasks/:taskId",
	ensureLoggedIn,
	validateSchemas([
		{ schema: schemaUpdateTaskBody, reqBody: true },
		{ schema: schemaUpdateTaskPath, userIdParam: true, taskIdParam: true },
	]),
	validateUser,
	validateTask,
	validateCategory,
	async function (req, res, next) {
		try {
			if (Object.keys(req.body).length > 0) {
				const task = await Task.update({
					taskId: req.params.taskId,
					userId: req.params.userId,
					...req.body,
				});
				return res.status(201).json({ task });
			} else {
				throw new BadRequestError(
					"Empty request to update a task is not allowed."
				);
			}
		} catch (error) {
			// console.log("error from PATCH /task/:userId/:taskId/");
			// console.log(error);
			return next(error);
		}
	}
);

/** DELETE /taskId/:taskId  =>  { deleted: taskId }
 *
 * Deletes given task from database
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no taskID found
 *
 * Authorization required: logged in as correct user or admin */

router.delete(
	"/:userId/tasks/:taskId",
	ensureLoggedIn,
	validateSchemas([
		{ schema: schemaDeleteTask, userIdParam: true, taskIdParam: true },
	]),
	validateUser,
	validateTask,
	async function (req, res, next) {
		try {
			await Task.delete(req.params.taskId);
			return res.json({ deleted: req.params.taskId });
		} catch (err) {
			// console.log("error from DELETE /task/:userId");
			// console.log(err);
			return next(err);
		}
	}
);

/** PATCH /:userId/categories/:categoryId { newData } =>  { task }
 *
 *  Updates a category based on the provided fields.
 *
 * Required field in newData:
 * { categoryName: string }
 *
 * Returns { category: { categoryId, userId, categoryName } } on success.
 * Throws BadRequestError if the request body is empty.
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no categoryID or userID found
 *
 * Authorization required: logged in as correct user or admin */

router.patch(
	"/:userId/categories/:categoryId",
	ensureLoggedIn,
	validateSchemas([
		{ schema: schemaUpdateCategoryBody, reqBody: true },
		{
			schema: schemaUpdateCategoryPath,
			userIdParam: true,
			categoryIdParam: true,
		},
	]),
	validateUser,
	validateCategory,
	async function (req, res, next) {
		try {
			if (Object.keys(req.body).length > 0) {
				const category = await Category.update({
					categoryId: req.params.categoryId,
					userId: req.params.userId,
					...req.body,
				});
				return res.status(201).json({ category });
			} else {
				throw new BadRequestError(
					"Empty request to update a category is not allowed."
				);
			}
		} catch (error) {
			// console.log("error from PATCH /:userId/tasks/:categoryId");
			// console.log(error);
			return next(error);
		}
	}
);

/** POST /:userId/categories/ { newData } =>  { category }
 *
 * Created a category based on the provided fields.
 *
 * Required field in newData: { categoryName: string }
 *
 * Returns { category: { categoryId, userId, categoryName, default } } on success.
 *
 * Throws BadRequestError if the request body is empty.
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no userID found
 *
 * Authorization required: logged in as correct user or admin */

router.post(
	"/:userId/categories/",
	ensureLoggedIn,
	validateSchemas([
		{ schema: schemaCreateCategory, userIdParam: true, reqBody: true },
	]),
	validateUser,
	async function (req, res, next) {
		try {
			if (Object.keys(req.body).length > 0) {
				const category = await Category.create({
					userId: req.params.userId,
					categoryName: req.body.categoryName,
				});
				return res.status(201).json({ category });
			} else {
				throw new BadRequestError(
					"Empty request to create a category is not allowed."
				);
			}
		} catch (error) {
			// console.log("error from POST /:userId/categories/");
			// console.log(error);
			return next(error);
		}
	}
);

/** DELETE /:userId/categories/:categoryId  =>  { deleted: taskId }
 *
 * Deletes given task from database
 *
 * Returns { deleted: categoryId } on success.
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no taskID found
 *
 * Authorization required: logged in as correct user or admin */

router.delete(
	"/:userId/categories/:categoryId",
	ensureLoggedIn,
	validateSchemas([
		{ schema: schemaDeleteCategory, userIdParam: true, categoryIdParam: true },
	]),
	validateUser,
	validateCategory,
	async function (req, res, next) {
		try {
			await Category.delete({
				userId: req.params.userId,
				categoryId: req.params.categoryId,
			});
			return res.json({ deleted: req.params.categoryId });
		} catch (err) {
			// console.log("error from DELETE /task/:userId");
			// console.log(err);
			return next(err);
		}
	}
);

export default router;
