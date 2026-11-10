package com.vinnot.shared.infrastructure.persistence;

import org.flywaydb.core.Flyway;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Map;
import java.util.zip.CRC32;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Runs the actual operational SQL against all versioned application migrations. */
@Testcontainers(disabledWithoutDocker = true)
class ProductionDatabaseRolesPostgresIntegrationTest {
    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine")
            .withDatabaseName("vinnot_prod");
    private static final String TEST_PASSWORD = "isolated-integration-only";

    @Test
    void realMonitoringSqlObservesExhaustionAndOnlyRetriesMatchingStorageWork() throws Exception {
        String storage = "00000000-0000-0000-0000-000000000157";
        String email = "00000000-0000-0000-0000-000000000158";
        try (Connection connection = login("runtime"); var statement = connection.createStatement()) {
            statement.execute("INSERT INTO external_effects(id,kind,deduplication_key,payload,attempts,next_attempt_at) VALUES "
                    + "('" + storage + "','avatar-cleanup','monitor-storage','{}',10,'2026-09-30T12:00:00Z'),"
                    + "('" + email + "','SUPPORT_REQUEST','monitor-email','{}',10,'2026-09-30T12:00:00Z')");
        }
        try {
            String observation = monitoringPython("from collector import SQL; print(SQL)");
            String query = observation.substring(observation.indexOf("SELECT json_build_object"), observation.indexOf("COMMIT;")).trim();
            try (Connection connection = login("backup")) {
                var json = new ObjectMapper().readTree(scalar(connection, query));
                assertThat(json.path("effects_exhausted").asInt()).isEqualTo(2);
                assertThat(json.path("storage_pending").asInt()).isEqualTo(1);
                assertThat(json.path("ai_committed_usd").asInt()).isZero();
            }
            try (Connection connection = login("runtime"); var statement = connection.createStatement()) {
                for (String id : new String[] {storage, storage, email}) {
                    statement.execute(monitoringPython("from effects import retry_sql; print(retry_sql('" + id
                            + "',10,'2026-09-30T12:00:00Z'))"));
                }
                assertThat(scalar(connection, "SELECT attempts FROM external_effects WHERE id='" + storage + "'")).isEqualTo("0");
                assertThat(scalar(connection, "SELECT attempts FROM external_effects WHERE id='" + email + "'")).isEqualTo("10");
            }
        } finally {
            try (Connection connection = login("runtime"); var statement = connection.createStatement()) {
                statement.execute("DELETE FROM external_effects WHERE id IN ('" + storage + "','" + email + "')");
            }
        }
    }

    private static String monitoringPython(String expression) throws Exception {
        var process = new ProcessBuilder("python3", "-B", "-c", expression)
                .directory(Path.of("../infra/aws-low-cost/monitoring").toFile()).redirectErrorStream(true).start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        assertThat(process.waitFor()).as(output).isZero();
        return output;
    }

    @BeforeAll
    static void prepare() throws Exception {
        administrativeScript("production-roles.sql");
        administrativeScript("production-roles.sql"); // repeatable, without recreating roles
        try (Connection connection = administrator(); var statement = connection.createStatement()) {
            // Re-running the roles script must leave the migrator unable to log in.
            assertThat(scalar(connection,
                    "SELECT rolcanlogin::text || ':' || (rolpassword IS NULL)::text FROM pg_authid WHERE rolname = 'vinnot_prod_migrator'"))
                    .isEqualTo("false:true");
            for (String role : new String[]{"runtime", "backup"}) {
                statement.execute("ALTER ROLE vinnot_prod_" + role + " PASSWORD '" + TEST_PASSWORD + "'");
            }
            // A migration window grants a one-time login, exactly as the runbook does.
            statement.execute("ALTER ROLE vinnot_prod_migrator LOGIN PASSWORD '" + TEST_PASSWORD + "'");
        }
        migrate();
        administrativeScript("production-runtime-grants.sql");
    }

