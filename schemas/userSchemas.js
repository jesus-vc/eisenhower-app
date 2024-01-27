import Joi from "joi";
import { PHONE_NUMBER_REGEX } from "../constants.js";

const userRegisterSchema = Joi.object({
  firstName: Joi.string().min(1).max(30).required(),
  lastName: Joi.string().min(1).max(30).required(),
  email: Joi.string().email().min(6).max(60).required(),
  password: Joi.string().min(5).max(20).required(),
  phone: Joi.string()
    .regex(PHONE_NUMBER_REGEX)
    .messages({ "string.pattern.base": `Phone number must have 10 digits.` })
    .required(),
});

export { userRegisterSchema };
