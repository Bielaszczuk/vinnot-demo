package com.vinnot.wine.domain.model;

import com.vinnot.shared.domain.base.AggregateRoot;
import com.vinnot.shared.domain.exception.DomainException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Auditable user proposal. It is intentionally separate from the canonical
 * wine aggregate so untrusted input never becomes catalog data directly.
 */
public class WineSubmission extends AggregateRoot<UUID> {

    private final UUID id;
    private final UUID submittedBy;
    private final String wineName;
    private final String wineryName;
    private final String wineType;
    private final Integer vintage;
    private final List<String> grapes;
    private final String country;
    private final String region;
    private final BigDecimal alcoholContent;
    private final String notes;
    private final WineSubmissionCatalogReferences catalogReferences;
    private final Instant createdAt;
    private WineSubmissionStatus status;
    private String imageUrl;
    private String reviewReason;
    private Double reviewConfidence;
    private UUID matchedWineId;
    private UUID createdWineId;
    private UUID reviewedBy;
    private Instant reviewedAt;
    private boolean imageQuarantined;
    private Instant updatedAt;

    private WineSubmission(Builder builder) {
        this.id = builder.id;
        this.submittedBy = builder.submittedBy;
        this.wineName = builder.wineName;
        this.wineryName = builder.wineryName;
        this.wineType = builder.wineType;
        this.vintage = builder.vintage;
        this.grapes = List.copyOf(builder.grapes);
        this.country = builder.country;
        this.region = builder.region;
        this.alcoholContent = builder.alcoholContent;
        this.notes = builder.notes;
        this.catalogReferences = Objects.requireNonNullElse(
                builder.catalogReferences, WineSubmissionCatalogReferences.none());
        this.status = builder.status;
        this.imageUrl = builder.imageUrl;
        this.reviewReason = builder.reviewReason;
        this.reviewConfidence = builder.reviewConfidence;
        this.matchedWineId = builder.matchedWineId;
        this.createdWineId = builder.createdWineId;
        this.reviewedBy = builder.reviewedBy;
        this.reviewedAt = builder.reviewedAt;
        this.imageQuarantined = builder.imageQuarantined;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    public static WineSubmission create(
            UUID submittedBy, String wineName, String wineryName, String wineType,
            Integer vintage, List<String> grapes, String country, String region,
            BigDecimal alcoholContent, String notes) {
        return create(submittedBy, wineName, wineryName, wineType, vintage, grapes, country, region,
                alcoholContent, notes, WineSubmissionCatalogReferences.none());
    }

    public static WineSubmission create(
            UUID submittedBy, String wineName, String wineryName, String wineType,
            Integer vintage, List<String> grapes, String country, String region,
            BigDecimal alcoholContent, String notes, WineSubmissionCatalogReferences references) {
        if (Objects.isNull(submittedBy)) {
            throw new DomainException("INVALID_SUBMISSION", "Submitting user is required");
        }
        if (Objects.isNull(wineName) || wineName.isBlank()) {
            throw new DomainException("INVALID_SUBMISSION", "Wine name is required");
        }
        if (Objects.isNull(wineryName) || wineryName.isBlank()) {
            throw new DomainException("INVALID_SUBMISSION", "Winery name is required");
        }
        List<String> submittedGrapes = Objects.nonNull(grapes) ? grapes : List.of();
        WineSubmissionCatalogReferences links =
                Objects.requireNonNullElse(references, WineSubmissionCatalogReferences.none());
        if (!submittedGrapes.containsAll(links.proposedGrapes())) {
            throw new DomainException("INVALID_SUBMISSION", "Proposed grapes must be submitted grapes");
        }
        Instant now = Instant.now();
        return builder()
                .id(UUID.randomUUID())
                .submittedBy(submittedBy)
                .wineName(wineName.trim())
                .wineryName(wineryName.trim())
                .wineType(clean(wineType))
                .vintage(vintage)
                .grapes(submittedGrapes)
                .country(clean(country))
                .region(clean(region))
                .alcoholContent(alcoholContent)
                .notes(clean(notes))
                .catalogReferences(links)
                .status(WineSubmissionStatus.PENDING)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public void approve(UUID wineId, String storedImageUrl, double confidence) {
        transition(WineSubmissionStatus.APPROVED, WineSubmissionSystemReason.AUTO_APPROVED.storedText(),
                confidence, null, wineId, storedImageUrl, false, null,
                WineSubmissionStatus.PENDING);
    }

    public void markDuplicate(UUID wineId, double confidence) {
        markDuplicate(wineId, confidence, null);
    }

    public void markDuplicate(UUID wineId, double confidence, String storedImageUrl) {
        transition(WineSubmissionStatus.DUPLICATE, WineSubmissionSystemReason.CATALOG_MATCH.storedText(),
                confidence, wineId, null, storedImageUrl, false, null,
                WineSubmissionStatus.PENDING);
    }

    public void reject(String reason, double confidence) {
        transition(WineSubmissionStatus.REJECTED, reason, confidence,
                null, null, null, false, null, WineSubmissionStatus.PENDING);
    }

    public void requireReview(String reason, double confidence, String storedImageUrl) {
        transition(WineSubmissionStatus.NEEDS_REVIEW, reason,
                confidence, null, null, storedImageUrl, true, null,
                WineSubmissionStatus.PENDING);
    }

    public void approveByAdmin(
            UUID wineId, String storedImageUrl, UUID reviewerId, String reason) {
        reviewTransition(WineSubmissionStatus.APPROVED, reviewerId, reason,
                null, wineId, storedImageUrl, false);
    }

    public void mergeByAdmin(UUID wineId, UUID reviewerId, String reason) {
        reviewTransition(WineSubmissionStatus.DUPLICATE, reviewerId, reason,
                wineId, null, null, false);
    }

    public void rejectByAdmin(UUID reviewerId, String reason) {
        reviewTransition(WineSubmissionStatus.REJECTED, reviewerId, reason,
                null, null, null, false);
    }

    public void requestCorrections(UUID reviewerId, String reason) {
        reviewTransition(WineSubmissionStatus.CHANGES_REQUESTED, reviewerId, reason,
                null, null, imageUrl, imageQuarantined);
    }

    private void transition(
            WineSubmissionStatus target, String reason, double confidence,
            UUID matchedId, UUID createdId, String storedImageUrl,
            boolean quarantined, UUID reviewerId,
            WineSubmissionStatus expectedCurrentStatus) {
        if (status != expectedCurrentStatus) {
            throw new DomainException(
                    "INVALID_SUBMISSION_TRANSITION", "Submission has already been reviewed");
        }
        this.status = target;
        this.reviewReason = clean(reason);
        this.reviewConfidence = Math.max(0.0, Math.min(1.0, confidence));
        this.matchedWineId = matchedId;
        this.createdWineId = createdId;
        this.imageUrl = storedImageUrl;
        this.imageQuarantined = quarantined;
        this.reviewedBy = reviewerId;
        this.reviewedAt = Objects.nonNull(reviewerId) ? Instant.now() : null;
        this.updatedAt = Instant.now();
    }

    public void assertReviewable() {
        if (status != WineSubmissionStatus.NEEDS_REVIEW) {
            throw new DomainException("INVALID_SUBMISSION_TRANSITION",
                    "Only pending-review submissions can be decided by an administrator");
        }
    }

    private void reviewTransition(
            WineSubmissionStatus target, UUID reviewerId, String reason,
            UUID matchedId, UUID createdId, String storedImageUrl,
            boolean quarantined) {
        if (status != WineSubmissionStatus.NEEDS_REVIEW) {
            throw new DomainException(
                    "INVALID_SUBMISSION_TRANSITION",
                    "Only pending-review submissions can be decided by an administrator");
        }
        if (Objects.isNull(reviewerId)) {
            throw new DomainException("INVALID_SUBMISSION_REVIEW", "Reviewer is required");
        }
        if (Objects.isNull(reason) || reason.isBlank()) {
            throw new DomainException("INVALID_SUBMISSION_REVIEW", "Decision reason is required");
        }
        transition(target, reason, Objects.requireNonNullElse(reviewConfidence, 0.0),
                matchedId, createdId, storedImageUrl, quarantined, reviewerId,
                WineSubmissionStatus.NEEDS_REVIEW);
    }

    private static String clean(String value) {
        return Objects.nonNull(value) && !value.isBlank() ? value.trim() : null;
    }

    public static Builder builder() {
        return new Builder();
    }

    @Override
    public UUID getId() {
        return id;
    }

    public UUID getSubmittedBy() {
        return submittedBy;
    }

    public String getWineName() {
        return wineName;
    }

    public String getWineryName() {
        return wineryName;
    }

    public String getWineType() {
        return wineType;
    }

    public Integer getVintage() {
        return vintage;
    }

    public List<String> getGrapes() {
        return grapes;
    }

    public String getCountry() {
        return country;
    }

    public String getRegion() {
        return region;
    }

    public BigDecimal getAlcoholContent() {
        return alcoholContent;
    }

    public String getNotes() {
        return notes;
    }

    public WineSubmissionCatalogReferences getCatalogReferences() {
        return catalogReferences;
    }

    public WineSubmissionStatus getStatus() {
        return status;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getReviewReason() {
        return reviewReason;
    }

    /**
     * The automatic review's reason as a stable code. Empty when an administrator decided (their text is
     * shown as written) or when there is no reason.
     */
    public Optional<WineSubmissionSystemReason> systemReason() {
        if (Objects.nonNull(reviewedBy) || Objects.isNull(reviewReason)) {
            return Optional.empty();
        }
        return Optional.of(WineSubmissionSystemReason.fromStoredText(reviewReason));
    }

    public Double getReviewConfidence() {
        return reviewConfidence;
    }

    public UUID getMatchedWineId() {
        return matchedWineId;
    }

    public UUID getCreatedWineId() {
        return createdWineId;
    }

    public UUID getReviewedBy() {
        return reviewedBy;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public boolean isImageQuarantined() {
        return imageQuarantined;
    }

    @Override
    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public static final class Builder {
        private UUID id;
        private UUID submittedBy;
        private String wineName;
        private String wineryName;
        private String wineType;
        private Integer vintage;
        private List<String> grapes = List.of();
        private String country;
        private String region;
        private BigDecimal alcoholContent;
        private String notes;
        private WineSubmissionCatalogReferences catalogReferences;
        private WineSubmissionStatus status;
        private String imageUrl;
        private String reviewReason;
        private Double reviewConfidence;
        private UUID matchedWineId;
        private UUID createdWineId;
        private UUID reviewedBy;
        private Instant reviewedAt;
        private boolean imageQuarantined;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID value) {
            this.id = value;
            return this;
        }

        public Builder submittedBy(UUID value) {
            this.submittedBy = value;
            return this;
        }

        public Builder wineName(String value) {
            this.wineName = value;
            return this;
        }

        public Builder wineryName(String value) {
            this.wineryName = value;
            return this;
        }

        public Builder wineType(String value) {
            this.wineType = value;
            return this;
        }

        public Builder vintage(Integer value) {
            this.vintage = value;
            return this;
        }

        public Builder grapes(List<String> value) {
            this.grapes = value;
            return this;
        }

        public Builder country(String value) {
            this.country = value;
            return this;
        }

        public Builder region(String value) {
            this.region = value;
            return this;
        }

        public Builder alcoholContent(BigDecimal value) {
            this.alcoholContent = value;
            return this;
        }

        public Builder notes(String value) {
            this.notes = value;
            return this;
        }

        public Builder catalogReferences(WineSubmissionCatalogReferences value) {
            this.catalogReferences = value;
            return this;
        }

        public Builder status(WineSubmissionStatus value) {
            this.status = value;
            return this;
        }

        public Builder imageUrl(String value) {
            this.imageUrl = value;
            return this;
        }

        public Builder reviewReason(String value) {
            this.reviewReason = value;
            return this;
        }

        public Builder reviewConfidence(Double value) {
            this.reviewConfidence = value;
            return this;
        }

        public Builder matchedWineId(UUID value) {
            this.matchedWineId = value;
            return this;
        }

        public Builder createdWineId(UUID value) {
            this.createdWineId = value;
            return this;
        }

        public Builder reviewedBy(UUID value) {
            this.reviewedBy = value;
            return this;
        }

        public Builder reviewedAt(Instant value) {
            this.reviewedAt = value;
            return this;
        }

        public Builder imageQuarantined(boolean value) {
            this.imageQuarantined = value;
            return this;
        }

        public Builder createdAt(Instant value) {
            this.createdAt = value;
            return this;
        }

        public Builder updatedAt(Instant value) {
            this.updatedAt = value;
            return this;
        }

        public WineSubmission build() {
            return new WineSubmission(this);
        }
    }
}
