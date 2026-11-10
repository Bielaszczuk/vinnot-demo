package com.vinnot.winery.application.query.response;

import com.vinnot.winery.domain.model.Winery;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Detailed response for winery detail views.
 *
 * @param id              the winery id
 * @param name            the winery name
 * @param slug            the URL slug
 * @param descriptionEs   Spanish description
 * @param descriptionEn   English description
 * @param subregion       the subregion
 * @param address         the physical address
 * @param latitude        the latitude
 * @param longitude       the longitude
 * @param email           contact email
 * @param phone           contact phone
 * @param website         website URL
 * @param logoUrl         the logo URL
 * @param imageUrl        the image URL
 * @param establishedYear year established
 * @param seoName         the SEO name
 * @param businessName    the business name
 * @param regionId        the region ID
 * @param regionName      the region name
 * @param countryId       the country ID
 * @param countryCode     the country code
 * @param countryName     the country name
 * @param ratingsCount    number of ratings
 * @param ratingsAverage  average rating
 * @param winesCount      number of wines
 * @param labelsCount     number of labels
 * @param backgroundImageUrl the background image URL
 * @param isActive        whether active
 * @param createdAt       creation timestamp
 * @param updatedAt       update timestamp
 */
public record WineryDetailsResponse(
        UUID id,
        String name,
        String slug,
        String descriptionEs,
        String descriptionEn,
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
        String seoName,
        String businessName,
        UUID regionId,
        String regionName,
        UUID countryId,
        String countryCode,
        String countryName,
        Integer ratingsCount,
        BigDecimal ratingsAverage,
        Integer winesCount,
        Integer labelsCount,
        String backgroundImageUrl,
        boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {

    /**
     * Creates a WineryDetailsResponse from a Winery domain model.
     *
     * @param winery the domain model
     * @return the response
     */
    public static WineryDetailsResponse fromDomain(Winery winery) {
        return fromDomain(winery, winery.getWinesCount());
    }

    public static WineryDetailsResponse fromDomain(Winery winery, Integer winesCount) {
        String address = null;
        BigDecimal latitude = null;
        BigDecimal longitude = null;

        if (Objects.nonNull(winery.getLocation())) {
            address = winery.getLocation().getAddress();
            if (winery.getLocation().hasCoordinates()) {
                latitude = winery.getLocation().getCoordinates().getLatitude();
                longitude = winery.getLocation().getCoordinates().getLongitude();
            }
        }

        String email = null;
        String phone = null;
        String website = null;

        if (Objects.nonNull(winery.getContactInfo())) {
            email = winery.getContactInfo().getEmail();
            phone = winery.getContactInfo().getPhone();
            website = winery.getContactInfo().getWebsite();
        }

        return new WineryDetailsResponse(
                winery.getId(),
                winery.getName(),
                winery.getSlug(),
                winery.getDescriptionEs(),
                winery.getDescriptionEn(),
                winery.getSubregion(),
                address,
                latitude,
                longitude,
                email,
                phone,
                website,
                winery.getLogoUrl(),
                winery.getImageUrl(),
                winery.getEstablishedYear(),
                winery.getSeoName(),
                winery.getBusinessName(),
                winery.getRegionId(),
                winery.getRegionName(),
                winery.getCountryId(),
                winery.getCountryCode(),
                winery.getCountryName(),
                winery.getRatingsCount(),
                winery.getRatingsAverage(),
                winesCount,
                winery.getLabelsCount(),
                winery.getBackgroundImageUrl(),
                winery.isActive(),
                winery.getCreatedAt(),
                winery.getUpdatedAt()
        );
    }
}

