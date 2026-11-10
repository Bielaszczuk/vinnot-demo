package com.vinnot.wine.application.command.handler;

import com.vinnot.wine.application.port.out.WineContributionPointsPort;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.command.model.ReviewWineSubmissionCommand;
import com.vinnot.wine.application.command.model.WineSubmissionCatalogData;
import com.vinnot.wine.application.port.out.WineCatalogReferencePort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionLockPort;
import com.vinnot.wine.application.port.out.WineSubmissionNotificationPort;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.application.service.WineSubmissionCatalogPublisher;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionDecision;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import com.vinnot.wine.domain.model.WineSubmissionSystemReason;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.wine.application.service.RecommendWineService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class ReviewWineSubmissionCommandHandlerTest {
    private final WineContributionPointsPort points = mock(WineContributionPointsPort.class);

    @Mock
    private WineSubmissionRepositoryPort submissionRepository;
    @Mock
    private WineRepositoryPort wineRepository;
    @Mock
    private WineCatalogReferencePort catalogReferencePort;
    @Mock
    private WineSubmissionLockPort submissionLockPort;
    @Mock
    private FileStoragePort fileStoragePort;
    @Mock
    private WineSubmissionNotificationPort notificationPort;

    private ReviewWineSubmissionCommandHandler handler;

    @BeforeEach
    void setUp() {
        handler = new ReviewWineSubmissionCommandHandler(
                submissionRepository, wineRepository,
                new WineSubmissionCatalogPublisher(catalogReferencePort, wineRepository, mock(RecommendWineService.class)),
                submissionLockPort,
                fileStoragePort, notificationPort, points);
    }

    @Test
    void rejectsWithAdministratorAuditAndNotification() {
        allowSaving();
        WineSubmission submission = pendingReview();
        UUID reviewerId = UUID.randomUUID();
        when(submissionRepository.findByIdForUpdate(submission.getId()))
                .thenReturn(Optional.of(submission));

        var result = handler.execute(new ReviewWineSubmissionCommand(
                submission.getId(), reviewerId, WineSubmissionDecision.REJECT,
                "The submitted content is not a wine label", null, null));

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.REJECTED);
        assertThat(submission.getReviewedBy()).isEqualTo(reviewerId);
        assertThat(submission.getReviewReason()).contains("not a wine label");
        verify(notificationPort).notifyStatusChanged(submission);
    }

    @Test
    void mergesAndCompletesAnExistingWineImageFromQuarantine() {
        allowSaving();
        WineSubmission submission = pendingReview();
        UUID reviewerId = UUID.randomUUID();
        Wine target = Wine.create(
                "Malbec Reserva", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        when(submissionRepository.findByIdForUpdate(submission.getId()))
                .thenReturn(Optional.of(submission));
        when(wineRepository.findByIdForUpdate(target.getId())).thenReturn(Optional.of(target));
        when(fileStoragePort.promoteQuarantinedWineLabel(submission.getId()))
                .thenReturn("/api/uploads/wine-labels/approved.jpg");

        var result = handler.execute(new ReviewWineSubmissionCommand(
                submission.getId(), reviewerId, WineSubmissionDecision.MERGE_EXISTING,
                "Same wine, verified against the catalog", target.getId(), null));

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.DUPLICATE);
        assertThat(submission.getMatchedWineId()).isEqualTo(target.getId());
        assertThat(target.getImageUrl()).isEqualTo("/api/uploads/wine-labels/approved.jpg");
        verify(wineRepository).save(target);
        verify(fileStoragePort).deleteQuarantinedWineLabel(submission.getId());
        verify(points, never()).submissionApproved(any(), any(), any());
    }

    @Test
    void approvingAsNewCreatesTheWineEvenWhenTheCatalogHasASimilarOne() {
        allowSaving();
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Las Pircas", "Bodega Norte", "WHITE",
                2022, List.of("Torrontes"), "Argentina", "Salta", null, null);
        submission.requireReview("Manual review", 0.78, "quarantine://label.jpg");
        UUID reviewerId = UUID.randomUUID();
        Wine similar = Wine.create(
                "Pircas Negras", UUID.randomUUID(), WineType.WHITE, UUID.randomUUID());
        when(submissionRepository.findByIdForUpdate(submission.getId()))
                .thenReturn(Optional.of(submission));
        when(catalogReferencePort.resolveOrCreate(any(WineCatalogReferencePort.CatalogSelection.class)))
                .thenReturn(Optional.of(new WineCatalogReferencePort.CatalogReference(
                        UUID.randomUUID(), "Bodega Norte", UUID.randomUUID(),
                        "Argentina", null, "Salta")));
        when(fileStoragePort.promoteQuarantinedWineLabel(submission.getId()))
                .thenReturn("/api/uploads/wine-labels/approved.jpg");
        when(wineRepository.save(any(Wine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = handler.execute(new ReviewWineSubmissionCommand(
                submission.getId(), reviewerId, WineSubmissionDecision.APPROVE_NEW,
                "A different wine from the same winery", null, null));

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.APPROVED);
        assertThat(result.wine().name()).isEqualTo("Las Pircas");
        assertThat(submission.getMatchedWineId()).isNotEqualTo(similar.getId());
        verify(wineRepository, never()).findByIdForUpdate(similar.getId());
        verify(submissionLockPort).lock("Las Pircas", "Bodega Norte", 2022);
    }

    @Test
    void approvesANewCatalogWineWithReviewedOverrides() {
        allowSaving();
        WineSubmission submission = pendingReview();
        UUID reviewerId = UUID.randomUUID();
        UUID wineryId = UUID.randomUUID();
        UUID countryId = UUID.randomUUID();
        when(submissionRepository.findByIdForUpdate(submission.getId()))
                .thenReturn(Optional.of(submission));
        when(catalogReferencePort.resolveOrCreate(new WineCatalogReferencePort.CatalogSelection(null, "Bodega Revisada", null, "Argentina", null, "Mendoza")))
                .thenReturn(Optional.of(new WineCatalogReferencePort.CatalogReference(
                        wineryId, "Bodega Revisada", countryId, "Argentina",
                        null, "Mendoza")));
        when(fileStoragePort.promoteQuarantinedWineLabel(submission.getId()))
                .thenReturn("/api/uploads/wine-labels/reviewed.jpg");
        when(wineRepository.save(any(Wine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var overrides = new WineSubmissionCatalogData(
                "Reserva Revisada", "Bodega Revisada", "RED", 2021,
                List.of("Malbec"), "Argentina", "Mendoza", null);
        var result = handler.execute(new ReviewWineSubmissionCommand(
                submission.getId(), reviewerId, WineSubmissionDecision.APPROVE_NEW,
                "Verified by the catalog team", null, overrides));

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.APPROVED);
        assertThat(result.wine().name()).isEqualTo("Reserva Revisada");
        assertThat(submission.getReviewedBy()).isEqualTo(reviewerId);
        verify(fileStoragePort).deleteQuarantinedWineLabel(submission.getId());
        verify(points).submissionApproved(submission.getSubmittedBy(), submission.getId(), result.wine().id());
    }

    @Test
    void requestsCorrectionsWithAdministratorAudit() {
        allowSaving();
        WineSubmission submission = pendingReview();
        UUID reviewerId = UUID.randomUUID();
        when(submissionRepository.findByIdForUpdate(submission.getId()))
                .thenReturn(Optional.of(submission));

        var result = handler.execute(new ReviewWineSubmissionCommand(
                submission.getId(), reviewerId,
                WineSubmissionDecision.REQUEST_CORRECTIONS,
                "Please provide a readable vintage", null, null));

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.CHANGES_REQUESTED);
        assertThat(result.message()).contains("correcciones");
        assertThat(submission.getReviewedBy()).isEqualTo(reviewerId);
    }

    @Test
    void reportsMissingSubmissionAndMergeTarget() {
        UUID submissionId = UUID.randomUUID();
        when(submissionRepository.findByIdForUpdate(submissionId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new ReviewWineSubmissionCommand(
                submissionId, UUID.randomUUID(), WineSubmissionDecision.REJECT,
                "Invalid", null, null)))
                .isInstanceOf(EntityNotFoundException.class);

        WineSubmission submission = pendingReview();
        UUID targetId = UUID.randomUUID();
        when(submissionRepository.findByIdForUpdate(submission.getId()))
                .thenReturn(Optional.of(submission));
        when(wineRepository.findByIdForUpdate(targetId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.execute(new ReviewWineSubmissionCommand(
                submission.getId(), UUID.randomUUID(),
                WineSubmissionDecision.MERGE_EXISTING,
                "Catalog reference", targetId, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void requiresCompleteCatalogDataForApproval() {
        WineSubmission incomplete = pendingReview();
        when(submissionRepository.findByIdForUpdate(incomplete.getId()))
                .thenReturn(Optional.of(incomplete));
        when(catalogReferencePort.resolveOrCreate(any(WineCatalogReferencePort.CatalogSelection.class)))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> handler.execute(new ReviewWineSubmissionCommand(
                incomplete.getId(), UUID.randomUUID(),
                WineSubmissionDecision.APPROVE_NEW,
                "Still incomplete", null, null)))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("SUBMISSION_CATALOG_DATA_INCOMPLETE");
    }

    @Test
    void approvesASubmissionSentWithoutALabelPhoto() {
        allowSaving();
        WineSubmission withoutPhoto = WineSubmission.create(
                UUID.randomUUID(), "Malbec Reserva", "Bodega Norte", "RED",
                2022, List.of("Malbec"), "Argentina", "Mendoza", null, null);
        withoutPhoto.requireReview(WineSubmissionSystemReason.LABEL_PHOTO_MISSING.storedText(), 0.0, null);
        when(submissionRepository.findByIdForUpdate(withoutPhoto.getId()))
                .thenReturn(Optional.of(withoutPhoto));
        when(catalogReferencePort.resolveOrCreate(any(WineCatalogReferencePort.CatalogSelection.class)))
                .thenReturn(Optional.of(new WineCatalogReferencePort.CatalogReference(
                        UUID.randomUUID(), "Bodega Norte", UUID.randomUUID(),
                        "Argentina", null, "Mendoza")));
        when(wineRepository.save(any(Wine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = handler.execute(new ReviewWineSubmissionCommand(
                withoutPhoto.getId(), UUID.randomUUID(),
                WineSubmissionDecision.APPROVE_NEW,
                "Checked by the catalog team", null, null));

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.APPROVED);
        assertThat(result.wine().name()).isEqualTo("Malbec Reserva");
        assertThat(withoutPhoto.getImageUrl()).isNull();
        verify(fileStoragePort, never()).promoteQuarantinedWineLabel(any());
    }

    @Test
    void refusesToPublishALabelImageThatWasNotQuarantined() {
        WineSubmission unreviewedImage = WineSubmission.builder()
                .id(UUID.randomUUID()).submittedBy(UUID.randomUUID())
                .wineName("Malbec Reserva").wineryName("Bodega Norte").wineType("RED")
                .vintage(2022).grapes(List.of("Malbec")).country("Argentina").region("Mendoza")
                .status(WineSubmissionStatus.NEEDS_REVIEW)
                .imageUrl("public://label.jpg").imageQuarantined(false)
                .build();
        when(submissionRepository.findByIdForUpdate(unreviewedImage.getId()))
                .thenReturn(Optional.of(unreviewedImage));
        when(catalogReferencePort.resolveOrCreate(any(WineCatalogReferencePort.CatalogSelection.class)))
                .thenReturn(Optional.of(new WineCatalogReferencePort.CatalogReference(
                        UUID.randomUUID(), "Bodega Norte", UUID.randomUUID(),
                        "Argentina", null, "Mendoza")));

        assertThatThrownBy(() -> handler.execute(new ReviewWineSubmissionCommand(
                unreviewedImage.getId(), UUID.randomUUID(),
                WineSubmissionDecision.APPROVE_NEW,
                "Checked by the catalog team", null, null)))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("SUBMISSION_IMAGE_REQUIRED");
        verify(fileStoragePort, never()).promoteQuarantinedWineLabel(any());
    }

    private WineSubmission pendingReview() {
        WineSubmission submission = WineSubmission.create(
                UUID.randomUUID(), "Malbec Reserva", "Bodega Norte", "RED",
                2022, List.of("Malbec"), "Argentina", "Mendoza", null, null);
        submission.requireReview(
                "Automatic review unavailable", 0.78, "quarantine://label.jpg");
        return submission;
    }

    private void allowSaving() {
        when(submissionRepository.save(any(WineSubmission.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }
}
