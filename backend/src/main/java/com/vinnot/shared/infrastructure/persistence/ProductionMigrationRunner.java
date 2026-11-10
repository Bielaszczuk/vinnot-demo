package com.vinnot.shared.infrastructure.persistence;

import org.flywaydb.core.Flyway;

import java.util.Map;

/** Deployment-only entry point: no Spring context, HTTP server or scheduled jobs. */
public final class ProductionMigrationRunner {
    private static final String URL_PATTERN = "jdbc:postgresql://(?:[a-zA-Z0-9.-]+|\\[[0-9a-fA-F:]+\\]):[0-9]{1,5}/vinnot_prod";
    private static final String SESSION_GUARD = """
            DO $$ BEGIN
                IF current_database() <> 'vinnot_prod' OR session_user <> 'vinnot_prod_migrator' THEN
                    RAISE EXCEPTION 'Invalid production migration identity';
                END IF;
            END $$;
            SET ROLE vinnot_prod_owner;
            """;

    private ProductionMigrationRunner() {
    }

    public static void main(String[] args) {
        if (args.length > 0) {
            throw new IllegalArgumentException("Migration runner does not accept command-line credentials or options");
        }
        migrate(System.getenv());
    }

    static Flyway migrate(Map<String, String> environment) {
        Flyway flyway = configure(environment);
        flyway.migrate();
        flyway.validate();
        return flyway;
    }

    static Flyway configure(Map<String, String> environment) {
        String url = environment.getOrDefault("VINNOT_MIGRATION_DB_URL", "");
        String password = environment.getOrDefault("VINNOT_MIGRATION_DB_PASSWORD", "");
        if (!url.matches(URL_PATTERN)) {
            throw new IllegalArgumentException("Migration URL must identify vinnot_prod with an explicit host and port, without JDBC options");
        }
        if (password.isBlank()) {
            throw new IllegalArgumentException("A dedicated migration password is required");
        }
        return Flyway.configure()
                .dataSource(url, "vinnot_prod_migrator", password)
                .initSql(SESSION_GUARD)
                .locations("classpath:db/migration")
                .defaultSchema("public")
                .schemas("public")
                .createSchemas(false)
                .baselineOnMigrate(false)
                .cleanDisabled(true)
                .validateOnMigrate(true)
                .outOfOrder(false)
                .load();
    }
}
