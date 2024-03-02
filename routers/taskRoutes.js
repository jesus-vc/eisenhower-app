import express from "express";
import Task from "../models/taskModel.js";
import { taskGetAllSchema } from "../schemas/taskSchemas.js";
import { BadRequestError } from "../expressError.js";
import {
  ensureLoggedIn,
  ensureCorrectUser,
  ensureIsAdmin,
} from "../middleware/authMiddleware.js";

const router = new express.Router();

/** //PEER Should I use query or route parameter for GET /task/:userId below
 *  I do anticipate a future need to get a single task by taskId such as GET task/:taskId
 *  but perhaps that can be a separate router for users such as GET /userid/:taskid
 * Or, I can add another path to this task router that accepts multiple filters such as
 * GET /task/ which accepts multiple filters. */

/** Get all tasks by userId
 *
 *  GET /[userId] => {tasks: [{taskId, description, importance, urgency, timebox, completed }, ...]}
 *
 * Authorization required: logged in as correct user or admin */

router.get("/:userId", ensureLoggedIn, async function (req, res, next) {
  try {
    //PEER since ensureCorrectUser() is an async function,
    // I was getting syntax errors when placing 'await ensureCorrectUser()' as middleware for this route.
    // So it is okay to have this authentication middleware run within the try-catch?

    // Also, ensureCorrectUser() will throw an UnauthorizedError() error if user is invalid.
    // Or is it better for ensureCorrectUser() to return "false" in order for this try-catch statement
    // to throw the UnauthorizedError() error directly?

    if (await ensureCorrectUser(req.params.userId, res.locals)) {
      const { error, value } = taskGetAllSchema.validate({
        userId: req.params.userId,
      });
      if (error) throw new BadRequestError(error.message);
      const tasks = await Task.getAll(req.params.userId);
      return res.status(200).json({ tasks });
    }
  } catch (error) {
    // console.log("caught error");
    // console.log(error);
    return next(error);
  }
});

export default router;
