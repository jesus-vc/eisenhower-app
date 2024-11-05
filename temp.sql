

INSERT INTO tasks(fk_category_id, fk_user_id, title, timebox, note, deadline_date, completed) 
SELECT categories.id, 
$1, $2, $3, $4, $5, $6 
FROM categories 
WHERE categories.ui_category_id = $7  RETURNING id AS "taskId", fk_user_id AS "userId", title, timebox, completed, note, fk_category_id AS "categoryId", deadline_date AS "deadlineDate", undefined
 [
  11113,                   -- $1 fk_user_id
  'Newest Idea2',           -- $2 title
  90,                       -- $3 timebox
  false,                    -- $4 completed
  'Note 1',                 -- $5 note
  'CA-676ae723-fc0f-46ee-820d-33104c9e048b' -- $6 ui_category_id
]

const query = `
  INSERT INTO tasks (fk_category_id, fk_user_id, title, timebox, completed, note, deadline_date)
  VALUES (
    (SELECT id FROM categories WHERE ui_category_id = $1),
    $2, $3, $4, $5, $6, $7
  )
  RETURNING id AS "taskId", fk_user_id AS "userId", title, timebox, completed, note, fk_category_id AS "categoryId", deadline_date AS "deadlineDate";
`;

const values = ['CA-676ae723-fc0f-46ee-820d-33104c9e048b', 11113, 'Newest Idea2', 90, false, 'Note 1', '2024-12-31'];

INSERT INTO tasks (fk_category_id, fk_user_id, title, timebox, completed, note, deadline_date)
VALUES ((SELECT id FROM categories WHERE ui_category_id = 'CA-3d75b9c9-e940-4c12-9ccd-f6b242da90b1'),
    11113, 'Newest Idea2', 90, false, 'Note 1',  '1111-01-01');

 
--  INSERT INTO tasks(fk_user_id, title, timebox, note, deadline_date, ui_category_id) 
 
--  VALUES($1, $2, $3, $4, $5, $6) 
 
--  RETURNING id AS "taskId", fk_user_id AS "userId", title, timebox, completed, note, fk_category_id AS "categoryId", deadline_date AS "deadlineDate" 
 
--  [
--       16,
--       'New Task 1',
--       30,
--       'Note 1',
--       '1111-01-01',
--       'CA-c6faf410-e7ed-4b24-b384-53891b8b4fb4'
--     ]

-- INSERT INTO tasks(fk_category_id, fk_user_id, title, timebox, completed, note)
-- SELECT categories.id, 11113, 'Newest Idea2', 90, false, 'Note 1'
-- FROM categories
-- WHERE categories.ui_category_id = 'CA-676ae723-fc0f-46ee-820d-33104c9e048b';


-- INSERT INTO tasks(fk_category_id, fk_user_id, title, timebox, completed, note)
-- SELECT categories.id, $1, $2, $3, $4, $5
-- FROM categories
-- WHERE categories.ui_category_id = $6
-- RETURNING id AS "taskId", fk_user_id AS "userId", title, timebox, completed, note, fk_category_id AS "categoryId";

