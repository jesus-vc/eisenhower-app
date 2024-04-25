import { validateSchemas } from "./validationMiddleware";
import {
  taskCreateSchema,
  taskSchemaUpdatePriority,
  taskSchemaUpdatePath,
} from "../schemas/taskSchemas";
import { BadRequestError } from "../expressError";

import { userRegisterSchema, userVerifySchema } from "../schemas/userSchemas";
import { authLoginSchema } from "../schemas/authSchemas";

/************************************** validateSchemas */

describe("validateSchemas", function () {
  it("works: via 1 schema", function () {
    const req = {
      body: {
        title: "New Task 1",
        urgent: true,
        important: false,
      },
      params: {
        userId: "123",
      },
    };
    const res = {};
    const next = jest.fn();

    const validations = [
      {
        schema: taskCreateSchema,
        userIdParam: true,
        reqBody: true,
      },
    ];

    const middleware = validateSchemas(validations);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("works: via multiple schemas", function () {
    const req = {
      body: {
        priority: "now",
      },
      params: {
        userId: "123",
        taskId: "456",
      },
    };

    const res = {};
    const next = jest.fn();

    const validations = [
      { schema: taskSchemaUpdatePriority, reqBody: true },
      { schema: taskSchemaUpdatePath, userIdParam: true, taskIdParam: true },
    ];

    const middleware = validateSchemas(validations);
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("works: valid followed by invalid schema still generates an error", function () {
    const req = {
      body: {
        priority: "now",
      },
      params: {
        userId: "NaN",
        taskId: "NaN",
      },
    };

    const res = {};

    const next = function (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    };

    const validations = [
      { schema: taskSchemaUpdatePriority, reqBody: true },
      { schema: taskSchemaUpdatePath, userIdParam: true, taskIdParam: true },
    ];

    const middleware = validateSchemas(validations);
    middleware(req, res, next);
  });

  it("works: invalid followed by valid schema still generates an error", function () {
    const req = {
      params: {
        userId: "123",
        taskId: "456",
      },
      body: {
        firstName: "U1F",
        lastName: "U1L",
        phone: "1111111111",
        email: "u1@email.com",
        // password: "password1", //required field that triggers schema error
      },
    };

    const res = {};

    const next = function (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    };

    const validations = [
      { schema: userRegisterSchema, reqBody: true },
      { schema: taskSchemaUpdatePath, userIdParam: true, taskIdParam: true },
    ];

    const middleware = validateSchemas(validations);
    middleware(req, res, next);
  });
});
