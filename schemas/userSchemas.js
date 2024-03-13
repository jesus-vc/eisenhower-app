import Joi from "joi";
import { PHONE_NUMBER_REGEX } from "../constants.js";

export const userRegisterSchema = Joi.object({
  firstName: Joi.string().min(1).max(30).required(),
  lastName: Joi.string().min(1).max(30).required(),
  email: Joi.string().email().min(6).max(60).required(),
  password: Joi.string().min(5).max(20).required(),
  phone: Joi.string()
    .regex(PHONE_NUMBER_REGEX)
    .messages({ "string.pattern.base": `Phone number must have 10 digits.` })
    .required(),
  isAdmin: Joi.boolean(),
});

export const userVerifySchema = Joi.object({
  token: Joi.string()
    .length(26)
    .pattern(/^[A-Z2-7]+$/)
    .required() /** adheres to base 32 alphabet (ABCDEFGHIJKLMNOPQRSTUVWXYZ234567) */,
  id: Joi.number().positive().required(),
});
