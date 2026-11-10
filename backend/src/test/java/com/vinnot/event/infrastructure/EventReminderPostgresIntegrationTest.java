package com.vinnot.event.infrastructure;

import com.vinnot.event.application.command.model.UpdateEventCommand;
import com.vinnot.event.application.port.in.SendEventRemindersUseCase;
import com.vinnot.event.application.port.in.UpdateEventUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

/** Reminders through the real use case, claim statement and outbox. The scheduler and worker never run here. */
@SpringBootTest(properties = {
        "ai.provider=mock", "ai.enabled=false", "ai.spending.paid-calls-enabled=false",
        "app.auth.email.provider=log", "app.storage.provider=local",
        "app.observability.snapshot.enabled=false", "app.effects.poll-ms=3600000", "app.events.reminders.enabled=false"
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class EventReminderPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired SendEventRemindersUseCase reminders;
    @Autowired UpdateEventUseCase updateEvent;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> UUID.randomUUID().toString() + UUID.randomUUID());
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void eachConfirmedAttendeeOfAnEventStartingWithinADayIsRemindedOnce() {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        UUID organizer = user("es");
        UUID soon = event(organizer, "PUBLISHED", now.plus(20, ChronoUnit.HOURS));
        UUID confirmed = registration(soon, user("en"), "CONFIRMED");
        UUID cancelled = registration(soon, user("es"), "CANCELLED");
        UUID requested = registration(soon, user("es"), "REQUESTED");
        UUID later = registration(event(organizer, "PUBLISHED", now.plus(30, ChronoUnit.HOURS)), user("es"), "CONFIRMED");
        UUID tooLate = registration(event(organizer, "PUBLISHED", now.plus(30, ChronoUnit.MINUTES)), user("es"), "CONFIRMED");
        UUID cancelledEvent = registration(event(organizer, "CANCELLED", now.plus(20, ChronoUnit.HOURS)), user("es"), "CONFIRMED");

        reminders.execute(now);
        reminders.execute(now);

        assertThat(reminderKeys(List.of(confirmed, cancelled, requested, later, tooLate, cancelledEvent)))
                .containsExactly("notification:reminder:" + confirmed + ":24h:" + now.plus(20, ChronoUnit.HOURS).getEpochSecond());
        assertThat(jdbc.queryForObject("SELECT payload->>'locale' FROM external_effects WHERE deduplication_key=?",
                String.class, "notification:reminder:" + confirmed + ":24h:" + now.plus(20, ChronoUnit.HOURS).getEpochSecond()))
                .isEqualTo("EN");
        assertThat(remindedAt(confirmed)).isNotNull();
        for (UUID skipped : List.of(cancelled, requested, later, tooLate, cancelledEvent)) {
            assertThat(remindedAt(skipped)).isNull();
        }
        assertThat(jdbc.queryForObject("SELECT payload->>'deferrable' FROM external_effects WHERE deduplication_key=?",
                String.class, "push:reminder:" + confirmed + ":24h:" + now.plus(20, ChronoUnit.HOURS).getEpochSecond()))
                .isEqualTo("true");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE deduplication_key LIKE 'push:reminder:%:2h:%'"
                + " AND payload->>'dedupeKey' LIKE ANY (ARRAY[?,?])", Integer.class, "reminder:" + tooLate + ":2h:%",
                "reminder:" + confirmed + ":2h:%"))
                .as("only the event starting within two hours gets the second reminder").isOne();
        assertThat(remindedSoonAt(tooLate)).isNotNull();
        assertThat(remindedSoonAt(confirmed)).isNull();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE kind='EVENT_REGISTRATION_CHANGED'"
                + " AND payload->>'registrationId'=? AND (payload->>'version')::bigint > 1", Integer.class, confirmed.toString()))
                .as("claiming a reminder is not a registration change").isZero();
    }

    @Test
    void movingAnEventLetsItsAttendeesBeRemindedAgain() {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        UUID organizer = user("es");
        UUID event = event(organizer, "PUBLISHED", now.plus(20, ChronoUnit.HOURS));
        UUID confirmed = registration(event, user("es"), "CONFIRMED");
        reminders.execute(now);
        assertThat(remindedAt(confirmed)).isNotNull();

        Instant moved = now.plus(10, ChronoUnit.DAYS);
        updateEvent.execute(new ObjectMapper().convertValue(Map.of("eventId", event.toString(),
                "requestingUserId", organizer.toString(), "isAdmin", false, "startDate", moved.toString(),
                "endDate", moved.plus(2, ChronoUnit.HOURS).toString()), UpdateEventCommand.class));

        assertThat(remindedAt(confirmed)).isNull();

        // The first email is still queued; the corrected one gets its own key instead of being deduplicated away.
        Instant movedSoon = now.plus(22, ChronoUnit.HOURS);
        updateEvent.execute(new ObjectMapper().convertValue(Map.of("eventId", event.toString(),
                "requestingUserId", organizer.toString(), "isAdmin", false, "startDate", movedSoon.toString(),
                "endDate", movedSoon.plus(2, ChronoUnit.HOURS).toString()), UpdateEventCommand.class));
        reminders.execute(now);
        assertThat(reminderKeys(List.of(confirmed))).containsExactlyInAnyOrder(
                "notification:reminder:" + confirmed + ":24h:" + now.plus(20, ChronoUnit.HOURS).getEpochSecond(),
                "notification:reminder:" + confirmed + ":24h:" + movedSoon.getEpochSecond());
    }

    @Test
    void movingAnEventClearsBothReminders() {
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        UUID organizer = user("es");
        UUID event = event(organizer, "PUBLISHED", now.plus(90, ChronoUnit.MINUTES));
        UUID confirmed = registration(event, user("es"), "CONFIRMED");
        jdbc.update("UPDATE event_registrations SET reminded_at=now() WHERE id=?", confirmed);
        reminders.execute(now);
        assertThat(remindedSoonAt(confirmed)).isNotNull();

        Instant moved = now.plus(10, ChronoUnit.DAYS);
        updateEvent.execute(new ObjectMapper().convertValue(Map.of("eventId", event.toString(),
                "requestingUserId", organizer.toString(), "isAdmin", false, "startDate", moved.toString(),
                "endDate", moved.plus(2, ChronoUnit.HOURS).toString()), UpdateEventCommand.class));

        assertThat(remindedAt(confirmed)).isNull();
        assertThat(remindedSoonAt(confirmed)).isNull();

        // The new date is reminded again under a new push key, so the send log never mistakes it for the old one.
        reminders.execute(moved.minus(90, ChronoUnit.MINUTES));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE deduplication_key=?", Integer.class,
                "push:reminder:" + confirmed + ":2h:" + moved.getEpochSecond())).isOne();
    }

    private Timestamp remindedSoonAt(UUID registration) {
        return jdbc.queryForObject("SELECT reminded_soon_at FROM event_registrations WHERE id=?", Timestamp.class, registration);
    }

    private List<String> reminderKeys(List<UUID> registrations) {
        return registrations.stream().flatMap(id -> jdbc.queryForList(
                "SELECT deduplication_key FROM external_effects WHERE deduplication_key LIKE ?", String.class,
                "notification:reminder:" + id + ":%").stream()).toList();
    }

    private Timestamp remindedAt(UUID registration) {
        return jdbc.queryForObject("SELECT reminded_at FROM event_registrations WHERE id=?", Timestamp.class, registration);
    }

    private UUID user(String language) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,preferred_language)
                VALUES (?,?,?,'fixture','Test','Member',?)
                """, id, "user-" + id, id + "@example.invalid", language);
        return id;
    }

    private UUID event(UUID organizer, String status, Instant start) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status,published_once,
                    max_attendees,max_tickets_per_registration,approval_mode,attendee_confirmation_required)
                VALUES (?,'Tasting night','TASTING',?,?,?,?,true,10,4,'AUTOMATIC',false)
                """, id, Timestamp.from(start), Timestamp.from(start.plus(2, ChronoUnit.HOURS)), organizer, status);
        return id;
    }

    private UUID registration(UUID event, UUID user, String status) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO event_registrations(id,event_id,user_id,attendee_count,status,payment_status,notification_language)
                VALUES (?,?,?,1,?,'NOT_REQUIRED',(SELECT preferred_language FROM users WHERE id=?))
                """, id, event, user, status, user);
        return id;
    }
}
