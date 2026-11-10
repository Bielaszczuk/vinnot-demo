package com.vinnot.wineroute.domain.model;

import com.vinnot.shared.domain.base.Entity;
import com.vinnot.shared.domain.valueobject.Coordinates;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

/**
 * Entity representing a stop on a wine route.
 */
public class RouteStop extends Entity<UUID> {

    private final UUID id;
    private String name;
    private String description;
    private String type;
    private String address;
    private Coordinates coordinates;
    private int stopOrder;
    private Integer estimatedDurationMinutes;

    private RouteStop(Builder builder) {
        this.id = builder.id;
        this.name = builder.name;
        this.description = builder.description;
        this.type = builder.type;
        this.address = builder.address;
        this.coordinates = builder.coordinates;
        this.stopOrder = builder.stopOrder;
        this.estimatedDurationMinutes = builder.estimatedDurationMinutes;
    }

    public static RouteStop create(String name, int stopOrder) {
        return builder()
                .id(UUID.randomUUID())
                .name(name)
                .stopOrder(stopOrder)
                .build();
    }

    /**
     * Creates a fully populated RouteStop.
     *
     * @param name                     the stop name
     * @param description              the description
     * @param type                     the stop type
     * @param address                  the address
     * @param latitude                 the latitude
     * @param longitude                the longitude
     * @param stopOrder                the order in the route
     * @param estimatedDurationMinutes the estimated duration
     * @return the created RouteStop
     */
    public static RouteStop create(String name, String description, String type,
                                    String address, BigDecimal latitude, BigDecimal longitude,
                                    int stopOrder, Integer estimatedDurationMinutes) {
        Coordinates coords = null;
        if (Objects.nonNull(latitude) && Objects.nonNull(longitude)) {
            coords = Coordinates.of(latitude, longitude);
        }
        return builder()
                .id(UUID.randomUUID())
                .name(name)
                .description(description)
                .type(type)
                .address(address)
                .coordinates(coords)
                .stopOrder(stopOrder)
                .estimatedDurationMinutes(estimatedDurationMinutes)
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

    public String getType() {
        return type;
    }

    public String getAddress() {
        return address;
    }

    public Coordinates getCoordinates() {
        return coordinates;
    }

    public int getStopOrder() {
        return stopOrder;
    }

    public Integer getEstimatedDurationMinutes() {
        return estimatedDurationMinutes;
    }


    public void updateDetails(String name, String description, String type, String address) {
        if (Objects.nonNull(name) && !name.isBlank()) {
            this.name = name;
        }
        this.description = description;
        this.type = type;
        this.address = address;
    }

    public void updateCoordinates(Coordinates coordinates) {
        this.coordinates = coordinates;
    }

    public void updateStopOrder(int order) {
        this.stopOrder = order;
    }

    public void updateDuration(Integer minutes) {
        this.estimatedDurationMinutes = minutes;
    }

    public static class Builder {
        private UUID id;
        private String name;
        private String description;
        private String type;
        private String address;
        private Coordinates coordinates;
        private int stopOrder;
        private Integer estimatedDurationMinutes;

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

        public Builder type(String type) {
            this.type = type;
            return this;
        }

        public Builder address(String address) {
            this.address = address;
            return this;
        }

        public Builder coordinates(Coordinates coordinates) {
            this.coordinates = coordinates;
            return this;
        }

        public Builder stopOrder(int stopOrder) {
            this.stopOrder = stopOrder;
            return this;
        }

        public Builder estimatedDurationMinutes(Integer estimatedDurationMinutes) {
            this.estimatedDurationMinutes = estimatedDurationMinutes;
            return this;
        }

        public RouteStop build() {
            Objects.requireNonNull(id, "Stop id cannot be null");
            Objects.requireNonNull(name, "Stop name cannot be null");
            return new RouteStop(this);
        }
    }
}

