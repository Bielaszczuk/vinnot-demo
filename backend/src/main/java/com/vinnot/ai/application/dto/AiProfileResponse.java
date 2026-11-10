package com.vinnot.ai.application.dto;

import com.vinnot.ai.domain.model.WineColorTone;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.UUID;

public record AiProfileResponse(
        UUID wineId,
        String language,
        Instant generatedAt,
        boolean cached,
        Map<String, Object> profileContent,
        String summary,
        Map<String, Object> visualAnalysis,
        String visualColorTone,
        String visualColorIntensity,
        String visualRimTone,
        boolean visualHighlights,
        List<String> visualReflectionTones,
        Map<String, Object> aromaticProfile,
        Map<String, Object> palateAnalysis,
        Map<String, Object> flavorProfile,
        Map<String, Object> foodPairings,
        Map<String, Object> servingRecommendations,
        ProfileArt profileArt,
        Map<String, Object> enrichedFields
) {

    @SuppressWarnings("unchecked")
    public static AiProfileResponse from(
            UUID wineId,
            String language,
            Map<String, Object> profileJson,
            Instant generatedAt,
            boolean cached) {
        return from(wineId, language, profileJson, generatedAt, cached, null);
    }

    @SuppressWarnings("unchecked")
    public static AiProfileResponse from(
            UUID wineId,
            String language,
            Map<String, Object> profileJson,
            Instant generatedAt,
            boolean cached,
            Map<String, Object> enrichedFields) {

        return new AiProfileResponse(
                wineId,
                language,
                generatedAt,
                cached,
                profileJson,
                (String) profileJson.get("summary"),
                (Map<String, Object>) profileJson.get("visualAnalysis"),
                toneOf(profileJson.get("visualAnalysis"), WineColorTone::fromDescription),
                toneOf(profileJson.get("visualAnalysis"), WineColorTone::intensityFromDescription),
                toneOf(profileJson.get("visualAnalysis"), WineColorTone::rimFromDescription),
                WineColorTone.namesHighlights(colorLine(profileJson.get("visualAnalysis"))),
                reflectionTones(colorLine(profileJson.get("visualAnalysis"))),
                (Map<String, Object>) profileJson.get("aromaticProfile"),
                (Map<String, Object>) profileJson.get("palateAnalysis"),
                (Map<String, Object>) profileJson.get("flavorProfile"),
                profileJson.get("foodPairings") instanceof Map<?, ?> pairings ? (Map<String, Object>) pairings : null,
                (Map<String, Object>) profileJson.get("servingRecommendations"),
                ProfileArt.from(profileJson),
                enrichedFields
        );
    }

    /** A tone of the visual color line (its main hue, its rim or its depth), or null when the line names none. */
    private static String toneOf(Object visualAnalysis, Function<String, Optional<? extends Enum<?>>> reader) {
        String color = colorLine(visualAnalysis);
        return Objects.isNull(color) ? null : reader.apply(color).map(Enum::name).orElse(null);
    }

    /** Every reflection tone the color line names, in its order; empty without a line. */
    private static List<String> reflectionTones(String color) {
        return WineColorTone.reflectionsFromDescription(color).stream().map(Enum::name).toList();
    }

    private static String colorLine(Object visualAnalysis) {
        return visualAnalysis instanceof Map<?, ?> visual && visual.get("color") instanceof String color ? color : null;
    }
}
