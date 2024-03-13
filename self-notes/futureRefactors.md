- Revisit using transactions in node-pg if I want to throw exceptions when a single query fails within a transaction: https://node-postgres.com/features/transactions
- Also revisit if I want to use this pattern to centralize my db configuration: https://node-postgres.com/guides/project-structure. The "import \* as db from '../db.js'" method seems intriguing, but I just don't know enough yet to execute this productively. I need to do more testing on this.

- Revisit secure e-mail communication.

- Handle failed e-mail messages:

  - get notified - can I use nodemailer's dns option?
  - how would I get alerted?

- Add more tests for schemas (E.g. inputting first name longer than 30 chars)
