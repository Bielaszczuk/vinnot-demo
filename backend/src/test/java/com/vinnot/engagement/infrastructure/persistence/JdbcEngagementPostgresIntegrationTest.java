package com.vinnot.engagement.infrastructure.persistence;

import com.vinnot.engagement.application.model.EngagementMetrics;
import com.vinnot.engagement.application.model.LedgerEntry;
import com.vinnot.engagement.application.model.PlanningAccount;
import com.vinnot.engagement.infrastructure.EngagementDatabase;
import com.vinnot.notification.domain.model.NotificationType;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/** The engagement ledger, audience, planner lease and metrics against Postgres (V67). */
@Testcontainers(disabledWithoutDocker = true)
class JdbcEngagementPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-10-22T07:00:00Z");
    private static JdbcTemplate jdbc;
    private static TransactionTemplate transactions;
    private static EngagementDatabase db;
    private static JdbcEngagementLedger ledger;
    private static JdbcEngagementAudience audience;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        transactions = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        db = new EngagementDatabase(jdbc);
        ledger = new JdbcEngagementLedger(jdbc);
        audience = new JdbcEngagementAudience(jdbc);
    }

    @Test
    void theLedgerKeepsTheLatestRowsPerAccountIgnoresRepeatsAndDeletedAccountsAndReleases() {
        UUID ana = db.user("UTC", NOW.minus(Duration.ofDays(90)));
        UUID bruno = db.user("UTC", NOW.minus(Duration.ofDays(90)));
        UUID gone = UUID.randomUUID();
        ledger.record(List.of(
                new LedgerEntry(ana, NotificationType.TASTE_PICK, "k1", "WINE:1", NOW.minus(Duration.ofDays(9)), false),
                new LedgerEntry(ana, NotificationType.ROUTE_PICK, "k2", null, NOW.minus(Duration.ofDays(2)), false),
                new LedgerEntry(ana, NotificationType.WINBACK, "k3", null, NOW.minus(Duration.ofDays(1)), true),
                new LedgerEntry(ana, NotificationType.TASTE_PICK, "k1", "WINE:other", NOW, false),
                new LedgerEntry(gone, NotificationType.TASTE_PICK, "k1", null, NOW, false)));
        db.sent(bruno, "A_TYPE_THIS_BINARY_DOES_NOT_KNOW", "k9", null, NOW, false);

        Map<UUID, List<LedgerEntry>> recent = ledger.recent(List.of(ana, bruno), 2);

        assertThat(recent.get(ana)).extracting(LedgerEntry::dedupeKey).containsExactly("k3", "k2");
        assertThat(recent.get(ana).getFirst().holdout()).isTrue();
        assertThat(recent).doesNotContainKey(bruno);
        assertThat(ledger.recent(List.of(ana), 10).get(ana)).extracting(LedgerEntry::contentRef).contains("WINE:1");
        assertThat(ledger.recent(List.of(), 10)).isEmpty();
        ledger.record(List.of());

        ledger.release("k2", List.of(ana));
        ledger.release("k2", List.of());
        assertThat(ledger.recent(List.of(ana), 10).get(ana)).extracting(LedgerEntry::dedupeKey).containsExactly("k3", "k1");
    }

    @Test
    void retentionDeletesOldRowsInBatches() {
        UUID ana = db.user("UTC", NOW.minus(Duration.ofDays(900)));
        Instant ancient = Instant.parse("2001-01-01T00:00:00Z");
        for (int index = 0; index < 3; index++) {
            db.sent(ana, "TASTE_PICK", "old-" + index, null, ancient.minusSeconds(index), false);
        }
        db.sent(ana, "TASTE_PICK", "recent", null, NOW, false);

        assertThat(ledger.purgeBefore(ancient.plusSeconds(1), 2)).isEqualTo(2);
        assertThat(ledger.purgeBefore(ancient.plusSeconds(1), 2)).isEqualTo(1);
        assertThat(ledger.recent(List.of(ana), 10).get(ana)).extracting(LedgerEntry::dedupeKey).containsExactly("recent");
    }

    @Test
    void theAudienceIsActiveAccountsWithADeviceOfOneZoneInIdOrderNotPlannedToday() {
        String zone = "Pacific/Chatham";
        UUID a = db.user(zone, NOW.minus(Duration.ofDays(30)));
        UUID b = db.user(zone, NOW.minus(Duration.ofDays(30)));
        UUID c = db.user(zone, NOW.minus(Duration.ofDays(30)));
        UUID noDevice = db.user(zone, NOW.minus(Duration.ofDays(30)));
        UUID locked = db.user(zone, NOW.minus(Duration.ofDays(30)));
        UUID planned = db.user(zone, NOW.minus(Duration.ofDays(30)));
        for (UUID user : List.of(a, b, c, locked, planned)) {
            db.device(user, NOW.minus(Duration.ofDays(3)));
        }
        db.device(a, NOW.minus(Duration.ofHours(1)));
        jdbc.update("UPDATE users SET locked = true WHERE id = ?", locked);
        Instant midnight = NOW.minus(Duration.ofHours(5));
        audience.claim(List.of(planned), midnight, NOW.minus(Duration.ofHours(1)));

        // Postgres orders uuids by their unsigned bytes, as their text sorts; UUID.compareTo compares signed longs.
        List<UUID> expected = List.of(a, b, c).stream().sorted(Comparator.comparing(UUID::toString)).toList();
        List<PlanningAccount> first = audience.page(zone, midnight, null, 2);
        assertThat(first).extracting(PlanningAccount::userId).containsExactlyElementsOf(expected.subList(0, 2));
        assertThat(audience.page(zone, midnight, first.get(1).userId(), 2)).extracting(PlanningAccount::userId)
                .containsExactly(expected.get(2));
        PlanningAccount ana = audience.page(zone, midnight, null, 10).stream().filter(account -> account.userId().equals(a))
                .findFirst().orElseThrow();
        assertThat(ana.deviceSeenAt()).as("its latest device").isEqualTo(NOW.minus(Duration.ofHours(1)));
        assertThat(audience.timeZones()).contains(zone);
        assertThat(noDevice).isNotNull();
    }

    @Test
    void aClaimPlansAnAccountOnceADayEvenWhenTwoRunsRace() throws Exception {
        UUID ana = db.user("UTC", NOW.minus(Duration.ofDays(30)));
        Instant midnight = Instant.parse("2026-10-22T00:00:00Z");
        CountDownLatch firstClaimed = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CompletableFuture<List<UUID>> first = CompletableFuture.supplyAsync(() -> transactions.execute(status -> {
            List<UUID> claimed = audience.claim(List.of(ana), midnight, NOW);
            firstClaimed.countDown();
            await(release);
            return claimed;
        }));
        firstClaimed.await(5, TimeUnit.SECONDS);
        CompletableFuture<List<UUID>> second = CompletableFuture.supplyAsync(() -> transactions.execute(status ->
                audience.claim(List.of(ana), midnight, NOW.plusSeconds(1))));
        Thread.sleep(200);
        assertThat(second).as("waits for the first claim's transaction").isNotDone();
        release.countDown();

        assertThat(first.get(5, TimeUnit.SECONDS)).containsExactly(ana);
        assertThat(second.get(5, TimeUnit.SECONDS)).isEmpty();
        assertThat(audience.claim(List.of(ana), midnight.plus(Duration.ofDays(1)), NOW.plus(Duration.ofDays(1))))
                .as("tomorrow").containsExactly(ana);
        assertThat(audience.claim(List.of(UUID.randomUUID()), midnight, NOW)).as("a deleted account").isEmpty();
        assertThat(audience.claim(List.of(), midnight, NOW)).isEmpty();
    }

    @Test
    void onlyOneInstanceHoldsThePlannerLeaseUntilItIsReleasedOrExpires() {
        JdbcPlannerLease lease = new JdbcPlannerLease(jdbc);
        Instant start = Instant.parse("2030-01-01T00:00:00Z");

        assertThat(lease.acquire("one", start, Duration.ofHours(2))).isTrue();
        assertThat(lease.acquire("two", start.plusSeconds(60), Duration.ofHours(2))).isFalse();
        assertThat(lease.acquire("one", start.plusSeconds(60), Duration.ofHours(2))).as("its holder renews it").isTrue();
        lease.release("two", start.plusSeconds(90));
        assertThat(lease.acquire("two", start.plusSeconds(120), Duration.ofHours(2))).as("only the holder releases").isFalse();
        lease.release("one", start.plusSeconds(120));
        assertThat(lease.acquire("two", start.plusSeconds(121), Duration.ofHours(2))).isTrue();
        assertThat(lease.acquire("one", start.plus(Duration.ofHours(3)), Duration.ofHours(2))).as("an expired lease").isTrue();
    }

    @Test
    void metricsCountSendsOpensOptOutsWithinTheWindowAndTheHoldoutPerType() {
        Instant base = Instant.parse("2031-03-01T12:00:00Z");
        UUID opener = db.user("UTC", base.minus(Duration.ofDays(30)));
        UUID quitter = db.user("UTC", base.minus(Duration.ofDays(30)));
        UUID late = db.user("UTC", base.minus(Duration.ofDays(30)));
        UUID held = db.user("UTC", base.minus(Duration.ofDays(30)));
        db.sent(opener, "TASTE_PICK", "t1", null, base, false);
        db.sent(quitter, "TASTE_PICK", "t1", null, base, false);
        db.sent(late, "TASTE_PICK", "t1", null, base, false);
        db.sent(held, "TASTE_PICK", "t1:holdout", null, base, true);
        db.sent(opener, "ONBOARDING", "o1", null, base, false);
        db.sent(opener, "TASTE_PICK", "before", null, base.minus(Duration.ofDays(30)), false);
        jdbc.update("INSERT INTO push_opens(user_id,ref,type,opened_at) VALUES (?,?,?,?)", opener, "t1", "TASTE_PICK",
                Timestamp.from(base.plusSeconds(600)));
        optOut(quitter, "RECOMMENDATIONS", base.plus(Duration.ofHours(5)));
        optOut(late, "RECOMMENDATIONS", base.plus(Duration.ofHours(60)));
        optOut(opener, "REMINDERS", base.minus(Duration.ofHours(1)));

        Map<NotificationType, EngagementMetrics.Counts> counts = new JdbcEngagementMetrics(jdbc)
                .countsSince(base.minus(Duration.ofDays(1)), Duration.ofHours(48));

        assertThat(counts).containsOnlyKeys(NotificationType.TASTE_PICK, NotificationType.ONBOARDING);
        assertThat(counts.get(NotificationType.TASTE_PICK)).isEqualTo(new EngagementMetrics.Counts(3, 1, 1, 1));
        assertThat(counts.get(NotificationType.ONBOARDING)).as("an opt-out before the push does not count")
                .isEqualTo(new EngagementMetrics.Counts(1, 0, 0, 0));

        Map<NotificationType, Instant> perType = new EnumMap<>(NotificationType.class);
        perType.put(NotificationType.TASTE_PICK, base.plusSeconds(1));
        perType.put(NotificationType.ONBOARDING, base.minus(Duration.ofDays(1)));
        assertThat(new JdbcEngagementMetrics(jdbc).countsSince(perType, Duration.ofHours(48)))
                .as("each type from its own start; types left out are not counted")
                .containsOnlyKeys(NotificationType.ONBOARDING);
    }

    private static void optOut(UUID user, String category, Instant at) {
        jdbc.update("INSERT INTO notification_preferences(user_id,category,channel,enabled,updated_at) VALUES (?,?,'PUSH',false,?)",
                user, category, Timestamp.from(at));
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }
}
