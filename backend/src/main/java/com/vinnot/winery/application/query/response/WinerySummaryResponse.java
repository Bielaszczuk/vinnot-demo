package com.vinnot.winery.application.query.response;

import com.vinnot.winery.domain.model.Winery;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

/**
 * Summary response for winery list views.
 *
 * @param id          the winery id
 * @param name        the winery name
 * @param slug        the URL slug
 * @param countryName the country name
 * @param regionName  the region name
 * @param logoUrl     the logo URL
 * @param imageUrl    the image URL
 * @param address     the address
 * @param latitude    the latitude coordinate
 * @param longitude   the longitude coordinate
 * @param winesCount  the active catalog wine count
 * @param establishedYear the founding year, or null when unknown
 */
public record WinerySummaryResponse(
        UUID id,
        String name,
        String slug,
        String countryName,
        String regionName,
        String logoUrl,
        String imageUrl,
        String address,
        BigDecimal latitude,
        BigDecimal longitude,
        int winesCount,
        Integer establishedYear
) {

    /**
     * Creates a WinerySummaryResponse from a Winery domain model.
     *
     * @param winery the domain model
     * @param winesCount the active catalog wine count
     * @return the response
     */
    public static WinerySummaryResponse fromDomain(Winery winery, int winesCount) {
        BigDecimal lat = null;
        BigDecimal lng = null;
        String address = null;
        if (Objects.nonNull(winery.getLocation())) {
            address = winery.getLocation().getAddress();
            if (winery.getLocation().hasCoordinates()) {
                lat = winery.getLocation().getCoordinates().getLatitude();
                lng = winery.getLocation().getCoordinates().getLongitude();
            }
        }
        return new WinerySummaryResponse(
                winery.getId(),
                winery.getName(),
                winery.getSlug(),
                winery.getCountryName(),
                winery.getRegionName(),
                winery.getLogoUrl(),
                winery.getImageUrl(),
                address,
                lat,
                lng,
                winesCount,
                winery.getEstablishedYear()
        );
    }
}

