DROP TABLE IF EXISTS users, tokens_registration, tasks;

-- Create the users table with constraints
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(30) NOT NULL CHECK (LENGTH(first_name) >= 1),
  last_name VARCHAR(30) NOT NULL CHECK (LENGTH(last_name) >= 1), 
  phone TEXT NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
  email TEXT UNIQUE NOT NULL CHECK (position('@' IN email) > 1),
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
CREATE DOMAIN priority_domain AS TEXT CHECK (VALUE IN ('now', 'delegate', 'schedule','avoid'));

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  title TEXT NOT NULL CHECK (LENGTH(title) >= 3 AND LENGTH(title)<=50),
  important BOOLEAN NOT NULL,
  urgent BOOLEAN NOT NULL,
  priority priority_domain NOT NULL,
  timebox INT CHECK (timebox >= 1 AND timebox <= 600),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT CHECK (LENGTH(note) >= 1 AND LENGTH(note)<=500),
  category TEXT CHECK (LENGTH(category) >= 1 AND LENGTH(category)<=15),
  deadline_date DATE
);

-- Trigger function to prevent updates to tasks.user_id
CREATE FUNCTION prevent_user_id_update()
RETURNS TRIGGER AS $prevent_user_id_update$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Updating user_id column is not allowed.';
    END IF;
    RETURN NEW;
END;
$prevent_user_id_update$ LANGUAGE plpgsql;

-- Attach the trigger to the tasks table. Function will be called before an update operation on the tasks table.
CREATE OR REPLACE TRIGGER prevent_user_id_update_trigger
BEFORE UPDATE OF user_id ON tasks
FOR EACH ROW
EXECUTE FUNCTION prevent_user_id_update();
