package com.vinnot.shared.infrastructure.effects;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;

/** The shared outbox worker against the real schema: claiming, transactions, concurrency, backlog and wake-ups. */
@Testcontainers(disabledWithoutDocker = true)
class DurableEffectWorkerPostgresIntegrationTest {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");
    private static final String DIRECT = "TEST_DIRECT";
    private static final String IN_TRANSACTION = "TEST_IN_TRANSACTION";
    private static DriverManagerDataSource dataSource;
    private static JdbcTemplate jdbc;
    private static DataSourceTransactionManager transactions;
    private static DurableEffectQueue queue;
    private final Map<String, Consumer<Map<String, Object>>> behaviour = new ConcurrentHashMap<>();
    private final List<ExternalEffectHandler> handlers = List.of(handler(DIRECT, false), handler(IN_TRANSACTION, true));

    @BeforeAll
    static void migrate() {
        dataSource = new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
        jdbc = new JdbcTemplate(dataSource);
        transactions = new DataSourceTransactionManager(dataSource);
        queue = new DurableEffectQueue(jdbc, new ObjectMapper());
    }

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM external_effects");
    }

    @Test
    void aDirectJobRunsOutsideAnyTransactionWithoutHoldingItsRowYetNoOtherWorkerCanClaimIt() {
        String key = enqueue(DIRECT);
        var observed = new ConcurrentHashMap<String, Object>();
        behaviour.put(DIRECT, payload -> {
            observed.put("transaction", TransactionSynchronizationManager.isActualTransactionActive());
            observed.put("rowLocked", locked(key));
            observed.put("claimable", jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE deduplication_key = ?"
                    + " AND next_attempt_at <= CURRENT_TIMESTAMP", Integer.class, key));
        });

        worker(10, 2).drain();

        assertThat(observed).containsEntry("transaction", false).containsEntry("rowLocked", false).containsEntry("claimable", 0);
        assertThat(pending()).isZero();
    }

    @Test
    void aTransactionalJobStillRunsInsideItsTransactionHoldingItsRow() {
        String key = enqueue(IN_TRANSACTION);
        var observed = new ConcurrentHashMap<String, Object>();
        behaviour.put(IN_TRANSACTION, payload -> {
            observed.put("transaction", TransactionSynchronizationManager.isActualTransactionActive());
            observed.put("rowLocked", locked(key));
        });

        worker(10, 2).drain();

        assertThat(observed).containsEntry("transaction", true).containsEntry("rowLocked", true);
        assertThat(pending()).isZero();
    }

    @Test
    void failedJobsBackOffWithTheirErrorTypeAndNeverBlockTheOthers() {
        String failingDirect = enqueue(DIRECT, Map.of("fail", true));
        String failingInTransaction = enqueue(IN_TRANSACTION, Map.of("fail", true));
        enqueue(DIRECT);
        enqueue(IN_TRANSACTION);
        Consumer<Map<String, Object>> failWhenAsked = payload -> {
            if (Boolean.TRUE.equals(payload.get("fail"))) {
                throw new IllegalStateException("provider down");
            }
        };
        behaviour.put(DIRECT, failWhenAsked);
        behaviour.put(IN_TRANSACTION, failWhenAsked);

        worker(10, 2).drain();

        assertThat(jdbc.queryForList("SELECT deduplication_key FROM external_effects", String.class))
                .containsExactlyInAnyOrder(failingDirect, failingInTransaction);
        for (String key : List.of(failingDirect, failingInTransaction)) {
            assertThat(jdbc.queryForMap("""
                    SELECT attempts, last_error_type, next_attempt_at > CURRENT_TIMESTAMP + INTERVAL '20 seconds' AS backing_off
                    FROM external_effects WHERE deduplication_key = ?""", key))
                    .containsEntry("attempts", 1).containsEntry("last_error_type", "IllegalStateException")
                    .containsEntry("backing_off", true);
        }
    }

    @Test
    void oneDrainEmptiesABacklogLargerThanABatch() {
        for (int index = 0; index < 25; index++) {
            enqueue(DIRECT);
        }
        behaviour.put(DIRECT, payload -> { });

        worker(10, 4).drain();

        assertThat(pending()).isZero();
    }

    @Test
    void jobsRunConcurrentlyUpToTheConfiguredLimit() {
        for (int index = 0; index < 6; index++) {
            enqueue(DIRECT);
        }
        var running = new AtomicInteger();
        var mostAtOnce = new AtomicInteger();
        behaviour.put(DIRECT, payload -> {
            mostAtOnce.accumulateAndGet(running.incrementAndGet(), Math::max);
            pause(Duration.ofMillis(300));
            running.decrementAndGet();
        });

        long started = System.nanoTime();
        worker(6, 3).drain();
        Duration took = Duration.ofNanos(System.nanoTime() - started);

        assertThat(mostAtOnce).hasValue(3);
        assertThat(took).isLessThan(Duration.ofMillis(1500));
        assertThat(pending()).isZero();
    }

    @Test
    void aDueJobWakesAListeningWorkerWithoutWaitingForThePollButADelayedOneWaits() {
        behaviour.put(DIRECT, payload -> { });
        DurableEffectWorker worker = worker(10, 2);
        var wakeUp = new DurableEffectWakeUp(dataSource, worker, Duration.ofMillis(100));
        wakeUp.start();
        try {
            assertThat(wakeUp.isRunning()).isTrue();
            awaitListening(wakeUp);
            String later = UUID.randomUUID().toString();
            queue.enqueue(DIRECT, later, Map.of(), Duration.ofHours(1));
            String now = enqueue(DIRECT);

            long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
            while (exists(now) && System.nanoTime() < deadline) {
                pause(Duration.ofMillis(50));
            }

            assertThat(exists(now)).as("the due job was drained by the wake-up").isFalse();
            assertThat(exists(later)).as("the delayed job waits for its time").isTrue();
        } finally {
            wakeUp.stop();
        }
        assertThat(wakeUp.isRunning()).isFalse();
    }

    private DurableEffectWorker worker(int batchSize, int concurrency) {
        return new DurableEffectWorker(jdbc, new ObjectMapper(), handlers, transactions,
                new DurableEffectWorker.Settings(batchSize, concurrency, Duration.ofMinutes(15), Duration.ofSeconds(30)));
    }

    private ExternalEffectHandler handler(String kind, boolean transactional) {
        return new ExternalEffectHandler() {
            @Override
            public boolean supports(String candidate) {
                return kind.equals(candidate);
            }

            @Override
            public void execute(String ignored, Map<String, Object> payload) {
                behaviour.getOrDefault(kind, value -> { }).accept(payload);
            }

            @Override
            public boolean transactional() {
                return transactional;
            }
        };
    }

    private static String enqueue(String kind) {
        return enqueue(kind, Map.of());
    }

    private static String enqueue(String kind, Map<String, Object> payload) {
        String key = UUID.randomUUID().toString();
        queue.enqueue(kind, key, payload, Duration.ZERO);
        return key;
    }

    /** Whether another connection finds the job's row locked. */
    private static boolean locked(String key) {
        try {
            new JdbcTemplate(new DriverManagerDataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()))
                    .queryForList("SELECT id FROM external_effects WHERE deduplication_key = ? FOR UPDATE NOWAIT", key);
            return false;
        } catch (DataAccessException lockNotAvailable) {
            return true;
        }
    }

    private static boolean exists(String key) {
        return Objects.equals(1, jdbc.queryForObject("SELECT count(*) FROM external_effects WHERE deduplication_key = ?",
                Integer.class, key));
    }

    private static int pending() {
        return jdbc.queryForObject("SELECT count(*) FROM external_effects", Integer.class);
    }

    /** Waits until the wake-up's session listens on the outbox channel. */
    private static void awaitListening(DurableEffectWakeUp wakeUp) {
        long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
        while (!wakeUp.listening() && System.nanoTime() < deadline) {
            pause(Duration.ofMillis(50));
        }
        assertThat(wakeUp.listening()).isTrue();
    }

    private static void pause(Duration duration) {
        try {
            Thread.sleep(duration);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interrupted);
        }
    }
}
