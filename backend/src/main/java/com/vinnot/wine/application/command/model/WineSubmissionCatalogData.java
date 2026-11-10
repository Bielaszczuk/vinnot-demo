package com.vinnot.wine.application.command.model;

import com.vinnot.wine.domain.model.WineSubmission;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Catalog fields reviewed before a submission is published or merged. */
public record WineSubmissionCatalogData(
        String wineName,
        String wineryName,
        String wineType,
        Integer vintage,
        List<String> grapes,
        String country,
        String region,
        BigDecimal alcoholContent,
        UUID wineryId,
        UUID countryId,
        UUID regionId
) {

    /** Reviewed text only, as an administrator's overrides arrive. */
    public WineSubmissionCatalogData(
            String wineName, String wineryName, String wineType, Integer vintage,
            List<String> grapes, String country, String region, BigDecimal alcoholContent) {
        this(wineName, wineryName, wineType, vintage, grapes, country, region, alcoholContent,
                null, null, null);
    }

    public static WineSubmissionCatalogData from(WineSubmission submission) {
        var references = submission.getCatalogReferences();
        return new WineSubmissionCatalogData(
                submission.getWineName(), submission.getWineryName(),
                submission.getWineType(), submission.getVintage(),
                submission.getGrapes(), submission.getCountry(),
                submission.getRegion(), submission.getAlcoholContent(),
                references.wineryId(), references.countryId(), references.regionId());
    }

    public WineSubmissionCatalogData overrideWith(WineSubmissionCatalogData override) {
        if (Objects.isNull(override)) {
            return this;
        }
        // A typed override replaces the catalog pick; a new country also invalidates the picked region.
        boolean wineryChanged = hasText(override.wineryName);
        boolean countryChanged = hasText(override.country);
        boolean regionChanged = countryChanged || hasText(override.region);
        return new WineSubmissionCatalogData(
                text(override.wineName, wineName),
                text(override.wineryName, wineryName),
                text(override.wineType, wineType),
                value(override.vintage, vintage),
                Objects.nonNull(override.grapes) && !override.grapes.isEmpty()
                        ? override.grapes : grapes,
                text(override.country, country),
                text(override.region, region),
                value(override.alcoholContent, alcoholContent),
                wineryChanged ? override.wineryId : wineryId,
                countryChanged ? override.countryId : countryId,
                regionChanged ? override.regionId : regionId);
    }

    private static String text(String preferred, String fallback) {
        return hasText(preferred) ? preferred.trim() : fallback;
    }

    private static <T> T value(T preferred, T fallback) {
        return Objects.nonNull(preferred) ? preferred : fallback;
    }

    private static boolean hasText(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }
}
