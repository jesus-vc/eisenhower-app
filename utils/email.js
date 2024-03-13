import nodemailer from "nodemailer";

/**  Load environment variables */
const GMAIL_ACCOUNT = process.env.GMAIL_ACCOUNT;
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_ACCOUNT,
    pass: GMAIL_PASSWORD,
  },
});

/** Sends email registration link to user
 *
 * Requires user data containing {email, plainTextToken, and id }
 *
 * Returns no output besides the exit code */
export default async function sendEmailRegistration(userData) {
  const mailOptions = {
    from: GMAIL_ACCOUNT,
    to: userData.email,
    subject: "Account Activation",
    text: `Welcome! Please click on this url http://localhost:3001/user/verify?token=${userData.plainTextToken}&id=${userData.id}`,
  };

  return await transporter.sendMail(mailOptions);
}
