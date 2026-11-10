package com.vinnot.marketing.infrastructure.async;

import com.vinnot.marketing.application.model.PlannedBatch;
import com.vinnot.marketing.application.port.in.GeneratePlannedCopyUseCase;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** The planned copy runs on its own thread once the drafts are committed, never inside the shared outbox drain (#489). */
class BackgroundSocialCopyQueueTest {
    private static final PlannedBatch BATCH = new PlannedBatch(List.of(UUID.randomUUID(), UUID.randomUUID()),
            LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 15));
    private final GeneratePlannedCopyUseCase plannedCopy = mock(GeneratePlannedCopyUseCase.class);
    private final BackgroundSocialCopyQueue queue = new BackgroundSocialCopyQueue(plannedCopy);

    @AfterEach
    void tearDown() throws InterruptedException {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        queue.destroy();
    }

    @Test
    void waitsForTheCommitBeforeWritingTheCopy() {
        TransactionSynchronizationManager.initSynchronization();

        queue.enqueue(BATCH);

        verify(plannedCopy, after(200).never()).execute(any(), any());
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        verify(plannedCopy, timeout(2000)).execute(eq(BATCH), any(Instant.class));
    }

    @Test
    void aRolledBackPlanWritesNothing() {
        TransactionSynchronizationManager.initSynchronization();

        queue.enqueue(BATCH);
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(sync -> sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));

        verify(plannedCopy, after(200).never()).execute(any(), any());
    }

    @Test
    void runsAtOnceWithoutATransactionAndSurvivesAFailedBatch() {
        PlannedBatch next = new PlannedBatch(List.of(UUID.randomUUID()), LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 15));
        when(plannedCopy.execute(eq(BATCH), any())).thenThrow(new IllegalStateException("database down"));

        queue.enqueue(BATCH);
        queue.enqueue(next);

        verify(plannedCopy, timeout(2000)).execute(eq(next), any(Instant.class));
    }

    @Test
    void anEmptyBatchRunsNothing() throws InterruptedException {
        queue.enqueue(new PlannedBatch(List.of(), LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 15)));
        queue.destroy();

        verifyNoInteractions(plannedCopy);
        verify(plannedCopy, never()).execute(any(), any());
    }
}
