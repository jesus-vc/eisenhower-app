// Load the real nodemailer
import nodemailer from "nodemailer";
import { getMockFor } from "nodemailer-mock";

// Get the mock for nodemailer
const nodemailerMocked = getMockFor(nodemailer);

export default nodemailerMocked;

// const { getMockFor } = require('../../dist/nodemailer-mock');
// const nodemailer = require('nodemailer');
// module.exports = getMockFor(nodemailer);
