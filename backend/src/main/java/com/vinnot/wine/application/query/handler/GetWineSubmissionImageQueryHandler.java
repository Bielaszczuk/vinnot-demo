package com.vinnot.wine.application.query.handler;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.port.in.GetWineSubmissionImageUseCase;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.application.query.response.WineSubmissionImageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GetWineSubmissionImageQueryHandler implements GetWineSubmissionImageUseCase {

    private final WineSubmissionRepositoryPort repository;
    private final FileStoragePort fileStoragePort;

    @Override
    public WineSubmissionImageResponse execute(UUID submissionId) {
        repository.findById(submissionId)
                .orElseThrow(() -> new EntityNotFoundException("Wine submission not found"));
        FileStoragePort.StoredFile file =
                fileStoragePort.loadQuarantinedWineLabel(submissionId);
        return new WineSubmissionImageResponse(
                file.content(), file.contentType(), file.size());
    }
}
