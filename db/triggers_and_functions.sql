-- Prevent updates to id columns
CREATE OR REPLACE FUNCTION prevent_id_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot update id column.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_id_update_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_id_update();

CREATE TRIGGER prevent_id_update_users
BEFORE UPDATE ON tokens_registration
FOR EACH ROW
EXECUTE FUNCTION prevent_id_update();

CREATE TRIGGER prevent_id_update_tasks
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION prevent_id_update();

CREATE TRIGGER prevent_id_update_categories
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION prevent_id_update();

-- Prevent updates to tasks.fk_user_id
CREATE OR REPLACE FUNCTION prevent_fk_user_id_update()
RETURNS TRIGGER AS $prevent_fk_user_id_update_trigger$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Updating fk_user_id column is not allowed.';
    END IF;
    RETURN NEW;
END;
$prevent_fk_user_id_update_trigger$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER prevent_fk_user_id_update_on_tasks_trigger
BEFORE UPDATE OF fk_user_id ON tasks
FOR EACH ROW
EXECUTE FUNCTION prevent_fk_user_id_update();

CREATE OR REPLACE TRIGGER prevent_fk_user_id_update_on_categories_trigger
BEFORE UPDATE OF fk_user_id ON categories
FOR EACH ROW
EXECUTE FUNCTION prevent_fk_user_id_update();

-- Prevent updates to UI Ids
CREATE OR REPLACE FUNCTION prevent_ui_id_update()
RETURNS TRIGGER AS $prevent_ui_id_update_trigger$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Updating user interface Ids is not allowed.';
    END IF;
    RETURN NEW;
END;
$prevent_ui_id_update_trigger$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER prevent_ui_task_id_update_on_tasks_trigger
BEFORE UPDATE OF ui_task_id ON tasks
FOR EACH ROW
EXECUTE FUNCTION prevent_ui_id_update();

CREATE OR REPLACE TRIGGER prevent_ui_category_id_update_on_categories_trigger
BEFORE UPDATE OF ui_category_id ON categories
FOR EACH ROW
EXECUTE FUNCTION prevent_ui_id_update();

-- Notify clients of changes to tasks or categories tables
CREATE OR REPLACE FUNCTION notify_clients_change()
RETURNS TRIGGER AS $notify_clients_change_trigger$
DECLARE 
  user_id text;
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    user_id := NEW.fk_user_id::text;
  ELSIF (TG_OP = 'DELETE') THEN
    user_id := OLD.fk_user_id::text;
  END IF;

  PERFORM pg_notify('data_change', user_id);
  RETURN NEW;
END;
$notify_clients_change_trigger$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER notify_clients_tasks_changes_trigger
AFTER UPDATE OR DELETE OR INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_clients_change();

CREATE OR REPLACE TRIGGER notify_clients_categories_changes_trigger
AFTER UPDATE OR DELETE OR INSERT ON categories
FOR EACH ROW
EXECUTE FUNCTION notify_clients_change();

-- Automatically create a default category when a new user is registered
CREATE OR REPLACE FUNCTION create_default_category()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO categories (fk_user_id, name, is_default)
    VALUES (NEW.id, 'Ideas', TRUE)
    ON CONFLICT (fk_user_id)
    WHERE is_default = TRUE -- Check if default category already exists for this user
    DO NOTHING; -- Skip creating another default if it already exists
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_default_category
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_category();