package com.vinnot.wine.domain.model;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

/**
 * Provider-independent information observed on a wine label.
 */
public record ExtractedWineLabel(
        String wineryName,
        String wineName,
        String grapeVariety,
        Integer vintage,
        String wineType,
        String region,
        String country,
        BigDecimal alcoholContent,
        double extractionConfidence,
        String searchKeywords,
        String visualDescription,
        boolean wineLabel,
        List<String> observedText,
        List<String> identitySymbols
) {

    public ExtractedWineLabel {
        extractionConfidence = Math.max(0.0, Math.min(1.0, extractionConfidence));
        observedText = Objects.nonNull(observedText) ? List.copyOf(observedText) : List.of();
        identitySymbols = Objects.nonNull(identitySymbols)
                ? List.copyOf(identitySymbols) : List.of();
    }

    public ExtractedWineLabel(
            String wineryName,
            String wineName,
            String grapeVariety,
            Integer vintage,
            String wineType,
            String region,
            String country,
            BigDecimal alcoholContent,
            double extractionConfidence,
            String searchKeywords,
            String visualDescription,
            boolean wineLabel,
            List<String> observedText) {
        this(wineryName, wineName, grapeVariety, vintage, wineType, region,
                country, alcoholContent, extractionConfidence, searchKeywords,
                visualDescription, wineLabel, observedText, List.of());
    }

    public static ExtractedWineLabel empty() {
        return new ExtractedWineLabel(
                null, null, null, null, null, null, null, null,
                0.0, null, null, false, List.of(), List.of());
    }
}
