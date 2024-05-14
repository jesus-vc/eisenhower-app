# A Task Priorization app that leverages the Eisenhower Methodology.

## Requirements to start app

    - Install psql
    - Run npm install
    - .env file with variables: EMAIL_ACCOUNT, EMAIL_PASSWORD, SECRET_KEY

## Run tests from root directory:

    - npm test

    - Integration tests for these four routes are found in routes/integration.test.js file.

## Start app from root directory:

    - psql eisenhower_test < seeds/eisenhower.sql

    - nodemon server.js OR node server.js
