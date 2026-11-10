package com.vinnot.cellar.application.query.response;

import com.vinnot.cellar.domain.model.CellarWine;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CellarWineResponse(
        UUID id,
        UUID userId,
        UUID wineId,
        BigDecimal rating,
        BigDecimal purchasePrice,
        String notes,
        Integer vintage,
        Instant addedAt,
        Instant updatedAt,
        WineInfo wine,
        UUID reviewId
) {

    public record WineInfo(
            UUID id,
            String name,
            Integer vintage,
            String wineType,
            String style,
            List<String> grapes,
            String wineryName,
            String region,
            String country,
            BigDecimal priceMin,
            BigDecimal priceMax,
            String imageUrl,
            BigDecimal ratingAverage
    ) {
    }

    /**
     * Creates a CellarWineResponse from a domain model without wine info.
     *
     * @param cellarWine the domain model
     * @return the response
     */
    public static CellarWineResponse fromDomain(CellarWine cellarWine) {
        return fromDomain(cellarWine, null);
    }

    /**
     * Creates a CellarWineResponse from a domain model with wine info.
     *
     * @param cellarWine the domain model
     * @param wineInfo   the wine information (nullable)
     * @return the response
     */
    public static CellarWineResponse fromDomain(CellarWine cellarWine, WineInfo wineInfo) {
        return fromDomain(cellarWine, wineInfo, null);
    }

    public static CellarWineResponse fromDomain(CellarWine cellarWine, WineInfo wineInfo, UUID reviewId) {
        return new CellarWineResponse(
                cellarWine.getId(),
                cellarWine.getUserId(),
                cellarWine.getWineId(),
                cellarWine.getRating(),
                cellarWine.getPurchasePrice(),
                cellarWine.getNotes(),
                cellarWine.getVintage(),
                cellarWine.getCreatedAt(),
                cellarWine.getUpdatedAt(),
                wineInfo,
                reviewId
        );
    }
}

