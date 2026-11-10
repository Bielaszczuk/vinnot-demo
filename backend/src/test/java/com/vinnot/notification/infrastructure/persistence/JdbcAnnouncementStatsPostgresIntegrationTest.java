package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.model.AnnouncementRecord;
import com.vinnot.notification.application.model.AnnouncementStats;
import com.vinnot.notification.application.port.out.AnnouncementStorePort;
import com.vinnot.notification.application.port.out.PushReceiptStorePort;
import com.vinnot.notification.domain.model.Announcement;
import com.vinnot.notification.domain.model.AnnouncementAudience;
import com.vinnot.notification.domain.model.AnnouncementContent;
import com.vinnot.notification.domain.model.AnnouncementDestination;
import com.vinnot.notification.domain.model.AnnouncementKind;
import com.vinnot.notification.domain.model.AnnouncementRef;
import com.vinnot.notification.domain.model.NotificationLocale;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.infrastructure.outbox.OutboxAttempts;
import com.vinnot.notification.infrastructure.outbox.OutboxNotificationAdapter;
import com.vinnot.shared.infrastructure.effects.DurableEffectWorker;
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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The per-announcement delivery counts (V79) against the real schema: their table, their reads, the receipts' link and
 * the outbox attempts that decide when an email failed for good.
 */
