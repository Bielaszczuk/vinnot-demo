package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.model.WineColorEvidence;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.winery.domain.model.Winery;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Catalog facts sent to the AI provider for one wine, shared by the profile and comparison prompts
 * so both read the same distinguishing evidence in the same order. The Vinnot user rating is left out on
 * purpose (#496): a rating from a handful of users must not become the source of truth about a wine.
 */
final class WineCatalogFacts {

    static final int WINERY_PROFILE_MAX_CHARS = 400;

    /** One labelled fact; always-present labels may carry a blank value. */
    record Fact(String label, String value) {
        String render() {
            return label + ": " + value;
        }
    }

    private WineCatalogFacts() {
    }

    static List<Fact> of(Wine wine, Winery winery) {
        var taste = wine.getTasteProfile();
        boolean hasWinery = Objects.nonNull(winery);
        return Stream.of(
                new Fact("Name", String.valueOf(wine.getName())),
                new Fact("Type", Objects.nonNull(wine.getWineType())
                        ? wine.getWineType().name().toLowerCase(Locale.ROOT) : ""),
                Objects.nonNull(wine.getVintage()) ? new Fact("Vintage", String.valueOf(wine.getVintage())) : null,
                new Fact("Winery", hasWinery ? String.valueOf(winery.getName()) : ""),
                new Fact("Region", firstPresent(wine.getRegionName(), hasWinery ? winery.getRegionName() : null)),
                new Fact("Country", firstPresent(wine.getCountryName(), hasWinery ? winery.getCountryName() : null)),
                stripped("Winery subregion", hasWinery ? winery.getSubregion() : null),
                hasWinery && Objects.nonNull(winery.getEstablishedYear())
                        ? new Fact("Winery founded", String.valueOf(winery.getEstablishedYear())) : null,
                stripped("Winery profile", hasWinery
                        ? truncate(firstPresent(winery.getDescriptionEs(), winery.getDescriptionEn())) : null),
                stripped("Style", wine.getStyle()),
                Objects.nonNull(wine.getDescriptionEs()) ? new Fact("Description (es)", wine.getDescriptionEs()) : null,
                Objects.nonNull(wine.getDescriptionEn()) ? new Fact("Description (en)", wine.getDescriptionEn()) : null,
                Objects.nonNull(wine.getGrapes()) && !wine.getGrapes().isEmpty()
                        ? new Fact("Grapes", String.join(", ", wine.getGrapes())) : null,
                Objects.nonNull(wine.getAlcoholContent()) ? new Fact("Alcohol", wine.getAlcoholContent() + "%") : null,
                priceRange(wine),
                servingTemperature(wine),
                Boolean.TRUE.equals(wine.isNatural()) ? new Fact("Natural wine", "yes") : null,
                stripped("Known food pairings", wine.getFoodPairing()),
                Objects.nonNull(taste) ? score("Acidity score", taste.getAcidity()) : null,
                Objects.nonNull(taste) ? score("Tannin score", taste.getTannin()) : null,
                Objects.nonNull(taste) ? score("Body score", taste.getBody()) : null,
                Objects.nonNull(taste) ? score("Sweetness score", taste.getSweetness()) : null
        ).filter(Objects::nonNull).toList();
    }

    /** The facts a wine's color depends on, with the same region and country fallbacks as the catalog facts. */
    static WineColorEvidence.Facts colorFacts(Wine wine, Winery winery) {
        boolean hasWinery = Objects.nonNull(winery);
        return new WineColorEvidence.Facts(wine.getName(), wine.getStyle(),
                Objects.nonNull(wine.getWineType()) ? wine.getWineType().name() : null, wine.getGrapes(),
                firstPresent(wine.getRegionName(), hasWinery ? winery.getRegionName() : null),
                hasWinery ? winery.getSubregion() : null,
                firstPresent(wine.getCountryName(), hasWinery ? winery.getCountryName() : null),
                wine.getVintage(),
                Objects.nonNull(wine.getTasteProfile()) ? wine.getTasteProfile().getSweetness() : null);
    }

    /** True when the catalog holds a price, the only evidence a value note may rely on. */
    static boolean hasCatalogPrice(Wine wine) {
        return Objects.nonNull(wine.getPriceRange()) && Objects.nonNull(wine.getPriceRange().getMinPrice());
    }

    private static String firstPresent(String preferred, String fallback) {
        if (Objects.nonNull(preferred) && !preferred.isBlank()) {
            return preferred;
        }
        return Objects.nonNull(fallback) ? fallback : "";
    }

    private static Fact stripped(String label, String value) {
        return Objects.nonNull(value) && !value.isBlank() ? new Fact(label, value.strip()) : null;
    }

    private static Fact score(String label, Integer value) {
        return Objects.nonNull(value) ? new Fact(label, value + "/100") : null;
    }

    private static String truncate(String value) {
        String text = value.strip();
        return text.length() > WINERY_PROFILE_MAX_CHARS
                ? text.substring(0, WINERY_PROFILE_MAX_CHARS) + "…" : text;
    }

    private static Fact priceRange(Wine wine) {
        if (!hasCatalogPrice(wine)) {
            return null;
        }
        var price = wine.getPriceRange();
        return new Fact("Catalog price range", price.getMinPrice().stripTrailingZeros().toPlainString()
                + (Objects.nonNull(price.getMaxPrice())
                        ? "-" + price.getMaxPrice().stripTrailingZeros().toPlainString() : ""));
    }

    private static Fact servingTemperature(Wine wine) {
        var temperature = wine.getServingTemperature();
        if (Objects.isNull(temperature) || Objects.isNull(temperature.getMinTemp())
                || Objects.isNull(temperature.getMaxTemp())) {
            return null;
        }
        return new Fact("Catalog serving temperature",
                temperature.getMinTemp() + "-" + temperature.getMaxTemp() + " °C");
    }
}
