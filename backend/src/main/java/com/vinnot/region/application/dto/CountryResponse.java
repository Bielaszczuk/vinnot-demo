package com.vinnot.region.application.dto;

import com.vinnot.region.domain.model.Country;

import java.util.UUID;

/**
 * Response DTO for country data.
 *
 * @param id   the country ID
 * @param code the country code (e.g., "ar")
 * @param name the country name (e.g., "Argentina")
 */
public record CountryResponse(UUID id, String code, String name) {

    /**
     * Creates a CountryResponse from a domain model.
     *
     * @param country the domain model
     * @return the response DTO
     */
    public static CountryResponse fromDomain(Country country) {
        return new CountryResponse(country.getId(), country.getCode(), country.getName());
    }
}

