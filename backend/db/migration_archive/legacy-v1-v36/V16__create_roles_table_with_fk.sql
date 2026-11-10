-- V16: Create roles table and update user_roles to use FK

-- 1. Create the roles table
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed default roles (both with and without ROLE_ prefix for matching)
INSERT INTO roles (name, description) VALUES
    ('ROLE_USER', 'Standard user with basic permissions'),
    ('ROLE_ADMIN', 'Administrator with full access'),
    ('ROLE_MODERATOR', 'Moderator with content management permissions'),
    ('ROLE_PARTNER', 'Partner (winery owner) with business management permissions');

-- 3. Normalize existing role values to include ROLE_ prefix
UPDATE user_roles SET role = 'ROLE_' || role
WHERE role NOT LIKE 'ROLE_%';

-- 4. Add role_id column to user_roles (nullable initially)
ALTER TABLE user_roles ADD COLUMN role_id BIGINT;

-- 5. Populate role_id from the normalized role strings
UPDATE user_roles
SET role_id = r.id
FROM roles r
WHERE user_roles.role = r.name;

-- 6. For any remaining NULLs, default to ROLE_USER
UPDATE user_roles
SET role_id = (SELECT id FROM roles WHERE name = 'ROLE_USER')
WHERE role_id IS NULL;

-- 7. Make role_id NOT NULL now that all rows have a value
ALTER TABLE user_roles ALTER COLUMN role_id SET NOT NULL;

-- 8. Add FK constraint
ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

-- 9. Create index on role_id
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);


