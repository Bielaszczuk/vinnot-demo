package com.vinnot.wine.application.query.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.application.port.out.WineProfileOverviewPort;
import java.util.Map;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Detailed response model for wine detail views.
 *
 * @param id                 the wine id
 * @param name               the wine name
 * @param wineryId           the winery id
 * @param wineryName         the winery name
 * @param vintage            the vintage year
 * @param wineType           the wine type
 * @param style              the wine style
 * @param grapes             the grape varieties
 * @param allergens          the allergens
 * @param descriptionEs      the Spanish description
 * @param descriptionEn      the English description
 * @param alcoholContent     the alcohol percentage
 * @param servingTempMin     minimum serving temperature
 * @param servingTempMax     maximum serving temperature
 * @param priceMin           minimum price
 * @param priceMax           maximum price
 * @param imageUrl           the image URL
 * @param ratingAverage      the average rating
 * @param ratingCount        the number of ratings
 * @param isFeatured         whether featured
 * @param isActive           whether active
 * @param createdAt          creation timestamp
 * @param updatedAt          update timestamp
 */
public record WineDetailsResponse(
        UUID id,
        String name,
        UUID wineryId,
        String wineryName,
        String region,
        String country,
        Integer vintage,
        String wineType,
        String style,
        List<String> grapes,
        List<String> allergens,
        String descriptionEs,
        String descriptionEn,
        BigDecimal alcoholContent,
        Integer servingTempMin,
        Integer servingTempMax,
        BigDecimal priceMin,
        BigDecimal priceMax,
        String imageUrl,
        BigDecimal ratingAverage,
        int ratingCount,
        @JsonProperty("isFeatured") boolean isFeatured,
        @JsonProperty("isActive") boolean isActive,
        boolean inCellar,
        Boolean isNatural,
        String bottleImageUrl,
        String externalUrl,
        String foodPairing,
        String seoName,
        Integer bestVintageYear,
        BigDecimal bestVintageRating,
        UUID regionId,
        String regionName,
        UUID countryId,
        String countryName,
        Instant createdAt,
        Instant updatedAt,
        WineryInfo winery,
        Integer acidityScore,
        Integer tanninScore,
        Integer bodyScore,
        Integer sweetnessScore,
        Map<String, WineProfileOverviewPort.Overview> profileOverview
) {

    public record WineryInfo(
            UUID id,
            String name,
            String country,
            String region,
            String subregion,
            String description,
            String websiteUrl,
            String contactEmail,
            String contactPhone,
            String address,
            BigDecimal latitude,
            BigDecimal longitude,
            String logoUrl,
            Integer established
    ) {
    }

    /**
     * Creates a WineDetailsResponse from a Wine domain model.
     *
     * @param wine the domain model
     * @return the response DTO
     */
    public static WineDetailsResponse fromDomain(Wine wine) {
        return fromDomain(wine, null, null, null, false, null);
    }

    /**
     * Creates a WineDetailsResponse from a Wine domain model with winery name.
     *
     * @param wine       the domain model
     * @param wineryName the winery name
     * @return the response DTO
     */
    public static WineDetailsResponse fromDomain(Wine wine, String wineryName) {
        return fromDomain(wine, wineryName, null, null, false, null);
    }

    /**
     * Creates a WineDetailsResponse from a Wine domain model with cellar status.
     *
     * @param wine       the domain model
     * @param wineryName the winery name
     * @param inCellar   whether wine is in user's cellar
     * @return the response DTO
     */
    public static WineDetailsResponse fromDomain(Wine wine, String wineryName, boolean inCellar) {
        return fromDomain(wine, wineryName, null, null, inCellar, null);
    }

    /**
     * Creates a fully populated WineDetailsResponse.
     *
     * @param wine       the domain model
     * @param wineryName the winery name
     * @param region     the winery region
     * @param country    the winery country
     * @param inCellar   whether wine is in user's cellar
     * @param wineryInfo the nested winery info (nullable)
     * @return the response DTO
     */
    public static WineDetailsResponse fromDomain(Wine wine, String wineryName,
                                                    String region, String country,
                                                    boolean inCellar, WineryInfo wineryInfo) {
        return fromDomain(wine, wineryName, region, country, inCellar, wineryInfo, Map.of());
    }

    public static WineDetailsResponse fromDomain(Wine wine, String wineryName,
                                                 String region, String country,
                                                 boolean inCellar, WineryInfo wineryInfo,
                                                 Map<String, WineProfileOverviewPort.Overview> profileOverview) {
        return new WineDetailsResponse(
                wine.getId(),
                wine.getName(),
                wine.getWineryId(),
                wineryName,
                Objects.nonNull(wine.getRegionName()) ? wine.getRegionName() : region,
                Objects.nonNull(wine.getCountryName()) ? wine.getCountryName() : country,
                wine.getVintage(),
                wine.getWineType().name(),
                wine.getStyle(),
                wine.getGrapes(),
                wine.getAllergens(),
                wine.getDescriptionEs(),
                wine.getDescriptionEn(),
                wine.getAlcoholContent(),
                Objects.nonNull(wine.getServingTemperature()) ? wine.getServingTemperature().getMinTemp() : null,
                Objects.nonNull(wine.getServingTemperature()) ? wine.getServingTemperature().getMaxTemp() : null,
                Objects.nonNull(wine.getPriceRange()) ? wine.getPriceRange().getMinPrice() : null,
                Objects.nonNull(wine.getPriceRange()) ? wine.getPriceRange().getMaxPrice() : null,
                wine.getImageUrl(),
                wine.getRating().getAverage(),
                wine.getRating().getCount(),
                wine.isFeatured(),
                wine.isActive(),
                inCellar,
                wine.isNatural(),
                wine.getBottleImageUrl(),
                wine.getExternalUrl(),
                wine.getFoodPairing(),
                wine.getSeoName(),
                wine.getBestVintageYear(),
                wine.getBestVintageRating(),
                wine.getRegionId(),
                wine.getRegionName(),
                wine.getCountryId(),
                wine.getCountryName(),
                wine.getCreatedAt(),
                wine.getUpdatedAt(),
                wineryInfo,
                Objects.nonNull(wine.getTasteProfile()) ? wine.getTasteProfile().getAcidity() : null,
                Objects.nonNull(wine.getTasteProfile()) ? wine.getTasteProfile().getTannin() : null,
                Objects.nonNull(wine.getTasteProfile()) ? wine.getTasteProfile().getBody() : null,
                Objects.nonNull(wine.getTasteProfile()) ? wine.getTasteProfile().getSweetness() : null,
                profileOverview
        );
    }
}
