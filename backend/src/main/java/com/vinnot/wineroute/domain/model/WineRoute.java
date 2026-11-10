package com.vinnot.wineroute.domain.model;

import com.vinnot.shared.domain.base.AggregateRoot;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.wineroute.domain.valueobject.RouteDifficulty;
import com.vinnot.wineroute.domain.valueobject.RouteStatus;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * WineRoute aggregate root.
 * Represents a wine tourism route with multiple stops.
 */
public class WineRoute extends AggregateRoot<UUID> {

    private final UUID id;
    private String name;
    private String description;
    private String country;
    private String region;
    private String subregion;
    private Integer estimatedDurationMinutes;
    private Integer estimatedDays;
    private Double totalDistanceKm;
    private RouteDifficulty difficulty;
    private String imageUrl;
    private RouteStatus status;
    private List<String> recommendedWineTypes;
    private String mapEmbedUrl;
    private UUID createdBy;
    private List<RouteStop> stops;
    private Instant createdAt;
    private Instant updatedAt;

    private WineRoute(Builder builder) {
        this.id = builder.id;
        this.name = builder.name;
        this.description = builder.description;
        this.country = builder.country;
        this.region = builder.region;
        this.subregion = builder.subregion;
        this.estimatedDurationMinutes = builder.estimatedDurationMinutes;
        this.estimatedDays = builder.estimatedDays;
        this.totalDistanceKm = builder.totalDistanceKm;
        this.difficulty = builder.difficulty;
        this.imageUrl = builder.imageUrl;
        this.status = builder.status;
        this.recommendedWineTypes = new ArrayList<>(builder.recommendedWineTypes);
        this.mapEmbedUrl = builder.mapEmbedUrl;
        this.createdBy = builder.createdBy;
        this.stops = new ArrayList<>(builder.stops);
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    public static WineRoute create(String name, UUID createdBy) {
        Objects.requireNonNull(name, "Route name cannot be null");
        Objects.requireNonNull(createdBy, "Creator ID cannot be null");

        if (name.isBlank()) {
            throw new DomainException("INVALID_ROUTE_NAME", "Route name cannot be empty");
        }

        Instant now = Instant.now();
        return builder()
                .id(UUID.randomUUID())
                .name(name.trim())
                .status(RouteStatus.DRAFT)
                .createdBy(createdBy)
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

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getCountry() {
        return country;
    }

    public String getRegion() {
        return region;
    }

    public String getSubregion() {
        return subregion;
    }

    public Integer getEstimatedDurationMinutes() {
        return estimatedDurationMinutes;
    }

    public Integer getEstimatedDays() {
        return estimatedDays;
    }

    public Double getTotalDistanceKm() {
        return totalDistanceKm;
    }

    public RouteDifficulty getDifficulty() {
        return difficulty;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public RouteStatus getStatus() {
        return status;
    }

    public List<String> getRecommendedWineTypes() {
        return Collections.unmodifiableList(recommendedWineTypes);
    }

    public String getMapEmbedUrl() {
        return mapEmbedUrl;
    }

    public UUID getCreatedBy() {
        return createdBy;
    }

    public List<RouteStop> getStops() {
        return Collections.unmodifiableList(stops);
    }

    @Override
    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void updateBasicInfo(String name, String description, String country, String region, String subregion) {
        if (Objects.nonNull(name) && !name.isBlank()) {
            this.name = name.trim();
        }
        this.description = description;
        this.country = country;
        this.region = region;
        this.subregion = subregion;
        this.updatedAt = Instant.now();
    }

    public void updateRouteDetails(Integer durationMinutes, Integer days, Double distanceKm, RouteDifficulty difficulty) {
        this.estimatedDurationMinutes = durationMinutes;
        this.estimatedDays = days;
        this.totalDistanceKm = distanceKm;
        this.difficulty = difficulty;
        this.updatedAt = Instant.now();
    }

    public void updateImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
        this.updatedAt = Instant.now();
    }

    public void updateMapEmbedUrl(String mapEmbedUrl) {
        this.mapEmbedUrl = mapEmbedUrl;
        this.updatedAt = Instant.now();
    }

    public void updateRecommendedWineTypes(List<String> types) {
        this.recommendedWineTypes = Objects.nonNull(types) ? new ArrayList<>(types) : new ArrayList<>();
        this.updatedAt = Instant.now();
    }

    public void addStop(RouteStop stop) {
        Objects.requireNonNull(stop, "Stop cannot be null");
        this.stops.add(stop);
        this.updatedAt = Instant.now();
    }

    /**
     * Replaces all stops with the given list.
     *
     * @param newStops the new stops
     */
    public void replaceStops(List<RouteStop> newStops) {
        this.stops.clear();
        if (Objects.nonNull(newStops)) {
            this.stops.addAll(newStops);
        }
        this.updatedAt = Instant.now();
    }

    /**
     * Clears all stops.
     */
    public void clearStops() {
        this.stops.clear();
        this.updatedAt = Instant.now();
    }

    public void removeStop(UUID stopId) {
        this.stops.removeIf(stop -> stop.getId().equals(stopId));
        reorderStops();
        this.updatedAt = Instant.now();
    }

    public void reorderStops() {
        this.stops.sort(Comparator.comparingInt(RouteStop::getStopOrder));
        for (int index = 0; index < this.stops.size(); index++) {
            this.stops.get(index).updateStopOrder(index + 1);
        }
    }

    public void publish() {
        if (this.stops.isEmpty()) {
            throw new DomainException("CANNOT_PUBLISH", "Cannot publish a route without stops");
        }
        this.status = RouteStatus.PUBLISHED;
        this.updatedAt = Instant.now();
    }

    public void archive() {
        this.status = RouteStatus.ARCHIVED;
        this.updatedAt = Instant.now();
    }

    public void setToDraft() {
        this.status = RouteStatus.DRAFT;
        this.updatedAt = Instant.now();
    }

    public int getStopCount() {
        return this.stops.size();
    }

    public static class Builder {
        private UUID id;
        private String name;
        private String description;
        private String country;
        private String region;
        private String subregion;
        private Integer estimatedDurationMinutes;
        private Integer estimatedDays;
        private Double totalDistanceKm;
        private RouteDifficulty difficulty;
        private String imageUrl;
        private RouteStatus status = RouteStatus.DRAFT;
        private List<String> recommendedWineTypes = new ArrayList<>();
        private String mapEmbedUrl;
        private UUID createdBy;
        private List<RouteStop> stops = new ArrayList<>();
        private Instant createdAt;
        private Instant updatedAt;

        public Builder id(UUID id) {
            this.id = id;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder description(String description) {
            this.description = description;
            return this;
        }

        public Builder country(String country) {
            this.country = country;
            return this;
        }

        public Builder region(String region) {
            this.region = region;
            return this;
        }

        public Builder subregion(String subregion) {
            this.subregion = subregion;
            return this;
        }

        public Builder estimatedDurationMinutes(Integer estimatedDurationMinutes) {
            this.estimatedDurationMinutes = estimatedDurationMinutes;
            return this;
        }

        public Builder estimatedDays(Integer estimatedDays) {
            this.estimatedDays = estimatedDays;
            return this;
        }

        public Builder totalDistanceKm(Double totalDistanceKm) {
            this.totalDistanceKm = totalDistanceKm;
            return this;
        }

        public Builder difficulty(RouteDifficulty difficulty) {
            this.difficulty = difficulty;
            return this;
        }

        public Builder imageUrl(String imageUrl) {
            this.imageUrl = imageUrl;
            return this;
        }

        public Builder status(RouteStatus status) {
            this.status = status;
            return this;
        }

        public Builder recommendedWineTypes(List<String> recommendedWineTypes) {
            this.recommendedWineTypes = Objects.nonNull(recommendedWineTypes) ? recommendedWineTypes : new ArrayList<>();
            return this;
        }

        public Builder mapEmbedUrl(String mapEmbedUrl) {
            this.mapEmbedUrl = mapEmbedUrl;
            return this;
        }

        public Builder createdBy(UUID createdBy) {
            this.createdBy = createdBy;
            return this;
        }

        public Builder stops(List<RouteStop> stops) {
            this.stops = Objects.nonNull(stops) ? stops : new ArrayList<>();
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

        public WineRoute build() {
            Objects.requireNonNull(id, "Route id cannot be null");
            Objects.requireNonNull(name, "Route name cannot be null");
            Objects.requireNonNull(createdBy, "Creator ID cannot be null");
            return new WineRoute(this);
        }
    }
}

