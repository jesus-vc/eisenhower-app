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

/** Get all tasks by userId
 *
 *  GET /[userId] => {tasks: [{taskId, description, importance, urgency, timebox, completed }, ...]}
 *
 * Authorization required: logged in as correct user or admin */

router.get("/:userId", ensureLoggedIn, async function (req, res, next) {
  try {
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
