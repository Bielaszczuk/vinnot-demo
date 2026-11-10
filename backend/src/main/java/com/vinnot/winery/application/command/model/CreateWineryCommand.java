package com.vinnot.winery.application.command.model;

import com.vinnot.shared.application.command.Command;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Command to create a new winery.
 *
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
public record CreateWineryCommand(
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
        Integer establishedYear
) implements Command<UUID> {
}

