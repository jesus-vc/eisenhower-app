import { BadRequestError } from "../expressError.js";
import {
  userRegisterSchema,
  userVerifySchema,
} from "../schemas/userSchemas.js";
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
 * Authorization required: none */

router.post("/register", async function (req, res, next) {
  try {
    const { error, value } = userRegisterSchema.validate(req.body);
    if (error) throw new BadRequestError(error.message);

    const newUser = await User.registerAccount({ ...req.body });
    const jsonResponse = await sendEmailRegistration(newUser);

    return res.status(200).json(jsonResponse);
  } catch (error) {
    //PEER Lawrence, What do you think of this new duplicate constraint error handling?
    if (error.code === "23505" && error.constraint === "users_email_key") {
      return next(
        new BadRequestError(
          `Your ${req.body.email} is already registered or pending registration.`
        )
      );
    }
    return next(error);
  }
});

/** POST /user/verify: {registrationToken} & {userId} => updates users as 'true' for registered
 *
 * Registration token must be unexpired and exist in tokens_registration table
 *
 * Returns 200 status code and redirects to /sign-in
 *
 * Authorization required: none */

router.post("/verify", async function (req, res, next) {
  try {
    const { error, value } = userVerifySchema.validate(req.query);
    if (error) {
      throw new BadRequestError(
        `Your registration link does not exist. Ensure the original link we e-mailed you has not been modified.`
      );
    }

    if (await User.validToken(req.query)) {
      await User.verifyAccount(req.query.id);
      //PEER should I also remove this res.redirect below?
      return res.redirect(302, "/auth/login");
    }
  } catch (error) {
    // console.log("error from /verify route");
    // console.log(error);
    return next(error);
  }
});

export default router;
