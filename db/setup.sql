DROP DATABASE IF EXISTS eisenhower_test;

CREATE DATABASE eisenhower_test;

\connect eisenhower_test

-- Execute SQL scripts
\i db/schema.sql
\i db/triggers_and_functions.sql