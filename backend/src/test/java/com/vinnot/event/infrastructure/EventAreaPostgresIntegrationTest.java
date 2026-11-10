package com.vinnot.event.infrastructure;

import com.vinnot.event.application.port.in.ManageEventAreaUseCase.AreaView;
import com.vinnot.event.application.command.model.PublishEventCommand;
import com.vinnot.event.application.command.model.CreateEventCommand;
import com.vinnot.event.application.command.model.UpdateEventCommand;
import com.vinnot.event.application.port.in.CreateEventUseCase;
import com.vinnot.event.application.port.in.PublishEventUseCase;
import com.vinnot.event.application.port.in.UpdateEventUseCase;
import com.vinnot.event.application.port.out.EventAreaRepository;
import com.vinnot.event.application.port.out.NewEventAudience;
import com.vinnot.event.domain.valueobject.EventArea;
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

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;

import static org.assertj.core.api.Assertions.assertThat;

/** The "events near you" area store against the real schema. */
@SpringBootTest(properties = {
        "ai.provider=mock", "ai.enabled=false", "ai.spending.paid-calls-enabled=false",
        "app.auth.email.provider=log", "app.storage.provider=local",
        "app.observability.snapshot.enabled=false", "app.effects.poll-ms=3600000", "app.events.reminders.enabled=false",
        "app.events.organizer-digests.enabled=false"
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class EventAreaPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired EventAreaRepository areas;
    @Autowired NewEventAudience audience;
    @Autowired PublishEventUseCase publish;
    @Autowired CreateEventUseCase create;
    @Autowired UpdateEventUseCase update;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> UUID.randomUUID().toString() + UUID.randomUUID());
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    /** Areas saved by another test would join the audience of this one. */
    @BeforeEach
    void noAreas() {
        jdbc.update("DELETE FROM user_event_areas");
    }

    @Test
    void aRegionAreaIsReadBackWithItsNameAndReplacedByAnApproximateOneRoundedInTheDatabase() {
        UUID user = user();
        UUID mendoza = jdbc.queryForObject("SELECT id FROM regions WHERE name='Mendoza' LIMIT 1", UUID.class);

        assertThat(areas.save(user, EventArea.region(mendoza))).isTrue();
        assertThat(areas.find(user)).contains(new AreaView(AreaView.Kind.REGION, mendoza, "Mendoza"));

        assertThat(areas.save(user, EventArea.approximate(-32.889458, -68.845839))).isTrue();
        assertThat(areas.find(user)).contains(new AreaView(AreaView.Kind.APPROXIMATE, null, null));
        Map<String, Object> row = jdbc.queryForMap("SELECT region_id, latitude, longitude FROM user_event_areas WHERE user_id=?", user);
        assertThat(row.get("region_id")).isNull();
        assertThat(row.get("latitude")).isEqualTo(new BigDecimal("-32.9"));
        assertThat(row.get("longitude")).isEqualTo(new BigDecimal("-68.8"));
    }

    @Test
    void anUnknownRegionStoresNothingAndClearingOrDeletingTheAccountRemovesTheArea() {
        UUID user = user();
        assertThat(areas.save(user, EventArea.region(UUID.randomUUID()))).isFalse();
        assertThat(areas.find(user)).isEmpty();

        areas.save(user, EventArea.approximate(-34.6, -58.4));
        areas.delete(user);
        assertThat(areas.find(user)).isEmpty();

        areas.save(user, EventArea.approximate(-34.6, -58.4));
        jdbc.update("DELETE FROM users WHERE id=?", user);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_event_areas WHERE user_id=?", Integer.class, user)).isZero();
    }

    @Test
    void theAudienceIsRegionsNamedLikeTheEventsRegionOrCityAndLocationsWithinFiftyKilometres() {
        UUID organizer = user();
        UUID mendoza = jdbc.queryForObject("SELECT id FROM regions WHERE name='Mendoza' LIMIT 1", UUID.class);
        UUID salta = jdbc.queryForObject("SELECT id FROM regions WHERE name='Salta' LIMIT 1", UUID.class);
        UUID byRegion = user();
        areas.save(byRegion, EventArea.region(mendoza));
        UUID elsewhere = user();
        areas.save(elsewhere, EventArea.region(salta));
        UUID close = user();
        areas.save(close, EventArea.approximate(-33.0, -68.9));
        UUID far = user();
        areas.save(far, EventArea.approximate(-34.6, -58.4));
        areas.save(organizer, EventArea.region(mendoza));

        assertThat(audience.near(new NewEventAudience.Place(organizer, "  mendoza ", "Luján de Cuyo", -33.03, -68.87)))
                .containsExactlyInAnyOrder(byRegion, close);
        assertThat(audience.near(new NewEventAudience.Place(organizer, null, "MENDOZA", null, null))).containsExactly(byRegion);
        assertThat(audience.near(new NewEventAudience.Place(organizer, null, null, null, null))).isEmpty();
    }

    @Test
    void membersWhoBlockedTheOrganizerOrWereBlockedByThemAreNotTold() {
        UUID organizer = user();
        UUID mendoza = jdbc.queryForObject("SELECT id FROM regions WHERE name='Mendoza' LIMIT 1", UUID.class);
        UUID blocker = user();
        UUID blocked = user();
        UUID neighbour = user();
        for (UUID member : List.of(blocker, blocked, neighbour)) {
            areas.save(member, EventArea.region(mendoza));
        }
        jdbc.update("INSERT INTO user_blocks(blocker_id, blocked_id) VALUES (?, ?)", blocker, organizer);
        jdbc.update("INSERT INTO user_blocks(blocker_id, blocked_id) VALUES (?, ?)", organizer, blocked);

        assertThat(audience.near(new NewEventAudience.Place(organizer, "Mendoza", null, null, null)))
                .containsExactly(neighbour);
    }

    @Test
    void theFirstPublicationQueuesOneNearbyPushWithItsDeadline() {
        UUID organizer = user();
        UUID nearby = user();
        areas.save(nearby, EventArea.approximate(-33.0, -68.9));
        UUID event = event(organizer, "Mendoza", "Luján de Cuyo", -33.03, -68.87);

        publish.execute(new PublishEventCommand(event, organizer, false));

        Map<String, Object> job = jdbc.queryForMap("""
                SELECT payload->>'type' AS type, payload->'userIds'->>0 AS user_id, payload->>'expiresAt' AS expires,
                    payload->'data'->>'place' AS place
                FROM external_effects WHERE deduplication_key = ?""", "push:event-nearby:" + event);
        assertThat(job).containsEntry("type", "EVENT_NEARBY").containsEntry("user_id", nearby.toString())
                .containsEntry("place", "Luján de Cuyo");
        assertThat(job.get("expires")).isNotNull();
    }

    @Test
    void anEventCreatedAlreadyPublishedIsAnnouncedInTheSameTransaction() {
        UUID organizer = user();
        UUID nearby = user();
        areas.save(nearby, EventArea.approximate(-33.0, -68.9));
        Instant start = Instant.now().plus(5, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);

        UUID event = create.execute(new CreateEventCommand("Harvest night", null, "TASTING", start, start.plus(2, ChronoUnit.HOURS),
                "Bodega", null, "Luján de Cuyo", "Mendoza", "AR", new BigDecimal("-33.03"), new BigDecimal("-68.87"), null, null,
                10, null, null, 4, null, null, null, null, null, null, null, organizer, null, null, null, "PUBLISHED"));

        assertThat(nearbyPushTo(event)).isEqualTo(nearby.toString());
    }

    @Test
    void aDraftEditedIntoANewPlaceAndPublishedAtOnceIsAnnouncedForTheNewPlace() {
        UUID organizer = user();
        UUID nearby = user();
        areas.save(nearby, EventArea.approximate(-33.0, -68.9));
        UUID event = event(organizer, null, null, null, null);

        update.execute(new UpdateEventCommand(event, organizer, false, null, null, null, null, null, "Bodega", null,
                "Luján de Cuyo", "Mendoza", "AR", new BigDecimal("-33.03"), new BigDecimal("-68.87"), null, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null, null, null, "PUBLISHED"));

        assertThat(nearbyPushTo(event)).isEqualTo(nearby.toString());
    }

    private String nearbyPushTo(UUID event) {
        return jdbc.queryForObject("SELECT payload->'userIds'->>0 FROM external_effects WHERE deduplication_key = ?",
                String.class, "push:event-nearby:" + event);
    }

    private UUID event(UUID organizer, String region, String city, Double latitude, Double longitude) {
        UUID id = UUID.randomUUID();
        Instant start = Instant.now().plus(5, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status,published_once,
                    max_attendees,max_tickets_per_registration,approval_mode,attendee_confirmation_required,
                    location_region,location_city,latitude,longitude)
                VALUES (?,'Tasting night','TASTING',?,?,?,'DRAFT',false,10,4,'AUTOMATIC',false,?,?,?,?)
                """, id, Timestamp.from(start), Timestamp.from(start.plus(2, ChronoUnit.HOURS)), organizer,
                region, city, latitude, longitude);
        return id;
    }

    private UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,preferred_language)
                VALUES (?,?,?,'fixture','Test','Member','es')
                """, id, "user-" + id, id + "@example.invalid");
        return id;
    }

}
