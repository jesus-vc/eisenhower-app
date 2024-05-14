import { BadRequestError } from "../expressError.js";
import { authLoginSchema } from "../schemas/authSchemas.js";
import {
  userRegisterSchema,
  userVerifySchema,
} from "../schemas/userSchemas.js";
import { validateSchemas } from "../middleware/validationMiddleware.js";
import sendEmailRegistration from "../utils/email.js";
import express from "express";
import Auth from "../models/authModel.js";

const router = new express.Router();

/** POST /login
 *
 * {email, password} -> returns {token}
 *
 * Authorization required: none **/

router.post(
  "/login",
  validateSchemas([{ schema: authLoginSchema, reqBody: true }]),
  async function (req, res, next) {
    try {
      const { email, password } = req.body;
      const validLogin = await Auth.authenticate(
        req.body.email,
        req.body.password
      );

      if (validLogin) {
        const token = await Auth.createAuthToken({ email });
        res.json({ token });
      } else {
        throw new BadRequestError("Invalid user/password.");
      }
    } catch (error) {
      // console.log("error from /login router");
      // console.log(error);
      return next(error);
    }
  }
);

/** POST /auth/register: {user} => email OTP (one-time pw)
 *
 * User must include {firstName, lastName, email, password, phone}
 *
 * Returns 200 status code and sends email with OTP link.
 *
 * Authorization required: none */

router.post(
  "/register",
  validateSchemas([{ schema: userRegisterSchema, reqBody: true }]),
  async function (req, res, next) {
    try {
      const newUser = await Auth.registerAccount({ ...req.body });
      const jsonResponse = await sendEmailRegistration(newUser);

      if (jsonResponse.accepted.length === 1) {
        return res.status(200).json({
          Success: "Successfully emailed registration link!", //FIXME add test for this new response?
        });
      } else {
        //FIXME review if I should add a custom error if message via nodemailer fails
      }
    } catch (error) {
      // console.log("error from POST user/register");
      // console.log(error);
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

/** POST /auth/verify: {registrationToken} & {userId} => updates users as 'true' for registered
 *
 * Registration token must be unexpired and exist in tokens_registration table
 *
 * Returns 200 status code
 *
 * Authorization required: none */

router.post(
  "/verify",
  validateSchemas([{ schema: userVerifySchema, reqQuery: true }]),
  async function (req, res, next) {
    try {
      if (await Auth.validToken(req.query)) {
        await Auth.verifyAccount(req.query.id);
        return res.status(200).json({
          Success: "Successfully verified account!",
        });
        //FIXME add test for this new response?
      }
    } catch (error) {
      // console.log("error from /verify route");
      // console.log(error);
      return next(error);
    }
  }
);

export default router;
