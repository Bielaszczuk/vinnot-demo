package com.vinnot.activity.infrastructure.persistence;

import com.vinnot.activity.domain.model.ContentKind;
import com.vinnot.activity.domain.model.OpenHourHistogram;
import com.vinnot.activity.domain.model.ViewedContent;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class JdbcActivityPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant MORNING = Instant.parse("2026-10-20T12:00:00Z");
    private static final Duration GAP = Duration.ofMinutes(30);
    private static JdbcTemplate jdbc;
    private static JdbcContentViewRepository views;
    private static JdbcAppOpenRepository opens;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        views = new JdbcContentViewRepository(jdbc);
        opens = new JdbcAppOpenRepository(jdbc);
    }

    @Test
    void repeatedViewsOfOneDetailOnOneDayShareARowAndAnotherDayAddsOne() {
        UUID user = user();
        UUID wine = UUID.randomUUID();
        views.record(user, ContentKind.WINE, wine, MORNING);
        views.record(user, ContentKind.WINE, wine, MORNING.plusSeconds(600));
        views.record(user, ContentKind.WINE, wine, MORNING.plus(Duration.ofDays(1)));

        assertThat(jdbc.queryForList("SELECT views FROM content_views WHERE user_id=? ORDER BY view_day",
                Integer.class, user)).containsExactly(2, 1);
        assertThat(views.viewsSince(List.of(user), ContentKind.WINE, MORNING.minusSeconds(1)))
                .containsExactlyEntriesOf(Map.of(user, List.of(
                        new ViewedContent(ContentKind.WINE, wine, 3, MORNING.plus(Duration.ofDays(1))))));
    }

    @Test
    void viewsAreReadPerUserAndKindSinceAnInstantMostViewedFirst() {
        UUID ana = user();
        UUID bruno = user();
        UUID route = UUID.randomUUID();
        UUID otherRoute = UUID.randomUUID();
        UUID oldRoute = UUID.randomUUID();
        views.record(ana, ContentKind.ROUTE, route, MORNING);
        views.record(ana, ContentKind.ROUTE, otherRoute, MORNING);
        views.record(ana, ContentKind.ROUTE, otherRoute, MORNING.plusSeconds(60));
        views.record(ana, ContentKind.ROUTE, oldRoute, MORNING.minus(Duration.ofDays(20)));
        views.record(ana, ContentKind.EVENT, UUID.randomUUID(), MORNING);
        views.record(bruno, ContentKind.ROUTE, route, MORNING);

        var read = views.viewsSince(List.of(ana, bruno, user()), ContentKind.ROUTE, MORNING.minus(Duration.ofDays(7)));

        assertThat(read).containsOnlyKeys(ana, bruno);
        assertThat(read.get(ana)).extracting(ViewedContent::entityId).containsExactly(otherRoute, route);
        assertThat(read.get(bruno)).extracting(ViewedContent::views).containsExactly(1);
        assertThat(views.viewsSince(List.of(), ContentKind.ROUTE, MORNING)).isEmpty();
    }

    @Test
    void theMostViewedContentAddsUpEveryUser() {
        UUID winery = UUID.randomUUID();
        UUID lessViewed = UUID.randomUUID();
        Instant since = Instant.parse("2030-01-01T00:00:00Z");
        Instant at = since.plusSeconds(3600);
        views.record(user(), ContentKind.WINERY, winery, at);
        views.record(user(), ContentKind.WINERY, winery, at);
        views.record(user(), ContentKind.WINERY, lessViewed, at);
        views.record(user(), ContentKind.WINERY, UUID.randomUUID(), since.minusSeconds(1));

        assertThat(views.mostViewed(ContentKind.WINERY, since, 1))
                .containsExactly(new ViewedContent(ContentKind.WINERY, winery, 2, at));
        assertThat(views.mostViewed(ContentKind.WINERY, since, 10)).extracting(ViewedContent::entityId)
                .containsExactly(winery, lessViewed);
    }

    @Test
    void signalsOfAnAccountThatNoLongerExistsAreIgnored() {
        UUID ghost = UUID.randomUUID();

        views.record(ghost, ContentKind.WINE, UUID.randomUUID(), MORNING);

        assertThat(opens.recordOpen(ghost, MORNING, GAP)).isFalse();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM content_views WHERE user_id=?", Integer.class, ghost)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM user_activity WHERE user_id=?", Integer.class, ghost)).isZero();
    }

    @Test
    void anOpenIsRecordedAtMostOncePerGapAndMovesLastActive() {
        UUID user = user();

        assertThat(opens.recordOpen(user, MORNING, GAP)).isTrue();
        assertThat(opens.recordOpen(user, MORNING.plus(Duration.ofMinutes(10)), GAP)).isFalse();
        assertThat(opens.lastActive(List.of(user))).containsEntry(user, MORNING);
        assertThat(opens.recordOpen(user, MORNING.plus(Duration.ofMinutes(30)), GAP)).isTrue();

        assertThat(opens.lastActive(List.of(user, user()))).containsExactlyEntriesOf(
                Map.of(user, MORNING.plus(Duration.ofMinutes(30))));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app_opens WHERE user_id=?", Integer.class, user)).isEqualTo(2);
        assertThat(opens.lastActive(List.of())).isEmpty();
    }

    @Test
    void openHoursAreCountedInTheUsersTimeZoneSinceAnInstant() {
        UUID buenosAires = user();
        UUID madrid = user();
        jdbc.update("UPDATE users SET timezone='Europe/Madrid' WHERE id=?", madrid);
        Instant evening = Instant.parse("2026-10-20T23:00:00Z");
        opens.recordOpen(buenosAires, MORNING.minus(Duration.ofDays(40)), GAP);
        opens.recordOpen(buenosAires, evening, GAP);
        opens.recordOpen(buenosAires, MORNING.plus(Duration.ofDays(1)), GAP);
        opens.recordOpen(buenosAires, evening.plus(Duration.ofDays(1)), GAP);
        opens.recordOpen(madrid, MORNING, GAP);

        var hours = opens.openHoursSince(List.of(buenosAires, madrid, user()), MORNING.minus(Duration.ofDays(30)));

        assertThat(hours).containsOnlyKeys(buenosAires, madrid);
        assertThat(hours.get(buenosAires)).isEqualTo(new OpenHourHistogram(Map.of(20, 2, 9, 1)));
        assertThat(hours.get(madrid)).isEqualTo(new OpenHourHistogram(Map.of(14, 1)));
        assertThat(opens.openHoursSince(List.of(), MORNING)).isEmpty();
    }

    @Test
    void purgesSignalsOlderThanTheCutoffInBatches() {
        UUID user = user();
        Instant old = Instant.parse("2001-01-01T10:00:00Z");
        Instant cutoff = Instant.parse("2001-02-01T00:00:00Z");
        for (int day = 0; day < 3; day++) {
            views.record(user, ContentKind.EVENT, UUID.randomUUID(), old.plus(Duration.ofDays(day)));
            opens.recordOpen(user, old.plus(Duration.ofDays(day)), GAP);
        }
        views.record(user, ContentKind.EVENT, UUID.randomUUID(), cutoff.plusSeconds(1));
        opens.recordOpen(user, cutoff.plusSeconds(1), GAP);

        assertThat(views.purgeBefore(cutoff, 2)).isEqualTo(2);
        assertThat(views.purgeBefore(cutoff, 2)).isEqualTo(1);
        assertThat(views.purgeBefore(cutoff, 2)).isZero();
        assertThat(opens.purgeBefore(cutoff, 10)).isEqualTo(3);
        assertThat(opens.purgeLastActiveBefore(cutoff, 10)).as("the user was active after the cutoff").isZero();
        UUID inactive = user();
        opens.recordOpen(inactive, old, GAP);
        assertThat(opens.purgeLastActiveBefore(cutoff, 10)).isEqualTo(1);
        assertThat(opens.lastActive(List.of(inactive, user))).containsOnlyKeys(user);

        assertThat(jdbc.queryForObject("SELECT count(*) FROM content_views WHERE user_id=?", Integer.class, user)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app_opens WHERE user_id=?", Integer.class, user)).isEqualTo(1);
    }

    @Test
    void deletingTheAccountDeletesItsSignals() {
        UUID user = user();
        views.record(user, ContentKind.WINE, UUID.randomUUID(), MORNING);
        opens.recordOpen(user, MORNING, GAP);

        jdbc.update("DELETE FROM users WHERE id=?", user);

        for (String table : List.of("content_views", "user_activity", "app_opens")) {
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE user_id=?", Integer.class, user))
                    .as(table).isZero();
        }
    }

    private static UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Member')",
                id, "user-" + id, id + "@example.invalid");
        return id;
    }
}
