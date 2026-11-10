package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.model.WineAiProfile;
import com.vinnot.ai.domain.repository.WineAiProfileRepository;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;

import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * A stored profile bundle is current only when every supported language exists and matches the
 * generation context fingerprint; manual profiles always match.
 */
final class AiProfileBundles {

    private AiProfileBundles() { }

    static Optional<Map<AiContentLanguage, WineAiProfile>> current(
            WineAiProfileRepository profiles, UUID wineId, String fingerprint) {
        Map<AiContentLanguage, WineAiProfile> bundle = new EnumMap<>(AiContentLanguage.class);
        for (AiContentLanguage language : AiContentLanguage.values()) {
            var profile = profiles.findByWineIdAndLanguage(wineId, language.code())
                    .filter(value -> AiContentProvenance.matches(value.getProfileJson(), fingerprint));
            if (profile.isEmpty()) {
                return Optional.empty();
            }
            bundle.put(language, profile.get());
        }
        return Optional.of(bundle);
    }
}
