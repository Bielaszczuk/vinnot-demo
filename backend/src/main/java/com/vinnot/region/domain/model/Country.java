package com.vinnot.region.domain.model;

import java.time.Instant;
import java.util.UUID;

public class Country {

    private final UUID id;
    private final String code;
    private final String name;
    private final Instant createdAt;

    /**
     * Constructs a Country.
     *
     * @param id        the ID
     * @param code      the country code (e.g., "ar")
     * @param name      the country name (e.g., "Argentina")
     * @param createdAt the creation timestamp
     */
    public Country(UUID id, String code, String name, Instant createdAt) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}

