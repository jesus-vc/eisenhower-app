-- DROP DATABASE eisenhower;
-- CREATE DATABASE eisenhower;
-- \connect eisenhower

DROP DATABASE IF EXISTS eisenhower_test;

CREATE DATABASE eisenhower_test;

-- Connect to the newly created database
\connect eisenhower_test

-- Execute the SQL script for creating tables and schema
\i seeds/eisenhowerSchema.sql
