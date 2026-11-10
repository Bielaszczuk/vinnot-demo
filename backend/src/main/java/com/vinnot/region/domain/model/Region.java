package com.vinnot.region.domain.model;

import java.time.Instant;
import java.util.UUID;

public class Region {

    private final UUID id;
    private final String name;
    private final UUID countryId;
    private final String countryCode;
    private final String countryName;
    private final Instant createdAt;

    /**
     * Constructs a Region.
     *
     * @param id          the ID
     * @param name        the region name
     * @param countryId   the country ID
     * @param countryCode the country code
     * @param countryName the country name
     * @param createdAt   the creation timestamp
     */
    public Region(UUID id, String name, UUID countryId, String countryCode,
                  String countryName, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.countryId = countryId;
        this.countryCode = countryCode;
        this.countryName = countryName;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
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

    public Instant getCreatedAt() {
        return createdAt;
    }
}

