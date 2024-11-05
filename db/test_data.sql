DELETE FROM tasks
WHERE EXISTS (SELECT 1 FROM tasks);

DELETE FROM categories
WHERE EXISTS (SELECT 1 FROM categories);

DELETE FROM users
WHERE EXISTS (SELECT 1 FROM users);

-- 2a7bcaeb-e2ab-4431-a694-da2905eb8de5
-- 0c8950f7-041d-4012-a06e-f1fc4a57cd23

INSERT INTO users (id, first_name, last_name, phone, email, hashed_password, verified, is_admin) VALUES
('2a7bcaeb-e2ab-4431-a694-da2905eb8de5', 'John', 'Doe', '1234567890', 'john.doe@example.com', 'hashed_password_1', TRUE, TRUE),
('0c8950f7-041d-4012-a06e-f1fc4a57cd23', 'Jane', 'Smith', '0987654321', 'jane.smith@example.com', 'hashed_password_2', True, TRUE);

INSERT INTO categories (id, fk_user_id, name) VALUES
('84432c1c-237e-4ba9-9a1d-55924438dedd', '0c8950f7-041d-4012-a06e-f1fc4a57cd23', 'Finances'),
('f14395f5-fa39-4281-ae59-ab411bbf2db8', '0c8950f7-041d-4012-a06e-f1fc4a57cd23', 'Family'),
('9559c9bb-098e-4244-89df-a04d553b5d08', '0c8950f7-041d-4012-a06e-f1fc4a57cd23', 'Career'),
('8c1decb6-526b-4a03-99d4-71d3c79eb926', '0c8950f7-041d-4012-a06e-f1fc4a57cd23', 'Friendships'),
('781f835e-bea8-4d59-b981-052c15f2eb24', '0c8950f7-041d-4012-a06e-f1fc4a57cd23', 'Gym'),
('807682ea-7e40-4bf4-9f3c-35889ffb313d', '0c8950f7-041d-4012-a06e-f1fc4a57cd23', 'Health'),
('98dddf00-e371-4996-83f8-3d61c7969eef', '2a7bcaeb-e2ab-4431-a694-da2905eb8de5', 'Pets'),
('bf331360-e2ec-4dad-b7c2-914a0807652a', '2a7bcaeb-e2ab-4431-a694-da2905eb8de5', 'Exercise');

