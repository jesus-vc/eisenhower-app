import DateExtension from "@joi/date";
import JoiImport from "joi";
const Joi = JoiImport.extend(DateExtension);

/** //NICE-TO-HAVE Revisit in future
 * 1. As I evolve the API routes, consider combining schemas, including using Joi's 'extend' feature which allows for establishing base schemas that can be customized.
 * 2. As I build front-end for this application, re-evaluate if I need to handle for duplicate keys passed by clients, given keys in a JavaScript object must already be unique.
 */

export const schemaCreateTask = Joi.object({
	userId: Joi.string()
		.uuid()
		.required()
		.messages({ "string.guid": '"userId" must be a valid UUID' }),
	title: Joi.string().min(3).max(30).required(),
	timebox: Joi.number().positive().min(1).max(600),
	note: Joi.string().min(1).max(500),
	categoryId: Joi.string()
		.pattern(/^CA-[0-9a-fA-F-]{36}$/)
		.messages({
			"string.pattern.base": '"categoryId" must be in the format "CA-UUID"',
		}),
	deadlineDate: Joi.date().format("YYYY-MM-DD"),
});

export const schemaUpdateTaskBody = Joi.object({
	title: Joi.string().min(3).max(30),
	timebox: Joi.number().positive().min(1).max(600),
	completed: Joi.boolean(),
	note: Joi.string().min(1).max(500),
	categoryId: Joi.string()
		.pattern(/^CA-[0-9a-fA-F-]{36}$/)
		.messages({
			"string.pattern.base": '"categoryId" must be in the format "CA-UUID"',
		}),
	deadlineDate: Joi.date().format("YYYY-MM-DD"),
});

export const schemaUpdateTaskPath = Joi.object({
	taskId: Joi.string()
		.pattern(/^TA-[0-9a-fA-F-]{36}$/)
		.messages({
			"string.pattern.base": '"taskId" must be in the format "TA-UUID"',
		})
		.required(),
	userId: Joi.string()
		.uuid()
		.required()
		.messages({ "string.guid": '"userId" must be a valid UUID' }),
});

export const schemaGetTask = Joi.object({
	userId: Joi.string()
		.uuid()
		.required()
		.messages({ "string.guid": '"userId" must be a valid UUID' }),
	title: Joi.string().min(3).max(30),
	completed: Joi.boolean(),
	deadlineDate: Joi.date().format("YYYY-MM-DD"),
	cats: Joi.boolean(),
});

export const schemaDeleteTask = Joi.object({
	userId: Joi.string()
		.uuid()
		.required()
		.messages({ "string.guid": '"userId" must be a valid UUID' }),
	taskId: Joi.string()
		.pattern(/^TA-[0-9a-fA-F-]{36}$/)
		.messages({
			"string.pattern.base": '"taskId" must be in the format "TA-UUID"',
		})
		.required(),
});

export const schemaDeleteCategory = Joi.object({
	userId: Joi.string()
		.uuid()
		.required()
		.messages({ "string.guid": '"userId" must be a valid UUID' }),
	categoryId: Joi.string()
		.pattern(/^CA-[0-9a-fA-F-]{36}$/)
		.required()
		.messages({
			"string.pattern.base": '"categoryId" must be in the format "CA-UUID"',
		}),
});

export const schemaCreateCategory = Joi.object({
	userId: Joi.string()
		.uuid()
		.required()
		.messages({ "string.guid": '"userId" must be a valid UUID' }),
	categoryName: Joi.string().min(3).max(50).required(),
});

export const schemaUpdateCategoryPath = Joi.object({
	categoryId: Joi.string()
		.pattern(/^CA-[0-9a-fA-F-]{36}$/)
		.required()
		.messages({
			"string.pattern.base": '"categoryId" must be in the format "CA-UUID"',
		}),
	userId: Joi.string()
		.uuid()
		.required()
		.messages({ "string.guid": '"userId" must be a valid UUID' }),
});

export const schemaUpdateCategoryBody = Joi.object({
	categoryName: Joi.string().min(3).max(50).required(),
});
