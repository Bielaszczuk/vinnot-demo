package com.vinnot.wine.application.command.model;

import com.vinnot.shared.application.command.Command;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Command to create a new wine.
 *
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
 * @param createdBy      the creating user ID
 */
public record CreateWineCommand(
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
        boolean isFeatured,
        UUID createdBy,
        Boolean isActive,
        Integer acidityScore,
        Integer tanninScore,
        Integer bodyScore,
        Integer sweetnessScore
) implements Command<UUID> {
    public CreateWineCommand(
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
            boolean isFeatured,
            UUID createdBy
    ) {
        this(name, wineryId, wineType, vintage, style, grapes, allergens, descriptionEs,
                descriptionEn, alcoholContent, servingTempMin, servingTempMax, priceMin, priceMax, imageUrl, isFeatured, createdBy,
                null, null, null, null, null);
    }
}
