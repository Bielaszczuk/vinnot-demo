package com.vinnot.event.infrastructure;

import com.vinnot.event.application.port.in.SendOrganizerDigestsUseCase;
import com.vinnot.event.application.port.out.OrganizerActivityDigest;
import com.vinnot.event.application.port.out.OrganizerActivityDigest.Activity;
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
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Organizer digests through the real store, use case and outbox. The schedulers and worker never run here. */
@SpringBootTest(properties = {
        "ai.provider=mock", "ai.enabled=false", "ai.spending.paid-calls-enabled=false",
        "app.auth.email.provider=log", "app.storage.provider=local",
        "app.observability.snapshot.enabled=false", "app.effects.poll-ms=3600000", "app.events.reminders.enabled=false",
        "app.events.organizer-digests.enabled=false"
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class OrganizerDigestPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired OrganizerActivityDigest digests;
    @Autowired SendOrganizerDigestsUseCase send;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> UUID.randomUUID().toString() + UUID.randomUUID());
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void aBurstOfActivityBecomesOneDeferrablePushOnceTheWindowIsDue() {
        UUID organizer = user();
        UUID event = event(organizer);
        digests.add(event, organizer, Activity.CONFIRMED, Duration.ZERO);
        digests.add(event, organizer, Activity.CONFIRMED, Duration.ofMinutes(15));
        digests.add(event, organizer, Activity.REQUESTED, Duration.ofMinutes(15));
        digests.add(event, organizer, Activity.CANCELLED, Duration.ofMinutes(15));
        UUID later = event(organizer);
        digests.add(later, organizer, Activity.CONFIRMED, Duration.ofMinutes(15));

        assertThat(send.execute()).isOne();
        assertThat(send.execute()).isZero();

        Map<String, Object> job = jdbc.queryForMap("""
                SELECT payload->>'type' AS type, payload->>'deferrable' AS deferrable, payload->'data'->>'confirmed' AS confirmed,
                    payload->'data'->>'requested' AS requested, payload->'data'->>'cancelled' AS cancelled,
                    payload->'data'->>'title' AS title, payload->'userIds'->>0 AS organizer
                FROM external_effects WHERE deduplication_key LIKE ?""", "push:organizer-digest:" + event + ":%");
        assertThat(job).containsEntry("type", "EVENT_REGISTRATION_ORGANIZER").containsEntry("deferrable", "true")
                .containsEntry("confirmed", "2").containsEntry("requested", "1").containsEntry("cancelled", "1")
                .containsEntry("title", "Tasting night").containsEntry("organizer", organizer.toString());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM organizer_push_digests WHERE event_id=?", Integer.class, event)).isZero();
        assertThat(jdbc.queryForObject("SELECT confirmed FROM organizer_push_digests WHERE event_id=?", Integer.class, later)).isOne();
    }

    @Test
    void aDigestOfAnEventCancelledMeanwhileIsRemovedWithoutAPush() {
        UUID organizer = user();
        UUID event = event(organizer);
        digests.add(event, organizer, Activity.CONFIRMED, Duration.ZERO);
        jdbc.update("UPDATE events SET status='CANCELLED' WHERE id=?", event);

        assertThat(send.execute()).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM organizer_push_digests WHERE event_id=?", Integer.class, event)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE deduplication_key LIKE ?", Integer.class,
                "push:organizer-digest:" + event + ":%")).isZero();
    }

    @Test
    void anOpenDigestGoesWithItsEvent() {
        UUID organizer = user();
        UUID event = event(organizer);
        digests.add(event, organizer, Activity.REQUESTED, Duration.ofMinutes(15));
        jdbc.update("DELETE FROM events WHERE id=?", event);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM organizer_push_digests WHERE event_id=?", Integer.class, event)).isZero();
    }

    private UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,preferred_language)
                VALUES (?,?,?,'fixture','Test','Member','es')
                """, id, "user-" + id, id + "@example.invalid");
        return id;
    }

    private UUID event(UUID organizer) {
        UUID id = UUID.randomUUID();
        Instant start = Instant.now().plus(3, ChronoUnit.DAYS);
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status,published_once,
                    max_attendees,max_tickets_per_registration,approval_mode,attendee_confirmation_required)
                VALUES (?,'Tasting night','TASTING',?,?,?,'PUBLISHED',true,10,4,'AUTOMATIC',false)
                """, id, Timestamp.from(start), Timestamp.from(start.plus(2, ChronoUnit.HOURS)), organizer);
        return id;
    }
}
