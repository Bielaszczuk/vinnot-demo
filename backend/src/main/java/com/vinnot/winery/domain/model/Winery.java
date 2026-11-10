package com.vinnot.winery.domain.model;

import com.vinnot.shared.domain.base.AggregateRoot;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.winery.domain.valueobject.ContactInfo;
import com.vinnot.winery.domain.valueobject.Location;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Winery aggregate root.
 * Represents a wine producer/vineyard in the system.
 */
public class Winery extends AggregateRoot<UUID> {

    private final UUID id;
    private String name;
    private String slug;
    private String descriptionEs;
    private String descriptionEn;
    private String subregion;
    private Location location;
    private ContactInfo contactInfo;
    private String logoUrl;
    private String imageUrl;
    private Integer establishedYear;
    private String seoName;
    private String businessName;
    private Integer wineryStatus;
    private Boolean claimed;
    private UUID regionId;
    private UUID countryId;
    private String countryCode;
    private String countryName;
    private String regionName;
    private Integer ratingsCount;
    private BigDecimal ratingsAverage;
    private Integer winesCount;
    private Integer labelsCount;
    private String backgroundImageUrl;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;

    private Winery(Builder builder) {
        this.id = builder.id;
        this.name = builder.name;
        this.slug = builder.slug;
        this.descriptionEs = builder.descriptionEs;
        this.descriptionEn = builder.descriptionEn;
        this.subregion = builder.subregion;
        this.location = builder.location;
        this.contactInfo = builder.contactInfo;
        this.logoUrl = builder.logoUrl;
        this.imageUrl = builder.imageUrl;
        this.establishedYear = builder.establishedYear;
        this.seoName = builder.seoName;
        this.businessName = builder.businessName;
        this.wineryStatus = builder.wineryStatus;
        this.claimed = builder.claimed;
        this.regionId = builder.regionId;
        this.countryId = builder.countryId;
        this.countryCode = builder.countryCode;
        this.countryName = builder.countryName;
        this.regionName = builder.regionName;
        this.ratingsCount = builder.ratingsCount;
        this.ratingsAverage = builder.ratingsAverage;
        this.winesCount = builder.winesCount;
        this.labelsCount = builder.labelsCount;
        this.backgroundImageUrl = builder.backgroundImageUrl;
        this.active = builder.active;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    /**
     * Factory method to create a new Winery.
     *
     * @param name      the winery name
     * @param countryId the country ID
     * @return the created Winery
     */
    public static Winery create(String name, UUID countryId) {
        Objects.requireNonNull(name, "Winery name cannot be null");
        Objects.requireNonNull(countryId, "Country ID cannot be null");

        if (name.isBlank()) {
            throw new DomainException("INVALID_WINERY_NAME", "Winery name cannot be empty");
        }

        Instant now = Instant.now();
        String slug = generateSlug(name);

        return builder()
                .id(UUID.randomUUID())
                .name(name.trim())
                .slug(slug)
                .countryId(countryId)
                .active(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    private static String generateSlug(String name) {
        return name.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    /**
     * Creates a builder for Winery.
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
     * Gets the winery name.
     *
     * @return the name
     */
    public String getName() {
        return name;
    }

    /**
     * Gets the slug.
     *
     * @return the URL-friendly slug
     */
    public String getSlug() {
        return slug;
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
     * Gets the subregion.
     *
     * @return the subregion
     */
    public String getSubregion() {
        return subregion;
    }

    /**
     * Gets the location.
     *
     * @return the location with address and coordinates
     */
    public Location getLocation() {
        return location;
    }

    /**
     * Gets the contact information.
     *
     * @return the contact info
     */
    public ContactInfo getContactInfo() {
        return contactInfo;
    }

    /**
     * Gets the logo URL.
     *
     * @return the logo URL
     */
    public String getLogoUrl() {
        return logoUrl;
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
     * Gets the year the winery was established.
     *
     * @return the established year
     */
    public Integer getEstablishedYear() {
        return establishedYear;
    }

    /**
     * Checks if the winery is active.
     *
     * @return true if active
     */
    public boolean isActive() {
        return active;
    }

    @Override
    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public String getSeoName() {
        return seoName;
    }

    public String getBusinessName() {
        return businessName;
    }

    public Integer getWineryStatus() {
        return wineryStatus;
    }

    public Boolean getClaimed() {
        return claimed;
    }

    public UUID getRegionId() {
        return regionId;
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

    public String getRegionName() {
        return regionName;
    }

    public Integer getRatingsCount() {
        return ratingsCount;
    }

    public BigDecimal getRatingsAverage() {
        return ratingsAverage;
    }

    public Integer getWinesCount() {
        return winesCount;
    }

    public Integer getLabelsCount() {
        return labelsCount;
    }

    public String getBackgroundImageUrl() {
        return backgroundImageUrl;
    }

    /**
     * Updates the basic information.
     *
     * @param name        the new name
     * @param description the new description
     * @param countryId   the new country ID
     * @param regionId    the new region ID
     * @param subregion   the new subregion
     */
    public void updateBasicInfo(String name, String description,
                                UUID countryId, UUID regionId, String subregion) {
        if (Objects.nonNull(name) && !name.isBlank()) {
            this.name = name.trim();
            this.slug = generateSlug(name);
        }
        this.descriptionEs = description;
        this.countryId = Objects.requireNonNull(countryId, "Country ID cannot be null");
        this.regionId = regionId;
        this.subregion = subregion;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates localized descriptions without coupling the aggregate to transport DTOs.
     *
     * @param descriptionEs Spanish description
     * @param descriptionEn English description
     */
    public void updateDescriptions(String descriptionEs, String descriptionEn) {
        this.descriptionEs = descriptionEs;
        this.descriptionEn = descriptionEn;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the location.
     *
     * @param location the new location
     */
    public void updateLocation(Location location) {
        this.location = location;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the contact information.
     *
     * @param contactInfo the new contact info
     */
    public void updateContactInfo(ContactInfo contactInfo) {
        this.contactInfo = contactInfo;
        this.updatedAt = Instant.now();
    }

    /**
     * Updates the images.
     *
     * @param logoUrl  the new logo URL
     * @param imageUrl the new image URL
     */
    public void updateImages(String logoUrl, String imageUrl) {
        this.logoUrl = logoUrl;
        this.imageUrl = imageUrl;
        this.updatedAt = Instant.now();
    }

    /**
     * Sets the established year.
     *
     * @param year the year established
     */
    public void setEstablishedYear(Integer year) {
        this.establishedYear = year;
        this.updatedAt = Instant.now();
    }

    /**
     * Activates the winery.
     */
    public void activate() {
        this.active = true;
        this.updatedAt = Instant.now();
    }

    /**
     * Deactivates the winery.
     */
    public void deactivate() {
        this.active = false;
        this.updatedAt = Instant.now();
    }

    /**
     * Builder for Winery aggregate.
     */
    public static class Builder {
        private UUID id;
        private String name;
        private String slug;
        private String descriptionEs;
        private String descriptionEn;
        private String subregion;
        private Location location;
        private ContactInfo contactInfo;
        private String logoUrl;
        private String imageUrl;
        private Integer establishedYear;
        private String seoName;
        private String businessName;
        private Integer wineryStatus;
        private Boolean claimed;
        private UUID regionId;
        private UUID countryId;
        private String countryCode;
        private String countryName;
        private String regionName;
        private Integer ratingsCount;
        private BigDecimal ratingsAverage;
        private Integer winesCount;
        private Integer labelsCount;
        private String backgroundImageUrl;
        private boolean active = true;
        private Instant createdAt;
        private Instant updatedAt;

        /**
         * Sets the id.
         *
         * @param id the id
         * @return this builder
         */
        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        /**
         * Sets the name.
         *
         * @param name the name
         * @return this builder
         */
        public Builder name(String name) {
            this.name = name;
            return this;
        }

        /**
         * Sets the slug.
         *
         * @param slug the slug
         * @return this builder
         */
        public Builder slug(String slug) {
            this.slug = slug;
            return this;
        }

        /**
         * Sets the Spanish description.
         *
         * @param descriptionEs the Spanish description
         * @return this builder
         */
        public Builder descriptionEs(String descriptionEs) {
            this.descriptionEs = descriptionEs;
            return this;
        }

        /**
         * Sets the English description.
         *
         * @param descriptionEn the English description
         * @return this builder
         */
        public Builder descriptionEn(String descriptionEn) {
            this.descriptionEn = descriptionEn;
            return this;
        }


        /**
         * Sets the subregion.
         *
         * @param subregion the subregion
         * @return this builder
         */
        public Builder subregion(String subregion) {
            this.subregion = subregion;
            return this;
        }

        /**
         * Sets the location.
         *
         * @param location the location
         * @return this builder
         */
        public Builder location(Location location) {
            this.location = location;
            return this;
        }

        /**
         * Sets the contact info.
         *
         * @param contactInfo the contact info
         * @return this builder
         */
        public Builder contactInfo(ContactInfo contactInfo) {
            this.contactInfo = contactInfo;
            return this;
        }

        /**
         * Sets the logo URL.
         *
         * @param logoUrl the logo URL
         * @return this builder
         */
        public Builder logoUrl(String logoUrl) {
            this.logoUrl = logoUrl;
            return this;
        }

        /**
         * Sets the image URL.
         *
         * @param imageUrl the image URL
         * @return this builder
         */
        public Builder imageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
            return this;
        }

        /**
         * Sets the established year.
         *
         * @param establishedYear the year
         * @return this builder
         */
        public Builder establishedYear(Integer establishedYear) {
            this.establishedYear = establishedYear;
            return this;
        }

        /**
         * Sets the active status.
         *
         * @param active the active status
         * @return this builder
         */
        public Builder active(boolean active) {
            this.active = active;
            return this;
        }

        /**
         * Sets the creation timestamp.
         *
         * @param createdAt the creation timestamp
         * @return this builder
         */
        public Builder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        /**
         * Sets the update timestamp.
         *
         * @param updatedAt the update timestamp
         * @return this builder
         */
        public Builder updatedAt(Instant updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public Builder seoName(String seoName) {
            this.seoName = seoName;
            return this;
        }

        public Builder businessName(String businessName) {
            this.businessName = businessName;
            return this;
        }

        public Builder wineryStatus(Integer wineryStatus) {
            this.wineryStatus = wineryStatus;
            return this;
        }

        public Builder claimed(Boolean claimed) {
            this.claimed = claimed;
            return this;
        }

        public Builder regionId(UUID regionId) {
            this.regionId = regionId;
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

        public Builder regionName(String regionName) {
            this.regionName = regionName;
            return this;
        }

        public Builder ratingsCount(Integer ratingsCount) {
            this.ratingsCount = ratingsCount;
            return this;
        }

        public Builder ratingsAverage(BigDecimal ratingsAverage) {
            this.ratingsAverage = ratingsAverage;
            return this;
        }

        public Builder winesCount(Integer winesCount) {
            this.winesCount = winesCount;
            return this;
        }

        public Builder labelsCount(Integer labelsCount) {
            this.labelsCount = labelsCount;
            return this;
        }

        public Builder backgroundImageUrl(String backgroundImageUrl) {
            this.backgroundImageUrl = backgroundImageUrl;
            return this;
        }

        /**
         * Builds the Winery.
         *
         * @return the built Winery
         */
        public Winery build() {
            Objects.requireNonNull(id, "Winery id cannot be null");
            Objects.requireNonNull(name, "Winery name cannot be null");
            return new Winery(this);
        }
    }
}