    private static Flyway migrate() {
        return ProductionMigrationRunner.migrate(Map.of(
                "VINNOT_MIGRATION_DB_URL", "jdbc:postgresql://" + POSTGRES.getHost() + ":" + POSTGRES.getMappedPort(5432) + "/vinnot_prod",
                "VINNOT_MIGRATION_DB_PASSWORD", TEST_PASSWORD));
    }

    @Test
    void allMigrationsRunAsOwnerWithoutGivingDdlToRuntime() throws Exception {
        assertThat(migrate().info().pending()).isEmpty();
        try (Connection connection = login("runtime")) {
            assertThat(scalar(connection, "SELECT count(*) FROM roles")).isNotEqualTo("0");
            assertThat(scalar(connection, "SELECT count(*) FROM legal_documents")).isEqualTo("4");
            assertThat(scalar(connection, "SELECT unaccent('Malbéc')")).isEqualTo("Malbec");
            assertThat(scalar(connection, "SELECT nextval('refresh_tokens_id_seq')::text")).isNotBlank();
            denied(connection, "CREATE TABLE public.unauthorized(id int)");
            denied(connection, "CREATE SCHEMA unauthorized");
            denied(connection, "CREATE TEMP TABLE unauthorized(id int)");
            denied(connection, "ALTER TABLE wines ADD COLUMN unauthorized int");
            denied(connection, "DROP TABLE wines");
            denied(connection, "TRUNCATE wines CASCADE");
            denied(connection, "SET ROLE vinnot_prod_owner");
            denied(connection, "CREATE ROLE unauthorized");
            denied(connection, "DELETE FROM flyway_schema_history");
            denied(connection, "UPDATE legal_documents SET title = 'rewritten'");
        }
    }

    @Test
    void runtimeRetainsCatalogCrudAndIdentityTriggers() throws Exception {
        try (Connection connection = login("runtime"); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            statement.execute("INSERT INTO wineries(id, name) VALUES ('00000000-0000-0000-0000-000000000147', 'Role Test Estate')");
            statement.execute("INSERT INTO wines(id, name, winery_id, wine_type) VALUES ('00000000-0000-0000-0000-000000000147', 'Role Test Malbec', '00000000-0000-0000-0000-000000000147', 'RED')");
            statement.execute("UPDATE wineries SET name = 'Renamed Estate' WHERE id = '00000000-0000-0000-0000-000000000147'");
            assertThat(scalar(connection, "SELECT search_text FROM wine_catalog_search WHERE wine_id = '00000000-0000-0000-0000-000000000147'"))
                    .contains("renamed estate");
            statement.execute("DELETE FROM wines WHERE id = '00000000-0000-0000-0000-000000000147'");
            statement.execute("DELETE FROM wineries WHERE id = '00000000-0000-0000-0000-000000000147'");
            connection.rollback();
        }
    }

    @Test
    void backupCanReadAllApplicationDataButCannotModifyIt() throws Exception {
        try (Connection connection = login("backup")) {
            assertThat(Integer.parseInt(scalar(connection, "SELECT count(*) FROM flyway_schema_history WHERE success")))
                    .isEqualTo(migrate().info().applied().length);
            assertThat(scalar(connection, "SELECT count(*) FROM ai_spending_reservations")).isEqualTo("0");
            denied(connection, "DELETE FROM wines");
            denied(connection, "UPDATE users SET first_name = 'unauthorized'");
            denied(connection, "SET ROLE vinnot_prod_owner");
        }
    }

