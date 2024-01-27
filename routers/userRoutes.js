import { BadRequestError } from "../expressError.js";
import { userRegisterSchema } from "../schemas/userSchemas.js";
import express from "express";
import User from "../models/userModel.js";
import sendEmailRegistration from "../utils/email.js";

const router = new express.Router();

/** POST /user/register: {user} => email OTP (one-time pw)
 *
 * User must include {firstName, lastName, email, password}
 *
 * Returns 200 status code and sends email with OTP link.
 *
 * Authorization required: none
 */

router.post("/register", async function (req, res, next) {
  //TODO refactor with L's async util
  try {
    const { error, value } = userRegisterSchema.validate(req.body);
    if (error) throw new BadRequestError(error.message);

    const newUser = await User.register({ ...req.body });

    //send mail
    await sendEmailRegistration(newUser.email);

    return res.status(201).json({ email: "OTP sent" });
  } catch (error) {
    return next(error);
  }
});

export default router;
