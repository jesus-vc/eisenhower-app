import Joi from "joi";

export const authLoginSchema = Joi.object({
  email: Joi.string().email().min(8).max(60).required(),
  password: Joi.string().min(5).max(30).required(),
});
