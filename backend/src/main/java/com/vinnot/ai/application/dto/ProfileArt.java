package com.vinnot.ai.application.dto;

import com.vinnot.ai.domain.model.PairingDish;
import com.vinnot.ai.domain.model.SensoryNote;
import com.vinnot.ai.domain.model.WineColorTone;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

/**
 * The illustrations each profile section shows, derived on read from the stored profile and never persisted.
 * Each list keeps the source order, keeps only recognized descriptors and keeps the first descriptor per art key.
 */
public record ProfileArt(
        List<ProfileArtEntry> aromas,
        List<ProfileArtEntry> flavors,
        List<ProfileArtEntry> pairings,
        ProfileArtServing serving
) {

    public static ProfileArt from(Map<String, Object> profileJson) {
        Object aromatic = profileJson.get("aromaticProfile");
        Object flavor = profileJson.get("flavorProfile");
        return new ProfileArt(
                entries(texts(aromatic, "primaryAromas", "secondaryAromas"), SensoryNote::fromDescriptor),
                entries(texts(flavor, "primaryFlavors", "secondaryFlavors"), SensoryNote::fromDescriptor),
                entries(pairingTexts(profileJson.get("foodPairings")), PairingDish::fromDescription),
                ProfileArtServing.from(profileJson.get("servingRecommendations"),
                        colorTone(profileJson.get("visualAnalysis"))));
    }

    /** The string items of the named list fields of a section, in order; anything else is skipped. */
    private static List<String> texts(Object section, String... fields) {
        List<String> texts = new ArrayList<>();
        if (section instanceof Map<?, ?> values) {
            for (String field : fields) {
                texts.addAll(strings(values.get(field)));
            }
        }
        return texts;
    }

    /** Pairings are stored as a plain list or as {@code {pairings: [...]}}. */
    private static List<String> pairingTexts(Object foodPairings) {
        if (foodPairings instanceof Map<?, ?> values) {
            return strings(values.get("pairings"));
        }
        return strings(foodPairings);
    }

    private static List<String> strings(Object value) {
        if (!(value instanceof List<?> items)) {
            return List.of();
        }
        return items.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .toList();
    }

    private static <T extends Enum<T>> List<ProfileArtEntry> entries(
            List<String> labels, Function<String, Optional<T>> classifier) {
        Map<T, ProfileArtEntry> firstPerArt = new LinkedHashMap<>();
        for (String label : labels) {
            classifier.apply(label).ifPresent(art -> firstPerArt.putIfAbsent(art, new ProfileArtEntry(label, art.name())));
        }
        return List.copyOf(firstPerArt.values());
    }

    /** The main hue of the visual color line, if it names one. */
    private static Optional<WineColorTone> colorTone(Object visualAnalysis) {
        return visualAnalysis instanceof Map<?, ?> visual && visual.get("color") instanceof String color
                ? WineColorTone.fromDescription(color)
                : Optional.empty();
    }
}
