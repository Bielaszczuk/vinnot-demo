package com.vinnot.event.infrastructure;

import com.vinnot.event.application.command.model.CancelEventCommand;
import com.vinnot.event.domain.valueobject.EventCancellation;
import com.vinnot.event.domain.valueobject.EventCancellationReason;
import com.vinnot.event.application.command.model.CancelEventRegistrationCommand;
import com.vinnot.event.application.command.model.ConfirmEventAttendanceCommand;
import com.vinnot.event.application.command.model.CreateEventCommand;
import com.vinnot.event.application.command.model.RegisterForEventCommand;
import com.vinnot.event.application.command.model.ReviewEventRegistrationCommand;
import com.vinnot.event.application.port.in.CancelEventRegistrationUseCase;
import com.vinnot.event.application.port.in.CancelEventUseCase;
import com.vinnot.event.application.port.in.ConfirmEventAttendanceUseCase;
import com.vinnot.event.application.port.in.CreateEventUseCase;
import com.vinnot.event.application.port.in.RegisterForEventUseCase;
import com.vinnot.event.application.port.in.ReviewEventRegistrationUseCase;
import com.vinnot.event.application.port.in.UpdateEventUseCase;
import com.vinnot.event.application.command.model.UpdateEventCommand;
import com.vinnot.event.application.port.out.EventRegistrationNoticeReader;
import com.vinnot.event.application.query.response.EventOrganizerNotice;
import com.vinnot.event.domain.valueobject.EventRegistrationAction;
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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Who is told about a registration change, through the real handlers, V35/V40 triggers and outbox rows.
 * The worker never drains here, so every queued effect stays visible.
 */
