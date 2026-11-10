-- V33: Finalize roles UUID PK migration + seed future roles
-- Completes V32: swaps roles.id to UUID, re-creates user_roles FK, adds future roles.

-- 1. Drop old integer PK
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_pkey;
ALTER TABLE roles DROP COLUMN IF EXISTS id;
ALTER TABLE roles RENAME COLUMN uuid_id TO id;
ALTER TABLE roles ADD PRIMARY KEY (id);

-- 2. Apply uuid_role_id as the real FK in user_roles
ALTER TABLE user_roles DROP COLUMN IF EXISTS role_id;
ALTER TABLE user_roles RENAME COLUMN uuid_role_id TO role_id;
ALTER TABLE user_roles ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE user_roles
    ADD CONSTRAINT fk_user_roles_role
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id_v2 ON user_roles(role_id);

-- 3. Add FK on role_permissions → roles (now that roles has UUID PK)
ALTER TABLE role_permissions
    ADD CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);

-- 4. Drop legacy string role column from user_roles (no longer needed)
ALTER TABLE user_roles DROP COLUMN IF EXISTS role;

-- 5. Seed future roles (no permissions yet — to be added via admin panel)
INSERT INTO roles (name, description) VALUES
    ('ROLE_TOURISM_OPERATOR', 'Municipios y organismos de turismo — gestionan rutas del vino propias'),
    ('ROLE_VERIFIED_EXPERT',  'Sommeliers y enólogos verificados — pueden escribir artículos y tienen badge de verificación')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions to TOURISM_OPERATOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_TOURISM_OPERATOR'
  AND p.code IN (
    'WINE_READ','WINERY_READ','EVENT_READ',
    'WINE_ROUTE_READ','WINE_ROUTE_CREATE','WINE_ROUTE_UPDATE_OWN','WINE_ROUTE_DELETE_OWN',
    'REVIEW_CREATE','REVIEW_UPDATE_OWN','REVIEW_DELETE_OWN',
    'CELLAR_MANAGE_OWN'
  )
ON CONFLICT DO NOTHING;

-- Grant permissions to VERIFIED_EXPERT
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ROLE_VERIFIED_EXPERT'
  AND p.code IN (
    'WINE_READ','WINERY_READ','EVENT_READ','WINE_ROUTE_READ',
    'REVIEW_CREATE','REVIEW_UPDATE_OWN','REVIEW_DELETE_OWN',
    'ARTICLE_CREATE','ARTICLE_UPDATE_OWN','ARTICLE_DELETE_OWN',
    'CELLAR_MANAGE_OWN'
  )
ON CONFLICT DO NOTHING;

