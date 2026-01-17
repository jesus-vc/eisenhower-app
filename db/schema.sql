DROP EXTENSION IF EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS users, tokens_registration, tasks, categories;

CREATE TABLE users (
  -- id SERIAL PRIMARY KEY,
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(30) NOT NULL CHECK (LENGTH(first_name) >= 1),
  last_name VARCHAR(30) NOT NULL CHECK (LENGTH(last_name) >= 1), 
  phone TEXT NOT NULL CHECK (phone ~ '^[0-9]{10}$'),
  email TEXT UNIQUE NOT NULL CHECK (position('@' IN email) > 1),
  hashed_password TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE tokens_registration (
  -- id SERIAL PRIMARY KEY,
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fk_user_id UUID UNIQUE,
  FOREIGN KEY (fk_user_id) REFERENCES users(id) ON DELETE CASCADE,
  hashed_token TEXT NOT NULL,
  expiration_timestamp TIMESTAMP NOT NULL
);

--//PEER Lawrence, I opted to use uuid_generate_v4() over SERIAL for IDs since uuid has many advantages such as greater gobal uniqueness. Does this choice seem suitable? 
CREATE TABLE categories (
  -- id SERIAL PRIMARY KEY,
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ui_category_id TEXT UNIQUE DEFAULT 'CA-' || uuid_generate_v4()::text,
  fk_user_id UUID,
  FOREIGN KEY (fk_user_id) REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (LENGTH(name) >= 3 AND LENGTH(name)<=50),
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX unique_default_category_per_user 
ON categories (fk_user_id) 
WHERE is_default = TRUE;

CREATE TABLE tasks (
  -- id SERIAL PRIMARY KEY,
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ui_task_id TEXT UNIQUE DEFAULT 'TA-' || uuid_generate_v4()::text,
  fk_user_id UUID NOT NULL,
  FOREIGN KEY (fk_user_id) REFERENCES users(id) ON DELETE CASCADE,
  fk_category_id UUID NOT NULL,
  FOREIGN KEY (fk_category_id) REFERENCES categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (LENGTH(title) >= 3 AND LENGTH(title)<=50),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  timebox INT CHECK (timebox >= 1 AND timebox <= 600),
  note TEXT CHECK (LENGTH(note) >= 1 AND LENGTH(note)<=500),
  deadline_date DATE
);