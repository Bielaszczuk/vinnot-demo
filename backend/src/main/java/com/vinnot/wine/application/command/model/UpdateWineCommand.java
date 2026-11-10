package com.vinnot.wine.application.command.model;

import com.vinnot.shared.application.command.Command;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.Set;

/**
 * Command to update an existing wine.
 *
 * @param wineId         the wine ID to update
 * @param name           the wine name
 * @param wineryId       the winery ID
 * @param wineType       the wine type
 * @param vintage        the vintage year
 * @param style          the wine style
 * @param grapes         the grape varieties
 * @param allergens      the allergens
 * @param descriptionEs  Spanish description
 * @param descriptionEn  English description
 * @param alcoholContent alcohol percentage
 * @param servingTempMin minimum serving temperature
 * @param servingTempMax maximum serving temperature
 * @param priceMin       minimum price
 * @param priceMax       maximum price
 * @param imageUrl       the image URL
 * @param isFeatured     whether featured
 * @param isActive       whether active
 * @param acidityScore   acidity score
 * @param tanninScore    tannin score
 * @param bodyScore      body score
 * @param sweetnessScore sweetness score
 */
public record UpdateWineCommand(
        UUID wineId,
        String name,
        UUID wineryId,
        String wineType,
        Integer vintage,
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
        Boolean isFeatured,
        Boolean isActive,
        Integer acidityScore,
        Integer tanninScore,
        Integer bodyScore,
        Integer sweetnessScore,
        Set<String> clearFields
) implements Command<Void> {
    public UpdateWineCommand(UUID wineId,
            String name,
            UUID wineryId,
            String wineType,
            Integer vintage,
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
            Boolean isFeatured,
            Boolean isActive,
            Integer acidityScore,
            Integer tanninScore,
            Integer bodyScore,
            Integer sweetnessScore) {
        this(wineId,
                name,
                wineryId,
                wineType,
                vintage,
                style,
                grapes,
                allergens,
                descriptionEs,
                descriptionEn,
                alcoholContent,
                servingTempMin,
                servingTempMax,
                priceMin,
                priceMax,
                imageUrl,
                isFeatured,
                isActive,
                acidityScore,
                tanninScore,
                bodyScore,
                sweetnessScore,
                Set.of());
    }


    /**
     * Backwards-compatible constructor without wineryId, wineType, isFeatured, isActive, scores.
     */
    public UpdateWineCommand(UUID wineId, String name, Integer vintage, String style,
                               List<String> grapes, List<String> allergens,
                               String descriptionEs, String descriptionEn,
                               BigDecimal alcoholContent, Integer servingTempMin,
                               Integer servingTempMax, BigDecimal priceMin,
                               BigDecimal priceMax, String imageUrl) {
        this(wineId, name, null, null, vintage, style, grapes, allergens,
                descriptionEs, descriptionEn, alcoholContent, servingTempMin,
                servingTempMax, priceMin, priceMax, imageUrl, null, null,
                null, null, null, null);
    }

    /**
     * Backwards-compatible constructor without score fields.
     */
    public UpdateWineCommand(UUID wineId, String name, UUID wineryId, String wineType,
                               Integer vintage, String style,
                               List<String> grapes, List<String> allergens,
                               String descriptionEs, String descriptionEn,
                               BigDecimal alcoholContent, Integer servingTempMin,
                               Integer servingTempMax, BigDecimal priceMin,
                               BigDecimal priceMax, String imageUrl,
                               Boolean isFeatured, Boolean isActive) {
        this(wineId, name, wineryId, wineType, vintage, style, grapes, allergens,
                descriptionEs, descriptionEn, alcoholContent, servingTempMin,
                servingTempMax, priceMin, priceMax, imageUrl, isFeatured, isActive,
                null, null, null, null);
    }
}
