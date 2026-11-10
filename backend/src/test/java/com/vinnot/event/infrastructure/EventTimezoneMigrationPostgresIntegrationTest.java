package com.vinnot.event.infrastructure;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;

/** V40 upgrades a database that already holds events and registrations, as production does. */
@Testcontainers(disabledWithoutDocker = true)
class EventTimezoneMigrationPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @Test
    void existingEventsTakeTheirOrganizerTimeZoneAndNewEventsDefaultToIt() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        var jdbc = new JdbcTemplate(dataSource);
        flyway(dataSource, "39").migrate();
        UUID madrid = user(jdbc, "Europe/Madrid");
        UUID defaulted = user(jdbc, null);
        UUID madridEvent = event(jdbc, madrid);
        UUID defaultedEvent = event(jdbc, defaulted);
        UUID registration = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO event_registrations(id,event_id,user_id,attendee_count,status,payment_status,currency,
                    created_at,updated_at) VALUES (?,?,?,1,'CONFIRMED','NOT_REQUIRED','ARS',now(),now())
                """, registration, madridEvent, defaulted);

        flyway(dataSource, "latest").migrate();

        assertThat(zone(jdbc, madridEvent)).isEqualTo("Europe/Madrid");
        assertThat(zone(jdbc, defaultedEvent)).isEqualTo("America/Argentina/Buenos_Aires");
        assertThat(zone(jdbc, event(jdbc, madrid))).as("an insert that names no zone").isEqualTo("Europe/Madrid");
        assertThat(jdbc.queryForObject("SELECT last_actor_id IS NULL FROM event_registrations WHERE id=?",
                Boolean.class, registration)).isTrue();
        assertThat(jdbc.queryForObject("SELECT is_nullable FROM information_schema.columns "
                + "WHERE table_name='events' AND column_name='timezone'", String.class)).isEqualTo("NO");
    }

    private static Flyway flyway(DriverManagerDataSource dataSource, String target) {
        return Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target(target).load();
    }

    private static UUID user(JdbcTemplate jdbc, String zone) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Member')",
                id, "user-" + id, id + "@example.invalid");
        if (Objects.nonNull(zone)) {
            jdbc.update("UPDATE users SET timezone=? WHERE id=?", zone, id);
        }
        return id;
    }

    private static UUID event(JdbcTemplate jdbc, UUID organizer) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status)
                VALUES (?,'Tasting','TASTING',now()+interval '2 days',now()+interval '3 days',?,'PUBLISHED')
                """, id, organizer);
        return id;
    }

    private static String zone(JdbcTemplate jdbc, UUID event) {
        return jdbc.queryForObject("SELECT timezone FROM events WHERE id=?", String.class, event);
    }
}
