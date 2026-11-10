package com.vinnot.wine.application.query.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.vinnot.wine.domain.model.Wine;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Summary response model for wine list views.
 *
 * @param id            the wine id
 * @param name          the wine name
 * @param wineryId      the winery id
 * @param wineryName    the winery name (to be populated)
 * @param vintage       the vintage year
 * @param wineType      the wine type
 * @param grapes        the grape varieties
 * @param imageUrl      the image URL
 * @param ratingAverage the average rating
 * @param ratingCount   the number of ratings
 * @param priceMin      the minimum price
 * @param priceMax      the maximum price
 * @param isFeatured    whether the wine is featured
 */
public record WineSummaryResponse(
        UUID id,
        String name,
        UUID wineryId,
        String wineryName,
        Integer vintage,
        String wineType,
        String style,
        List<String> grapes,
        String region,
        String country,
        String imageUrl,
        BigDecimal ratingAverage,
        int ratingCount,
        BigDecimal priceMin,
        BigDecimal priceMax,
        @JsonProperty("isFeatured") boolean isFeatured,
        @JsonProperty("isActive") boolean isActive,
        Boolean isNatural,
        String bottleImageUrl,
        String seoName
) {

    /**
     * Creates a WineSummaryResponse from a Wine domain model.
     *
     * @param wine the domain model
     * @return the response DTO
     */
    public static WineSummaryResponse fromDomain(Wine wine) {
        return fromDomain(wine, null, null, null);
    }

    /**
     * Creates a WineSummaryResponse from a Wine domain model with winery name.
     *
     * @param wine       the domain model
     * @param wineryName the winery name
     * @return the response DTO
     */
    public static WineSummaryResponse fromDomain(Wine wine, String wineryName) {
        return fromDomain(wine, wineryName, null, null);
    }

    /**
     * Creates a WineSummaryResponse with full winery context.
     *
     * @param wine       the domain model
     * @param wineryName the winery name
     * @param region     the winery region
     * @param country    the winery country
     * @return the response DTO
     */
    public static WineSummaryResponse fromDomain(Wine wine, String wineryName,
                                                   String region, String country) {
        return new WineSummaryResponse(
                wine.getId(),
                wine.getName(),
                wine.getWineryId(),
                wineryName,
                wine.getVintage(),
                wine.getWineType().name(),
                wine.getStyle(),
                wine.getGrapes(),
                Objects.nonNull(wine.getRegionName()) ? wine.getRegionName() : region,
                Objects.nonNull(wine.getCountryName()) ? wine.getCountryName() : country,
                wine.getImageUrl(),
                wine.getRating().getAverage(),
                wine.getRating().getCount(),
                Objects.nonNull(wine.getPriceRange()) ? wine.getPriceRange().getMinPrice() : null,
                Objects.nonNull(wine.getPriceRange()) ? wine.getPriceRange().getMaxPrice() : null,
                wine.isFeatured(),
                wine.isActive(),
                wine.isNatural(),
                wine.getBottleImageUrl(),
                wine.getSeoName()
        );
    }
}

