-- V36: Drop obsolete triggers and function from V17
-- Hibernate now inserts (user_id, role_id) directly; the trigger references
-- NEW.role which no longer exists on the user_roles join table.

DROP TRIGGER IF EXISTS trg_user_roles_set_role_id ON user_roles;
DROP TRIGGER IF EXISTS trg_user_roles_update_role_id ON user_roles;
DROP FUNCTION IF EXISTS set_role_id_from_name();

