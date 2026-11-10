package com.vinnot.wine.application.command.handler;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.application.port.FileStoragePort;
import com.vinnot.wine.application.command.model.SubmitWineCommand;
import com.vinnot.wine.application.command.model.WineSubmissionCatalogData;
import com.vinnot.wine.application.port.in.SubmitWineUseCase;
import com.vinnot.wine.application.port.out.WineLabelRecognitionPort;
import com.vinnot.wine.application.port.out.WineContributionPointsPort;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionModerationPort;
import com.vinnot.wine.application.port.out.WineSubmissionRepositoryPort;
import com.vinnot.wine.application.port.out.WineSubmissionLockPort;
import com.vinnot.wine.application.port.out.WineSubmissionNotificationPort;
import com.vinnot.wine.application.port.out.WineLabelMetricsPort;
import com.vinnot.wine.application.query.response.WineSubmissionResponse;
import com.vinnot.wine.application.query.response.WineSummaryResponse;
import com.vinnot.wine.application.service.WineLabelCatalogMatcher;
import com.vinnot.wine.application.service.WineSubmissionCatalogPublisher;
import com.vinnot.wine.application.service.WineSubmissionCatalogResolver;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineContentSafetyReview;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionReview;
import com.vinnot.wine.domain.model.WineSubmissionSystemReason;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class SubmitWineCommandHandler implements SubmitWineUseCase {

    private final WineLabelRecognitionPort recognitionPort;
    private final WineLabelCatalogMatcher catalogMatcher;
    private final WineSubmissionModerationPort moderationPort;
    private final WineSubmissionRepositoryPort submissionRepository;
    private final WineSubmissionLockPort submissionLockPort;
    private final WineRepositoryPort wineRepository;
    private final FileStoragePort fileStoragePort;
    private final WineSubmissionCatalogPublisher catalogPublisher;
    private final WineSubmissionNotificationPort notificationPort;
    private final WineLabelMetricsPort metricsPort;
    private final WineSubmissionCatalogResolver catalogResolver;
    private final WineContributionPointsPort points;

    @Override
    @Transactional
    public WineSubmissionResponse execute(SubmitWineCommand command) {
        long startedAt = System.nanoTime();
        RecognitionResult recognition = command.hasLabelPhoto()
                ? safelyRecognize(command)
                : new RecognitionResult(false, ExtractedWineLabel.empty());
        ExtractedWineLabel extracted = recognition.label();
        WineSubmissionCatalogResolver.Resolution catalog = catalogResolver.resolve(
                new WineSubmissionCatalogResolver.Input(
                        command.wineryId(), command.wineryName(),
                        command.countryId(), firstText(command.country(), extracted.country()),
                        command.regionId(), firstText(command.region(), extracted.region()),
                        firstGrapes(command.grapes(), extracted.grapeVariety())));
        WineSubmission submission = WineSubmission.create(
                command.submittedBy(),
                command.wineName(),
                catalog.wineryName(),
                firstText(command.wineType(), extracted.wineType()),
                firstValue(command.vintage(), extracted.vintage()),
                catalog.grapes(),
                catalog.country(),
                catalog.region(),
                firstValue(command.alcoholContent(), extracted.alcoholContent()),
                command.notes(),
                catalog.references());
        submissionLockPort.lock(
                submission.getWineName(),
                submission.getWineryName(),
                submission.getVintage());

        WineLabelCatalogMatcher.MatchResult match = catalogMatcher.match(
                toMatchingLabel(submission, extracted));
        if (!command.hasLabelPhoto()) {
            return record(match.exact()
                    ? saveDuplicate(submission, match, command)
                    : requireReview(submission, command,
                            WineSubmissionSystemReason.LABEL_PHOTO_MISSING.storedText(), 0.0), startedAt);
        }
        WineContentSafetyReview safetyReview = safelyModerate(submission, command);
        WineSubmissionReview review = combineReviews(
                safetyReview, recognition, submission);
        if (!review.permitsAutomaticPublication()) {
            return record(requireReview(submission, command, review), startedAt);
        }
        if (match.exact()) {
            return record(saveDuplicate(submission, match, command), startedAt);
        }

        String imageUrl = storeImage(submission, command);
        Optional<WineSubmissionCatalogPublisher.PublicationResult> publication =
                catalogPublisher.publish(
                        WineSubmissionCatalogData.from(submission),
                        command.submittedBy(), imageUrl);
        if (publication.isEmpty()) {
            fileStoragePort.deleteWineLabel(submission.getId());
            return record(requireReview(submission, command, review), startedAt);
        }

        submission.approve(publication.get().wine().getId(), imageUrl, review.confidence());
        WineSubmission savedSubmission = submissionRepository.save(submission);
        notificationPort.notifyStatusChanged(savedSubmission);
        points.submissionApproved(savedSubmission.getSubmittedBy(), savedSubmission.getId(),
                publication.get().wine().getId());
        return record(response(
                savedSubmission,
                "El vino fue validado y agregado al catálogo",
                publication.get().summary()), startedAt);
    }

    private WineSubmissionResponse saveDuplicate(
            WineSubmission submission,
            WineLabelCatalogMatcher.MatchResult match,
            SubmitWineCommand command) {
        RankedWineLabelCandidate exact = match.ranked().getFirst();
        Wine wine = exact.candidate().wine();
        String imageUrl = null;
        if (!hasText(wine.getImageUrl()) && command.hasLabelPhoto()) {
            imageUrl = storeImage(submission, command);
            wine.updateImageUrl(imageUrl);
            wineRepository.save(wine);
        }
        submission.markDuplicate(exact.candidate().id(), exact.score(), imageUrl);
        WineSubmission saved = submissionRepository.save(submission);
        notificationPort.notifyStatusChanged(saved);
        var winery = Objects.nonNull(wine.getWineryId())
                ? match.wineries().get(wine.getWineryId()) : null;
        WineSummaryResponse summary = WineSummaryResponse.fromDomain(
                wine,
                Objects.nonNull(winery) ? winery.name() : null,
                Objects.nonNull(winery) ? winery.regionName() : null,
                Objects.nonNull(winery) ? winery.countryName() : null);
        return response(saved, "El vino ya existía en el catálogo", summary);
    }

    private WineSubmissionResponse requireReview(
            WineSubmission submission,
            SubmitWineCommand command,
            WineSubmissionReview review) {
        String reason = hasText(review.reason())
                ? review.reason()
                : !review.completed()
                        ? WineSubmissionSystemReason.VALIDATION_UNAVAILABLE.storedText()
                        : WineSubmissionSystemReason.LOW_CONFIDENCE.storedText();
        return requireReview(submission, command, reason, review.confidence());
    }

    private WineSubmissionResponse requireReview(
            WineSubmission submission,
            SubmitWineCommand command,
            String reason,
            double confidence) {
        String imageUrl = command.hasLabelPhoto()
                ? storeQuarantinedImage(submission, command) : null;
        submission.requireReview(reason, confidence, imageUrl);
        WineSubmission saved = submissionRepository.save(submission);
        notificationPort.notifyStatusChanged(saved);
        return response(
                saved,
                "Recibimos el vino y quedó pendiente de revisión",
                null);
    }

    private String storeImage(WineSubmission submission, SubmitWineCommand command) {
        return fileStoragePort.storeWineLabel(
                new ByteArrayInputStream(command.imageBytes()),
                command.originalFilename(),
                command.imageContentType(),
                command.imageBytes().length,
                submission.getId());
    }

    private String storeQuarantinedImage(
            WineSubmission submission, SubmitWineCommand command) {
        return fileStoragePort.storeQuarantinedWineLabel(
                new ByteArrayInputStream(command.imageBytes()),
                command.originalFilename(), command.imageContentType(),
                command.imageBytes().length, submission.getId());
    }

    private RecognitionResult safelyRecognize(SubmitWineCommand command) {
        try {
            return new RecognitionResult(
                    true,
                    recognitionPort.recognize(
                            command.imageBytes(), command.imageContentType()));
        } catch (ExternalServiceUnavailableException exception) {
            return new RecognitionResult(false, ExtractedWineLabel.empty());
        }
    }

    private WineContentSafetyReview safelyModerate(
            WineSubmission submission, SubmitWineCommand command) {
        try {
            return moderationPort.reviewSafety(
                    submission, command.imageBytes(), command.imageContentType());
        } catch (ExternalServiceUnavailableException exception) {
            return new WineContentSafetyReview(
                    false, false, WineSubmissionSystemReason.MODERATION_UNAVAILABLE.storedText());
        }
    }

    private WineSubmissionReview combineReviews(
            WineContentSafetyReview safety,
            RecognitionResult recognition,
            WineSubmission submission) {
        boolean completed = safety.completed()
                && (!safety.safe() || recognition.available());
        double confidence = completed
                ? recognition.label().extractionConfidence() : 0.0;
        String reason = !safety.completed() || !safety.safe()
                ? safety.reason()
                : !recognition.available()
                        ? WineSubmissionSystemReason.RECOGNITION_UNAVAILABLE.storedText()
                        : recognition.label().wineLabel()
                                ? WineSubmissionSystemReason.CHECKS_PASSED.storedText()
                                : WineSubmissionSystemReason.NOT_A_WINE_LABEL.storedText();
        return new WineSubmissionReview(
                completed,
                safety.safe(),
                recognition.label().wineLabel(),
                confidence,
                reason,
                firstText(submission.getWineType(), recognition.label().wineType()));
    }

    private ExtractedWineLabel toMatchingLabel(
            WineSubmission submission, ExtractedWineLabel extracted) {
        return new ExtractedWineLabel(
                submission.getWineryName(),
                submission.getWineName(),
                submission.getGrapes().isEmpty()
                        ? null : submission.getGrapes().getFirst(),
                submission.getVintage(),
                submission.getWineType(),
                submission.getRegion(),
                submission.getCountry(),
                submission.getAlcoholContent(),
                extracted.extractionConfidence(),
                extracted.searchKeywords(),
                extracted.visualDescription(),
                extracted.wineLabel(),
                extracted.observedText());
    }

    private static String firstText(String preferred, String fallback) {
        return hasText(preferred) ? preferred.trim()
                : hasText(fallback) ? fallback.trim() : null;
    }

    private static <T> T firstValue(T preferred, T fallback) {
        return Objects.nonNull(preferred) ? preferred : fallback;
    }

    private static List<String> firstGrapes(
            List<String> preferred, String fallback) {
        if (Objects.nonNull(preferred) && !preferred.isEmpty()) {
            return preferred.stream().filter(SubmitWineCommandHandler::hasText).toList();
        }
        return hasText(fallback) ? List.of(fallback.trim()) : List.of();
    }

    private static boolean hasText(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }

    private WineSubmissionResponse response(
            WineSubmission submission, String message, WineSummaryResponse wine) {
        return new WineSubmissionResponse(
                submission.getId(), submission.getStatus(), message, wine);
    }

    private WineSubmissionResponse record(
            WineSubmissionResponse response, long startedAt) {
        metricsPort.recordSubmission(response.status(),
                Duration.ofNanos(System.nanoTime() - startedAt));
        return response;
    }

    private record RecognitionResult(
            boolean available,
            ExtractedWineLabel label
    ) {
    }
}
