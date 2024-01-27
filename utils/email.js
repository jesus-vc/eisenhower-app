import nodemailer from "nodemailer";

//PEER Should this transporter variable be inside the sendEmailRegistration fn?
// I understand that for now it's unecessary since the 'transporter' doesn't need to be dynamic for now.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "eisenhowerapp@gmail.com",
    pass: "rcgf mrcn nhvu pkgu", // temporary pw
  },
});

export default async function sendEmailRegistration(emailClient) {
  const mailOptions = {
    from: "eisenhowerapp@gmail.com",
    to: `${emailClient}`,
    subject: "Account Activation",
    text: "OTP link goes here",
  };
  return await transporter.sendMail(mailOptions);
}
