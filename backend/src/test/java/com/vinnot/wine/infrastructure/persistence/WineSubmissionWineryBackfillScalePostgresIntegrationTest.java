package com.vinnot.wine.infrastructure.persistence;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V41 links submissions to wineries on a catalog the size of production (about 195,000 wineries).
 * A backfill that compares every winery with every other one never finishes there, so the migration
 * runs under a statement timeout that only a linear backfill meets.
 */
@Testcontainers(disabledWithoutDocker = true)
class WineSubmissionWineryBackfillScalePostgresIntegrationTest {
    private static final int WINERIES = 20_000;

    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @Test
    void linksWineriesOnALargeCatalogWithinTheStatementTimeout() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        var jdbc = new JdbcTemplate(dataSource);
        flyway(dataSource, "40").migrate();
        jdbc.update("INSERT INTO wineries(id,name) SELECT gen_random_uuid(), 'Scale Winery ' || g FROM generate_series(1,?) g",
                WINERIES);
        jdbc.update("INSERT INTO wineries(id,name) VALUES (?,'Scale Twin'),(?,'scale twin')", UUID.randomUUID(), UUID.randomUUID());
        UUID user = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Member')",
                user, "user-" + user, user + "@example.invalid");
        UUID unique = submission(jdbc, user, " scale winery 777 ");
        UUID twin = submission(jdbc, user, "Scale Twin");

        flyway(dataSource, "latest").migrate();

        UUID expected = jdbc.queryForObject("SELECT id FROM wineries WHERE name='Scale Winery 777'", UUID.class);
        assertThat(wineryOf(jdbc, unique)).isEqualTo(expected);
        assertThat(wineryOf(jdbc, twin)).as("an ambiguous winery name stays a proposal").isNull();
    }

    private static Flyway flyway(DriverManagerDataSource dataSource, String target) {
        return Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target(target)
                .initSql("SET statement_timeout = '10s'").load();
    }

    private static UUID submission(JdbcTemplate jdbc, UUID user, String winery) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO wine_submissions(id,submitted_by,wine_name,winery_name,status)
                VALUES (?,?,'Fixture Wine',?,'NEEDS_REVIEW')
                """, id, user, winery);
        return id;
    }

    private static UUID wineryOf(JdbcTemplate jdbc, UUID submission) {
        return jdbc.queryForObject("SELECT winery_id FROM wine_submissions WHERE id=?", UUID.class, submission);
    }
}