    @Test
    void grantsAreRepeatableAndFutureObjectsRequireExplicitPostMigrationStep() throws Exception {
        try (Connection connection = login("migrator"); var statement = connection.createStatement()) {
            statement.execute("SET ROLE vinnot_prod_owner");
            statement.execute("CREATE TABLE permission_fixture(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, value text)");
        }
        try {
            try (Connection connection = login("runtime")) {
                denied(connection, "SELECT * FROM permission_fixture");
            }
            administrativeScript("production-runtime-grants.sql");
            administrativeScript("production-runtime-grants.sql");
            try (Connection connection = login("runtime"); var statement = connection.createStatement()) {
                statement.execute("INSERT INTO permission_fixture(value) VALUES ('permitted')");
                assertThat(scalar(connection, "SELECT value FROM permission_fixture")).isEqualTo("permitted");
                denied(connection, "DELETE FROM flyway_schema_history");
            }
        } finally {
            try (Connection connection = administrator(); var statement = connection.createStatement()) {
                statement.execute("DROP TABLE permission_fixture");
            }
        }
    }

    @Test
    void migrationsCanCallExtensionFunctionsOwnedByTheBootstrapAdministrator() throws Exception {
        // Production created its extensions before the role split, so the administrator owns their functions.
        try (Connection connection = administrator(); var statement = connection.createStatement()) {
            statement.execute("ALTER FUNCTION public.unaccent(text) OWNER TO " + POSTGRES.getUsername());
            statement.execute("REVOKE EXECUTE ON FUNCTION public.unaccent(text) FROM vinnot_prod_owner");
        }
        try {
            try (Connection connection = login("migrator"); var statement = connection.createStatement()) {
                statement.execute("SET ROLE vinnot_prod_owner");
                denied(connection, "SELECT unaccent('Malbéc')");
            }
            administrativeScript("production-runtime-grants.sql");
            try (Connection connection = login("migrator"); var statement = connection.createStatement()) {
                statement.execute("SET ROLE vinnot_prod_owner");
                assertThat(scalar(connection, "SELECT unaccent('Malbéc')")).isEqualTo("Malbec");
            }
        } finally {
            try (Connection connection = administrator(); var statement = connection.createStatement()) {
                statement.execute("ALTER FUNCTION public.unaccent(text) OWNER TO vinnot_prod_owner");
            }
        }
    }

