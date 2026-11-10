package com.vinnot.wine.domain.model;

import com.vinnot.shared.domain.base.AggregateRoot;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wine.domain.valueobject.PriceRange;
import com.vinnot.wine.domain.valueobject.Rating;
import com.vinnot.wine.domain.valueobject.ServingTemperature;
import com.vinnot.wine.domain.valueobject.TasteProfile;
import com.vinnot.wine.domain.valueobject.WineType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public class Wine extends AggregateRoot<UUID> {

    private final UUID id;
    private final long revision;
    private UUID wineryId;
    private String name;
    private Integer vintage;
    private WineType wineType;
    private String style;
    private List<String> grapes;
    private List<String> allergens;
    private String descriptionEs;
    private String descriptionEn;
    private BigDecimal alcoholContent;
    private ServingTemperature servingTemperature;
    private PriceRange priceRange;
    private String imageUrl;
    private Rating rating;
    private boolean featured;
    private boolean active;
    private UUID createdBy;
    private Instant createdAt;
    private Instant updatedAt;
    private UUID regionId;
    private String regionName;
    private UUID countryId;
    private String countryCode;
    private String countryName;
    private Boolean natural;
    private Integer labelsCount;
    private Integer vintagesCount;
    private Integer bestVintageYear;
    private BigDecimal bestVintageRating;
    private String bottleImageUrl;
    private String externalUrl;
    private String foodPairing;
    private String seoName;
    // Sensory taste profile — grouped as value object
    private TasteProfile tasteProfile;

    private Wine(Builder builder) {
        this.id = builder.id;
        this.revision = builder.revision;
        this.wineryId = builder.wineryId;
        this.name = builder.name;
        this.vintage = builder.vintage;
        this.wineType = builder.wineType;
        this.style = builder.style;
        this.grapes = new ArrayList<>(builder.grapes);
        this.allergens = new ArrayList<>(builder.allergens);
        this.descriptionEs = builder.descriptionEs;
        this.descriptionEn = builder.descriptionEn;
        this.alcoholContent = builder.alcoholContent;
        this.servingTemperature = builder.servingTemperature;
        this.priceRange = builder.priceRange;
        this.imageUrl = builder.imageUrl;
        this.rating = builder.rating;
        this.featured = builder.featured;
        this.active = builder.active;
        this.createdBy = builder.createdBy;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
        this.regionId = builder.regionId;
        this.regionName = builder.regionName;
        this.countryId = builder.countryId;
        this.countryCode = builder.countryCode;
        this.countryName = builder.countryName;
        this.natural = builder.natural;
        this.labelsCount = builder.labelsCount;
        this.vintagesCount = builder.vintagesCount;
        this.bestVintageYear = builder.bestVintageYear;
        this.bestVintageRating = builder.bestVintageRating;
        this.bottleImageUrl = builder.bottleImageUrl;
        this.externalUrl = builder.externalUrl;
        this.foodPairing = builder.foodPairing;
        this.seoName = builder.seoName;
        this.tasteProfile = builder.tasteProfile;
    }

    /**
     * Factory method to create a new Wine.
     *
     * @param name      the wine name
     * @param wineryId  the winery ID
     * @param wineType  the type of wine
     * @param createdBy the user creating the wine
     * @return the created Wine
     */
    public static Wine create(String name, UUID wineryId, WineType wineType, UUID createdBy) {
        Objects.requireNonNull(name, "Wine name cannot be null");
        Objects.requireNonNull(wineType, "Wine type cannot be null");

        if (name.isBlank()) {
            throw new DomainException("INVALID_WINE_NAME", "Wine name cannot be empty");
        }

        Instant now = Instant.now();
        return builder()
                .id(UUID.randomUUID())
                .name(name.trim())
                .wineryId(wineryId)
                .wineType(wineType)
                .rating(Rating.initial())
                .featured(false)
                .active(true)
                .createdBy(createdBy)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    /**
     * Creates a builder for Wine.
     *
     * @return a new Builder instance
     */
    public static Builder builder() {
        return new Builder();
    }

    @Override
    public UUID getId() {
        return id;
    }

    /**
     * Gets the winery ID.
     *
     * @return the winery ID
     */
    public UUID getWineryId() {
        return wineryId;
    }

    /**
     * Gets the wine name.
     *
     * @return the name
     */
    public String getName() {
        return name;
    }

    /**
     * Gets the vintage year.
     *
     * @return the vintage year
     */
    public Integer getVintage() {
        return vintage;
    }

    /**
     * Gets the wine type.
     *
     * @return the wine type
     */
    public WineType getWineType() {
        return wineType;
    }

    /**
     * Gets the wine style.
     *
     * @return the style
     */
    public String getStyle() {
        return style;
    }

    /**
     * Gets the grape varieties.
     *
     * @return unmodifiable list of grapes
     */
    public List<String> getGrapes() {
        return Collections.unmodifiableList(grapes);
    }

    /**
     * Gets the allergens.
     *
     * @return unmodifiable list of allergens
     */
    public List<String> getAllergens() {
        return Collections.unmodifiableList(allergens);
    }

    /**
     * Gets the Spanish description.
     *
     * @return the description in Spanish
     */
    public String getDescriptionEs() {
        return descriptionEs;
    }

    /**
     * Gets the English description.
     *
     * @return the description in English
     */
    public String getDescriptionEn() {
        return descriptionEn;
    }

    /**
     * Gets the alcohol content.
     *
     * @return the alcohol percentage
     */
    public BigDecimal getAlcoholContent() {
        return alcoholContent;
    }

    /**
     * Gets the serving temperature.
     *
     * @return the serving temperature range
     */
    public ServingTemperature getServingTemperature() {
        return servingTemperature;
    }

    /**
     * Gets the price range.
     *
     * @return the price range
     */
    public PriceRange getPriceRange() {
        return priceRange;
    }

    /**
     * Gets the image URL.
     *
     * @return the image URL
     */
    public String getImageUrl() {
        return imageUrl;
    }

    /**
     * Gets the rating.
     *
     * @return the rating
     */
    public Rating getRating() {
        return rating;
    }

    /**
     * Checks if the wine is featured.
     *
     * @return true if featured
     */
    public boolean isFeatured() {
        return featured;
    }

    /**
     * Checks if the wine is active.
     *
     * @return true if active
     */
    public boolean isActive() {
        return active;
    }

    /**
     * Gets the creator user ID.
     *
     * @return the creator ID
     */
    public UUID getCreatedBy() {
        return createdBy;
    }

    @Override
    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public UUID getRegionId() {
        return regionId;
    }

    public String getRegionName() {
        return regionName;
    }

    public UUID getCountryId() {
        return countryId;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public String getCountryName() {
        return countryName;
    }

    public Boolean isNatural() {
        return natural;
    }

    public Integer getLabelsCount() {
        return labelsCount;
    }

    public Integer getVintagesCount() {
        return vintagesCount;
    }

    public Integer getBestVintageYear() {
        return bestVintageYear;
    }

    public BigDecimal getBestVintageRating() {
        return bestVintageRating;
    }

    public String getBottleImageUrl() {
        return bottleImageUrl;
    }

    public String getExternalUrl() {
        return externalUrl;
    }

    public String getFoodPairing() {
        return foodPairing;
    }

    public String getSeoName() {
        return seoName;
    }

    public TasteProfile getTasteProfile() {
        return tasteProfile;
    }

    // -------------------------------------------------------------------------
    // Domain behaviour
    // -------------------------------------------------------------------------

    /**
     * Updates the wine details.
     *
     * @param name        the new name
     * @param vintage     the new vintage
     * @param style       the new style
     * @param description the new description in Spanish
     */
    public void updateBasicInfo(String name, Integer vintage, String style, String description) {
        if (Objects.nonNull(name) && !name.isBlank()) {
            this.name = name.trim();
        }
        this.vintage = vintage;
        this.style = style;
        this.descriptionEs = description;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the serving information.
     *
     * @param alcoholContent     the alcohol content
     * @param servingTemperature the serving temperature range
     * @param priceRange         the price range
     */
    public void updateServingInfo(BigDecimal alcoholContent, ServingTemperature servingTemperature,
                                  PriceRange priceRange) {
        this.alcoholContent = alcoholContent;
        this.servingTemperature = servingTemperature;
        this.priceRange = priceRange;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the grapes list.
     *
     * @param grapes the new list of grapes
     */
    public void updateGrapes(List<String> grapes) {
        this.grapes = Objects.nonNull(grapes) ? new ArrayList<>(grapes) : new ArrayList<>();
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the allergens list.
     *
     * @param allergens the new list of allergens
     */
    public void updateAllergens(List<String> allergens) {
        this.allergens = Objects.nonNull(allergens) ? new ArrayList<>(allergens) : new ArrayList<>();
        this.updatedAt = Instant.now();
    }

    /**
     * Updates descriptions.
     *
     * @param descriptionEs the Spanish description
     * @param descriptionEn the English description
     */
    public void replaceDescriptions(String descriptionEs, String descriptionEn) {
        this.descriptionEs = descriptionEs;
        this.descriptionEn = descriptionEn;
        this.updatedAt = Instant.now();
    }

    public void updateDescriptions(String descriptionEs, String descriptionEn) {
        if (Objects.nonNull(descriptionEs) && !descriptionEs.isBlank()) {
            this.descriptionEs = descriptionEs;
        }
        if (Objects.nonNull(descriptionEn) && !descriptionEn.isBlank()) {
            this.descriptionEn = descriptionEn;
        }
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the image URL.
     *
     * @param imageUrl the new image URL
     */
    public void updateImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the rating.
     *
     * @param rating the new rating
     */
    public void updateRating(Rating rating) {
        this.rating = Objects.requireNonNull(rating, "Rating cannot be null");
        this.updatedAt = Instant.now();
    }

    /**
     * Toggles the featured status.
     */
    public void toggleFeatured() {
        this.featured = !this.featured;
        this.updatedAt = Instant.now();
    }

    /**
     * Toggles the active status.
     */
    public void toggleActive() {
        this.active = !this.active;
        this.updatedAt = Instant.now();
    }

    /**
     * Activates the wine.
     */
    public void activate() {
        this.active = true;
        this.updatedAt = Instant.now();
    }

    /**
     * Deactivates the wine.
     */
    public void deactivate() {
        this.active = false;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the food pairing.
     *
     * @param foodPairing the food pairing description
     */
    public void updateFoodPairing(String foodPairing) {
        this.foodPairing = foodPairing;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the sensory taste profile.
     * Accepts individual scores for backward compatibility with existing command handlers.
     */
    public void updateTasteProfile(Integer acidity, Integer tannin, Integer body, Integer sweetness) {
        this.tasteProfile = TasteProfile.of(acidity, tannin, body, sweetness);
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the winery association.
     *
     * @param wineryId the new winery ID
     */
    public void updateWineryId(UUID wineryId) {
        this.wineryId = Objects.requireNonNull(wineryId, "Winery ID cannot be null");
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the wine type.
     *
     * @param wineType the new wine type
     */
    public void updateWineType(WineType wineType) {
        this.wineType = Objects.requireNonNull(wineType, "Wine type cannot be null");
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the normalized catalog origin.
     *
     * @param countryId the required country identifier
     * @param regionId  the optional region identifier
     */
    public void updateOrigin(UUID countryId, UUID regionId) {
        this.countryId = Objects.requireNonNull(countryId, "Country ID cannot be null");
        this.regionId = regionId;
        this.updatedAt = Instant.now();
    }

    // -------------------------------------------------------------------------
    // Builder
    // -------------------------------------------------------------------------

    /**
     * Builder for Wine aggregate.
     */
    public long getRevision() { return revision; }

    public static class Builder {
        private long revision;

        public Builder revision(long value) {
            this.revision = value;
            return this;
        }
        private UUID id;
        private UUID wineryId;
        private String name;
        private Integer vintage;
        private WineType wineType;
        private String style;
        private List<String> grapes = new ArrayList<>();
        private List<String> allergens = new ArrayList<>();
        private String descriptionEs;
        private String descriptionEn;
        private BigDecimal alcoholContent;
        private ServingTemperature servingTemperature;
        private PriceRange priceRange;
        private String imageUrl;
        private Rating rating = Rating.initial();
        private boolean featured = false;
        private boolean active = true;
        private UUID createdBy;
        private Instant createdAt;
        private Instant updatedAt;
        private UUID regionId;
        private String regionName;
        private UUID countryId;
        private String countryCode;
        private String countryName;
        private Boolean natural = false;
        private Integer labelsCount;
        private Integer vintagesCount;
        private Integer bestVintageYear;
        private BigDecimal bestVintageRating;
        private String bottleImageUrl;
        private String externalUrl;
        private String foodPairing;
        private String seoName;
        private TasteProfile tasteProfile;

        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        public Builder wineryId(UUID wineryId) {
            this.wineryId = wineryId;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder vintage(Integer vintage) {
            this.vintage = vintage;
            return this;
        }

        public Builder wineType(WineType wineType) {
            this.wineType = wineType;
            return this;
        }

        public Builder style(String style) {
            this.style = style;
            return this;
        }

        public Builder grapes(List<String> grapes) {
            this.grapes = Objects.nonNull(grapes) ? new ArrayList<>(grapes) : new ArrayList<>();
            return this;
        }

        public Builder allergens(List<String> allergens) {
            this.allergens = Objects.nonNull(allergens) ? new ArrayList<>(allergens) : new ArrayList<>();
            return this;
        }

        public Builder descriptionEs(String descriptionEs) {
            this.descriptionEs = descriptionEs;
            return this;
        }

        public Builder descriptionEn(String descriptionEn) {
            this.descriptionEn = descriptionEn;
            return this;
        }

        public Builder alcoholContent(BigDecimal alcoholContent) {
            this.alcoholContent = alcoholContent;
            return this;
        }

        public Builder servingTemperature(ServingTemperature servingTemperature) {
            this.servingTemperature = servingTemperature;
            return this;
        }

        public Builder priceRange(PriceRange priceRange) {
            this.priceRange = priceRange;
            return this;
        }

        public Builder imageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
            return this;
        }

        public Builder rating(Rating rating) {
            this.rating = rating;
            return this;
        }

        public Builder featured(boolean featured) {
            this.featured = featured;
            return this;
        }

        public Builder active(boolean active) {
            this.active = active;
            return this;
        }

        public Builder createdBy(UUID createdBy) {
            this.createdBy = createdBy;
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

        public Builder regionId(UUID regionId) {
            this.regionId = regionId;
            return this;
        }

        public Builder regionName(String regionName) {
            this.regionName = regionName;
            return this;
        }

        public Builder countryId(UUID countryId) {
            this.countryId = countryId;
            return this;
        }

        public Builder countryCode(String countryCode) {
            this.countryCode = countryCode;
            return this;
        }

        public Builder countryName(String countryName) {
            this.countryName = countryName;
            return this;
        }

        public Builder natural(Boolean natural) {
            this.natural = natural;
            return this;
        }

        public Builder labelsCount(Integer labelsCount) {
            this.labelsCount = labelsCount;
            return this;
        }

        public Builder vintagesCount(Integer vintagesCount) {
            this.vintagesCount = vintagesCount;
            return this;
        }

        public Builder bestVintageYear(Integer bestVintageYear) {
            this.bestVintageYear = bestVintageYear;
            return this;
        }

        public Builder bestVintageRating(BigDecimal bestVintageRating) {
            this.bestVintageRating = bestVintageRating;
            return this;
        }

        public Builder bottleImageUrl(String bottleImageUrl) {
            this.bottleImageUrl = bottleImageUrl;
            return this;
        }

        public Builder externalUrl(String externalUrl) {
            this.externalUrl = externalUrl;
            return this;
        }

        public Builder foodPairing(String foodPairing) {
            this.foodPairing = foodPairing;
            return this;
        }

        public Builder seoName(String seoName) {
            this.seoName = seoName;
            return this;
        }

        public Builder tasteProfile(TasteProfile tasteProfile) {
            this.tasteProfile = tasteProfile;
            return this;
        }

        /**
         * Builds the Wine.
         *
         * @return the built Wine
         */
        public Wine build() {
            Objects.requireNonNull(id, "Wine id cannot be null");
            Objects.requireNonNull(name, "Wine name cannot be null");
            Objects.requireNonNull(wineType, "Wine type cannot be null");
            return new Wine(this);
        }
    }
}
