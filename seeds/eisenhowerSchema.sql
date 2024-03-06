DROP TABLE IF EXISTS users, tokens_registration, tasks;

-- Create the users table with constraints
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(30) NOT NULL CHECK (LENGTH(first_name) >= 1),
  last_name VARCHAR(30) NOT NULL CHECK (LENGTH(last_name) >= 1), 
  phone TEXT NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
   -- PEER - Do you prefer line 10 or line 11 below for validating email input.
  email TEXT NOT NULL CHECK (position('@' IN email) > 1),
  -- email TEXT NOT NULL CHECK (email ~ '.+@.+\..+'),
  hashed_password TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create the tokens table
CREATE TABLE tokens_registration (
  id SERIAL PRIMARY KEY,
  fk_user_id INT UNIQUE,
  FOREIGN KEY (fk_user_id) REFERENCES users(id) ON DELETE CASCADE,
  hashed_token TEXT NOT NULL,
  expiration_timestamp TIMESTAMP NOT NULL
);

-- Create the tasks table
CREATE DOMAIN task_priority AS TEXT CHECK (VALUE IN ('low', 'medium', 'high'));

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  description TEXT NOT NULL CHECK (LENGTH(description) >= 3 AND LENGTH(description)<=50),
  importance task_priority NOT NULL,
  urgency task_priority NOT NULL,
  timebox INT CHECK (timebox >= 1 AND timebox <= 600),
  completed BOOLEAN NOT NULL DEFAULT FALSE
)