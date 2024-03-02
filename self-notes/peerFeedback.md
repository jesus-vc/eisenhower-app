1. Which do you prefer from eisenhowerSchema.sql file?

email TEXT NOT NULL CHECK (position('@' IN email) > 1),
OR
email TEXT NOT NULL CHECK (email ~ '.+@.+\..+'),

2.
