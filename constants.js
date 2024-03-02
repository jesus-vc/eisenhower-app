/** //PEER Is there a standard on how to add a constant variable (such as PHONE_NUMBER_REGEX below) to a SQL schema file?
 * For example, the file seeds/eisenhowerSchema.sql has a 'users' table with a 'phone' column that requires a regex pattern.
 * I ask since I assume using a constant variable in SQL schema files could reduce potential inconsitency across multiple regex patterns. */

export const PHONE_NUMBER_REGEX = /^[0-9]{10}$/;
