package com.vinnot.cellar.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * V71 adds the one-decimal cellar rating next to the whole one (expand/contract, #455): the previous backend revision
 * keeps booting and reading {@code rating integer}, and what it writes there reaches the decimal column.
 */
@Testcontainers(disabledWithoutDocker = true)
class CellarRatingDecimalMigrationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @Test
    void theDecimalColumnIsBackfilledAndTheWholeColumnKeepsWorkingForThePreviousRevision() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        var jdbc = new JdbcTemplate(dataSource);
        flyway(dataSource, "70").migrate();
        UUID member = member(jdbc);
        UUID rated = entry(jdbc, member, 4);
        UUID unrated = entry(jdbc, member, null);

        flyway(dataSource, "latest").migrate();

        assertThat(columns(jdbc, rated)).containsEntry("rating", 4);
        assertThat((BigDecimal) columns(jdbc, rated).get("rating_decimal")).isEqualByComparingTo("4.0");
        assertThat(columns(jdbc, unrated)).containsEntry("rating", null).containsEntry("rating_decimal", null);
        assertThat(jdbc.queryForObject("SELECT data_type FROM information_schema.columns "
                + "WHERE table_name='cellar_wines' AND column_name='rating'", String.class)).isEqualTo("integer");
        Integer previousRead = jdbc.queryForObject("SELECT rating FROM cellar_wines WHERE id=?",
                (row, index) -> row.getInt("rating"), rated);
        assertThat(previousRead).as("the previous revision's read").isEqualTo(4);

        // The current revision writes both columns.
        jdbc.update("UPDATE cellar_wines SET rating_decimal=3.6, rating=4 WHERE id=?", rated);
        assertThat((BigDecimal) columns(jdbc, rated).get("rating_decimal")).isEqualByComparingTo("3.6");
        // The previous revision rewrites the whole rating it read (an edit of the notes): the decimal one stays.
        jdbc.update("UPDATE cellar_wines SET rating=4, notes='Opened' WHERE id=?", rated);
        assertThat((BigDecimal) columns(jdbc, rated).get("rating_decimal")).isEqualByComparingTo("3.6");
        // The previous revision changes or clears the rating, or adds an entry: the decimal column follows.
        jdbc.update("UPDATE cellar_wines SET rating=2 WHERE id=?", rated);
        assertThat((BigDecimal) columns(jdbc, rated).get("rating_decimal")).isEqualByComparingTo("2.0");
        jdbc.update("UPDATE cellar_wines SET rating=NULL WHERE id=?", rated);
        assertThat(columns(jdbc, rated)).containsEntry("rating_decimal", null);
        UUID added = entry(jdbc, member, 5);
        assertThat((BigDecimal) columns(jdbc, added).get("rating_decimal")).isEqualByComparingTo("5.0");

        for (String rejected : new String[] {"5.1", "0"}) {
            assertThatThrownBy(() -> jdbc.update("UPDATE cellar_wines SET rating_decimal=?::numeric WHERE id=?",
                    rejected, added)).isInstanceOf(DataIntegrityViolationException.class);
        }
        assertThatThrownBy(() -> jdbc.update("UPDATE cellar_wines SET rating=0 WHERE id=?", added))
                .as("the whole rating keeps its 1 to 5 check").isInstanceOf(DataIntegrityViolationException.class);
    }

    private static Flyway flyway(DriverManagerDataSource dataSource, String target) {
        return Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target(target).load();
    }

    private static Map<String, Object> columns(JdbcTemplate jdbc, UUID entry) {
        return jdbc.queryForMap("SELECT rating, rating_decimal FROM cellar_wines WHERE id=?", entry);
    }

    private static UUID member(JdbcTemplate jdbc) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Member')",
                id, "user-" + id, id + "@example.invalid");
        return id;
    }

    private static UUID entry(JdbcTemplate jdbc, UUID member, Integer rating) {
        UUID wine = UUID.randomUUID();
        jdbc.update("INSERT INTO wines(id,name,wine_type,is_active) VALUES (?,'Cellar','RED',true)", wine);
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO cellar_wines(id, user_id, wine_id, rating) VALUES (?, ?, ?, ?)", id, member, wine, rating);
        return id;
    }
}
