import Joi from "joi";

export const taskAddSchema = Joi.object({
  userId: Joi.number().positive().required(),
  description: Joi.string().min(3).max(30).required(),
  importance: Joi.string()
    .valid("low", "medium", "high")
    .min(3)
    .max(5)
    .required(),
  urgency: Joi.string().valid("low", "medium", "high").min(3).max(5).required(),
  timebox: Joi.string().min(5).max(20).required(),
});

export const taskUpdateSchema = Joi.object({
  taskId: Joi.number().positive().required(),
  description: Joi.string().min(3).max(30),
  importance: Joi.string().valid("low", "medium", "high").min(3).max(5),
  urgency: Joi.string().valid("low", "medium", "high").min(3).max(5),
  timebox: Joi.string().min(5).max(20),
  completed: Joi.boolean(),
});

export const taskGetSchema = Joi.object({
  taskId: Joi.number().positive().required(),
});

export const taskGetAllSchema = Joi.object({
  userId: Joi.number().positive().required(),
});
