import { BadRequestError } from "../expressError.js";
import { authLoginSchema } from "../schemas/authSchemas.js";
import express from "express";
import User from "../models/userModel.js";

const router = new express.Router();

/** POST /login
 *
 * {email, password} -> returns {token} and redirect to /task/:userId homepage
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
      const userId = await User.getId(email);

      res.json({ token, redirectUrl: `/task/${userId}` });
    } else {
      //PEER should I throw this error from within the User.authenticate model?
      // Also, is it best to throw error or use a 'return next({status: 400, message:"error message"})' statement?
      throw new BadRequestError("Invalid user/password.");
    }
  } catch (error) {
    // console.log(error);
    return next(error);
  }
});

export default router;
