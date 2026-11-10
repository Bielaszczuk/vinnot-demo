package com.vinnot.shared.infrastructure.effects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Drains the shared {@code external_effects} outbox. SKIP LOCKED lets several instances drain it without duplicate
 * claims.
 *
 * <p>A drain claims up to {@code batch-size} due jobs in one short transaction that leases them (moves
 * {@code next_attempt_at} past the lease) and commits at once, then runs them on virtual threads, at most
 * {@code concurrency} at a time, and keeps claiming until nothing is due (a backlog, or jobs its own jobs queued) or the
 * drain's time budget is spent. A job left by a worker that died mid-run becomes due again when its lease ends.
 *
 * <p>A {@linkplain ExternalEffectHandler#transactional() transactional} handler runs in its own transaction that also
 * locks the job's row, as before: a failure rolls back everything it wrote, and the failed attempt is then recorded in
 * a separate transaction, so a handler that leaves the transaction rollback-only still backs off instead of blocking
 * the jobs queued after it. Any other handler runs outside a transaction and holds no connection while it waits on its
 * provider. Either way a finished job is deleted and a failed one backs off ({@code min(1 h, 30 s * 2^attempts)}) until
 * {@link #MAX_ATTEMPTS}.
 *
 * <p>The scheduled poll is the fallback; {@link DurableEffectWakeUp} drains as soon as a due job is committed.
 */
@Component
public class DurableEffectWorker implements DisposableBean {
    /**
     * Attempts after which a job is never claimed again (it may have reached its target). The partial indexes on
     * {@code external_effects} (V18, V43) repeat it as a literal, so queries embed it as a literal too.
     */
    public static final int MAX_ATTEMPTS = 10;
    private static final Logger LOGGER = LoggerFactory.getLogger(DurableEffectWorker.class);
    private static final Duration SHUTDOWN_WAIT = Duration.ofSeconds(30);
    private static final String CLAIM = """
            UPDATE external_effects SET next_attempt_at = CURRENT_TIMESTAMP + (? * INTERVAL '1 millisecond')
            WHERE id IN (
                SELECT id FROM external_effects
                WHERE attempts < %d AND next_attempt_at <= CURRENT_TIMESTAMP
                ORDER BY next_attempt_at, id LIMIT ? FOR UPDATE SKIP LOCKED)
            RETURNING id, kind, payload::text
            """.formatted(MAX_ATTEMPTS);
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final List<ExternalEffectHandler> handlers;
    private final TransactionTemplate transaction;
    private final Settings settings;
    private final ReentrantLock draining = new ReentrantLock();
    private final Semaphore slots;
    private final ExecutorService runners = Executors.newThreadPerTaskExecutor(
            Thread.ofVirtual().name("external-effect-", 0).factory());
    private volatile boolean stopping;

    /**
     * How a drain claims and runs jobs.
     *
     * @param batchSize   jobs claimed per transaction
     * @param concurrency jobs running at once in this instance
     * @param lease       how long a claimed job stays unavailable to other workers; longer than any job may run
     * @param drainBudget how long one drain keeps claiming while a backlog remains
     */
    public record Settings(int batchSize, int concurrency, Duration lease, Duration drainBudget) {
        /** The defaults of {@code application.yml}. */
        public static final Settings DEFAULTS = new Settings(20, 4, Duration.ofMinutes(15), Duration.ofSeconds(60));

        public Settings {
            if (batchSize < 1 || concurrency < 1) {
                throw new IllegalArgumentException("The outbox batch size and concurrency must be at least 1");
            }
            if (lease.isNegative() || lease.isZero() || drainBudget.isNegative()) {
                throw new IllegalArgumentException("The outbox lease must be positive and the drain budget not negative");
            }
        }
    }

    @Autowired
    public DurableEffectWorker(JdbcTemplate jdbc, ObjectMapper mapper, List<ExternalEffectHandler> handlers,
            PlatformTransactionManager transactions,
            @Value("${app.effects.batch-size:20}") int batchSize,
            @Value("${app.effects.concurrency:4}") int concurrency,
            @Value("${app.effects.lease:15m}") Duration lease,
            @Value("${app.effects.drain-budget:60s}") Duration drainBudget) {
        this(jdbc, mapper, handlers, transactions, new Settings(batchSize, concurrency, lease, drainBudget));
    }

    /** A worker with the default settings. */
    public DurableEffectWorker(JdbcTemplate jdbc, ObjectMapper mapper, List<ExternalEffectHandler> handlers,
            PlatformTransactionManager transactions) {
        this(jdbc, mapper, handlers, transactions, Settings.DEFAULTS);
    }

    public DurableEffectWorker(JdbcTemplate jdbc, ObjectMapper mapper, List<ExternalEffectHandler> handlers,
            PlatformTransactionManager transactions, Settings settings) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.handlers = handlers;
        this.transaction = new TransactionTemplate(transactions);
        this.settings = settings;
        this.slots = new Semaphore(settings.concurrency());
    }

    /**
     * Runs every job due now (and those that become due while it runs, up to the drain budget). A call made while
     * another drain runs in this instance waits for it and then drains what is left, so on return the jobs that were due
     * at the call have been attempted.
     */
    @Scheduled(fixedDelayString = "${app.effects.poll-ms:30000}", initialDelayString = "${app.effects.poll-ms:30000}")
    public void drain() {
        if (stopping) {
            return;
        }
        draining.lock();
        try {
            long deadline = System.nanoTime() + settings.drainBudget().toNanos();
            while (!stopping) {
                List<Job> claimed = claim();
                if (claimed.isEmpty()) {
                    return;
                }
                runAll(claimed);
                if (System.nanoTime() - deadline > 0) {
                    return;
                }
            }
        } finally {
            draining.unlock();
        }
    }

    @Override
    public void destroy() throws InterruptedException {
        stopping = true;
        runners.shutdown();
        if (!runners.awaitTermination(SHUTDOWN_WAIT.toSeconds(), TimeUnit.SECONDS)) {
            LOGGER.warn("Outbox jobs still running at shutdown; their leases make them due again later");
        }
    }

    private List<Job> claim() {
        List<Job> claimed = transaction.execute(status -> jdbc.query(CLAIM,
                (row, index) -> new Job(row.getObject("id", UUID.class), row.getString("kind"), row.getString("payload")),
                settings.lease().toMillis(), settings.batchSize()));
        return Objects.requireNonNullElse(claimed, List.of());
    }

    private void runAll(List<Job> claimed) {
        List<Future<?>> running = new ArrayList<>(claimed.size());
        for (Job job : claimed) {
            running.add(runners.submit(() -> runWhenFree(job)));
        }
        for (Future<?> job : running) {
            try {
                job.get();
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                return;
            } catch (ExecutionException unexpected) {
                LOGGER.error("Outbox job runner failed", unexpected.getCause());
            }
        }
    }

    private void runWhenFree(Job job) {
        slots.acquireUninterruptibly();
        try {
            if (stopping) {
                // Not started: hand it back now instead of waiting for its lease.
                jdbc.update("UPDATE external_effects SET next_attempt_at = CURRENT_TIMESTAMP WHERE id = ?", job.id());
                return;
            }
            run(job);
        } finally {
            slots.release();
        }
    }

    private void run(Job job) {
        Optional<ExternalEffectHandler> handler = handlers.stream().filter(value -> value.supports(job.kind())).findFirst();
        if (handler.isPresent() && !handler.get().transactional()) {
            runDirect(job, handler.get());
        } else {
            runInTransaction(job, handler);
        }
    }

    private void runDirect(Job job, ExternalEffectHandler handler) {
        try {
            handler.execute(job.kind(), payload(job));
            jdbc.update("DELETE FROM external_effects WHERE id = ?", job.id());
        } catch (RuntimeException failure) {
            recordFailure(job.id(), failure);
        }
    }

    private void runInTransaction(Job job, Optional<ExternalEffectHandler> handler) {
        Exception[] failure = new Exception[1];
        try {
            transaction.executeWithoutResult(status -> {
                // The lease already keeps other workers away; the row lock also covers a run that outlives its lease.
                if (jdbc.queryForList("SELECT id FROM external_effects WHERE id = ? FOR UPDATE SKIP LOCKED", job.id()).isEmpty()) {
                    return;
                }
                try {
                    handler.orElseThrow(() -> new IllegalStateException("External effect handler missing"))
                            .execute(job.kind(), payload(job));
                    jdbc.update("DELETE FROM external_effects WHERE id = ?", job.id());
                } catch (RuntimeException handlerFailure) {
                    failure[0] = handlerFailure;
                    status.setRollbackOnly();
                }
            });
        } catch (RuntimeException commitFailure) {
            failure[0] = commitFailure;
        }
        if (Objects.nonNull(failure[0])) {
            Exception recorded = failure[0];
            transaction.executeWithoutResult(status -> recordFailure(job.id(), recorded));
        }
    }

    private Map<String, Object> payload(Job job) {
        return mapper.readValue(job.payload(), new TypeReference<>() { });
    }

    private void recordFailure(UUID jobId, Exception failure) {
        // Keep payloads/addresses/tokens out of logs. Failed jobs remain available for operator retry.
        jdbc.update("""
                UPDATE external_effects SET attempts = attempts + 1, last_error_type = ?,
                next_attempt_at = CURRENT_TIMESTAMP + (LEAST(3600, 30 * POWER(2, attempts)) * INTERVAL '1 second')
                WHERE id = ?
                """, failure.getClass().getSimpleName(), jobId);
    }

    private record Job(UUID id, String kind, String payload) { }
}
