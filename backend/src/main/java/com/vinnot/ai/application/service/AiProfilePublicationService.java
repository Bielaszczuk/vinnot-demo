package com.vinnot.ai.application.service;

import com.vinnot.ai.application.dto.AiProfileResponse;
import com.vinnot.ai.domain.model.WineAiProfile;
import com.vinnot.ai.domain.repository.WineAiProfileRepository;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import java.util.EnumMap;
import java.util.ArrayList;
import java.util.List;

/** Atomic bilingual publication without promoting generated content into catalog facts. */
@Service
@RequiredArgsConstructor
public class AiProfilePublicationService {
    private final WineRepositoryPort wineRepository;
    private final WineAiProfileRepository profileRepository;
    private final AiProfilePromptBuilder promptBuilder;

    @Transactional
    public AiProfileResponse publish(Wine input, AiContentLanguage requestedLanguage, MultilingualAiContent generatedContent, boolean forceRegenerate) {
        Wine wine = wineRepository.findByIdForUpdate(input.getId())
                .orElseThrow(() -> new EntityNotFoundException("Wine", input.getId()));
        if (wine.getRevision() != input.getRevision()) {
            throw new DomainException("CONCURRENT_UPDATE", "Wine changed during generation. Please retry.");
        }
        Map<AiContentLanguage, Map<String, Object>> profiles =
                new EnumMap<>(AiContentLanguage.class);
        for (AiContentLanguage supportedLanguage : AiContentLanguage.values()) {
            profiles.put(supportedLanguage, generatedContent.content(supportedLanguage));
        }

        // Provider enrichment is unverified; neither catalog fields nor nested enrichment are published.
        profiles.values().forEach(profile -> profile.remove("enrichment"));
        String fingerprint = promptBuilder.contextFingerprint(wine);

        List<WineAiProfile> profilesToSave = new ArrayList<>();
        profiles.forEach((supportedLanguage, profileJson) -> {
            var existing = profileRepository.findByWineIdAndLanguage(wine.getId(), supportedLanguage.code());
            if (!forceRegenerate && existing.filter(value -> AiContentProvenance.isManual(value.getProfileJson())).isPresent()) {
                profilesToSave.add(existing.orElseThrow());
                return;
            }
            WineAiProfile profile = WineAiProfile.create(
                    wine.getId(), supportedLanguage.code(), AiContentProvenance.stamp(
                            profileJson, promptBuilder.isMockMode() ? "mock" : "provider", fingerprint));
            profilesToSave.add(profile);
        });

        Map<AiContentLanguage, WineAiProfile> savedProfiles =
                new EnumMap<>(AiContentLanguage.class);
        profileRepository.saveBundle(profilesToSave).forEach(profile ->
                savedProfiles.put(
                        AiContentLanguage.from(profile.getLanguage()), profile));

        WineAiProfile requestedProfile = savedProfiles.get(requestedLanguage);

        return AiProfileResponse.from(
                wine.getId(),
                requestedLanguage.code(),
                requestedProfile.getProfileJson(),
                requestedProfile.getUpdatedAt(),
                false,
                null);
    }

}
