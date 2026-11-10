package com.vinnot.review.domain.model;

import com.vinnot.shared.domain.base.AggregateRoot;
import com.vinnot.shared.domain.exception.DomainException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.Year;
import java.util.Objects;
import java.util.UUID;

public class Review extends AggregateRoot<UUID> {

    private static final BigDecimal MIN_RATING = new BigDecimal("0.1");
    private static final BigDecimal MAX_RATING = new BigDecimal("5.0");
    private static final int MIN_VINTAGE = 1800;

    private final UUID id;
    private final UUID wineId;
    private final UUID userId;
    private BigDecimal rating;
    private String title;
    private String comment;
    private Integer vintage;
    private PublicationStatus publicationStatus;
    private boolean verified;
    private int helpfulCount;
    private int likesCount;
    private Instant createdAt;
    private Instant updatedAt;

    private Review(Builder builder) {
        this.id = builder.id;
        this.wineId = builder.wineId;
        this.userId = builder.userId;
        this.rating = builder.rating;
        this.title = builder.title;
        this.comment = builder.comment;
        this.vintage = builder.vintage;
        this.publicationStatus = builder.publicationStatus;
        this.verified = builder.verified;
        this.helpfulCount = builder.helpfulCount;
        this.likesCount = builder.likesCount;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    /**
     * Factory method to create a new Review.
     *
     * @param wineId the wine ID
     * @param userId the user ID
     * @param rating the rating (0.1 to 5.0, one decimal at most)
     * @return the created Review
     */
    public static Review create(UUID wineId, UUID userId, BigDecimal rating) {
        Objects.requireNonNull(wineId, "Wine ID cannot be null");
        Objects.requireNonNull(userId, "User ID cannot be null");
        Objects.requireNonNull(rating, "Rating cannot be null");

        validateRating(rating);

        Instant now = Instant.now();
        return builder()
                .id(UUID.randomUUID())
                .wineId(wineId)
                .userId(userId)
                .rating(rating)
                .publicationStatus(PublicationStatus.APPROVED)
                .verified(false)
                .helpfulCount(0)
                .likesCount(0)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    /** A rating goes from 0.1 to 5.0 in steps of 0.1 (#455); a whole number from an older app is still valid. */
    private static void validateRating(BigDecimal rating) {
        if (rating.compareTo(MIN_RATING) < 0 || rating.compareTo(MAX_RATING) > 0
                || rating.stripTrailingZeros().scale() > 1) {
            throw new DomainException("INVALID_RATING",
                    String.format("Rating must be between %s and %s with at most one decimal", MIN_RATING, MAX_RATING));
        }
    }

    public static Builder builder() {
        return new Builder();
    }

    @Override
    public UUID getId() {
        return id;
    }

    public UUID getWineId() {
        return wineId;
    }

    public UUID getUserId() {
        return userId;
    }

    public BigDecimal getRating() {
        return rating;
    }

    public String getTitle() {
        return title;
    }

    public String getComment() {
        return comment;
    }

    /**
     * The vintage the author tasted, independent from the catalog wine vintage.
     *
     * @return the tasted vintage, or {@code null} when the author did not set one
     */
    public Integer getVintage() {
        return vintage;
    }

    public PublicationStatus getPublicationStatus() {
        return publicationStatus;
    }

    public boolean isVerified() {
        return verified;
    }

    public int getHelpfulCount() {
        return helpfulCount;
    }

    public int getLikesCount() {
        return likesCount;
    }

    @Override
    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public Instant getUpdatedAt() {
        return updatedAt;
    }

    /**
     * Partially updates the review content: {@code null} keeps the current value.
     * An approved review stays published; an edited rejected or pending review
     * goes back to the moderation queue as PENDING instead of becoming public.
     *
     * @param rating  the new rating, or {@code null} to keep it
     * @param title   the new title, or {@code null} to keep it
     * @param comment the new comment, or {@code null} to keep it
     */
    public void updateContent(BigDecimal rating, String title, String comment) {
        if (Objects.nonNull(rating)) {
            validateRating(rating);
            this.rating = rating;
        }
        if (Objects.nonNull(title)) {
            this.title = title;
        }
        if (Objects.nonNull(comment)) {
            this.comment = comment;
        }
        if (this.publicationStatus != PublicationStatus.APPROVED) {
            this.publicationStatus = PublicationStatus.PENDING;
        }
        this.updatedAt = Instant.now();
    }

    /**
     * Sets the vintage the author tasted, or clears it with {@code null}. A vintage goes from 1800 to next year,
     * so a wine bottled early in the year after its harvest can still be recorded.
     *
     * @param vintage the tasted vintage, or {@code null} to clear it
     */
    public void updateVintage(Integer vintage) {
        if (Objects.nonNull(vintage)) {
            int latest = Year.now().getValue() + 1;
            if (vintage < MIN_VINTAGE || vintage > latest) {
                throw new DomainException("INVALID_VINTAGE",
                        String.format("Vintage must be between %d and %d", MIN_VINTAGE, latest));
            }
        }
        this.vintage = vintage;
        this.updatedAt = Instant.now();
    }

    public void verify() {
        this.verified = true;
        this.updatedAt = Instant.now();
    }

    public void incrementHelpfulCount() {
        this.helpfulCount++;
        this.updatedAt = Instant.now();
    }

    public void incrementLikesCount() {
        this.likesCount++;
        this.updatedAt = Instant.now();
    }

    public void decrementLikesCount() {
        if (this.likesCount > 0) {
            this.likesCount--;
            this.updatedAt = Instant.now();
        }
    }

    /**
     * Sets the likes count directly.
     *
     * @param count the new count
     */
    public void setLikesCount(int count) {
        this.likesCount = Math.max(0, count);
        this.updatedAt = Instant.now();
    }

    public static class Builder {
        private UUID id;
        private UUID wineId;
        private UUID userId;
        private BigDecimal rating;
        private String title;
        private String comment;
        private Integer vintage;
        private PublicationStatus publicationStatus = PublicationStatus.APPROVED;
        private boolean verified = false;
        private int helpfulCount = 0;
        private int likesCount = 0;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        public Builder wineId(UUID wineId) {
            this.wineId = wineId;
            return this;
        }

        public Builder userId(UUID userId) {
            this.userId = userId;
            return this;
        }

        public Builder rating(BigDecimal rating) {
            this.rating = rating;
            return this;
        }

        public Builder title(String title) {
            this.title = title;
            return this;
        }

        public Builder comment(String comment) {
            this.comment = comment;
            return this;
        }

        public Builder vintage(Integer vintage) {
            this.vintage = vintage;
            return this;
        }

        public Builder publicationStatus(PublicationStatus status) {
            this.publicationStatus = Objects.requireNonNull(status);
            return this;
        }

        public Builder verified(boolean verified) {
            this.verified = verified;
            return this;
        }

        public Builder helpfulCount(int helpfulCount) {
            this.helpfulCount = helpfulCount;
            return this;
        }

        public Builder likesCount(int likesCount) {
            this.likesCount = likesCount;
            return this;
        }

        public Builder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder updatedAt(Instant updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public Review build() {
            Objects.requireNonNull(id, "Review id cannot be null");
            Objects.requireNonNull(wineId, "Wine id cannot be null");
            Objects.requireNonNull(userId, "User id cannot be null");
            Objects.requireNonNull(rating, "Rating cannot be null");
            return new Review(this);
        }
    }
}
