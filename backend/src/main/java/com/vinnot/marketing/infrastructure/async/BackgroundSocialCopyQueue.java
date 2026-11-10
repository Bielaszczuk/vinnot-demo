package com.vinnot.marketing.infrastructure.async;

import com.vinnot.marketing.application.model.PlannedBatch;
import com.vinnot.marketing.application.port.in.GeneratePlannedCopyUseCase;
import com.vinnot.marketing.application.port.out.SocialCopyQueue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Writes a planned batch on its own thread once the planner's transaction commits (#489). It stays out of the shared
 * outbox on purpose: the outbox drain waits for every claimed job, so minutes of AI calls there would hold back the
 * emails and pushes queued after them. The drafts are the durable state: if the process stops mid-batch, the
 * 30-minute {@code SocialCopyGenerationScheduler} writes the drafts still waiting (without the batch notice).
 * One batch runs at a time, so two plans never write the same window at once.
 */
@Component
public class BackgroundSocialCopyQueue implements SocialCopyQueue, DisposableBean {
    private static final Logger LOGGER = LoggerFactory.getLogger(BackgroundSocialCopyQueue.class);
    private static final Duration SHUTDOWN_WAIT = Duration.ofSeconds(30);
    private final GeneratePlannedCopyUseCase plannedCopy;
    private final ExecutorService runner = Executors.newSingleThreadExecutor(Thread.ofVirtual().name("social-copy-", 0).factory());

    public BackgroundSocialCopyQueue(GeneratePlannedCopyUseCase plannedCopy) {
        this.plannedCopy = plannedCopy;
    }

    @Override
    public void enqueue(PlannedBatch batch) {
        if (batch.postIds().isEmpty()) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    submit(batch);
                }
            });
        } else {
            submit(batch);
        }
    }

    private void submit(PlannedBatch batch) {
        runner.execute(() -> {
            try {
                int pending = plannedCopy.execute(batch, Instant.now());
                LOGGER.info("Wrote the copy of a planned batch: {} of {} post(s) wait for approval", pending, batch.postIds().size());
            } catch (RuntimeException exception) {
                LOGGER.warn("Planned social copy batch {}..{} failed; the copy retry job picks up its drafts: {}",
                        batch.from(), batch.to(), exception.getMessage());
            }
        });
    }

    @Override
    public void destroy() throws InterruptedException {
        runner.shutdown();
        if (!runner.awaitTermination(SHUTDOWN_WAIT.toSeconds(), TimeUnit.SECONDS)) {
            LOGGER.warn("A planned social copy batch was still running at shutdown; the copy retry job finishes its drafts");
        }
    }
}
