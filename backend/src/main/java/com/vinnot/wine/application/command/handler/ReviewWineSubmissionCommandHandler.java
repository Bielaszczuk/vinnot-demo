package com.vinnot.wine.application.command.handler;

import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.command.model.ReviewWineSubmissionCommand;
import com.vinnot.wine.application.command.model.WineSubmissionCatalogData;
import com.vinnot.wine.application.port.in.ReviewWineSubmissionUseCase;
import com.vinnot.wine.application.port.out.WineContributionPointsPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionLockPort;
import com.vinnot.wine.application.port.out.WineSubmissionNotificationPort;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.application.query.response.WineSubmissionResponse;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.application.service.WineSubmissionCatalogPublisher;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionDecision;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewWineSubmissionCommandHandler
        implements ReviewWineSubmissionUseCase {

    private final WineSubmissionRepositoryPort submissionRepository;
    private final WineRepositoryPort wineRepository;
    private final WineSubmissionCatalogPublisher catalogPublisher;
    private final WineSubmissionLockPort submissionLockPort;
    private final FileStoragePort fileStoragePort;
    private final WineSubmissionNotificationPort notificationPort;
    private final WineContributionPointsPort points;

    @Override
    @Transactional
    public WineSubmissionResponse execute(ReviewWineSubmissionCommand command) {
        WineSubmission submission = submissionRepository.findByIdForUpdate(command.submissionId())
                .orElseThrow(() -> new EntityNotFoundException("Wine submission not found"));
        submission.assertReviewable();
        WineSummaryResponse wine = switch (command.decision()) {
            case APPROVE_NEW -> approveNew(submission, command);
            case MERGE_EXISTING -> mergeExisting(submission, command);
            case REJECT -> reject(submission, command);
            case REQUEST_CORRECTIONS -> requestCorrections(submission, command);
        };
        WineSubmission saved = submissionRepository.save(submission);
        notificationPort.notifyStatusChanged(saved);
        return new WineSubmissionResponse(
                saved.getId(), saved.getStatus(), statusMessage(command.decision()), wine);
    }

    private WineSummaryResponse approveNew(
            WineSubmission submission, ReviewWineSubmissionCommand command) {
        WineSubmissionCatalogData data =
                WineSubmissionCatalogData.from(submission)
                        .overrideWith(command.catalogData());
        submissionLockPort.lock(data.wineName(), data.wineryName(), data.vintage());
        var publication = catalogPublisher.publish(
                        data, command.reviewerId(), () -> promoteImageIfSent(submission))
                .orElseThrow(() -> new DomainException(
                        "SUBMISSION_CATALOG_DATA_INCOMPLETE",
                        "Wine type and a known country are required to approve the wine"));
        String imageUrl = publication.wine().getImageUrl();
        submission.approveByAdmin(
                publication.wine().getId(), imageUrl,
                command.reviewerId(), command.reason());
        fileStoragePort.deleteQuarantinedWineLabel(submission.getId());
        points.submissionApproved(submission.getSubmittedBy(), submission.getId(), publication.wine().getId());
        return publication.summary();
    }

    private WineSummaryResponse mergeExisting(
            WineSubmission submission, ReviewWineSubmissionCommand command) {
        UUID targetWineId = Objects.requireNonNull(command.targetWineId(),
                "Target wine is required for merge");
        Wine wine = wineRepository.findByIdForUpdate(targetWineId)
                .orElseThrow(() -> new EntityNotFoundException("Target wine not found"));
        if (!hasText(wine.getImageUrl()) && Objects.nonNull(submission.getImageUrl())) {
            wine.updateImageUrl(promoteImage(submission));
            wineRepository.save(wine);
        }
        submission.mergeByAdmin(targetWineId, command.reviewerId(), command.reason());
        fileStoragePort.deleteQuarantinedWineLabel(submission.getId());
        return null;
    }

    private WineSummaryResponse reject(
            WineSubmission submission, ReviewWineSubmissionCommand command) {
        submission.rejectByAdmin(command.reviewerId(), command.reason());
        return null;
    }

    private WineSummaryResponse requestCorrections(
            WineSubmission submission, ReviewWineSubmissionCommand command) {
        submission.requestCorrections(command.reviewerId(), command.reason());
        return null;
    }

    /** A wine sent without a label photo is published without an image. */
    private String promoteImageIfSent(WineSubmission submission) {
        return Objects.isNull(submission.getImageUrl()) ? null : promoteImage(submission);
    }

    private String promoteImage(WineSubmission submission) {
        if (Objects.isNull(submission.getImageUrl()) || !submission.isImageQuarantined()) {
            throw new DomainException(
                    "SUBMISSION_IMAGE_REQUIRED", "A reviewed label image is required");
        }
        return fileStoragePort.promoteQuarantinedWineLabel(submission.getId());
    }

    private String statusMessage(WineSubmissionDecision decision) {
        return switch (decision) {
            case APPROVE_NEW -> "La propuesta fue aprobada y publicada";
            case MERGE_EXISTING -> "La propuesta fue fusionada con un vino existente";
            case REJECT -> "La propuesta fue rechazada";
            case REQUEST_CORRECTIONS -> "La propuesta requiere correcciones";
        };
    }

    private boolean hasText(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }
}
