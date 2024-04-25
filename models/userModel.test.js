import User from "./userModel";
import Auth from "./authModel";
import { BadRequestError } from "../expressError.js";

import {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} from "./_testCommon";

/************************************** hooks */

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** global variables */

const newUser = {
  firstName: "Lawrence",
  lastName: "O",
  phone: "1213213213",
  email: "lawrenceo@fakemail.com",
};

/************************************** getId */
describe("getId", function () {
  it("returns a userId for email", async function () {
    const { id: registeredUser } = await Auth.registerAccount({
      ...newUser,
      password: "nigeriaRules",
    });

    const stordUserId = await User.getId(newUser.email);

    expect(stordUserId).toEqual(registeredUser);
  });

  it("returns error for invalid email", async function () {
    const getIdPromise = User.getId("invalid@email.com");
    await expect(getIdPromise).rejects.toThrow(BadRequestError);
    await expect(getIdPromise).rejects.toThrow(`Invalid email.`);
  });
});
