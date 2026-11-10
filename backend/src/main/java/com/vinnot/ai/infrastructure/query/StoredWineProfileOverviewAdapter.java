package com.vinnot.ai.infrastructure.query;

import com.vinnot.ai.domain.repository.WineAiProfileRepository;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.wine.application.port.out.WineProfileOverviewPort;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** Exposes saved profile summaries through the wine module's read port, without invoking AI. */
@Component
public class StoredWineProfileOverviewAdapter implements WineProfileOverviewPort {
    private final WineAiProfileRepository profiles;

    public StoredWineProfileOverviewAdapter(WineAiProfileRepository profiles) {
        this.profiles = profiles;
    }

    @Override
    public Map<String, Overview> findByWineId(UUID wineId) {
        Map<String, Overview> result = new LinkedHashMap<>();
        for (AiContentLanguage language : AiContentLanguage.values()) {
            profiles.findByWineIdAndLanguage(wineId, language.code()).ifPresent(profile -> {
                Map<String, Object> content = profile.getProfileJson();
                if (Objects.isNull(content)) {
                    return;
                }
                Map<?, ?> palate = object(content.get("palateAnalysis"));
                Object pairings = object(content.get("foodPairings")).get("pairings");
                List<String> foods = pairings instanceof List<?> values
                        ? values.stream().filter(String.class::isInstance).map(String.class::cast)
                            .map(String::strip).filter(value -> !value.isEmpty()).toList() : List.of();
                result.put(language.code(), new Overview(
                        content.get("summary") instanceof String text ? text.strip() : null,
                        score(palate.get("acidityScore")), score(palate.get("tanninScore")),
                        score(palate.get("bodyScore")), score(palate.get("sweetnessScore")), foods));
            });
        }
        return Map.copyOf(result);
    }

    private Map<?, ?> object(Object value) {
        return value instanceof Map<?, ?> map ? map : Map.of();
    }

    private Integer score(Object value) {
        if (!(value instanceof Number number)) {
            return null;
        }
        double score = number.doubleValue();
        return Double.isFinite(score) && score >= 0 && score <= 100 ? (int) Math.round(score) : null;
    }
}
