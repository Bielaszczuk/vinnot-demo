package com.vinnot.cellar.domain.model;

import com.vinnot.shared.domain.base.AggregateRoot;
import com.vinnot.shared.domain.exception.DomainException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.Year;
import java.util.Objects;
import java.util.UUID;

public class CellarWine extends AggregateRoot<UUID> {

    private static final BigDecimal MIN_RATING = new BigDecimal("0.1");
    private static final BigDecimal MAX_RATING = new BigDecimal("5.0");
    private static final int MIN_VINTAGE = 1800;

    private final UUID id;
    private final UUID userId;
    private final UUID wineId;
    private BigDecimal rating;
    private BigDecimal purchasePrice;
    private String notes;
    private Integer vintage;
    private Instant createdAt;
    private Instant updatedAt;

    private CellarWine(Builder builder) {
        this.id = builder.id;
        this.userId = builder.userId;
        this.wineId = builder.wineId;
        this.rating = builder.rating;
        this.purchasePrice = builder.purchasePrice;
        this.notes = builder.notes;
        this.vintage = builder.vintage;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    /**
     * Creates a new cellar wine entry.
     *
     * @param userId the user ID
     * @param wineId the wine ID
     * @return new cellar wine
     */
    public static CellarWine create(UUID userId, UUID wineId) {
        Objects.requireNonNull(userId, "User ID cannot be null");
        Objects.requireNonNull(wineId, "Wine ID cannot be null");

        Instant now = Instant.now();
        return builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .wineId(wineId)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static Builder builder() {
        return new Builder();
    }

    @Override
    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getWineId() {
        return wineId;
    }

    public BigDecimal getRating() {
        return rating;
    }

    public BigDecimal getPurchasePrice() {
        return purchasePrice;
    }

    public String getNotes() {
        return notes;
    }

    /**
     * The vintage the user tasted, independent from the catalog wine vintage.
     *
     * @return the tasted vintage, or {@code null} when the user did not set one
     */
    public Integer getVintage() {
        return vintage;
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
     * Updates the personal rating: 0.1 to 5.0 with at most one decimal (#455), the same scale as a review. A whole
     * number from an older app is still valid.
     *
     * @param rating the new rating, nullable
     */
    public void updateRating(BigDecimal rating) {
        if (Objects.nonNull(rating) && (rating.compareTo(MIN_RATING) < 0 || rating.compareTo(MAX_RATING) > 0
                || rating.stripTrailingZeros().scale() > 1)) {
            throw new DomainException("INVALID_RATING", "Rating must be between 0.1 and 5.0 with at most one decimal");
        }
        this.rating = rating;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the purchase price.
     *
     * @param purchasePrice the price paid
     */
    public void updatePurchasePrice(BigDecimal purchasePrice) {
        this.purchasePrice = purchasePrice;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates personal notes.
     *
     * @param notes the notes
     */
    public void updateNotes(String notes) {
        this.notes = notes;
        this.updatedAt = Instant.now();
    }

    /**
     * Sets the vintage the user tasted, or clears it with {@code null}. A vintage goes from 1800 to next year,
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

    public static class Builder {
        private UUID id;
        private UUID userId;
        private UUID wineId;
        private BigDecimal rating;
        private BigDecimal purchasePrice;
        private String notes;
        private Integer vintage;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        public Builder userId(UUID userId) {
            this.userId = userId;
            return this;
        }

        public Builder wineId(UUID wineId) {
            this.wineId = wineId;
            return this;
        }

        public Builder rating(BigDecimal rating) {
            this.rating = rating;
            return this;
        }

        public Builder purchasePrice(BigDecimal purchasePrice) {
            this.purchasePrice = purchasePrice;
            return this;
        }

        public Builder notes(String notes) {
            this.notes = notes;
            return this;
        }

        public Builder vintage(Integer vintage) {
            this.vintage = vintage;
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

        /**
         * Builds the CellarWine instance.
         *
         * @return the cellar wine
         */
        public CellarWine build() {
            Objects.requireNonNull(id, "ID cannot be null");
            Objects.requireNonNull(userId, "User ID cannot be null");
            Objects.requireNonNull(wineId, "Wine ID cannot be null");
            return new CellarWine(this);
        }
    }
}
