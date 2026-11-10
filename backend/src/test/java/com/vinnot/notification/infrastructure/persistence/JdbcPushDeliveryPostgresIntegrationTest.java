package com.vinnot.notification.infrastructure.persistence;

import com.vinnot.notification.application.port.out.PushAudiencePort;
import com.vinnot.notification.application.port.out.PushReceiptStorePort;
import com.vinnot.notification.domain.model.NotificationCategory;
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

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;

/** Send log, receipt store and audience against the real schema (V46/V47), including their own transactions. */
@Testcontainers(disabledWithoutDocker = true)
class JdbcPushDeliveryPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final Instant NOW = Instant.now().truncatedTo(ChronoUnit.SECONDS);
    private static JdbcTemplate jdbc;
    private static TransactionTemplate outer;
    private static JdbcPushSendLog sendLog;
    private static JdbcPushReceiptStore receipts;
    private static JdbcPushAudience audience;

    @BeforeAll
    static void migrate() {
        var dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        var transactions = new DataSourceTransactionManager(dataSource);
        outer = new TransactionTemplate(transactions);
        sendLog = new JdbcPushSendLog(jdbc, transactions);
        receipts = new JdbcPushReceiptStore(jdbc, transactions);
        audience = new JdbcPushAudience(jdbc);
    }

    @Test
    void sendsRecordedInsideAFailingJobSurviveItsRollback() {
        UUID user = user(true, "America/Argentina/Buenos_Aires");
        try {
            outer.executeWithoutResult(status -> {
                sendLog.record("job", List.of(user, UUID.randomUUID()), NotificationCategory.NEWSLETTER, true, NOW);
                receipts.save(List.of(new PushReceiptStorePort.Pending("t-" + user, "ExpoPushToken[a]", NotificationType.EVENT_REMINDER)), NOW);
                throw new IllegalStateException("provider down");
            });
        } catch (IllegalStateException expected) {
            // the job failed after the first batch
        }

        assertThat(sendLog.alreadySent("job", List.of(user))).containsExactly(user);
        assertThat(receipts.due(NOW, null, 1000).tickets()).contains(new PushReceiptStorePort.Pending("t-" + user, "ExpoPushToken[a]", NotificationType.EVENT_REMINDER));
        sendLog.record("job", List.of(user), NotificationCategory.NEWSLETTER, true, NOW);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM push_sends WHERE dedupe_key='job'", Integer.class))
                .as("an unknown account is not recorded and a repeat is ignored").isEqualTo(1);
    }

    @Test
    void theCapCountsOnlyCappedSendsInsideTheWindow() {
        UUID user = user(true, "UTC");
        UUID quiet = user(true, "UTC");
        sendLog.record("a", List.of(user), NotificationCategory.NEWSLETTER, true, NOW.minus(Duration.ofHours(2)));
        sendLog.record("b", List.of(user), NotificationCategory.NEWSLETTER, true, NOW.minus(Duration.ofHours(1)));
        sendLog.record("c", List.of(user), NotificationCategory.TICKETS, false, NOW);
        sendLog.record("d", List.of(user), NotificationCategory.NEWSLETTER, true, NOW.minus(Duration.ofDays(2)));

        assertThat(sendLog.cappedSince(List.of(user, quiet), NOW.minus(Duration.ofDays(1)))).isEqualTo(Map.of(user, 2));
        assertThat(sendLog.cappedSince(List.of(), NOW)).isEmpty();
        assertThat(sendLog.alreadySent("a", List.of())).isEmpty();
        sendLog.purgeBefore(NOW.minus(Duration.ofDays(1)));
        assertThat(sendLog.alreadySent("d", List.of(user))).isEmpty();
        sendLog.record("e", List.of(), NotificationCategory.NEWSLETTER, true, NOW);
    }

    @Test
    void aCategoryLimitCountsOnlyThatCategoryInsideTheWindow() {
        UUID user = user(true, "UTC");
        UUID other = user(true, "UTC");
        sendLog.record("near-1", List.of(user), NotificationCategory.EVENTS_NEARBY, true, NOW.minus(Duration.ofHours(3)));
        sendLog.record("near-0", List.of(user), NotificationCategory.EVENTS_NEARBY, true, NOW.minus(Duration.ofDays(2)));
        sendLog.record("news", List.of(other), NotificationCategory.NEWSLETTER, true, NOW);

        assertThat(sendLog.sentInCategorySince(List.of(user, other), NotificationCategory.EVENTS_NEARBY,
                NOW.minus(Duration.ofDays(1)))).isEqualTo(Map.of(user, 1));
        assertThat(sendLog.sentInCategorySince(List.of(), NotificationCategory.EVENTS_NEARBY, NOW)).isEmpty();
    }

    @Test
    void receiptsAreReadOldestFirstDeletedAndPurged() {
        receipts.save(List.of(new PushReceiptStorePort.Pending("old", "ExpoPushToken[o]", NotificationType.EVENT_REMINDER)), NOW.minus(Duration.ofHours(30)));
        receipts.save(List.of(new PushReceiptStorePort.Pending("due", "ExpoPushToken[d]", NotificationType.EVENT_REMINDER)), NOW.minus(Duration.ofMinutes(20)));
        receipts.save(List.of(new PushReceiptStorePort.Pending("fresh", "ExpoPushToken[f]", NotificationType.EVENT_REMINDER)), NOW);
        receipts.save(List.of(), NOW);

        receipts.purgeBefore(NOW.minus(Duration.ofDays(1)));
        assertThat(receipts.due(NOW.minus(Duration.ofMinutes(15)), null, 10).tickets()).extracting(PushReceiptStorePort.Pending::ticketId)
                .contains("due").doesNotContain("old", "fresh");
        receipts.delete(List.of("due"));
        receipts.delete(List.of());
        assertThat(receipts.due(NOW.minus(Duration.ofMinutes(15)), null, 10).tickets()).extracting(PushReceiptStorePort.Pending::ticketId)
                .doesNotContain("due");
    }

    @Test
    void dueTicketsAreWalkedOldestFirstInChunksThatEndWithACursor() {
        Instant base = NOW.minus(Duration.ofDays(3));
        receipts.save(List.of(new PushReceiptStorePort.Pending("walk-b", "ExpoPushToken[b]", NotificationType.EVENT_REMINDER),
                new PushReceiptStorePort.Pending("walk-a", "ExpoPushToken[a]", NotificationType.EVENT_REMINDER)), base);
        receipts.save(List.of(new PushReceiptStorePort.Pending("walk-c", "ExpoPushToken[c]", NotificationType.EVENT_REMINDER)),
                base.plusSeconds(1));
        Instant dueBefore = base.plusSeconds(30);

        var first = receipts.due(dueBefore, null, 2);
        var second = receipts.due(dueBefore, first.next(), 2);

        assertThat(first.tickets()).extracting(PushReceiptStorePort.Pending::ticketId).containsExactly("walk-a", "walk-b");
        assertThat(first.next()).isEqualTo(new PushReceiptStorePort.Cursor(base, "walk-b"));
        assertThat(second.tickets()).extracting(PushReceiptStorePort.Pending::ticketId).containsExactly("walk-c");
        assertThat(second.next()).as("a short chunk is the last one").isNull();
        receipts.delete(List.of("walk-a", "walk-b", "walk-c"));
    }

    @Test
    void concurrentReservationsForTheSameAccountNeverBothPassALimit() throws Exception {
        UUID user = user(true, "UTC");
        UnaryOperator<List<UUID>> underOnePerDay = candidates -> candidates.stream()
                .filter(id -> sendLog.cappedSince(List.of(id), NOW.minus(Duration.ofDays(1))).getOrDefault(id, 0) < 1).toList();
        var firstInside = new CountDownLatch(1);
        try (var threads = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<List<UUID>> first = threads.submit(() -> sendLog.reserve("race-1", List.of(user), NotificationCategory.NEWSLETTER,
                    true, NOW, candidates -> {
                        List<UUID> kept = underOnePerDay.apply(candidates);
                        firstInside.countDown();
                        pause(Duration.ofMillis(300));
                        return kept;
                    }));
            assertThat(firstInside.await(5, TimeUnit.SECONDS)).isTrue();
            Future<List<UUID>> second = threads.submit(() -> sendLog.reserve("race-2", List.of(user), NotificationCategory.NEWSLETTER,
                    true, NOW, underOnePerDay));

            assertThat(first.get(5, TimeUnit.SECONDS)).containsExactly(user);
            assertThat(second.get(5, TimeUnit.SECONDS)).as("the second decision waited and saw the first send").isEmpty();
        }
        assertThat(sendLog.alreadySent("race-1", List.of(user))).containsExactly(user);
        assertThat(sendLog.alreadySent("race-2", List.of(user))).isEmpty();
    }

    @Test
    void aReleasedReservationIsForgottenAndAnEmptyOneTakesNoLock() {
        UUID user = user(true, "UTC");
        assertThat(sendLog.reserve("held", List.of(user), NotificationCategory.NEWSLETTER, true, NOW, candidates -> candidates))
                .containsExactly(user);
        assertThat(sendLog.reserve("held-none", List.of(), NotificationCategory.NEWSLETTER, true, NOW, candidates -> candidates)).isEmpty();

        sendLog.release("held", List.of(user));
        sendLog.release("held", List.of());

        assertThat(sendLog.alreadySent("held", List.of(user))).isEmpty();
    }

    private static void pause(Duration duration) {
        try {
            Thread.sleep(duration);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }

    @Test
    void theAudienceIsTheActiveUnsuspendedAccountsWithTheirZone() {
        UUID active = user(true, "Europe/Madrid");
        UUID inactive = user(false, "UTC");
        UUID broken = user(true, "Not/AZone");
        UUID suspended = user(true, "UTC");
        jdbc.update("UPDATE users SET locked = true WHERE id = ?", suspended);

        assertThat(audience.findActive(List.of(active, inactive, broken, suspended, UUID.randomUUID())))
                .as("a suspended (locked) account gets no pushes")
                .containsExactlyInAnyOrder(new PushAudiencePort.Member(active, ZoneId.of("Europe/Madrid")),
                        new PushAudiencePort.Member(broken, ZoneOffset.UTC));
        assertThat(audience.findActive(List.of())).isEmpty();
    }

    private static UUID user(boolean active, String zone) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO users(id,username,email,password,first_name,last_name,active,timezone)"
                + " VALUES (?,?,?,'fixture','Test','Member',?,?)", id, "user-" + id, id + "@example.invalid", active, zone);
        return id;
    }
}
