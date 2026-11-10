package com.vinnot.region.application.dto;

import com.vinnot.region.domain.model.Region;

import java.util.UUID;

/**
 * Response DTO for region data.
 *
 * @param id          the region ID
 * @param name        the region name
 * @param countryId   the country ID
 * @param countryCode the country code
 * @param countryName the country name
 */
public record RegionResponse(UUID id, String name, UUID countryId, String countryCode,
                             String countryName) {

    /**
     * Creates a RegionResponse from a domain model.
     *
     * @param region the domain model
     * @return the response DTO
     */
    public static RegionResponse fromDomain(Region region) {
        return new RegionResponse(
                region.getId(),
                region.getName(),
                region.getCountryId(),
                region.getCountryCode(),
                region.getCountryName()
        );
    }
}

