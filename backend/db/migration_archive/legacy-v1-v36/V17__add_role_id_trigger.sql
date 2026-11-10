-- V17: Add trigger to auto-populate role_id on user_roles insert

-- Allow NULL temporarily for new inserts (will be filled by trigger)
ALTER TABLE user_roles ALTER COLUMN role_id DROP NOT NULL;

-- Create function to auto-set role_id from role name
CREATE OR REPLACE FUNCTION set_role_id_from_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role_id IS NULL AND NEW.role IS NOT NULL THEN
        SELECT id INTO NEW.role_id FROM roles WHERE name = NEW.role;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before insert
CREATE TRIGGER trg_user_roles_set_role_id
BEFORE INSERT ON user_roles
FOR EACH ROW
EXECUTE FUNCTION set_role_id_from_name();

-- Also create a trigger for update
CREATE TRIGGER trg_user_roles_update_role_id
BEFORE UPDATE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION set_role_id_from_name();

