// import sendEmailRegistration from "../utils/email";

// import nodemailer from "nodemailer";

// // import nodemailerMocked from "nodemailer";

// /** 'nodemailer' is automatically mocked in ./__mocks__/nodemailer.js */

// /** get the mock utilities from the mocked nodemailer*/

// // console.log("nodemailerMocked");

// // console.log(nodemailerMocked);

// // Mock the nodemailer module
// // jest.mock("nodemailer");
// // jest.mock();

// /************************************** sendEmailRegistration() */

// describe("sendEmailRegistration()", function () {
//   it("emails to new user's email address", async function () {
//     const recipient = "newuser@example.com";
//     const sender = "eisenhowerapp@gmail.com";
//     await sendEmailRegistration(recipient);

//     // const sentMail = nodemailerMocked.getSentMail();
//     // console.log("sentMail");

//     // console.log(sentMail);

//     const sentMail = nodemailer.createTransport().sendMail.mock.calls[0][0];

//     // Make assertions on the sent email
//     expect(sentMail.from).toEqual("eisenhowerapp@gmail.com");

//     // expect(sentMail).toHaveLength(1); // Assuming one email is sent
//     // expect(sentMail[0].from).toEqual(sender);
//     // expect(sentMail[0].to).toEqual(recipient);
//     // expect(sentMail[0].subject).toEqual("Account Activationn");
//     // expect(sentMail[0].text).toEqual("Account Activationn");
//   });
// });
