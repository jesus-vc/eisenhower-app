import Joi from "joi";
import { PHONE_NUMBER_REGEX } from "../constants.js";

export const userRegisterSchema = Joi.object({
  firstName: Joi.string().min(1).max(30).required(),
  lastName: Joi.string().min(1).max(30).required(),
  email: Joi.string().email().min(8).max(60).required(),
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
    .pattern(
      /^[A-Z2-7]+$/
    ) /** adheres to base 32 alphabet (ABCDEFGHIJKLMNOPQRSTUVWXYZ234567) */
    .required()
    .messages({
      "string.length":
        "Your registration link does not exist. Ensure the original link we e-mailed you has not been modified.",
      "string.pattern.base":
        "Your registration link does not exist. Ensure the original link we e-mailed you has not been modified.",
    }),
  id: Joi.number()
    .positive()
    .messages({ "number.unsafe": '"userId" supplied is too large' })
    .required(),
});
