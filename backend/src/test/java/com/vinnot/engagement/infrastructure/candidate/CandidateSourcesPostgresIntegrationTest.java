package com.vinnot.engagement.infrastructure.candidate;

import com.vinnot.activity.application.query.handler.ReadActivitySignalsQueryHandler;
import com.vinnot.activity.infrastructure.persistence.JdbcAppOpenRepository;
import com.vinnot.activity.infrastructure.persistence.JdbcContentViewRepository;
import com.vinnot.engagement.application.model.CandidateQuery;
import com.vinnot.engagement.domain.model.EngagementCandidate;
import com.vinnot.engagement.domain.model.PlanningMember;
import com.vinnot.engagement.infrastructure.EngagementDatabase;
import com.vinnot.notification.domain.model.NotificationType;
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
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.OptionalInt;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.offset;

/** S13: each catalog generator's eligibility and exclusions, one statement per page, against Postgres. */
@Testcontainers(disabledWithoutDocker = true)
class CandidateSourcesPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final ZoneId BUENOS_AIRES = ZoneId.of("America/Argentina/Buenos_Aires");
    /** Thursday 04:00 in Buenos Aires. */
    private static final Instant NOW = Instant.parse("2026-10-22T07:00:00Z");
    private static JdbcTemplate jdbc;
    private static EngagementDatabase db;
    private static ReadActivitySignalsQueryHandler activity;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        db = new EngagementDatabase(jdbc);
        activity = new ReadActivitySignalsQueryHandler(new JdbcAppOpenRepository(jdbc), new JdbcContentViewRepository(jdbc),
                Duration.ofDays(30));
    }

    @Test
    void theWineOfTheWeekIsTheBestUnratedUnkeptUnsuggestedWineOfALikedGrapeOrType() {
        UUID ana = user();
        UUID nobody = user();
        UUID lowScore = user();
        UUID blocked = user();
        UUID white = db.wine("Blanco Popular", "WHITE", "[\"Torrontés\"]", NOW.minus(Duration.ofDays(400)), 900, null);
        UUID reviewed = db.wine("Malbec Reseñado", "RED", "[\"Malbec\"]", NOW.minus(Duration.ofDays(400)), 990, null);
        UUID kept = db.wine("Malbec Guardado", "RED", "[\"Malbec\"]", NOW.minus(Duration.ofDays(400)), 980, null);
        UUID suggested = db.wine("Malbec Sugerido", "RED", "[\"Malbec\"]", NOW.minus(Duration.ofDays(400)), 970, null);
        UUID fromBlocked = db.wine("Malbec Bloqueado", "RED", "[\" malbec \"]", NOW.minus(Duration.ofDays(400)), 960, null);
        jdbc.update("UPDATE wines SET created_by = ? WHERE id = ?", blocked, fromBlocked);
        jdbc.update("INSERT INTO user_blocks(blocker_id,blocked_id) VALUES (?,?)", ana, blocked);
        UUID expected = db.wine("Gran Malbec", "RED", "[\"Malbec\", \"Cabernet\"]", NOW.minus(Duration.ofDays(10)), 950, null);
        db.affinity(ana, "TYPE", "WHITE", "WHITE", 4.5, 3);
        db.affinity(ana, "GRAPE", "malbec", "Malbec", 4.8, 4);
        db.affinity(lowScore, "GRAPE", "malbec", "Malbec", 3.5, 4);
        db.review(ana, reviewed, 5, NOW.minus(Duration.ofDays(100)));
        db.cellar(ana, kept, null, NOW.minus(Duration.ofDays(100)));
        db.sent(ana, "WINE_RECOMMENDATION", "wine-recommendation:x", "WINE:" + suggested, NOW.minus(Duration.ofDays(90)), false);

        List<EngagementCandidate> found = new TastePickSource(jdbc).find(query(ana, nobody, lowScore));

        assertThat(found).singleElement().satisfies(candidate -> {
            assertThat(candidate.userId()).isEqualTo(ana);
            assertThat(candidate.contentRef()).isEqualTo("WINE:" + expected);
            assertThat(candidate.data()).containsEntry("reasonKind", "GRAPE").containsEntry("reason", "Malbec")
                    .containsEntry("wine", "Gran Malbec").containsEntry("wineId", expected.toString());
            assertThat(candidate.signals().fit()).isCloseTo(0.9, offset(0.001));
        });
        assertThat(white).isNotNull();
        assertThat(new TastePickSource(jdbc).find(new CandidateQuery(List.of(), NOW))).isEmpty();
    }

    @Test
    void aRouteOfARegionViewedLatelyBeatsOneOfALikedTypeAndDraftsOrSuggestedOnesNeverCome() {
        UUID ana = user();
        UUID bruno = user();
        UUID author = user();
        UUID viewedRoute = db.route("Ruta Vista", "Valle de Uco", "[]", author, "PUBLISHED");
        UUID sameRegion = db.route("Caminos de Uco", " valle de uco ", "[]", author, "PUBLISHED");
        UUID redRoute = db.route("Ruta de Tintos", "Salta", "[\"RED\"]", author, "PUBLISHED");
        db.route("Borrador de Uco", "Valle de Uco", "[]", author, "DRAFT");
        db.view(ana, "ROUTE", viewedRoute, 2, NOW.minus(Duration.ofDays(3)));
        db.sent(ana, "ROUTE_PICK", "route-old", "ROUTE:" + viewedRoute, NOW.minus(Duration.ofDays(40)), false);
        db.affinity(bruno, "TYPE", "RED", "RED", 4.6, 5);

        Map<UUID, EngagementCandidate> found = byUser(new RoutePickSource(jdbc).find(query(ana, bruno)));

        assertThat(found.get(ana).contentRef()).isEqualTo("ROUTE:" + sameRegion);
        assertThat(found.get(ana).signals().nearby()).isTrue();
        assertThat(found.get(ana).data()).containsEntry("region", "valle de uco").containsEntry("routeId", sameRegion.toString());
        assertThat(found.get(bruno).contentRef()).isEqualTo("ROUTE:" + redRoute);
        assertThat(found.get(bruno).signals().fit()).isEqualTo(0.8);
    }

    @Test
    void aWineryOfARegionTheAccountRatesHighlyThatItNeverRatedAWineOf() {
        UUID ana = user();
        UUID region = db.region("Luján de Cuyo " + UUID.randomUUID());
        UUID rated = db.winery("Bodega Conocida", region, 4.9);
        UUID expected = db.winery("Bodega Nueva", region, 4.5);
        db.winery("Bodega Menor", region, 3.0);
        UUID likedWine = db.wine("Vino de la zona", "RED", "[]", NOW.minus(Duration.ofDays(200)), 10, region);
        jdbc.update("UPDATE wines SET winery_id = ? WHERE id = ?", rated, likedWine);
        db.review(ana, likedWine, 5, NOW.minus(Duration.ofDays(20)));

        List<EngagementCandidate> found = new WineryPickSource(jdbc).find(query(ana, user()));

        assertThat(found).singleElement().satisfies(candidate -> {
            assertThat(candidate.contentRef()).isEqualTo("WINERY:" + expected);
            assertThat(candidate.data()).containsEntry("winery", "Bodega Nueva").containsKey("region");
        });
    }

    @Test
    void aWineViewedTwiceFiveToTenDaysAgoAndNeverRatedIsAskedAbout() {
        UUID ana = user();
        UUID bruno = user();
        UUID viewed = db.wine("Visto Dos Veces", "WHITE", "[]", NOW.minus(Duration.ofDays(400)), 1, null);
        UUID once = db.wine("Visto Una Vez", "WHITE", "[]", NOW.minus(Duration.ofDays(400)), 1, null);
        UUID recent = db.wine("Visto Ayer", "WHITE", "[]", NOW.minus(Duration.ofDays(400)), 1, null);
        UUID rated = db.wine("Ya Puntuado", "WHITE", "[]", NOW.minus(Duration.ofDays(400)), 1, null);
        db.view(ana, "WINE", viewed, 1, NOW.minus(Duration.ofDays(9)));
        db.view(ana, "WINE", viewed, 2, NOW.minus(Duration.ofDays(7)));
        db.view(ana, "WINE", once, 1, NOW.minus(Duration.ofDays(6)));
        db.view(bruno, "WINE", recent, 4, NOW.minus(Duration.ofDays(2)));
        db.view(bruno, "WINE", rated, 4, NOW.minus(Duration.ofDays(6)));
        db.review(bruno, rated, 4, NOW.minus(Duration.ofDays(5)));

        List<EngagementCandidate> found = new ViewedNotRatedSource(activity, jdbc).find(query(ana, bruno));

        assertThat(found).singleElement().satisfies(candidate -> {
            assertThat(candidate.userId()).isEqualTo(ana);
            assertThat(candidate.contentRef()).isEqualTo("WINE:" + viewed);
            assertThat(candidate.signals().sinceViewed()).isEqualTo(Duration.ofDays(7));
        });
        assertThat(new ViewedNotRatedSource(activity, jdbc).find(query(user()))).isEmpty();
    }

    @Test
    void aCellarWineUnratedForAMonthIsCheckedInOnce() {
        UUID ana = user();
        UUID bruno = user();
        UUID wine = db.wine("En la Cava", "RED", "[]", NOW.minus(Duration.ofDays(400)), 1, null);
        UUID cellar = db.cellar(ana, wine, null, NOW.minus(Duration.ofDays(40)));
        db.cellar(bruno, wine, null, NOW.minus(Duration.ofDays(10)));
        UUID other = db.wine("Otra", "RED", "[]", NOW.minus(Duration.ofDays(400)), 1, null);
        UUID asked = db.cellar(bruno, other, null, NOW.minus(Duration.ofDays(60)));
        db.sent(bruno, "CELLAR_CHECKIN", "c-old", "CELLAR:" + asked, NOW.minus(Duration.ofDays(31)), false);

        List<EngagementCandidate> found = new CellarCheckinSource(jdbc).find(query(ana, bruno));

        assertThat(found).singleElement().satisfies(candidate -> {
            assertThat(candidate.contentRef()).isEqualTo("CELLAR:" + cellar);
            assertThat(candidate.data()).containsEntry("wineId", wine.toString());
        });
    }

    @Test
    void onThursdayTheWeekendsEventsInTheAreaAreGroupedIntoOnePush() {
        UUID ana = user();
        UUID bruno = user();
        UUID organizer = user();
        String regionName = "Mendoza " + UUID.randomUUID();
        UUID region = db.region(regionName);
        db.area(ana, region);
        db.area(bruno, region);
        Instant friday = Instant.parse("2026-10-23T21:00:00Z");
        UUID popular = db.event("Cata de Otoño", organizer, friday, friday.plus(Duration.ofHours(3)), regionName, 40);
        db.event("Feria del Vino", organizer, friday.plus(Duration.ofDays(1)), friday.plus(Duration.ofDays(1).plusHours(4)), regionName, 5);
        db.event("La semana que viene", organizer, friday.plus(Duration.ofDays(7)), friday.plus(Duration.ofDays(7).plusHours(2)), regionName, 90);
        db.register(popular, bruno, "CONFIRMED");

        Map<UUID, EngagementCandidate> found = byUser(new WeekendEventsSource(jdbc).find(query(ana, bruno)));

        assertThat(found.get(ana).data()).containsEntry("count", "2").containsEntry("event", "Cata de Otoño").doesNotContainKey("eventId");
        assertThat(found.get(ana).contentRef()).isEqualTo("WEEKEND:2026-10-23");
        assertThat(found.get(bruno).data()).as("registered events are left out").containsEntry("count", "1").containsKey("eventId");
        assertThat(new WeekendEventsSource(jdbc).find(new CandidateQuery(members(ana), NOW.plus(Duration.ofDays(1))))).isEmpty();
        db.sent(ana, "WEEKEND_EVENTS", "w", "WEEKEND:2026-10-23", NOW.minus(Duration.ofHours(1)), false);
        assertThat(byUser(new WeekendEventsSource(jdbc).find(query(ana)))).doesNotContainKey(ana);
    }

    @Test
    void onboardingStepsFollowTheAccountsFirstDays() {
        UUID dayOne = db.user(BUENOS_AIRES.getId(), NOW.minus(Duration.ofDays(1)));
        UUID dayFour = db.user(BUENOS_AIRES.getId(), NOW.minus(Duration.ofDays(4)));
        UUID dayFourRated = db.user(BUENOS_AIRES.getId(), NOW.minus(Duration.ofDays(4)));
        UUID dayEight = db.user(BUENOS_AIRES.getId(), NOW.minus(Duration.ofDays(8)));
        UUID dayEightDone = db.user(BUENOS_AIRES.getId(), NOW.minus(Duration.ofDays(8)));
        UUID old = db.user(BUENOS_AIRES.getId(), NOW.minus(Duration.ofDays(20)));
        UUID top = db.wine("El Más Puntuado", "RED", "[]", NOW.minus(Duration.ofDays(400)), 1_000_000, null);
        for (int index = 0; index < 3; index++) {
            db.review(dayFourRated, db.wine("Probado " + index, "RED", "[]", NOW.minus(Duration.ofDays(400)), 1, null), 4, NOW);
        }
        db.sent(dayEightDone, "ONBOARDING", "o3", "ONBOARDING:3", NOW.minus(Duration.ofDays(1)), false);

        Map<UUID, EngagementCandidate> found = byUser(new OnboardingSource(jdbc).find(new CandidateQuery(List.of(
                member(dayOne, NOW.minus(Duration.ofDays(1))), member(dayFour, NOW.minus(Duration.ofDays(4))),
                member(dayFourRated, NOW.minus(Duration.ofDays(4))), member(dayEight, NOW.minus(Duration.ofDays(8))),
                member(dayEightDone, NOW.minus(Duration.ofDays(8))), member(old, NOW.minus(Duration.ofDays(20)))), NOW)));

        assertThat(found.get(dayOne).data()).containsEntry("step", "1");
        assertThat(found.get(dayFour).data()).containsEntry("step", "2");
        assertThat(found.get(dayEight).data()).containsEntry("step", "3").containsEntry("wineId", top.toString());
        assertThat(found).doesNotContainKeys(dayFourRated, dayEightDone, old);
        assertThat(new OnboardingSource(jdbc).find(new CandidateQuery(List.of(member(old, NOW.minus(Duration.ofDays(20)))), NOW))).isEmpty();
    }

    @Test
    void comeBackPushesAreTwoAttemptsPerAbsenceThenSilence() {
        UUID popular = db.wine("Lo Más Visto", "RED", "[]", NOW.minus(Duration.ofDays(400)), 1, null);
        db.view(user(), "WINE", popular, 100_000, NOW.minus(Duration.ofDays(2)));
        UUID firstTry = user();
        UUID secondTry = user();
        UUID tooSoon = user();
        UUID done = user();
        UUID active = user();
        Instant fifteen = NOW.minus(Duration.ofDays(15));
        Instant thirtyOne = NOW.minus(Duration.ofDays(31));
        db.sent(secondTry, "WINBACK", "wb1", null, thirtyOne.plus(Duration.ofDays(14)), false);
        db.sent(tooSoon, "WINBACK", "wb1", null, NOW.minus(Duration.ofDays(5)), false);
        db.sent(done, "WINBACK", "wb1", null, thirtyOne.plus(Duration.ofDays(14)), false);
        db.sent(done, "WINBACK", "wb2", null, thirtyOne.plus(Duration.ofDays(30)), false);
        db.sent(firstTry, "WINBACK", "older-absence", null, NOW.minus(Duration.ofDays(200)), false);
        db.wine("Nuevo", "WHITE", "[]", NOW.minus(Duration.ofDays(3)), 1, null);

        Map<UUID, EngagementCandidate> found = byUser(new WinbackSource(activity, jdbc).find(new CandidateQuery(List.of(
                seen(firstTry, fifteen), seen(secondTry, thirtyOne), seen(tooSoon, NOW.minus(Duration.ofDays(20))),
                seen(done, thirtyOne), seen(active, NOW.minus(Duration.ofDays(2)))), NOW)));

        assertThat(found.get(firstTry).data()).containsEntry("attempt", "1").containsEntry("wineId", popular.toString());
        assertThat(found.get(firstTry).contentRef()).isEqualTo("WINE:" + popular);
        assertThat(found.get(secondTry).data()).containsEntry("attempt", "2");
        assertThat(Integer.parseInt(found.get(secondTry).data().get("count"))).isPositive();
        assertThat(found.get(secondTry).contentRef()).isNull();
        assertThat(found).doesNotContainKeys(tooSoon, done, active);
        assertThat(new WinbackSource(activity, jdbc).find(new CandidateQuery(List.of(seen(active, NOW)), NOW))).isEmpty();
    }

    @Test
    void aMilestoneCrossedThisWeekIsCelebratedOnceAndOldOnesNever() {
        UUID author = user();
        UUID veteran = user();
        UUID rater = user();
        UUID wine = db.wine("Reseñado", "RED", "[]", NOW.minus(Duration.ofDays(400)), 1, null);
        db.review(author, wine, 5, NOW.minus(Duration.ofDays(100)));
        UUID review = db.reviewId(author, wine);
        for (int index = 0; index < 9; index++) {
            db.like(review, user(), NOW.minus(Duration.ofDays(30)));
        }
        db.like(review, user(), NOW.minus(Duration.ofDays(1)));
        db.like(review, author, NOW.minus(Duration.ofDays(1)));
        db.review(veteran, wine, 5, NOW.minus(Duration.ofDays(100)));
        UUID old = db.reviewId(veteran, wine);
        for (int index = 0; index < 12; index++) {
            db.like(old, user(), NOW.minus(Duration.ofDays(30)));
        }
        for (int index = 0; index < 5; index++) {
            db.review(rater, db.wine("R" + index, "RED", "[]", NOW, 1, null), 4,
                    index == 4 ? NOW.minus(Duration.ofDays(2)) : NOW.minus(Duration.ofDays(40)));
        }

        Map<UUID, EngagementCandidate> found = byUser(new MilestoneSource(jdbc).find(query(author, veteran, rater)));

        assertThat(found.get(author).contentRef()).isEqualTo("MILESTONE:LIKES:10");
        assertThat(found.get(author).data()).containsEntry("kind", "LIKES").containsEntry("count", "10").containsEntry("wineId", wine.toString());
        assertThat(found.get(rater).contentRef()).isEqualTo("MILESTONE:RATED:5");
        assertThat(found).doesNotContainKey(veteran);
        db.sent(author, "MILESTONE", "m", "MILESTONE:LIKES:10", NOW, false);
        assertThat(byUser(new MilestoneSource(jdbc).find(query(author)))).doesNotContainKey(author);
        assertThat(MilestoneSource.crossed(MilestoneSource.LIKES, 5, 60, "LIKES", Set.of())).contains(50);
    }

    @Test
    void theDayAfterAnAttendedEventItIsAskedAboutOnce() {
        UUID ana = user();
        UUID bruno = user();
        UUID organizer = user();
        Instant yesterdayEvening = Instant.parse("2026-10-21T23:00:00Z");
        UUID event = db.event("Noche de Malbec", organizer, yesterdayEvening.minus(Duration.ofHours(3)), yesterdayEvening, "Mendoza", 10);
        UUID older = db.event("Antes", organizer, NOW.minus(Duration.ofDays(4)), NOW.minus(Duration.ofDays(3)), "Mendoza", 10);
        db.register(event, ana, "CONFIRMED");
        db.register(event, bruno, "CANCELLED");
        db.register(older, bruno, "CONFIRMED");

        List<EngagementCandidate> found = new PostEventSource(jdbc).find(query(ana, bruno));

        assertThat(found).singleElement().satisfies(candidate -> {
            assertThat(candidate.userId()).isEqualTo(ana);
            assertThat(candidate.contentRef()).isEqualTo("EVENT:" + event + ":after");
            assertThat(candidate.data()).containsEntry("event", "Noche de Malbec");
        });
    }

    private static UUID user() {
        return db.user(BUENOS_AIRES.getId(), NOW.minus(Duration.ofDays(300)));
    }

    private static CandidateQuery query(UUID... users) {
        return new CandidateQuery(members(users), NOW);
    }

    private static List<PlanningMember> members(UUID... users) {
        return Arrays.stream(users).map(id -> member(id, NOW.minus(Duration.ofDays(300)))).toList();
    }

    private static PlanningMember member(UUID id, Instant createdAt) {
        return new PlanningMember(id, BUENOS_AIRES, createdAt, NOW.minus(Duration.ofDays(1)), OptionalInt.empty());
    }

    private static PlanningMember seen(UUID id, Instant lastSeen) {
        return new PlanningMember(id, BUENOS_AIRES, NOW.minus(Duration.ofDays(300)), lastSeen, OptionalInt.empty());
    }

    private static Map<UUID, EngagementCandidate> byUser(List<EngagementCandidate> candidates) {
        return candidates.stream().collect(Collectors.toMap(EngagementCandidate::userId, candidate -> candidate));
    }
}
