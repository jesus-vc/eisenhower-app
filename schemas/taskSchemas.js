import DateExtension from "@joi/date";
import JoiImport from "joi";
const Joi = JoiImport.extend(DateExtension);

/** //TODO Revisit in future
 * 1. As I evolve the API routes, consider combining schemas, including using Joi's 'extend' feature which allows for establishing base schemas that can be customized.
 * 2. As I build front-end for this application, re-evaluate if I need to handle for duplicate keys passed by clients, given keys in a JavaScript object must already be unique.
 */

export const taskCreateSchema = Joi.object({
  userId: Joi.number()
    .positive()
    .messages({ "number.unsafe": '"userId" supplied is too large' })
    .required(),
  title: Joi.string().min(3).max(30).required(),
  important: Joi.boolean().required(),
  urgent: Joi.boolean().required(),
  timebox: Joi.number().positive().min(1).max(600),
  note: Joi.string().min(1).max(500),
  category: Joi.string().min(2).max(15),
  deadlineDate: Joi.date().format("YYYY-MM-DD"),
});

export const taskUpdateBodySchema = Joi.object({
  title: Joi.string().min(3).max(30),
  important: Joi.boolean(),
  urgent: Joi.boolean(),
  timebox: Joi.number().positive().min(1).max(600),
  completed: Joi.boolean(),
  note: Joi.string().min(1).max(500),
  category: Joi.string().min(2).max(15),
  deadlineDate: Joi.date().format("YYYY-MM-DD"),
});

export const taskSchemaUpdatePriority = Joi.object({
  priority: Joi.string()
    .valid("now", "delegate", "schedule", "avoid")
    .min(3)
    .max(8)
    .required(),
});

export const taskSchemaUpdatePath = Joi.object({
  taskId: Joi.number()
    .positive()
    .messages({ "number.unsafe": '"taskId" supplied is too large' })
    .required(),
  userId: Joi.number()
    .positive()
    .messages({ "number.unsafe": '"userId" supplied is too large' })
    .required(),
});

export const taskGetSchema = Joi.object({
  userId: Joi.number()
    .positive()
    .messages({ "number.unsafe": '"userId" supplied is too large' })
    .required(),
  title: Joi.string().min(3).max(30),
  completed: Joi.boolean(),
  priority: Joi.string()
    .valid("now", "delegate", "schedule", "avoid")
    .min(3)
    .max(8),
  deadlineDate: Joi.date().format("YYYY-MM-DD"),
});

export const taskSchemaDelete = Joi.object({
  taskId: Joi.number()
    .positive()
    .messages({ "number.unsafe": '"taskId" supplied is too large' })
    .required(),
  userId: Joi.number()
    .positive()
    .messages({ "number.unsafe": '"userId" supplied is too large' })
    .required(),
});