@Testcontainers(disabledWithoutDocker = true)
class JdbcAnnouncementStatsPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.parse("2026-11-01T12:00:00Z").truncatedTo(ChronoUnit.SECONDS);
    private static JdbcTemplate jdbc;
    private static DataSourceTransactionManager transactions;
    private static JdbcAnnouncementStore store;
    private static JdbcAnnouncementStats stats;
    private static JdbcPushReceiptStore receipts;
    private static JdbcPushOpenStore opens;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        transactions = new DataSourceTransactionManager(dataSource);
        store = new JdbcAnnouncementStore(jdbc);
        stats = new JdbcAnnouncementStats(jdbc, transactions);
        receipts = new JdbcPushReceiptStore(jdbc, transactions);
        opens = new JdbcPushOpenStore(jdbc);
    }

    @Test
    void anAnnouncementWithoutCountsReadsZeroAndCountsAddUpInItsRecordAndTheHistory() {
        UUID id = announcement();
        assertThat(store.find(id)).map(AnnouncementRecord::stats).contains(AnnouncementStats.NONE);

        stats.recordEmail(id, 1, 0);
        stats.recordEmail(id, 1, 0);
        stats.recordEmail(id, 0, 1);
        stats.recordPush(id, 3, 2);
        stats.recordPush(id, 0, 1);
        stats.recordEmail(id, 0, 0);

        AnnouncementStats expected = new AnnouncementStats(2, 1, 3, 3, 0);
        assertThat(store.find(id)).map(AnnouncementRecord::stats).contains(expected);
        assertThat(store.recent(20)).filteredOn(sent -> sent.id().equals(id)).singleElement()
                .extracting(AnnouncementRecord::stats).isEqualTo(expected);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM announcement_delivery_stats WHERE announcement_id = ?",
                Integer.class, id)).isOne();
    }

    @Test
    void countsForAnUnknownAnnouncementAreIgnored() {
        UUID unknown = UUID.randomUUID();

        stats.recordEmail(unknown, 1, 1);
        stats.recordPush(unknown, 1, 1);
        stats.recordPushOpen(AnnouncementRef.of(AnnouncementRef.email(unknown, unknown)).orElseThrow(), user(), "ref");

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM announcement_delivery_stats WHERE announcement_id = ?",
                Integer.class, unknown)).isZero();
    }

    @Test
    void concurrentCountsAreNeverLost() throws Exception {
        UUID id = announcement();
        int workers = 8;
        int rounds = 25;
        ExecutorService pool = Executors.newFixedThreadPool(workers);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<CompletableFuture<Void>> runs = IntStream.range(0, workers).mapToObj(worker -> CompletableFuture.runAsync(() -> {
                await(start);
                for (int round = 0; round < rounds; round++) {
                    stats.recordEmail(id, 1, 0);
                    stats.recordPush(id, 2, 1);
                }
            }, pool)).toList();
            start.countDown();
            CompletableFuture.allOf(runs.toArray(CompletableFuture[]::new)).get();
        } finally {
            pool.shutdownNow();
        }

        assertThat(store.find(id)).map(AnnouncementRecord::stats)
                .contains(new AnnouncementStats(workers * rounds, 0, 2L * workers * rounds, (long) workers * rounds, 0));
    }

    @Test
    void anOpenCountsOncePerAccountAndAnnouncementInTheCallersTransaction() {
        UUID id = announcement();
        UUID ana = user();
        UUID bruno = user();
        UUID carla = user();
        String anaRef = AnnouncementRef.push(id, NotificationLocale.ES, ana);
        String anaLater = anaRef + ":quiet:1761000000";
        String brunoRef = AnnouncementRef.push(id, NotificationLocale.EN, ana) + ":1";
        AnnouncementRef announcement = AnnouncementRef.of(anaRef).orElseThrow();

        open(ana, anaRef, announcement);
        open(ana, anaLater, announcement);
        open(bruno, brunoRef, announcement);
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            open(carla, AnnouncementRef.push(id, NotificationLocale.ES, carla), announcement);
            status.setRollbackOnly();
        });

        assertThat(store.find(id)).map(AnnouncementRecord::stats).map(AnnouncementStats::pushesOpened).contains(2L);
    }

    @Test
    void aReceiptTicketKeepsTheAnnouncementItWasSentForAndOlderTicketsHaveNone() {
        UUID id = announcement();
        receipts.save(List.of(new PushReceiptStorePort.Pending("ticket-a-" + id, "ExpoPushToken[a]", NotificationType.NEWSLETTER, id),
                new PushReceiptStorePort.Pending("ticket-b-" + id, "ExpoPushToken[b]", NotificationType.EVENT_REMINDER)), NOW);

        Map<String, UUID> stored = new HashMap<>();
        receipts.due(NOW, null, 1000).tickets().stream().filter(ticket -> ticket.ticketId().endsWith(id.toString()))
                .forEach(ticket -> stored.put(ticket.ticketId(), ticket.announcementId()));

        assertThat(stored).containsOnlyKeys("ticket-a-" + id, "ticket-b-" + id).containsEntry("ticket-a-" + id, id);
        assertThat(stored.get("ticket-b-" + id)).isNull();
    }

    @Test
    void anEmailJobIsOnItsLastAttemptOnlyAfterEveryEarlierAttemptFailed() {
        OutboxAttempts attempts = new OutboxAttempts(jdbc, transactions);
        String key = OutboxNotificationAdapter.KEY_PREFIX + AnnouncementRef.email(UUID.randomUUID(), UUID.randomUUID());
        jdbc.update("INSERT INTO external_effects(id, kind, deduplication_key, payload, next_attempt_at, attempts)"
                + " VALUES (?, ?, ?, CAST('{}' AS jsonb), CURRENT_TIMESTAMP, ?)", UUID.randomUUID(),
                OutboxNotificationAdapter.KIND, key, DurableEffectWorker.MAX_ATTEMPTS - 2);

        assertThat(attempts.lastAttempt(key)).isFalse();
        jdbc.update("UPDATE external_effects SET attempts = attempts + 1 WHERE deduplication_key = ?", key);
        assertThat(attempts.lastAttempt(key)).isTrue();
        assertThat(attempts.lastAttempt(key + ":missing")).isFalse();
    }

    private static void open(UUID user, String ref, AnnouncementRef announcement) {
        if (opens.save(user, ref, NotificationType.NEWSLETTER, NOW)) {
            stats.recordPushOpen(announcement, user, ref);
        }
    }

    private static UUID announcement() {
        UUID id = UUID.randomUUID();
        store.save(id, new Announcement(AnnouncementKind.NEWS, Map.of(NotificationLocale.ES,
                        new AnnouncementContent("Vendimia", "Catas todo el mes.")),
                        new AnnouncementAudience(true, true, null, null, null, null), AnnouncementDestination.HOME),
                false, 10, new AnnouncementStorePort.Sender(null, "admin@vinnot.test"), NOW);
        return id;
    }

    private static UUID user() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name) VALUES (?,?,?,'fixture','Test','Member')",
                id, "user-" + id, id + "@example.invalid");
        return id;
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }
}
