Questions:

- How to persist logged in?
  - Token?
- Validate 2 pws match on server side?
- Is there a need to validate international phone numbers? https://github.com/google/libphonenumber
- Generally, should my code here not be responsible for creating the database? Should I always do that seperately?

  - lessons:

  1. Backend server creates a secret key for that particular user
  2. Server then shares that secret key with the user’s phone application.
  3. Phone application initializes a counter.
  4. Phone application generate a one time password using that secret key and counter.
  5. Phone application changes the counter after a certain interval and regenerates the one time password making it dynamic.
