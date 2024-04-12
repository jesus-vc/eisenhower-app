import { BadRequestError } from "../expressError.js";

/**
 * Dynamically validates the schema of data in req.body, req.query, and/or req.params.
 * @param {Array<{ schema: Joi.Schema, userIdParam?: boolean, taskIdParam?: boolean, reqQuery?: boolean, reqBody?: boolean }>} validations - Array of validation rules.
 * @returns Express middleware function.
 * @throws {BadRequestError} Throws BadRequestError if validation fails.
 *
 * @example
 * validateRequest([
 *   { schema: taskUpdateBodySchema, reqBody: true },
 *   { schema: taskSchemaUpdatePath, userIdParam: true, taskIdParam: true }
 * ]);
 */

//PEER would it be better if I use array.map or array.reduce here instead of for-loop?
export const validateRequest = (validations) => {
  return (req, res, next) => {
    try {
      for (const validation of validations) {
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
      }
      return next(); //PEER Lawrence am I correct in having this return next() outside the for-loop? I believe this allows the next() fn being called only after all validations inside the for-loop have completed.
    } catch (error) {
      return next(error);
    }
  };
};
