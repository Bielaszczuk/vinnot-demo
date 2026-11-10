package com.vinnot.user.infrastructure.persistence;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

/**
 * V76 removes the roles and permissions that no code path uses (#482): ROLE_TOURISM_OPERATOR, ROLE_VERIFIED_EXPERT
 * and the ARTICLE_* permissions. A guard refuses to run while any account still holds one of those roles, so an
 * assignment is never dropped silently. The four roles the application uses keep every other permission.
 */
@Testcontainers(disabledWithoutDocker = true)
class UnusedRolesRemovalMigrationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final List<String> REMOVED_ROLES = List.of("ROLE_TOURISM_OPERATOR", "ROLE_VERIFIED_EXPERT");
    private static final List<String> REMOVED_PERMISSIONS =
            List.of("ARTICLE_CREATE", "ARTICLE_UPDATE_OWN", "ARTICLE_DELETE", "ARTICLE_DELETE_OWN");
    private static final UUID HOLDER = UUID.randomUUID();
    private static JdbcTemplate jdbc;
    private static Map<String, Set<String>> permissionsBefore;
    private static Throwable guardFailure;
    private static Integer removedRolesWhileBlocked;
    private static Integer removedPermissionsWhileBlocked;
    private static Integer holderAssignmentsWhileBlocked;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target(lastVersionBeforeRemoval(dataSource))
                .load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        permissionsBefore = permissionsByRole();

        user(HOLDER);
        jdbc.update("INSERT INTO user_roles(user_id, role_id) SELECT ?, id FROM roles WHERE name = 'ROLE_VERIFIED_EXPERT'",
                HOLDER);
        guardFailure = catchThrowable(() -> fullMigration(dataSource).migrate());
        removedRolesWhileBlocked = countRoles();
        removedPermissionsWhileBlocked = countPermissions();
        holderAssignmentsWhileBlocked = jdbc.queryForObject(
                "SELECT count(*) FROM user_roles WHERE user_id = ?", Integer.class, HOLDER);

        jdbc.update("DELETE FROM user_roles WHERE user_id = ?", HOLDER);
        fullMigration(dataSource).migrate();
    }

    @Test
    void theGuardRefusesToRunWhileAnAccountHoldsARemovedRoleAndChangesNothing() {
        assertThat(guardFailure).isInstanceOf(FlywayException.class);
        assertThat(guardFailure.getMessage()).contains("ROLE_TOURISM_OPERATOR or ROLE_VERIFIED_EXPERT");
        assertThat(removedRolesWhileBlocked).isEqualTo(2);
        assertThat(removedPermissionsWhileBlocked).isEqualTo(4);
        assertThat(holderAssignmentsWhileBlocked).isEqualTo(1);
    }

    @Test
    void theUnusedRolesAndArticlePermissionsAreGone() {
        assertThat(countRoles()).isZero();
        assertThat(countPermissions()).isZero();
        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM role_permissions rp
                LEFT JOIN roles r ON r.id = rp.role_id
                LEFT JOIN permissions p ON p.id = rp.permission_id
                WHERE r.id IS NULL OR p.id IS NULL
                """, Integer.class)).isZero();
        assertThat(jdbc.queryForList("SELECT name FROM roles ORDER BY name", String.class))
                .containsExactly("ROLE_ADMIN", "ROLE_MODERATOR", "ROLE_PARTNER", "ROLE_USER");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM permissions", Integer.class)).isEqualTo(31);
    }

    @Test
    void theRolesInUseKeepEveryOtherPermission() {
        Map<String, Set<String>> after = permissionsByRole();

        assertThat(after.keySet()).containsExactly("ROLE_ADMIN", "ROLE_MODERATOR", "ROLE_PARTNER", "ROLE_USER");
        after.forEach((role, permissions) -> {
            Set<String> expected = new HashSet<>(permissionsBefore.get(role));
            REMOVED_PERMISSIONS.forEach(expected::remove);
            assertThat(permissions).as(role).isEqualTo(expected);
        });
        assertThat(after.get("ROLE_ADMIN")).hasSize(31);
        assertThat(after.get("ROLE_MODERATOR")).hasSize(18).doesNotContain("CELLAR_MANAGE_OWN");
        assertThat(after.get("ROLE_PARTNER")).hasSize(11);
        assertThat(after.get("ROLE_USER")).containsExactlyInAnyOrder("WINE_READ", "WINERY_READ", "EVENT_READ",
                "WINE_ROUTE_READ", "REVIEW_CREATE", "REVIEW_UPDATE_OWN", "REVIEW_DELETE_OWN", "CELLAR_MANAGE_OWN");
    }

    private static Flyway fullMigration(DriverManagerDataSource dataSource) {
        return Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load();
    }

    /** The other #482 migrations may land between V71 and V76, so the starting point is the last one present. */
    private static MigrationVersion lastVersionBeforeRemoval(DriverManagerDataSource dataSource) {
        MigrationVersion removal = MigrationVersion.fromVersion("76");
        return Arrays.stream(fullMigration(dataSource).info().all())
                .map(MigrationInfo::getVersion)
                .filter(version -> version.compareTo(removal) < 0)
                .max(Comparator.naturalOrder())
                .orElseThrow();
    }

    private static Integer countRoles() {
        return jdbc.queryForObject("SELECT count(*) FROM roles WHERE name IN (?, ?)", Integer.class,
                REMOVED_ROLES.toArray());
    }

    private static Integer countPermissions() {
        return jdbc.queryForObject("SELECT count(*) FROM permissions WHERE code IN (?, ?, ?, ?)", Integer.class,
                REMOVED_PERMISSIONS.toArray());
    }

    private static Map<String, Set<String>> permissionsByRole() {
        return jdbc.queryForList("""
                        SELECT r.name AS role, p.code AS permission FROM roles r
                        JOIN role_permissions rp ON rp.role_id = r.id
                        JOIN permissions p ON p.id = rp.permission_id
                        WHERE r.name NOT IN ('ROLE_TOURISM_OPERATOR', 'ROLE_VERIFIED_EXPERT')
                        """).stream()
                .collect(Collectors.groupingBy(row -> (String) row.get("role"), TreeMap::new,
                        Collectors.mapping(row -> (String) row.get("permission"), Collectors.toCollection(TreeSet::new))));
    }

    private static void user(UUID id) {
        Instant created = Instant.parse("2026-03-01T12:00:00Z");
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,active,created_at,updated_at)"
                        + " VALUES (?,?,?,'hash','Test','Member',true,?,?)",
                id, "user-" + id, id + "@example.invalid", Timestamp.from(created), Timestamp.from(created));
    }
}
