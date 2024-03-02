# A Task Priorization app that leverages the Eisenhower Methodology.

## /routers/ contains four Backend routes built thus far:

    - POST /user/register
    - POST /user/verify
    - POST /auth/login
    - GET /task/:userId

## Requirements to start app

    - Install psql
    - Run npm install
    - .env file with variables: GMAIL_ACCOUNT, GMAIL_PASSWORD, SECRET_KEY

## Run tests from root directory:

    - npm test

    - Integration tests for these four routes are found in routes/integration.test.js contains

## Start app from root directory:

    - psql eisenhower_test < seeds/eisenhower.sql

    - nodemon server.js OR node server.js
