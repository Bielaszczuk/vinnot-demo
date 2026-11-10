package com.vinnot.admin.infrastructure.persistence;

import com.vinnot.user.infrastructure.persistence.adapter.AccountAccessAdapter;
import com.vinnot.user.infrastructure.persistence.jpa.RoleJpaRepository;
import com.vinnot.user.infrastructure.persistence.jpa.UserJpaRepository;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import com.vinnot.wine.infrastructure.persistence.jpa.WineSubmissionJpaRepository;
import com.vinnot.wineroute.infrastructure.persistence.jpa.RouteStopJpaRepository;
import com.vinnot.wineroute.infrastructure.persistence.jpa.WineRouteJpaRepository;
import com.vinnot.winery.infrastructure.persistence.jpa.WineryJpaRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {"spring.flyway.enabled=true", "spring.jpa.hibernate.ddl-auto=validate"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(AccountAccessAdapter.class)
@Testcontainers(disabledWithoutDocker = true)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AdminPersistencePostgresIntegrationTest {
    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    @Autowired private JdbcTemplate jdbc;
    @Autowired private AccountAccessAdapter accounts;
    @Autowired private RoleJpaRepository roles;
    @Autowired private UserJpaRepository users;
    @Autowired private RouteStopJpaRepository stops;
    @Autowired private WineSubmissionJpaRepository submissions;
    @Autowired private WineryJpaRepository wineries;
    @Autowired private WineRouteJpaRepository routes;

    @Test
    void publicationMigrationPreservesLegacyLinksAndKeepsDraftsPrivate() {
        UUID actor = insertAdministrator();
        UUID published = UUID.randomUUID();
        UUID draft = UUID.randomUUID();
        jdbc.update("INSERT INTO events (id, title, event_type, start_date, end_date, organizer_id, status) VALUES (?, 'Published before migration', 'TASTING', now(), now() + interval '1 hour', ?, 'CANCELLED')", published, actor);
        jdbc.update("INSERT INTO events (id, title, event_type, start_date, end_date, organizer_id, status) VALUES (?, 'Draft before migration', 'TASTING', now(), now() + interval '1 hour', ?, 'DRAFT')", draft, actor);
        // Test-scoped transaction restores the schema after checking the actual migration.
        jdbc.execute("ALTER TABLE events DROP COLUMN published_once");
        new ResourceDatabasePopulator(
                new ClassPathResource("db/migration/V22__remember_event_publication.sql"))
                .execute(Objects.requireNonNull(jdbc.getDataSource()));
        assertThat(jdbc.queryForObject("SELECT published_once FROM events WHERE id = ?", Boolean.class, published)).isTrue();
        assertThat(jdbc.queryForObject("SELECT published_once FROM events WHERE id = ?", Boolean.class, draft)).isFalse();
    }

    @Test
    void aSuspensionStoresTheLongestReasonCodeWithAFullDetail() {
        UUID user = insertAdministrator();
        String stored = "TERMS_VIOLATION: " + "x".repeat(255);
        jdbc.update("UPDATE users SET locked = true, lock_reason = ? WHERE id = ?", stored, user);
        assertThat(jdbc.queryForObject("SELECT lock_reason FROM users WHERE id = ?", String.class, user)).isEqualTo(stored);
    }

    @Test
    void geographyDoesNotRevealLocationsFromDraftOrArchivedRoutes() {
        UUID actor = insertAdministrator();
        for (String status : List.of("DRAFT", "PUBLISHED", "ARCHIVED")) {
            jdbc.update("INSERT INTO wine_routes (id, name, created_by, status, country, region, subregion) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID(), "Route " + status, actor, status, "QA Country", "QA " + status, "QA " + status);
        }
        assertThat(routes.findDistinctCountries()).contains("QA Country");
        assertThat(routes.findDistinctRegionsByCountry("QA Country")).containsExactly("QA PUBLISHED");
        assertThat(routes.findDistinctSubregionsByCountryAndRegion("QA Country", "QA DRAFT")).isEmpty();
        assertThat(routes.findDistinctSubregionsByCountryAndRegion("QA Country", "QA PUBLISHED")).containsExactly("QA PUBLISHED");
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Test
    void validatesCurrentRolesAndLocksActiveAdministratorRows() {
        UUID id = insertAdministrator();
        assertThat(roles.lockAdministratorRole()).isPresent();
        assertThat(users.lockActiveAdministratorIds()).contains(id);
        assertThat(accounts.permits(id, List.of("ROLE_ADMIN"), 0)).isTrue();
        assertThat(accounts.permits(id, List.of("ROLE_USER"), 0)).isFalse();
        jdbc.update("UPDATE users SET locked = true WHERE id = ?", id);
        assertThat(accounts.permits(id, List.of("ROLE_ADMIN"), 0)).isFalse();
        assertThat(users.lockActiveAdministratorIds()).doesNotContain(id);
        jdbc.update("UPDATE users SET locked = false, active = false WHERE id = ?", id);
        assertThat(accounts.permits(id, List.of("ROLE_ADMIN"), 0)).isFalse();
        assertThat(accounts.permits(UUID.randomUUID(), List.of("ROLE_ADMIN"), 0)).isFalse();
    }

    @Test
    void countsStopsAndWineryStopsWithoutHydratingTheRouteCollection() {
        UUID actor = insertAdministrator();
        UUID route = UUID.randomUUID();
        jdbc.update("INSERT INTO wine_routes (id, name, created_by) VALUES (?, 'Test route', ?)", route, actor);
        for (int index = 0; index < 3; index++) {
            jdbc.update("INSERT INTO wine_route_stops (id, wine_route_id, name, type, stop_order) VALUES (?, ?, 'Stop', ?, ?)",
                    UUID.randomUUID(), route, index == 0 ? "restaurant" : "WINERY", index + 1);
        }
        var count = stops.countForRoutes(List.of(route));
        assertThat(count).singleElement().satisfies(row -> {
            assertThat(row.getRouteId()).isEqualTo(route);
            assertThat(row.getStops()).isEqualTo(3);
            assertThat(row.getWineries()).isEqualTo(2);
        });
    }

    @Test
    void submissionSearchSupportsMissingTextAndStatusWithRealPostgresTypes() {
        UUID actor = insertAdministrator();
        for (int index = 0; index < 2; index++) {
            jdbc.update("INSERT INTO wine_submissions (id, submitted_by, wine_name, winery_name, status) VALUES (?, ?, ?, 'Test estate', 'NEEDS_REVIEW')",
                    UUID.randomUUID(), actor, "Test Malbec " + index);
        }
        var page = PageRequest.of(0, 1);
        assertThat(submissions.search(WineSubmissionStatus.NEEDS_REVIEW, null, page).getTotalElements()).isEqualTo(2);
        assertThat(submissions.search(null, null, page).getTotalElements()).isEqualTo(2);
        assertThat(submissions.search(null, "mALb", page).getTotalElements()).isEqualTo(2);
        assertThat(submissions.search(null, "est", page).getTotalElements()).isEqualTo(2);
        assertThat(submissions.search(WineSubmissionStatus.REJECTED, null, page).getTotalElements()).isZero();
        assertThat(submissions.search(null, "missing", page).getTotalElements()).isZero();
    }

    @Test
    void wineryWithoutOptionalRegionRemainsVisibleInListsAndSearch() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO wineries (id, name, slug, country_id) SELECT ?, 'Missing region estate', ?, id FROM countries WHERE code = 'ar'",
                id, id.toString());
        var page = PageRequest.of(0, 20);
        assertThat(wineries.searchWithoutTerm(null, null, page).getContent()).extracting("id").contains(id);
        assertThat(wineries.search("region", "ar", null, page).getContent()).extracting("id").contains(id);
        assertThat(wineries.search("region", "ar", "Mendoza", page).getContent()).isEmpty();
        assertThat(wineries.searchWithoutTerm("fr", null, page).getContent()).isEmpty();
    }

    private UUID insertAdministrator() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users (id, email, username, password, first_name, last_name) VALUES (?, ?, ?, 'hash', 'Test', 'Admin')",
                id, id + "@example.com", id.toString());
        jdbc.update("INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE name = 'ROLE_ADMIN'", id);
        return id;
    }
}