@SpringBootTest(properties = {
        "ai.provider=mock", "ai.enabled=false", "ai.spending.paid-calls-enabled=false",
        "app.auth.email.provider=log", "app.storage.provider=local",
        "app.observability.snapshot.enabled=false", "app.effects.poll-ms=3600000"
})
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class EventNotificationRecipientsPostgresIntegrationTest {
    private static final List<String> BOTH = List.of("ATTENDEE", "ORGANIZER");
    private static final List<String> ATTENDEE_ONLY = List.of("ATTENDEE");

    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    @Autowired JdbcTemplate jdbc;
    @Autowired RegisterForEventUseCase register;
    @Autowired ReviewEventRegistrationUseCase review;
    @Autowired ConfirmEventAttendanceUseCase confirm;
    @Autowired CancelEventRegistrationUseCase cancelRegistration;
    @Autowired CancelEventUseCase cancelEvent;
    @Autowired CreateEventUseCase createEvent;
    @Autowired EventRegistrationNoticeReader notices;
    @Autowired UpdateEventUseCase updateEvent;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("jwt.secret", () -> UUID.randomUUID().toString() + UUID.randomUUID());
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void theOrganizerIsNotEmailedAboutTheirOwnApproveOrRejectDecisions() {
        UUID organizer = user("es");
        UUID event = event(organizer, "MANUAL", false);
        UUID approved = register.execute(command(event, user("es"))).id();
        UUID rejected = register.execute(command(event, user("es"))).id();

        review.execute(new ReviewEventRegistrationCommand(event, approved, organizer, false,
                EventRegistrationAction.APPROVE, null, null));
        review.execute(new ReviewEventRegistrationCommand(event, rejected, organizer, false,
                EventRegistrationAction.REJECT, null, "Full"));

        assertThat(recipients(approved, 2)).isEqualTo(ATTENDEE_ONLY);
        assertThat(recipients(rejected, 2)).isEqualTo(ATTENDEE_ONLY);
    }

    @Test
    void attendeeAndAdministratorChangesStillReachTheOrganizer() {
        UUID organizer = user("es");
        UUID admin = user("es");
        UUID attendee = user("es");
        UUID event = event(organizer, "MANUAL", true);
        UUID registration = register.execute(command(event, attendee)).id();
        UUID reviewedByAdmin = register.execute(command(event, user("es"))).id();
        assertThat(recipients(registration, 1)).isEqualTo(BOTH);

        review.execute(new ReviewEventRegistrationCommand(event, registration, organizer, false,
                EventRegistrationAction.APPROVE, null, null));
        confirm.execute(new ConfirmEventAttendanceCommand(registration, attendee));
        cancelRegistration.execute(new CancelEventRegistrationCommand(event, attendee));
        review.execute(new ReviewEventRegistrationCommand(event, reviewedByAdmin, admin, true,
                EventRegistrationAction.REJECT, null, "Duplicate"));

        assertThat(recipients(registration, 3)).as("attendee confirmation after an organizer decision").isEqualTo(BOTH);
        assertThat(recipients(registration, 4)).as("attendee self-cancel").isEqualTo(BOTH);
        assertThat(recipients(reviewedByAdmin, 2)).as("administrator decision").isEqualTo(BOTH);
    }

    @Test
    void anOrganizerCancellingTheirEventNotifiesEachAttendeeAndNotThemselves() {
        UUID organizer = user("es");
        UUID event = event(organizer, "AUTOMATIC", false);
        UUID first = register.execute(command(event, user("es"))).id();
        UUID second = register.execute(command(event, user("en"))).id();

        cancelEvent.execute(new CancelEventCommand(event, organizer, false,
                new EventCancellation(EventCancellationReason.WEATHER, "ignored without OTHER")));

        assertThat(status(first)).isEqualTo("CANCELLED");
        assertThat(recipients(first, 2)).as("the generic registration notice is replaced").isEmpty();
        assertThat(recipients(second, 2)).isEmpty();
        assertThat(summaries(event)).isZero();
        assertThat(cancellationNotice(event, first)).isEqualTo("EVENT_CANCELLED_ATTENDEE|ES|WEATHER|NONE|");
        assertThat(cancellationNotice(event, second)).as("written in the registration language").isEqualTo("EVENT_CANCELLED_ATTENDEE|ES|WEATHER|NONE|");
    }

    @Test
    void movingAPublishedEventTellsConfirmedAttendeesOncePerChange() {
        UUID organizer = user("es");
        UUID event = event(organizer, "AUTOMATIC", false);
        UUID confirmed = register.execute(command(event, user("es"))).id();
        Instant start = Instant.now().plus(5, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        var move = new ObjectMapper().convertValue(Map.of("eventId", event.toString(),
                "requestingUserId", organizer.toString(), "isAdmin", false, "startDate", start.toString(),
                "endDate", start.plus(2, ChronoUnit.HOURS).toString()), UpdateEventCommand.class);

        updateEvent.execute(move);
        updateEvent.execute(move);

        assertThat(jdbc.queryForObject("SELECT schedule_version FROM events WHERE id=?", Long.class, event)).isEqualTo(1);
        assertThat(jdbc.queryForList("SELECT deduplication_key FROM external_effects WHERE deduplication_key LIKE ?",
                String.class, "notification:event-changed:" + event + "%"))
                .as("saving the same schedule again sends nothing new")
                .containsExactly("notification:event-changed:" + event + ":1:" + confirmed);
        assertThat(jdbc.queryForObject("SELECT payload->'data'->>'startDate' FROM external_effects WHERE deduplication_key=?",
                String.class, "notification:event-changed:" + event + ":1:" + confirmed)).isEqualTo(start.toString());
    }

    @Test
    void anAdministratorCancellingAnEventSendsTheOrganizerOneSummary() {
        UUID organizer = user("en");
        UUID event = event(organizer, "AUTOMATIC", false);
        UUID first = register.execute(command(event, user("es"))).id();
        UUID second = register.execute(command(event, user("es"))).id();
        UUID alreadyCancelledBy = user("es");
        register.execute(command(event, alreadyCancelledBy));
        cancelRegistration.execute(new CancelEventRegistrationCommand(event, alreadyCancelledBy));

        cancelEvent.execute(new CancelEventCommand(event, user("es"), true));

        assertThat(recipients(first, 2)).isEmpty();
        assertThat(recipients(second, 2)).isEmpty();
        assertThat(cancellationNotice(event, first)).startsWith("EVENT_CANCELLED_ATTENDEE|ES|UNFORESEEN_CIRCUMSTANCES|");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE deduplication_key LIKE ?", Integer.class,
                "notification:event-cancelled:" + event + ":%")).as("not the attendee who had already cancelled").isEqualTo(2);
        assertThat(summaries(event)).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                SELECT (payload->>'type') || '|' || (payload->>'locale') || '|' || (payload->'recipient'->>'userId')
                    || '|' || (payload->'data'->>'cancelledRegistrations') || '|' || (payload->'data'->>'title')
                FROM external_effects WHERE deduplication_key=?
                """, String.class, "notification:event-cancelled-summary:" + event))
                .isEqualTo("EVENT_CANCELLED_ORGANIZER_SUMMARY|EN|" + organizer + "|2|Tasting night");
    }

    @Test
    void organizerNoticesUseTheOrganizerLanguageAndAttendeeNoticesTheRegistrationLanguage() {
        UUID organizer = user("en");
        UUID event = event(organizer, "MANUAL", false);
        UUID attendee = user("es");
        UUID registration = register.execute(command(event, attendee)).id();

        assertThat(notices.findCurrent(registration, 1, true).orElseThrow().language()).isEqualTo("en");
        assertThat(notices.findCurrent(registration, 1, false).orElseThrow().language()).isEqualTo("es");
        assertThat(notices.findCurrent(registration, 1, true).orElseThrow().recipientId()).isEqualTo(organizer);
        assertThat(notices.findCurrent(registration, 1, false).orElseThrow().recipientId()).isEqualTo(attendee);
        assertThat(notices.findActiveAttendees(event)).extracting(found -> found.userId()).containsExactly(attendee);
    }

    @Test
    void aNewEventTakesItsOrganizerTimeZoneAndEveryNoticeCarriesIt() {
        UUID organizer = user("es");
        jdbc.update("UPDATE users SET timezone='Europe/Madrid' WHERE id=?", organizer);
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        UUID event = createEvent.execute(new CreateEventCommand("Tasting night", null, "TASTING", start,
                start.plus(2, ChronoUnit.HOURS), "Winery", "Address", "Mendoza", "Mendoza", "Argentina", null, null,
                null, null, 10, "ARS", null, 4, "AUTOMATIC", false, null, null, null, null, null,
                organizer, null, null, null, "PUBLISHED"));
        jdbc.update("UPDATE users SET timezone='America/New_York' WHERE id=?", organizer);
        UUID registration = register.execute(command(event, user("en"))).id();

        assertThat(jdbc.queryForObject("SELECT timezone FROM events WHERE id=?", String.class, event))
                .as("fixed when the event was created").isEqualTo("Europe/Madrid");
        assertThat(notices.findCurrent(registration, 1, false).orElseThrow().timeZone()).isEqualTo("Europe/Madrid");
        assertThat(notices.findCurrent(registration, 1, true).orElseThrow().timeZone()).isEqualTo("Europe/Madrid");
        assertThat(notices.findOrganizer(event).orElseThrow()).isEqualTo(
                new EventOrganizerNotice(organizer, "es", "Europe/Madrid"));
    }

    private List<String> recipients(UUID registration, long version) {
        return jdbc.queryForList("""
                SELECT payload->>'recipient' FROM external_effects
                WHERE kind='EVENT_REGISTRATION_CHANGED' AND payload->>'registrationId'=? AND (payload->>'version')::bigint=?
                ORDER BY 1
                """, String.class, registration.toString(), version);
    }

    private String cancellationNotice(UUID event, UUID registration) {
        return jdbc.queryForObject("SELECT (payload->>'type') || '|' || (payload->>'locale') || '|' || (payload->'data'->>'reason')"
                + " || '|' || (payload->'data'->>'refund') || '|' || coalesce(payload->'data'->>'note', '')"
                + " FROM external_effects WHERE deduplication_key=?", String.class,
                "notification:event-cancelled:" + event + ":" + registration);
    }

    private int summaries(UUID event) {
        return jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE deduplication_key LIKE ?",
                Integer.class, "notification:event-cancelled-summary:" + event + "%");
    }

    private String status(UUID registration) {
        return jdbc.queryForObject("SELECT status FROM event_registrations WHERE id=?", String.class, registration);
    }

    private static RegisterForEventCommand command(UUID event, UUID user) {
        return new RegisterForEventCommand(event, user, 1, null, null, null, null, List.of(), null, false);
    }

    private UUID user(String language) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,preferred_language)
                VALUES (?,?,?,'fixture','Test','Member',?)
                """, id, "user-" + id, id + "@example.invalid", language);
        return id;
    }

    private UUID event(UUID organizer, String mode, boolean confirmation) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status,published_once,
                    max_attendees,max_tickets_per_registration,approval_mode,attendee_confirmation_required)
                VALUES (?,'Tasting night','TASTING',now()+interval '2 days',now()+interval '3 days',?,'PUBLISHED',true,10,4,?,?)
                """, id, organizer, mode, confirmation);
        return id;
    }
}
