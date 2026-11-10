package com.vinnot.wine.application.service;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WineSubmissionRetentionServiceTest {

    private final WineSubmissionRepositoryPort repository =
            mock(WineSubmissionRepositoryPort.class);
    private final FileStoragePort fileStoragePort = mock(FileStoragePort.class);
    private final WineSubmissionRetentionService service =
            new WineSubmissionRetentionService(repository, fileStoragePort);

    @Test
    void purgesDatabaseAndBothStorageNamespacesForExpiredRejections() {
        Instant cutoff = Instant.parse("2026-07-01T00:00:00Z");
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Reserva", "Bodega Norte", "RED",
                null, List.of(), "Argentina", null, null, null);
        when(repository.findExpired(
                List.of(WineSubmissionStatus.REJECTED), cutoff, 100))
                .thenReturn(List.of(submission));

        int deleted = service.purgeRejectedBefore(cutoff, 100);

        assertThat(deleted).isEqualTo(1);
        verify(fileStoragePort).deleteWineLabel(submission.getId());
        verify(fileStoragePort).deleteQuarantinedWineLabel(submission.getId());
        verify(repository).delete(submission);
    }

    @Test
    void purgesUncorrectedSubmissionsWithTheirDedicatedStatus() {
        Instant cutoff = Instant.parse("2026-07-01T00:00:00Z");
        when(repository.findExpired(
                List.of(WineSubmissionStatus.CHANGES_REQUESTED), cutoff, 25))
                .thenReturn(List.of());

        assertThat(service.purgeUncorrectedBefore(cutoff, 25)).isZero();

        verify(repository).findExpired(
                List.of(WineSubmissionStatus.CHANGES_REQUESTED), cutoff, 25);
    }
}
