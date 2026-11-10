package com.vinnot.wine.application.service;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WineSubmissionRetentionService {

    private final WineSubmissionRepositoryPort repository;
    private final FileStoragePort fileStoragePort;

    @Transactional
    public int purgeRejectedBefore(Instant cutoff, int batchSize) {
        return purge(List.of(WineSubmissionStatus.REJECTED), cutoff, batchSize);
    }

    @Transactional
    public int purgeUncorrectedBefore(Instant cutoff, int batchSize) {
        return purge(List.of(WineSubmissionStatus.CHANGES_REQUESTED), cutoff, batchSize);
    }

    private int purge(
            List<WineSubmissionStatus> statuses, Instant cutoff, int batchSize) {
        var expired = repository.findExpired(statuses, cutoff, batchSize);
        expired.forEach(submission -> {
            fileStoragePort.deleteWineLabel(submission.getId());
            fileStoragePort.deleteQuarantinedWineLabel(submission.getId());
            repository.delete(submission);
        });
        return expired.size();
    }
}
