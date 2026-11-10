package com.vinnot.ai.application.dto;

import com.vinnot.ai.domain.model.DecantingAdvice;
import com.vinnot.ai.domain.model.ServingGlass;
import com.vinnot.ai.domain.model.ServingTemperatureRange;
import com.vinnot.ai.domain.model.WineColorTone;

import java.util.Map;
import java.util.Optional;

/** The serving art: the recommended glass, whether a decanter shows, and the thermometer range; null when unnamed. */
public record ProfileArtServing(String glass, boolean decant, ProfileArtTemperature temperature) {

    /** The glass comes from the glassware line; the wine's color gives the family when the line names none. */
    static ProfileArtServing from(Object servingRecommendations, Optional<WineColorTone> color) {
        if (!(servingRecommendations instanceof Map<?, ?> serving)) {
            return new ProfileArtServing(null, false, null);
        }
        Optional<ServingGlass> glass = ServingGlass.of(text(serving.get("glassware")).orElse(null), color.orElse(null));
        return new ProfileArtServing(
                glass.map(Enum::name).orElse(null),
                text(serving.get("decanting")).map(DecantingAdvice::recommends).orElse(false),
                text(serving.get("temperature")).flatMap(ServingTemperatureRange::fromDescription)
                        .map(range -> new ProfileArtTemperature(range.min(), range.max()))
                        .orElse(null));
    }

    private static Optional<String> text(Object value) {
        return value instanceof String text ? Optional.of(text) : Optional.empty();
    }
}