INSERT INTO tasks ( fk_user_id, fk_category_id, title, timebox, completed, note, deadline_date)
VALUES
  ( '0c8950f7-041d-4012-a06e-f1fc4a57cd23', 'f14395f5-fa39-4281-ae59-ab411bbf2db8', 'Task 3', 60, TRUE, 'Note1', '2222-02-02'),
  ( '0c8950f7-041d-4012-a06e-f1fc4a57cd23', '84432c1c-237e-4ba9-9a1d-55924438dedd', 'Task 6', 90, TRUE, 'Note2', '3333-03-03'),
  ( '0c8950f7-041d-4012-a06e-f1fc4a57cd23', '84432c1c-237e-4ba9-9a1d-55924438dedd', 'Task 4', 60, FALSE, 'Note3', '2024-02-02'),
  ( '0c8950f7-041d-4012-a06e-f1fc4a57cd23', '84432c1c-237e-4ba9-9a1d-55924438dedd', 'Task 2', 60, FALSE, 'Note4', '2222-02-02'),
  ( '0c8950f7-041d-4012-a06e-f1fc4a57cd23', 'f14395f5-fa39-4281-ae59-ab411bbf2db8', 'Task 1', 30, FALSE, 'Note5', '1111-01-01'),
  ( '0c8950f7-041d-4012-a06e-f1fc4a57cd23', '9559c9bb-098e-4244-89df-a04d553b5d08', 'Task 5', 60, FALSE, NULL, NULL),
  ( '0c8950f7-041d-4012-a06e-f1fc4a57cd23', '8c1decb6-526b-4a03-99d4-71d3c79eb926', 'Task 7', 60, FALSE, NULL, NULL),
  ( '0c8950f7-041d-4012-a06e-f1fc4a57cd23', '781f835e-bea8-4d59-b981-052c15f2eb24', 'Task 8', 60, FALSE, NULL, NULL),
  ( '0c8950f7-041d-4012-a06e-f1fc4a57cd23', 'f14395f5-fa39-4281-ae59-ab411bbf2db8', 'Task 9', 60, FALSE, NULL, NULL),
  ( '0c8950f7-041d-4012-a06e-f1fc4a57cd23', '9559c9bb-098e-4244-89df-a04d553b5d08', 'Task 10', 60, FALSE, NULL, NULL),
  ( '2a7bcaeb-e2ab-4431-a694-da2905eb8de5', 'f14395f5-fa39-4281-ae59-ab411bbf2db8', 'Task 11', 60, FALSE, NULL, NULL),
  ( '2a7bcaeb-e2ab-4431-a694-da2905eb8de5', '781f835e-bea8-4d59-b981-052c15f2eb24', 'Task 12', 60, FALSE, NULL, NULL),
  ( '2a7bcaeb-e2ab-4431-a694-da2905eb8de5', 'f14395f5-fa39-4281-ae59-ab411bbf2db8', 'Task 13', 60, FALSE, NULL, NULL),
  ( '2a7bcaeb-e2ab-4431-a694-da2905eb8de5', '781f835e-bea8-4d59-b981-052c15f2eb24', 'Task 14', 90, FALSE, 'Note for Task 14', '1111-01-01');


-- INSERT INTO users (id, first_name, last_name, phone, email, hashed_password, verified, is_admin) VALUES
-- (11112, 'John', 'Doe', '1234567890', 'john.doe@example.com', 'hashed_password_1', TRUE, TRUE),
-- (11113, 'Jane', 'Smith', '0987654321', 'jane.smith@example.com', 'hashed_password_2', True, TRUE);

-- INSERT INTO categories (id, fk_user_id, name) VALUES
-- (3324, 11113, 'Finances'),
-- (3325, 11113, 'Family'),
-- (3326, 11113, 'Career'),
-- (3327, 11113, 'Friendships'),
-- (3328, 11113, 'Gym'),
-- (3329, 11113, 'Health'),
-- (3330, 11112, 'Pets'),
-- (3331, 11112, 'Exercise');

-- INSERT INTO tasks ( fk_user_id, fk_category_id, title, timebox, completed, note, deadline_date)
-- VALUES
--   ( 11113, 3325, 'Task 3', 60, TRUE, 'Note1', '2222-02-02'),
--   (11113, 3324, 'Task 6', 90, TRUE, 'Note2', '3333-03-03'),
--   ( 11113, 3324, 'Task 4', 60, FALSE, 'Note3', '2024-02-02'),
--   ( 11113, 3324, 'Task 2', 60, FALSE, 'Note4', '2222-02-02'),
--   ( 11113, 3325, 'Task 1', 30, FALSE, 'Note5', '1111-01-01'),
--   ( 11113, 3326, 'Task 5', 60, FALSE, NULL, NULL),
--   ( 11113, 3327, 'Task 7', 60, FALSE, NULL, NULL),
--   ( 11113, 3328, 'Task 8', 60, FALSE, NULL, NULL),
--   ( 11113, 3325, 'Task 9', 60, FALSE, NULL, NULL),
--   ( 11113, 3326, 'Task 10', 60, FALSE, NULL, NULL),
--   ( 11112, 3325, 'Task 11', 60, FALSE, NULL, NULL),
--   ( 11112, 3327, 'Task 12', 60, FALSE, NULL, NULL),
--   ( 11112, 3325, 'Task 13', 60, FALSE, NULL, NULL),
--   ( 11112, 3328, 'Task 14', 90, FALSE, 'Note for Task 14', '1111-01-01');