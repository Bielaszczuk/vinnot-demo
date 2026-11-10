package com.vinnot.shared.infrastructure.effects;

import org.postgresql.PGConnection;
import org.postgresql.PGNotification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.Objects;

/**
 * Drains the outbox as soon as a due job is committed instead of at the next poll: one dedicated connection LISTENs on
 * the {@value #CHANNEL} channel, which the {@code external_effects} insert trigger (V65) notifies, and each notification
 * runs {@link DurableEffectWorker#drain()} on this thread. It drains once right after it starts listening, to catch jobs
 * committed while it was not. A lost connection is reopened with a growing pause; meanwhile the poll keeps working.
 *
 * <p>It holds one pool connection for as long as the application runs. It is off when {@code app.effects.listen-enabled}
 * is {@code false}, and also when the fallback poll is an hour or longer: that setting means jobs are drained by hand
 * (integration tests), so no background drain may run at all.
 */
@Component
@ConditionalOnExpression("${app.effects.listen-enabled:true} and ${app.effects.poll-ms:30000} < 3600000")
public class DurableEffectWakeUp implements SmartLifecycle {
    static final String CHANNEL = "external_effects";
    private static final Logger LOGGER = LoggerFactory.getLogger(DurableEffectWakeUp.class);
    private static final Duration FIRST_RETRY = Duration.ofSeconds(1);
    private static final Duration LONGEST_RETRY = Duration.ofMinutes(1);
    private static final Duration STOP_GRACE = Duration.ofSeconds(5);
    private final DataSource dataSource;
    private final DurableEffectWorker worker;
    private final Duration wait;
    private volatile boolean running;
    private volatile boolean listening;
    private Thread thread;

    @Autowired
    public DurableEffectWakeUp(DataSource dataSource, DurableEffectWorker worker,
            @Value("${app.effects.listen-wait:10s}") Duration wait) {
        this.dataSource = dataSource;
        this.worker = worker;
        this.wait = wait;
    }

    @Override
    public synchronized void start() {
        if (running) {
            return;
        }
        running = true;
        thread = Thread.ofPlatform().daemon().name("external-effects-wake-up").start(this::listen);
    }

    @Override
    public synchronized void stop() {
        running = false;
        if (Objects.isNull(thread)) {
            return;
        }
        thread.interrupt();
        try {
            thread.join(wait.plus(STOP_GRACE).toMillis());
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
        thread = null;
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    /** Whether the dedicated connection currently listens (tests wait for it). */
    boolean listening() {
        return listening;
    }

    private void listen() {
        Duration retry = FIRST_RETRY;
        while (running) {
            try (Connection connection = dataSource.getConnection()) {
                if (!connection.isWrapperFor(PGConnection.class)) {
                    LOGGER.info("Outbox wake-up disabled: the database is not PostgreSQL; the poll still drains it");
                    return;
                }
                PGConnection postgres = connection.unwrap(PGConnection.class);
                try (Statement statement = connection.createStatement()) {
                    statement.execute("LISTEN " + CHANNEL);
                }
                listening = true;
                retry = FIRST_RETRY;
                worker.drain();
                while (running) {
                    PGNotification[] notifications = postgres.getNotifications((int) wait.toMillis());
                    if (Objects.nonNull(notifications) && notifications.length > 0) {
                        worker.drain();
                    }
                }
            } catch (SQLException | RuntimeException failure) {
                if (!running) {
                    return;
                }
                LOGGER.warn("Outbox wake-up lost its connection ({}); listening again in {}", failure.getClass().getSimpleName(), retry);
                if (!pause(retry)) {
                    return;
                }
                retry = retry.multipliedBy(2).compareTo(LONGEST_RETRY) > 0 ? LONGEST_RETRY : retry.multipliedBy(2);
            } finally {
                listening = false;
            }
        }
    }

    private boolean pause(Duration duration) {
        try {
            Thread.sleep(duration);
            return true;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}
