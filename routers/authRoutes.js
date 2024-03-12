import { BadRequestError } from "../expressError.js";
import { authLoginSchema } from "../schemas/authSchemas.js";
import express from "express";
import User from "../models/userModel.js";

const router = new express.Router();

/** POST /login
 *
 * {email, password} -> returns {token}
 *
 * Authorization required: none **/

router.post("/login", async function (req, res, next) {
  try {
    const { error, value } = authLoginSchema.validate(req.body);
    if (error) throw new BadRequestError(error.message);

    const { email, password } = req.body;

    const validLogin = await User.authenticate(
      req.body.email,
      req.body.password
    );

    if (validLogin) {
      const token = await User.createAuthToken({ email });
      res.json({ token });
    } else {
      throw new BadRequestError("Invalid user/password.");
    }
  } catch (error) {
    // console.log("error from /login router");
    // console.log(error);
    return next(error);
  }
});

export default router;
