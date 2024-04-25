import { BadRequestError } from "../expressError.js";

/**
 * Dynamically validates the schema of data in req.body, req.query, and/or req.params.
 * @param {Array<{ schema: Joi.Schema, userIdParam?: boolean, taskIdParam?: boolean, reqQuery?: boolean, reqBody?: boolean }>} validations - Array of validation rules.
 * @returns Express middleware function.
 * @throws {BadRequestError} Throws BadRequestError if validation fails.
 *
 * @example
 * validateSchemas([
 *   { schema: taskUpdateBodySchema, reqBody: true },
 *   { schema: taskSchemaUpdatePath, userIdParam: true, taskIdParam: true }
 * ]);
 */

export const validateSchemas = (validations) => {
  return (req, res, next) => {
    try {
      validations.forEach((validation) => {
        const requestData = [];
        if (validation.userIdParam)
          requestData.push({ userId: req.params.userId });
        if (validation.taskIdParam)
          requestData.push({ taskId: req.params.taskId });
        if (validation.reqQuery) requestData.push({ ...req.query });
        if (validation.reqBody) requestData.push({ ...req.body });

        const { error } = validation.schema.validate(
          Object.assign({}, ...requestData)
        );
        if (error) throw new BadRequestError(error.message);
      });
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
