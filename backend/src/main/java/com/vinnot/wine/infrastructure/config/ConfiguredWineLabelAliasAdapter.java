package com.vinnot.wine.infrastructure.config;

import com.vinnot.wine.application.port.out.WineLabelAliasPort;
import com.vinnot.wine.domain.model.WineLabelAliasCategory;
import com.vinnot.wine.domain.service.WineLabelIdentityNormalizer;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Objects;

@Component
public class ConfiguredWineLabelAliasAdapter implements WineLabelAliasPort {

    private final WineLabelAliasProperties properties;

    public ConfiguredWineLabelAliasAdapter(WineLabelAliasProperties properties) {
        this.properties = properties;
    }

    @Override
    public String canonicalize(WineLabelAliasCategory category, String value) {
        if (Objects.isNull(value) || value.isBlank()) {
            return value;
        }
        String normalized = WineLabelIdentityNormalizer.normalize(value);
        return aliases(category).entrySet().stream()
                .filter(entry -> WineLabelIdentityNormalizer.normalize(entry.getKey())
                        .equals(normalized))
                .map(Map.Entry::getValue)
                .filter(Objects::nonNull)
                .filter(canonical -> !canonical.isBlank())
                .findFirst()
                .orElse(value);
    }

    private Map<String, String> aliases(WineLabelAliasCategory category) {
        return switch (category) {
            case WINERY -> properties.getWineries();
            case GRAPE -> properties.getGrapes();
            case REGION -> properties.getRegions();
        };
    }
}
