import Joi from "joi";

export const authLoginSchema = Joi.object({
  email: Joi.string().email().min(6).max(60).required(),
  password: Joi.string().min(5).max(20).required(),
});
