package com.vinnot.winery.application.command.model;

import com.vinnot.shared.application.command.Command;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.Set;

/**
 * Command to update an existing winery.
 *
 * @param wineryId        the winery ID to update
 * @param name            the winery name
 * @param descriptionEs   Spanish description
 * @param descriptionEn   English description
 * @param countryId       the country ID
 * @param regionId        the region ID
 * @param subregion       the subregion
 * @param address         physical address
 * @param latitude        latitude coordinate
 * @param longitude       longitude coordinate
 * @param email           contact email
 * @param phone           contact phone
 * @param website         website URL
 * @param logoUrl         logo URL
 * @param imageUrl        image URL
 * @param establishedYear year established
 */
public record UpdateWineryCommand(
        UUID wineryId,
        String name,
        String descriptionEs,
        String descriptionEn,
        UUID countryId,
        UUID regionId,
        String subregion,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        String email,
        String phone,
        String website,
        String logoUrl,
        String imageUrl,
        Integer establishedYear,
        Set<String> clearFields
) implements Command<Void> {
    public UpdateWineryCommand(UUID wineryId,
            String name,
            String descriptionEs,
            String descriptionEn,
            UUID countryId,
            UUID regionId,
            String subregion,
            String address,
            BigDecimal latitude,
            BigDecimal longitude,
            String email,
            String phone,
            String website,
            String logoUrl,
            String imageUrl,
            Integer establishedYear) {
        this(wineryId, name, descriptionEs, descriptionEn, countryId, regionId, subregion, address, latitude, longitude, email, phone, website, logoUrl, imageUrl, establishedYear, Set.of());
    }

}
