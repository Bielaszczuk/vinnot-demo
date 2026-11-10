package com.vinnot.event.infrastructure.persistence.adapter;

import com.vinnot.event.application.port.out.EventRegistrationPointsPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.vinnot.event.domain.model.Event;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** The organizer's own event search filters on the real schema and keeps the newest-first order. */
@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.open-in-view=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(EventPersistenceAdapter.class)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class OrganizerEventSearchPostgresIntegrationTest {
    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    private static final PageQuery NEWEST_FIRST = PageQuery.of(0, 20, "createdAt", PageQuery.SortDirection.DESC);

    @Autowired JdbcTemplate jdbc;
    @Autowired EventPersistenceAdapter events;
    /** The points module is outside this slice (#455). */
    @MockitoBean EventRegistrationPointsPort points;

    private UUID organizer;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @BeforeEach
    void events() {
        organizer = user();
        UUID other = user();
        Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        event(organizer, "Cata de Malbec", "Bodega Sur", "Mendoza", "PUBLISHED", now.minus(3, ChronoUnit.DAYS));
        event(organizer, "Noche de Torrontés", "Bodega Norte", "Cafayate", "DRAFT", now.minus(2, ChronoUnit.DAYS));
        event(organizer, "Malbec al atardecer", null, null, "CANCELLED", now.minus(1, ChronoUnit.DAYS));
        event(other, "Cata de Malbec ajena", "Bodega Sur", "Mendoza", "PUBLISHED", now);
    }

    @Test
    void matchesTheTitleIgnoringCaseOnlyAmongTheOrganizersEventsNewestFirst() {
        PageResult<Event> page = events.searchByOrganizer(organizer, "MALBEC", NEWEST_FIRST);

        assertThat(titles(page)).containsExactly("Malbec al atardecer", "Cata de Malbec");
        assertThat(page.totalElements()).isEqualTo(2);
    }

    @Test
    void matchesTheVenueAndTheCityLikeThePublicSearch() {
        assertThat(titles(events.searchByOrganizer(organizer, "bodega norte", NEWEST_FIRST)))
                .containsExactly("Noche de Torrontés");
        assertThat(titles(events.searchByOrganizer(organizer, "cafayate", NEWEST_FIRST)))
                .containsExactly("Noche de Torrontés");
        assertThat(titles(events.searchByOrganizer(organizer, "Rioja", NEWEST_FIRST))).isEmpty();
    }

    @Test
    void withoutASearchTheOrganizerStillSeesEveryOwnEvent() {
        PageResult<Event> page = events.findByOrganizer(organizer, NEWEST_FIRST);

        assertThat(titles(page)).containsExactly("Malbec al atardecer", "Noche de Torrontés", "Cata de Malbec");
        assertThat(page.totalElements()).isEqualTo(3);
    }

    private static List<String> titles(PageResult<Event> page) {
        return page.content().stream().map(Event::getTitle).toList();
    }

    private void event(UUID owner, String title, String venue, String city, String status, Instant createdAt) {
        Instant start = Instant.now().plus(5, ChronoUnit.DAYS).truncatedTo(ChronoUnit.SECONDS);
        jdbc.update("""
                INSERT INTO events(id,title,event_type,start_date,end_date,organizer_id,status,
                    max_attendees,max_tickets_per_registration,approval_mode,attendee_confirmation_required,
                    location_name,location_city,created_at)
                VALUES (?,?,'TASTING',?,?,?,?,10,4,'AUTOMATIC',false,?,?,?)
                """, UUID.randomUUID(), title, Timestamp.from(start), Timestamp.from(start.plus(2, ChronoUnit.HOURS)),
                owner, status, venue, city, Timestamp.from(createdAt));
    }

    private UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO users(id,username,email,password,first_name,last_name,preferred_language)
                VALUES (?,?,?,'fixture','Event','Organizer','es')
                """, id, "user-" + id, id + "@example.invalid");
        return id;
    }
}
