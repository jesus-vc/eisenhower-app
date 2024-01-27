DROP TABLE IF EXISTS users;

-- Create the users table with constraints
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL CHECK (LENGTH(first_name) >= 1),
  last_name TEXT NOT NULL CHECK (LENGTH(last_name) >= 1), 
  phone TEXT NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
  email TEXT NOT NULL CHECK (position('@' IN email) > 1),
  hashed_password TEXT NOT NULL, 
  registered BOOLEAN NOT NULL DEFAULT FALSE
);
