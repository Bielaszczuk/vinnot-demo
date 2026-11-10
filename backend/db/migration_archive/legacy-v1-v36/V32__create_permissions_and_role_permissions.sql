-- V32: Full RBAC — permissions table + role_permissions junction
-- Builds on V16 which already created the roles table and role_id FK.
-- This migration adds granular permissions and seeds the full role-permission matrix.

-- 1. Recreate roles with UUID (V16 used BIGSERIAL — inconsistent with rest of schema)
--    We migrate in-place: add uuid column, populate, swap PKs.

ALTER TABLE roles ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();
UPDATE roles SET uuid_id = gen_random_uuid() WHERE uuid_id IS NULL;

-- Temporarily drop FK from user_roles so we can change roles PK
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS fk_user_roles_role;

-- Add uuid_role_id to user_roles before we swap
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS uuid_role_id UUID;
UPDATE user_roles ur
SET uuid_role_id = r.uuid_id
FROM roles r
WHERE ur.role_id = r.id;

-- 2. Create permissions table
CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed permissions
INSERT INTO permissions (code, description) VALUES
    -- Wines
    ('WINE_READ',                'Read wine details'),
    ('WINE_CREATE',              'Create a new wine'),
    ('WINE_UPDATE',              'Update any wine'),
    ('WINE_DELETE',              'Delete any wine'),
    -- Wineries
    ('WINERY_READ',              'Read winery details'),
    ('WINERY_CREATE',            'Create a new winery'),
    ('WINERY_UPDATE',            'Update any winery'),
    ('WINERY_DELETE',            'Delete any winery'),
    -- Events
    ('EVENT_READ',               'Read event details'),
    ('EVENT_CREATE',             'Create a new event'),
    ('EVENT_UPDATE',             'Update any event'),
    ('EVENT_UPDATE_OWN',         'Update own events'),
    ('EVENT_DELETE',             'Delete any event'),
    ('EVENT_DELETE_OWN',         'Delete own events'),
    -- Wine Routes
    ('WINE_ROUTE_READ',          'Read wine route details'),
    ('WINE_ROUTE_CREATE',        'Create a new wine route'),
    ('WINE_ROUTE_UPDATE',        'Update any wine route'),
    ('WINE_ROUTE_UPDATE_OWN',    'Update own wine routes'),
    ('WINE_ROUTE_DELETE',        'Delete any wine route'),
    ('WINE_ROUTE_DELETE_OWN',    'Delete own wine routes'),
    -- Reviews
    ('REVIEW_CREATE',            'Create a wine review'),
    ('REVIEW_UPDATE_OWN',        'Update own reviews'),
    ('REVIEW_DELETE',            'Delete any review'),
    ('REVIEW_DELETE_OWN',        'Delete own reviews'),
    -- Users
    ('USER_READ',                'Read user profiles'),
    ('USER_UPDATE',              'Update any user profile'),
    ('USER_BAN',                 'Ban a user'),
    ('USER_DELETE',              'Delete a user'),
    ('ROLE_ASSIGN',              'Assign roles to users'),
    -- Cellar
    ('CELLAR_MANAGE_OWN',        'Manage own wine cellar'),
    -- Articles (future VERIFIED_EXPERT)
    ('ARTICLE_CREATE',           'Write articles'),
    ('ARTICLE_UPDATE_OWN',       'Update own articles'),
    ('ARTICLE_DELETE',           'Delete any article'),
    ('ARTICLE_DELETE_OWN',       'Delete own articles'),
    -- Admin panel
    ('ADMIN_DASHBOARD_READ',     'Access admin dashboard');

-- 3. Create role_permissions junction
CREATE TABLE role_permissions (
    role_id       UUID NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Helper: grant permissions to a role by code
-- We use CTEs to avoid brittle hard-coded UUIDs

-- ROLE_ADMIN — full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.uuid_id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_ADMIN';

-- ROLE_MODERATOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.uuid_id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_MODERATOR'
  AND p.code IN (
    'WINE_READ','WINE_CREATE','WINE_UPDATE',
    'WINERY_READ','WINERY_CREATE','WINERY_UPDATE',
    'EVENT_READ','EVENT_CREATE','EVENT_UPDATE',
    'WINE_ROUTE_READ','WINE_ROUTE_CREATE','WINE_ROUTE_UPDATE',
    'REVIEW_CREATE','REVIEW_UPDATE_OWN','REVIEW_DELETE','REVIEW_DELETE_OWN',
    'USER_READ',
    'ARTICLE_CREATE','ARTICLE_UPDATE_OWN','ARTICLE_DELETE',
    'ADMIN_DASHBOARD_READ'
  );

-- ROLE_PARTNER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.uuid_id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_PARTNER'
  AND p.code IN (
    'WINE_READ',
    'WINERY_READ',
    'EVENT_READ','EVENT_CREATE','EVENT_UPDATE_OWN','EVENT_DELETE_OWN',
    'WINE_ROUTE_READ',
    'REVIEW_CREATE','REVIEW_UPDATE_OWN','REVIEW_DELETE_OWN',
    'CELLAR_MANAGE_OWN'
  );

-- ROLE_USER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.uuid_id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_USER'
  AND p.code IN (
    'WINE_READ',
    'WINERY_READ',
    'EVENT_READ',
    'WINE_ROUTE_READ',
    'REVIEW_CREATE','REVIEW_UPDATE_OWN','REVIEW_DELETE_OWN',
    'CELLAR_MANAGE_OWN'
  );

-- 4. Add FK for role_permissions → roles (using uuid_id for now)
--    Full PK swap will be done in V33 once role_id column is migrated in user_roles

COMMENT ON TABLE permissions IS 'Granular permission codes. Each role gets a set of permissions via role_permissions.';
COMMENT ON TABLE role_permissions IS 'Many-to-many mapping of roles to permissions.';

