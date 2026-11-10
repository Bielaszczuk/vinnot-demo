package com.vinnot.wine.infrastructure.persistence;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** V41 upgrades a database that already holds free-text submissions, as production does. */
@Testcontainers(disabledWithoutDocker = true)
class WineSubmissionCatalogReferenceMigrationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @Test
    void existingSubmissionsLinkMatchingCatalogEntriesAndKeepTheRestAsProposals() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        var jdbc = new JdbcTemplate(dataSource);
        flyway(dataSource, "40").migrate();
        UUID user = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Member')",
                user, "user-" + user, user + "@example.invalid");
        UUID country = UUID.randomUUID();
        jdbc.update("INSERT INTO countries(id,code,name) VALUES (?,'ZQ','Zanquilandia')", country);
        UUID region = UUID.randomUUID();
        jdbc.update("INSERT INTO regions(id,name,country_id) VALUES (?,'Valle Ámbar',?)", region, country);
        UUID winery = UUID.randomUUID();
        jdbc.update("INSERT INTO wineries(id,name) VALUES (?,'Bodega Única Fixture')", winery);
        jdbc.update("INSERT INTO wineries(id,name) VALUES (?,'Bodega Doble Fixture'),(?,'bodega doble fixture')",
                UUID.randomUUID(), UUID.randomUUID());
        jdbc.update("INSERT INTO grape_types(id,name,name_es) VALUES (?,'Fixturegrape Noir','Uva Fixtúra')", UUID.randomUUID());
        UUID matching = submission(jdbc, user, "bodega unica fixture", " zanquilandia ", "valle ambar",
                "[\"fixturegrape noir\",\"Uva Fixtura\",\"Invented Grape\"]");
        UUID proposed = submission(jdbc, user, "Bodega Doble Fixture", "Nowhere", "Valle Ámbar", "[]");

        flyway(dataSource, "latest").migrate();

        Map<String, Object> linked = row(jdbc, matching);
        assertThat(linked.get("country_id")).isEqualTo(country);
        assertThat(linked.get("region_id")).isEqualTo(region);
        assertThat(linked.get("winery_id")).isEqualTo(winery);
        assertThat(linked.get("proposed_grapes").toString()).isEqualTo("[\"Invented Grape\"]");
        assertThat(linked.get("country")).as("text is kept as entered").isEqualTo(" zanquilandia ");
        Map<String, Object> unlinked = row(jdbc, proposed);
        assertThat(unlinked.get("country_id")).isNull();
        assertThat(unlinked.get("region_id")).as("a region needs its country").isNull();
        assertThat(unlinked.get("winery_id")).as("an ambiguous winery name stays a proposal").isNull();
        assertThat(unlinked.get("proposed_grapes").toString()).isEqualTo("[]");
    }

    private static Flyway flyway(DriverManagerDataSource dataSource, String target) {
        return Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target(target).load();
    }

    private static UUID submission(JdbcTemplate jdbc, UUID user, String winery, String country, String region, String grapes) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO wine_submissions(id,submitted_by,wine_name,winery_name,country,region,grapes,status)
                VALUES (?,?,'Fixture Wine',?,?,?,?::jsonb,'NEEDS_REVIEW')
                """, id, user, winery, country, region, grapes);
        return id;
    }

    private static Map<String, Object> row(JdbcTemplate jdbc, UUID id) {
        return jdbc.queryForMap("""
                SELECT country, country_id, region_id, winery_id, proposed_grapes::text AS proposed_grapes
                FROM wine_submissions WHERE id=?
                """, id);
    }
}
