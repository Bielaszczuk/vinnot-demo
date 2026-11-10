package com.vinnot.wine.application.query.response;

import com.vinnot.wine.domain.model.ExtractedWineLabel;

import java.math.BigDecimal;
import java.util.List;

public record ExtractedWineLabelResponse(
        String wineryName,
        String wineName,
        String grapeVariety,
        Integer vintage,
        String wineType,
        String region,
        String country,
        BigDecimal alcoholContent,
        double confidence,
        String searchKeywords,
        String visualDescription,
        List<String> observedText
) {

    public static ExtractedWineLabelResponse fromDomain(ExtractedWineLabel label) {
        return new ExtractedWineLabelResponse(
                label.wineryName(),
                label.wineName(),
                label.grapeVariety(),
                label.vintage(),
                label.wineType(),
                label.region(),
                label.country(),
                label.alcoholContent(),
                label.extractionConfidence(),
                label.searchKeywords(),
                label.visualDescription(),
                label.observedText());
    }
}