    @Test
    void bootstrapRejectsAnotherDatabaseBeforeChangingAnything() throws Exception {
        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl().replace("/vinnot_prod", "/postgres"), POSTGRES.getUsername(), POSTGRES.getPassword());
             var statement = connection.createStatement()) {
            assertThatThrownBy(() -> statement.execute(script("production-roles.sql")))
                    .isInstanceOf(SQLException.class).hasMessageContaining("outside vinnot_prod");
        }
    }

    @Test
    void bootstrapRejectsPrivilegeDriftAndUnexpectedMemberships() throws Exception {
        try (Connection connection = administrator(); var statement = connection.createStatement()) {
            statement.execute("ALTER ROLE vinnot_prod_runtime CREATEDB");
            try {
                assertThatThrownBy(() -> administrativeScript("production-roles.sql"))
                        .isInstanceOf(SQLException.class).hasMessageContaining("unexpected elevated privileges");
            } finally {
                statement.execute("ALTER ROLE vinnot_prod_runtime NOCREATEDB");
            }
            statement.execute("CREATE ROLE foreign_permission_fixture NOLOGIN");
            statement.execute("GRANT foreign_permission_fixture TO vinnot_prod_backup");
            try {
                assertThatThrownBy(() -> administrativeScript("production-roles.sql"))
                        .isInstanceOf(SQLException.class).hasMessageContaining("Unexpected production role membership");
            } finally {
                statement.execute("REVOKE foreign_permission_fixture FROM vinnot_prod_backup");
            }
            statement.execute("GRANT vinnot_prod_owner TO foreign_permission_fixture");
            try {
                assertThatThrownBy(() -> administrativeScript("production-roles.sql"))
                        .isInstanceOf(SQLException.class).hasMessageContaining("Unexpected production role membership");
            } finally {
                statement.execute("REVOKE vinnot_prod_owner FROM foreign_permission_fixture");
                statement.execute("DROP ROLE foreign_permission_fixture");
            }
        }
    }

    @Test
    void backupRoleCanCreateAnArchiveThatActuallyRestores() throws Exception {
        var dump = POSTGRES.execInContainer("env", "PGPASSWORD=" + TEST_PASSWORD, "pg_dump",
                "--host=127.0.0.1", "--username=vinnot_prod_backup", "--dbname=vinnot_prod",
                "--format=custom", "--file=/tmp/production-roles-test.dump");
        assertThat(dump.getExitCode()).as(dump.getStderr()).isZero();
        try (Connection connection = administrator(); var statement = connection.createStatement()) {
            statement.execute("CREATE DATABASE vinnot_restore_test");
        }
        var restore = POSTGRES.execInContainer("env", "PGPASSWORD=" + POSTGRES.getPassword(), "pg_restore",
                "--host=127.0.0.1", "--username=" + POSTGRES.getUsername(), "--dbname=vinnot_restore_test",
                "--no-owner", "--no-acl", "--exit-on-error", "/tmp/production-roles-test.dump");
        assertThat(restore.getExitCode()).as(restore.getStderr()).isZero();
        try (Connection connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl().replace("/vinnot_prod", "/vinnot_restore_test"), POSTGRES.getUsername(), POSTGRES.getPassword())) {
            assertThat(scalar(connection, "SELECT count(*) FROM legal_documents")).isEqualTo("4");
            assertThat(scalar(connection, "SELECT count(*) FROM roles")).isNotEqualTo("0");
            assertThat(scalar(connection, "SELECT unaccent('Malbéc')")).isEqualTo("Malbec");
        }
    }

    @Test
    void grantStepRejectsWrongOwnershipRatherThanSilentlyTakingOverObjects() throws Exception {
        try (Connection connection = administrator(); var statement = connection.createStatement()) {
            statement.execute("CREATE TABLE public.foreign_owned_fixture(id int)");
        }
        try {
            assertThatThrownBy(() -> administrativeScript("production-runtime-grants.sql"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("non-login production owner");
        } finally {
            try (Connection connection = administrator(); var statement = connection.createStatement()) {
                statement.execute("DROP TABLE public.foreign_owned_fixture");
            }
        }
    }

    @Test
    void releaseInventoryChecksumMatchesTheActualFlywayHistory() throws Exception {
        try (Connection connection = login("backup"); var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT script, checksum FROM flyway_schema_history WHERE success AND type = 'SQL'")) {
            int checked = 0;
            while (rows.next()) {
                var crc = new CRC32();
                for (String line : Files.readAllLines(Path.of("src/main/resources/db/migration", rows.getString(1)))) {
                    crc.update(line.getBytes(StandardCharsets.UTF_8));
                }
                assertThat((int) crc.getValue()).as(rows.getString(1)).isEqualTo(rows.getInt(2));
                checked++;
            }
            assertThat(checked).isEqualTo(migrate().info().applied().length);
        }
    }

    private static void denied(Connection connection, String sql) {
        assertThatThrownBy(() -> {
            try (var statement = connection.createStatement()) {
                statement.execute(sql);
            }
        }).isInstanceOf(SQLException.class).extracting("SQLState").isEqualTo("42501");
    }

    private static String scalar(Connection connection, String sql) throws SQLException {
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(sql)) {
            assertThat(rows.next()).isTrue();
            return rows.getString(1);
        }
    }

    private static Connection administrator() throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }

    private static Connection login(String suffix) throws SQLException {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), "vinnot_prod_" + suffix, TEST_PASSWORD);
    }

    private static String script(String filename) throws Exception {
        return Files.readString(Path.of("../infra/postgres", filename));
    }

    private static void administrativeScript(String filename) throws Exception {
        try (Connection connection = administrator(); var statement = connection.createStatement()) {
            statement.execute(script(filename));
        }
    }
}
