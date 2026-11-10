package com.vinnot.wine.application.query.response;

import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.Objects;

public record WineSubmissionDetailsResponse(
        UUID id,
        UUID submittedBy,
        String submittedByUsername,
        String wineName,
        String wineryName,
        String wineType,
        Integer vintage,
        List<String> grapes,
        String country,
        String region,
        BigDecimal alcoholContent,
        String notes,
        String imageUrl,
        boolean imageAvailable,
        WineSubmissionStatus status,
        String reviewReason,
        Double reviewConfidence,
        UUID matchedWineId,
        UUID createdWineId,
        UUID reviewedBy,
        Instant reviewedAt,
        Instant createdAt,
        Instant updatedAt,
        UUID wineryId,
        UUID countryId,
        UUID regionId,
        List<String> proposedGrapes,
        /** The automatic review's reason as a stable code the apps translate; null for a moderator's own text. */
        String reasonCode
) {

    public static WineSubmissionDetailsResponse fromDomain(
            WineSubmission submission, boolean exposeQuarantinedImage) {
        return fromDomain(submission, exposeQuarantinedImage, null);
    }

    public static WineSubmissionDetailsResponse fromDomain(
            WineSubmission submission, boolean exposeQuarantinedImage, String submittedByUsername) {
        String visibleImage = !submission.isImageQuarantined()
                || exposeQuarantinedImage ? submission.getImageUrl() : null;
        return new WineSubmissionDetailsResponse(
                submission.getId(), submission.getSubmittedBy(), submittedByUsername,
                submission.getWineName(), submission.getWineryName(),
                submission.getWineType(), submission.getVintage(),
                submission.getGrapes(), submission.getCountry(),
                submission.getRegion(), submission.getAlcoholContent(),
                submission.getNotes(), visibleImage,
                Objects.nonNull(submission.getImageUrl()), submission.getStatus(),
                submission.getReviewReason(), submission.getReviewConfidence(),
                submission.getMatchedWineId(), submission.getCreatedWineId(),
                submission.getReviewedBy(), submission.getReviewedAt(),
                submission.getCreatedAt(), submission.getUpdatedAt(),
                submission.getCatalogReferences().wineryId(),
                submission.getCatalogReferences().countryId(),
                submission.getCatalogReferences().regionId(),
                submission.getCatalogReferences().proposedGrapes(),
                submission.systemReason().map(Enum::name).orElse(null));
    }
}
