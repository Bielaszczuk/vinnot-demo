-- #482: remove the roles and permissions no code path uses: ROLE_TOURISM_OPERATOR, ROLE_VERIFIED_EXPERT and ARTICLE_*.
-- The guard stops the migration while any account still holds one of those roles, so no assignment is dropped silently.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE r.name IN ('ROLE_TOURISM_OPERATOR', 'ROLE_VERIFIED_EXPERT')
    ) THEN
        RAISE EXCEPTION 'V76: an account still holds ROLE_TOURISM_OPERATOR or ROLE_VERIFIED_EXPERT; reassign it before removing the unused roles';
    END IF;
END $$;

-- role_permissions references both tables with ON DELETE CASCADE (V1), so the grants go with their rows.
DELETE FROM roles
WHERE name IN ('ROLE_TOURISM_OPERATOR', 'ROLE_VERIFIED_EXPERT');

DELETE FROM permissions
WHERE code IN ('ARTICLE_CREATE', 'ARTICLE_UPDATE_OWN', 'ARTICLE_DELETE', 'ARTICLE_DELETE_OWN');
