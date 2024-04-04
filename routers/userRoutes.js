import { BadRequestError } from "../expressError.js";
import {
  userRegisterSchema,
  userVerifySchema,
} from "../schemas/userSchemas.js";
import express from "express";
import User from "../models/userModel.js";
import sendEmailRegistration from "../utils/email.js";
import { validateRequest } from "../middleware/validationMiddleware.js";

const router = new express.Router();

/** POST /user/register: {user} => email OTP (one-time pw)
 *
 * User must include {firstName, lastName, email, password}
 *
 * Returns 200 status code and sends email with OTP link.
 *
 * Authorization required: none */

router.post(
  "/register",
  validateRequest([{ schema: userRegisterSchema, reqBody: true }]),
  async function (req, res, next) {
    try {
      const newUser = await User.registerAccount({ ...req.body });
      const jsonResponse = await sendEmailRegistration(newUser);
      return res.status(200).json(jsonResponse);
    } catch (error) {
      // console.log("error from POST user/register");
      // console.log(error);
      //PEER Lawrence, below is my new duplicate constraint error handling where I'm catching the DB-level error to send the custom 'BadRequestError'. Is this okay?
      if (error.code === "23505" && error.constraint === "users_email_key") {
        return next(
          new BadRequestError(
            `Your ${req.body.email} is already registered or pending registration.`
          )
        );
      }
      return next(error);
    }
  }
);

/** POST /user/verify: {registrationToken} & {userId} => updates users as 'true' for registered
 *
 * Registration token must be unexpired and exist in tokens_registration table
 *
 * Returns 200 status code and redirects to /sign-in
 *
 * Authorization required: none */

router.post(
  "/verify",
  validateRequest([{ schema: userVerifySchema, reqQuery: true }]),
  async function (req, res, next) {
    try {
      if (await User.validToken(req.query)) {
        await User.verifyAccount(req.query.id);
        //PEER Lawrence, should I also remove this res.redirect below?
        return res.redirect(302, "/auth/login");
      }
    } catch (error) {
      // console.log("error from /verify route");
      // console.log(error);
      return next(error);
    }
  }
);

export default router;
