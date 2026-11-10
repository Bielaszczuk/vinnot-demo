package com.vinnot.wine.application.command.handler;

import com.vinnot.wine.application.port.out.WineContributionPointsPort;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.command.model.SubmitWineCommand;
import com.vinnot.wine.application.port.out.WineCatalogReferencePort;
import com.vinnot.wine.application.port.out.WineLabelRecognitionPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionModerationPort;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionLockPort;
import com.vinnot.wine.application.port.out.WineSubmissionNotificationPort;
import com.vinnot.wine.application.port.out.WineLabelMetricsPort;
import com.vinnot.wine.application.service.WineLabelCatalogMatcher;
import com.vinnot.wine.application.service.WineSubmissionCatalogPublisher;
import com.vinnot.wine.application.service.WineSubmissionCatalogResolver;
import com.vinnot.wine.application.port.out.WineSubmissionCatalogLookupPort;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineContentSafetyReview;
import com.vinnot.wine.domain.model.WineLabelCandidate;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionCatalogReferences;
import com.vinnot.wine.domain.model.WineSubmissionStatus;
import com.vinnot.wine.domain.model.WineSubmissionSystemReason;
import com.vinnot.wine.domain.valueobject.WineType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import com.vinnot.wine.application.service.RecommendWineService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class SubmitWineCommandHandlerTest {
    private final WineContributionPointsPort points = mock(WineContributionPointsPort.class);

    @Mock
    private WineLabelRecognitionPort recognitionPort;
    @Mock
    private WineLabelCatalogMatcher catalogMatcher;
    @Mock
    private WineSubmissionModerationPort moderationPort;
    @Mock
    private WineSubmissionRepositoryPort submissionRepository;
    @Mock
    private WineSubmissionLockPort submissionLockPort;
    @Mock
    private WineCatalogReferencePort catalogReferencePort;
    @Mock
    private WineRepositoryPort wineRepository;
    @Mock
    private FileStoragePort fileStoragePort;
    @Mock
    private WineSubmissionNotificationPort notificationPort;
    @Mock
    private WineLabelMetricsPort metricsPort;
    @Mock
    private WineSubmissionCatalogLookupPort catalogLookupPort;

    private SubmitWineCommandHandler handler;

    @BeforeEach
    void setUp() {
        handler = new SubmitWineCommandHandler(
                recognitionPort,
                catalogMatcher,
                moderationPort,
                submissionRepository,
                submissionLockPort,
                wineRepository,
                fileStoragePort,
                new WineSubmissionCatalogPublisher(
                        catalogReferencePort, wineRepository, mock(RecommendWineService.class)),
                notificationPort,
                metricsPort,
                new WineSubmissionCatalogResolver(catalogLookupPort),
                points);
        when(submissionRepository.save(any(WineSubmission.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void linksDuplicateWithoutReplacingAnExistingImage() {
        ExtractedWineLabel extracted = extracted();
        Wine existing = Wine.create(
                "Malbec Reserva", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        existing.updateImageUrl("/existing.jpg");
        RankedWineLabelCandidate ranked = new RankedWineLabelCandidate(
                new WineLabelCandidate(existing, "Bodega Norte"), 0.96);
        when(recognitionPort.recognize(any(), any())).thenReturn(extracted);
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(
                        List.of(ranked), Map.of(), true));
        when(moderationPort.reviewSafety(any(), any(), any())).thenReturn(
                new WineContentSafetyReview(true, true, "Safe content"));

        var result = handler.execute(command());

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.DUPLICATE);
        assertThat(result.wine().id()).isEqualTo(existing.getId());
        verify(moderationPort).reviewSafety(any(), any(), any());
        verify(fileStoragePort, never())
                .storeWineLabel(any(), any(), any(), anyLong(), any());
        assertNotified("Existing catalog match", WineSubmissionSystemReason.CATALOG_MATCH);
    }

    @Test
    void publishesOnlyAfterSuccessfulAutomaticReviewAndReferenceResolution() {
        UUID wineryId = UUID.randomUUID();
        UUID countryId = UUID.randomUUID();
        when(recognitionPort.recognize(any(), any())).thenReturn(extracted());
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(List.of(), Map.of(), false));
        when(moderationPort.reviewSafety(any(), any(), any())).thenReturn(
                new WineContentSafetyReview(true, true, "Safe content"));
        when(catalogReferencePort.resolveOrCreate(any(WineCatalogReferencePort.CatalogSelection.class)))
                .thenReturn(Optional.of(new WineCatalogReferencePort.CatalogReference(
                        wineryId, "Bodega Norte", countryId, "Argentina",
                        null, null)));
        when(fileStoragePort.storeWineLabel(any(), any(), any(), anyLong(), any()))
                .thenReturn("/api/uploads/wine-labels/label.jpg");
        when(wineRepository.save(any(Wine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = handler.execute(command());

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.APPROVED);
        assertThat(result.wine().wineryId()).isEqualTo(wineryId);
        assertNotified("Automatically approved", WineSubmissionSystemReason.AUTO_APPROVED);
        assertThat(result.wine().country()).isEqualTo("Argentina");
        verify(wineRepository).save(any(Wine.class));
        verify(points).submissionApproved(any(UUID.class), eq(result.submissionId()), eq(result.wine().id()));
    }

    @Test
    void quarantinesFlaggedContentEvenWhenFormFieldsMatchAnExistingWine() {
        Wine existing = Wine.create(
                "Malbec Reserva", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        RankedWineLabelCandidate ranked = new RankedWineLabelCandidate(
                new WineLabelCandidate(existing, "Bodega Norte"), 0.97);
        when(recognitionPort.recognize(any(), any())).thenReturn(extracted());
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(
                        List.of(ranked), Map.of(), true));
        when(moderationPort.reviewSafety(any(), any(), any())).thenReturn(
                new WineContentSafetyReview(true, false, "Flagged content"));
        when(fileStoragePort.storeQuarantinedWineLabel(
                any(), any(), any(), anyLong(), any()))
                .thenReturn("quarantine://label.jpg");

        var result = handler.execute(command());

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.NEEDS_REVIEW);
        verify(wineRepository, never()).save(any(Wine.class));
        verify(fileStoragePort).storeQuarantinedWineLabel(
                any(), any(), any(), anyLong(), any());
        assertNotified("Flagged content", WineSubmissionSystemReason.CONTENT_REVIEW);
    }

    @Test
    void completesAnExistingWineImageFromASafeDuplicateSubmission() {
        Wine existing = Wine.create(
                "Malbec Reserva", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        RankedWineLabelCandidate ranked = new RankedWineLabelCandidate(
                new WineLabelCandidate(existing, "Bodega Norte"), 0.96);
        when(recognitionPort.recognize(any(), any())).thenReturn(extracted());
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(
                        List.of(ranked), Map.of(), true));
        when(moderationPort.reviewSafety(any(), any(), any())).thenReturn(
                new WineContentSafetyReview(true, true, "Safe content"));
        when(fileStoragePort.storeWineLabel(any(), any(), any(), anyLong(), any()))
                .thenReturn("/api/uploads/wine-labels/completed.jpg");

        var result = handler.execute(command());

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.DUPLICATE);
        assertThat(existing.getImageUrl())
                .isEqualTo("/api/uploads/wine-labels/completed.jpg");
        verify(wineRepository).save(existing);
    }

    @Test
    void movesSubmissionToReviewWhenCatalogPublicationCannotResolveReferences() {
        when(recognitionPort.recognize(any(), any())).thenReturn(extracted());
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(List.of(), Map.of(), false));
        when(moderationPort.reviewSafety(any(), any(), any())).thenReturn(
                new WineContentSafetyReview(true, true, "Safe content"));
        when(fileStoragePort.storeWineLabel(any(), any(), any(), anyLong(), any()))
                .thenReturn("/api/uploads/wine-labels/temporary.jpg");
        when(catalogReferencePort.resolveOrCreate(any(WineCatalogReferencePort.CatalogSelection.class)))
                .thenReturn(Optional.empty());
        when(fileStoragePort.storeQuarantinedWineLabel(
                any(), any(), any(), anyLong(), any()))
                .thenReturn("quarantine://label.jpg");

        var result = handler.execute(command());

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.NEEDS_REVIEW);
        verify(fileStoragePort).deleteWineLabel(any());
        assertNotified("Content safety and wine relevance passed", WineSubmissionSystemReason.CHECKS_PASSED);
    }

    @Test
    void quarantinesWhenRecognitionIsUnavailable() {
        when(recognitionPort.recognize(any(), any())).thenThrow(
                new ExternalServiceUnavailableException(
                        "LABEL_RECOGNITION_UNAVAILABLE", "Unavailable", null));
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(List.of(), Map.of(), false));
        when(moderationPort.reviewSafety(any(), any(), any())).thenReturn(
                new WineContentSafetyReview(true, true, "Safe content"));
        when(fileStoragePort.storeQuarantinedWineLabel(
                any(), any(), any(), anyLong(), any()))
                .thenReturn("quarantine://label.jpg");

        var result = handler.execute(command());

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.NEEDS_REVIEW);
        assertThat(result.message()).contains("pendiente");
        assertNotified("Wine-label recognition was unavailable", WineSubmissionSystemReason.RECOGNITION_UNAVAILABLE);
    }

    @Test
    void quarantinesWhenModerationIsUnavailable() {
        when(recognitionPort.recognize(any(), any())).thenReturn(extracted());
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(List.of(), Map.of(), false));
        when(moderationPort.reviewSafety(any(), any(), any())).thenThrow(
                new ExternalServiceUnavailableException(
                        "MODERATION_UNAVAILABLE", "Unavailable", null));
        when(fileStoragePort.storeQuarantinedWineLabel(
                any(), any(), any(), anyLong(), any()))
                .thenReturn("quarantine://label.jpg");

        var result = handler.execute(command());

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.NEEDS_REVIEW);
        assertNotified("Content moderation was unavailable", WineSubmissionSystemReason.MODERATION_UNAVAILABLE);
    }

    @Test
    void usesSafeDefaultReasonWhenModerationDoesNotExplainItsFailure() {
        when(recognitionPort.recognize(any(), any())).thenReturn(extracted());
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(List.of(), Map.of(), false));
        when(moderationPort.reviewSafety(any(), any(), any())).thenReturn(
                new WineContentSafetyReview(false, false, null));
        when(fileStoragePort.storeQuarantinedWineLabel(
                any(), any(), any(), anyLong(), any()))
                .thenReturn("quarantine://label.jpg");

        var result = handler.execute(command());

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.NEEDS_REVIEW);
        assertNotified("La validación automática no está disponible", WineSubmissionSystemReason.VALIDATION_UNAVAILABLE);
    }

    @Test
    void fillsOptionalCatalogFieldsFromLabelRecognition() {
        when(recognitionPort.recognize(any(), any())).thenReturn(extracted());
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(List.of(), Map.of(), false));
        when(moderationPort.reviewSafety(any(), any(), any())).thenReturn(
                new WineContentSafetyReview(true, true, "Safe content"));
        when(catalogReferencePort.resolveOrCreate(new WineCatalogReferencePort.CatalogSelection(null, "Bodega Norte", null, "Argentina", null, "Mendoza")))
                .thenReturn(Optional.of(new WineCatalogReferencePort.CatalogReference(
                        UUID.randomUUID(), "Bodega Norte", UUID.randomUUID(),
                        "Argentina", null, "Mendoza")));
        when(fileStoragePort.storeWineLabel(any(), any(), any(), anyLong(), any()))
                .thenReturn("/api/uploads/wine-labels/inferred.jpg");
        when(wineRepository.save(any(Wine.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        SubmitWineCommand sparse = new SubmitWineCommand(
                UUID.randomUUID(), "Malbec Reserva", "Bodega Norte",
                null, null, List.of(), null, null, null, null,
                new byte[] {1, 2, 3}, "image/jpeg", "label.jpg");

        var result = handler.execute(sparse);

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.APPROVED);
        assertThat(result.wine().grapes()).containsExactly("Malbec");
    }

    /** The stored reason text is unchanged; notifications read the code instead. */
@Test
    void storesThePickedCatalogEntriesAndPublishesWithThem() {
        UUID wineryId = UUID.randomUUID();
        UUID countryId = UUID.randomUUID();
        when(catalogLookupPort.findWinery(wineryId)).thenReturn(Optional.of(
                new WineSubmissionCatalogLookupPort.CatalogEntry(wineryId, "Bodega Norte S.A.")));
        when(catalogLookupPort.findCountry(countryId)).thenReturn(Optional.of(
                new WineSubmissionCatalogLookupPort.CatalogEntry(countryId, "Argentina")));
        when(catalogLookupPort.matchGrape("Malbec")).thenReturn(Optional.of("Malbec"));
        when(recognitionPort.recognize(any(), any())).thenReturn(extracted());
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(List.of(), Map.of(), false));
        when(moderationPort.reviewSafety(any(), any(), any())).thenReturn(
                new WineContentSafetyReview(true, true, "Safe content"));
        when(catalogReferencePort.resolveOrCreate(any(WineCatalogReferencePort.CatalogSelection.class)))
                .thenReturn(Optional.of(new WineCatalogReferencePort.CatalogReference(
                        wineryId, "Bodega Norte S.A.", countryId, "Argentina", null, null)));
        when(fileStoragePort.storeWineLabel(any(), any(), any(), anyLong(), any())).thenReturn("label.jpg");
        when(wineRepository.save(any(Wine.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SubmitWineCommand base = command();

        handler.execute(new SubmitWineCommand(
                base.submittedBy(), base.wineName(), "bodega norte", base.wineType(), base.vintage(),
                List.of("Malbec", "Uva Nueva"), "arg", null, null, null,
                base.imageBytes(), base.imageContentType(), base.originalFilename(),
                wineryId, countryId, null));

        verify(catalogReferencePort).resolveOrCreate(new WineCatalogReferencePort.CatalogSelection(
                wineryId, "Bodega Norte S.A.", countryId, "Argentina", null, "Mendoza"));
        ArgumentCaptor<WineSubmission> saved = ArgumentCaptor.forClass(WineSubmission.class);
        verify(submissionRepository).save(saved.capture());
        assertThat(saved.getValue().getWineryName()).isEqualTo("Bodega Norte S.A.");
        assertThat(saved.getValue().getCatalogReferences()).isEqualTo(
                new WineSubmissionCatalogReferences(
                        wineryId, countryId, null, List.of("Uva Nueva")));
    }

    @Test
    void sendsASubmissionWithoutPhotoToManualReviewWithoutCallingTheImageChecks() {
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(List.of(), Map.of(), false));

        var result = handler.execute(commandWithoutPhoto());

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.NEEDS_REVIEW);
        assertThat(result.wine()).isNull();
        verify(recognitionPort, never()).recognize(any(), any());
        verify(moderationPort, never()).reviewSafety(any(), any(), any());
        verify(fileStoragePort, never())
                .storeQuarantinedWineLabel(any(), any(), any(), anyLong(), any());
        verify(fileStoragePort, never())
                .storeWineLabel(any(), any(), any(), anyLong(), any());
        assertNotified("No label photo was attached", WineSubmissionSystemReason.LABEL_PHOTO_MISSING);
    }

    @Test
    void linksASubmissionWithoutPhotoToTheExactExistingWine() {
        Wine existing = Wine.create(
                "Malbec Reserva", UUID.randomUUID(), WineType.RED, UUID.randomUUID());
        RankedWineLabelCandidate ranked = new RankedWineLabelCandidate(
                new WineLabelCandidate(existing, "Bodega Norte"), 0.96);
        when(catalogMatcher.match(any())).thenReturn(
                new WineLabelCatalogMatcher.MatchResult(List.of(ranked), Map.of(), true));

        var result = handler.execute(commandWithoutPhoto());

        assertThat(result.status()).isEqualTo(WineSubmissionStatus.DUPLICATE);
        assertThat(result.wine().id()).isEqualTo(existing.getId());
        assertThat(existing.getImageUrl()).isNull();
        verify(moderationPort, never()).reviewSafety(any(), any(), any());
        verify(fileStoragePort, never())
                .storeWineLabel(any(), any(), any(), anyLong(), any());
    }

        private void assertNotified(String storedReason, WineSubmissionSystemReason code) {
        var notified = ArgumentCaptor.forClass(WineSubmission.class);
        verify(notificationPort).notifyStatusChanged(notified.capture());
        assertThat(notified.getValue().getReviewReason()).isEqualTo(storedReason);
        assertThat(notified.getValue().systemReason()).contains(code);
    }

    private SubmitWineCommand command() {
        return new SubmitWineCommand(
                UUID.randomUUID(),
                "Malbec Reserva",
                "Bodega Norte",
                "RED",
                2022,
                List.of("Malbec"),
                "Argentina",
                "Mendoza",
                null,
                null,
                new byte[] {1, 2, 3},
                "image/jpeg",
                "label.jpg");
    }

    private SubmitWineCommand commandWithoutPhoto() {
        return new SubmitWineCommand(
                UUID.randomUUID(), "Malbec Reserva", "Bodega Norte", "RED", 2022,
                List.of("Malbec"), "Argentina", "Mendoza", null, null,
                null, null, null);
    }

    private ExtractedWineLabel extracted() {
        return new ExtractedWineLabel(
                "Bodega Norte",
                "Malbec Reserva",
                "Malbec",
                2022,
                "RED",
                "Mendoza",
                "Argentina",
                null,
                0.95,
                "malbec reserva bodega norte",
                "Etiqueta bordó",
                true,
                List.of("Malbec Reserva"));
    }
}
