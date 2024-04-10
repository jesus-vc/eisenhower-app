import express from "express";
import Task from "../models/taskModel.js";
import {
  taskCreateSchema,
  taskGetSchema,
  taskUpdateBodySchema,
  taskSchemaUpdatePath,
  taskSchemaDelete,
  taskSchemaUpdatePriority,
} from "../schemas/taskSchemas.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { BadRequestError } from "../expressError.js";
import {
  ensureLoggedIn,
  userExistsAndCorrect,
  taskExistsAndCorrect,
} from "../middleware/authMiddleware.js";

const router = new express.Router();

/** GET /userId => {tasks: [{taskId, title, urgent, important, priority, timebox, completed, note, category, deadlineDate }, ...]}
 *
 * Get all tasks by userId. Filters are optional.
 *
 * Allowed filters { title, completed, priority, deadlineDate}
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no userID found
 *
 * Authorization required: logged in as correct user or admin */

router.get(
  "/:userId",
  ensureLoggedIn,
  validateRequest([
    { schema: taskGetSchema, userIdParam: true, reqQuery: true },
  ]),
  userExistsAndCorrect,
  async function (req, res, next) {
    try {
      // Handle request with filters
      if (Object.keys(req.query).length > 0) {
        const tasks = await Task.getByFilters({
          userId: req.params.userId,
          ...req.query,
        });
        return res.status(200).json({ tasks });
      }
      const tasks = await Task.getAll(req.params.userId);
      return res.status(200).json({ tasks });
    } catch (error) {
      // console.log("caught error");
      // console.log(error);
      return next(error);
    }
  }
);

/** POST /userId { taskData } =>  { task }
 *
 * Creates new task.
 *
 * taskData required fields: { title, urgent, important }
 *
 * taskData optional fields for 'taskData': { timebox, note, category, deadlineDate}
 *
 * Returns {task: {taskId, userId, title, urgent, important, priority, timebox, completed, note, category, deadlineDate }}
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no userID found
 *
 * Authorization required: logged in as correct user or admin */

router.post(
  "/:userId",
  ensureLoggedIn,
  validateRequest([
    { schema: taskCreateSchema, userIdParam: true, reqBody: true },
  ]),
  userExistsAndCorrect,
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

/** PATCH /:userId/:taskId { newData } =>  { task }
 *
 * Updates a task based on fields provided.
 *
 * newData optional fields: { title, urgent, important, timebox, completed, note, category, deadline_date }.
 *
 * Returns {task: {taskId, userId, fieldChanged1, fieldChanged2 ... }} or BadRequestError if empty request.
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no taskID or userID found
 *
 * Authorization required: logged in as correct user or admin */

//FIXME with lawrence.
/** //PEER Lawrence, which route hierarchy is better:
current:
-  patch(tasks/:userId/:taskId) 

other options:
- patch(tasks/:taskId/:userId/)
- patch(tasks/user/:userId/taskId/:taskId)
- patch(tasks/taskId/:taskId/user/:userId/)
 **/

router.patch(
  "/:userId/:taskId",
  ensureLoggedIn,
  validateRequest([
    { schema: taskUpdateBodySchema, reqBody: true },
    { schema: taskSchemaUpdatePath, userIdParam: true, taskIdParam: true },
  ]),
  //REFACTOR revisit combining these two middlewares below. Perhaps I can combine their logic to perform only 1 query? Such as querying just tasks or doing a JOIN operation between task and users tables.
  userExistsAndCorrect,
  taskExistsAndCorrect,
  async function (req, res, next) {
    try {
      if (Object.keys(req.body).length > 0) {
        const task = await Task.update({
          taskId: Number(req.params.taskId),
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

/** PATCH :userId/:taskId/priority { newData } =>  { task }
 *
 * Updates a task's 'priority' status.
 *
 * Required keys: { priority } with values of {'now', 'schedule', 'delegate' ,'avoid' }
 *
 * Returns {task: { taskId, userId, urgent, important, priority }}
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no taskID or userID found
 *
 * Authorization required: logged in as correct user or admin */

router.patch(
  "/:userId/:taskId/priority",
  ensureLoggedIn,
  validateRequest([
    { schema: taskSchemaUpdatePriority, reqBody: true },
    { schema: taskSchemaUpdatePath, userIdParam: true, taskIdParam: true },
  ]),
  userExistsAndCorrect,
  taskExistsAndCorrect,
  async function (req, res, next) {
    try {
      if (Object.keys(req.body).length > 0) {
        const task = await Task.updatePriority({
          taskId: req.params.taskId,
          priority: req.body.priority,
        });
        return res.status(201).json({ task });
      } else {
        return res.status(200).json({});
      }
    } catch (error) {
      // console.log("error from PATCH /task/:userId/:taskId/priority");
      // console.log(error);
      return next(error);
    }
  }
);

/** DELETE /taskId  =>  { deleted: taskId }
 *
 * Deletes given task from database
 *
 * Throws UnauthorizedError or NotFoundError (based on user privileges) if no taskID found
 *
 * Authorization required: logged in as correct user or admin */

router.delete(
  "/:userId/:taskId",
  ensureLoggedIn,
  validateRequest([
    { schema: taskSchemaDelete, userIdParam: true, taskIdParam: true },
  ]),
  userExistsAndCorrect,
  taskExistsAndCorrect,
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

export default router;
