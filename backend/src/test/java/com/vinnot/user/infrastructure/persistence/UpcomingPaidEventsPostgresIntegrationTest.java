package com.vinnot.user.infrastructure.persistence;

import com.vinnot.user.infrastructure.persistence.adapter.UpcomingPaidEventsAdapter;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * An organizer cannot delete the account while buyers still hold, or are paying for, tickets to an event that has not
 * happened: the cascade would remove the event and the Mercado Pago credentials that refunds need.
 */
@Testcontainers(disabledWithoutDocker = true)
class UpcomingPaidEventsPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static JdbcTemplate jdbc;
    private static UpcomingPaidEventsAdapter adapter;
    private static final UUID BUYER = UUID.randomUUID();

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        adapter = new UpcomingPaidEventsAdapter(jdbc);
        user(BUYER);
    }

    @Test
    void anUpcomingEventWithAPaidOrPayingRegistrationBlocksTheOrganizer() {
        for (String status : new String[]{"CONFIRMED", "AWAITING_PAYMENT", "AWAITING_ATTENDEE_CONFIRMATION"}) {
            UUID organizer = organizer();
            paidRegistration(event(organizer, "PUBLISHED", days(10)), status);
            assertThat(adapter.organizesUpcomingPaidEvents(organizer)).as(status).isTrue();
        }
        UUID postponed = organizer();
        paidRegistration(event(postponed, "POSTPONED", days(30)), "CONFIRMED");
        assertThat(adapter.organizesUpcomingPaidEvents(postponed)).isTrue();
    }

    @Test
    void cancelledEndedOrFreeEventsAndInactiveRegistrationsDoNotBlock() {
        UUID cancelled = organizer();
        paidRegistration(event(cancelled, "CANCELLED", days(10)), "CONFIRMED");
        UUID completed = organizer();
        paidRegistration(event(completed, "COMPLETED", days(10)), "CONFIRMED");
        UUID ended = organizer();
        paidRegistration(event(ended, "PUBLISHED", days(-1)), "CONFIRMED");
        UUID refunded = organizer();
        paidRegistration(event(refunded, "PUBLISHED", days(10)), "CANCELLED");
        UUID free = organizer();
        registration(event(free, "PUBLISHED", days(10)), "CONFIRMED");

        for (UUID organizer : new UUID[]{cancelled, completed, ended, refunded, free, BUYER}) {
            assertThat(adapter.organizesUpcomingPaidEvents(organizer)).isFalse();
        }
    }

    private static Instant days(int amount) {
        return Instant.now().plus(amount, ChronoUnit.DAYS);
    }

    private static UUID organizer() {
        UUID id = UUID.randomUUID();
        user(id);
        return id;
    }

    private static void user(UUID id) {
        Timestamp now = Timestamp.from(Instant.now());
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,active,created_at,updated_at)"
                + " VALUES (?,?,?,'hash','Test','Member',true,?,?)", id, "user-" + id, id + "@example.invalid", now, now);
    }

    private static UUID event(UUID organizer, String status, Instant end) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status) VALUES (?,?,?,?,?,?,?)",
                id, "Harvest tasting", "TASTING", Timestamp.from(end.minus(3, ChronoUnit.HOURS)), Timestamp.from(end),
                organizer, status);
        return id;
    }

    private static UUID registration(UUID event, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO event_registrations(id,event_id,user_id,status) VALUES (?,?,?,?)", id, event, BUYER, status);
        return id;
    }

    private static void paidRegistration(UUID event, String status) {
        UUID registration = registration(event, status);
        UUID organizer = jdbc.queryForObject("SELECT organizer_id FROM events WHERE id = ?", UUID.class, event);
        jdbc.update("""
                INSERT INTO payment_checkout_attempts(id,registration_id,event_id,buyer_id,organizer_id,seller_id,title,
                  unit_price,quantity,currency,total_amount,commission_amount,commission_basis_points,commission_policy,
                  expires_at)
                VALUES (?,?,?,?,?,'123456','Harvest tasting',100.00,1,'ARS',100.00,3.00,300,'VINNOT_3_PERCENT_V1',?)
                """, UUID.randomUUID(), registration, event, BUYER, organizer, Timestamp.from(days(1)));
    }
}
