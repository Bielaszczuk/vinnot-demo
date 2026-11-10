package com.vinnot.ai.application.service;

import com.vinnot.ai.application.dto.AiProfileResponse;
import com.vinnot.ai.application.dto.AiProfileStatusResponse;
import com.vinnot.ai.application.port.in.GenerateAiProfileUseCase;
import com.vinnot.ai.application.port.in.GetAiProfileStatusUseCase;
import com.vinnot.ai.application.port.in.GetAiProfileUseCase;
import com.vinnot.ai.application.port.in.UpdateAiProfileUseCase;
import com.vinnot.ai.domain.model.WineAiProfile;
import com.vinnot.ai.domain.repository.WineAiProfileRepository;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.Wine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import com.vinnot.ai.domain.model.ManualProfileContent;

/**
 * Orchestrates AI wine profile use cases.
 * Delegates generation to {@link AiProfilePromptBuilder} / {@link MockAiProfileGenerator}
 * and atomic bilingual publication to {@link AiProfilePublicationService}.
 */
@Service
@RequiredArgsConstructor
public class AiProfileService implements GetAiProfileUseCase,
        GenerateAiProfileUseCase, GetAiProfileStatusUseCase, UpdateAiProfileUseCase {

    private static final Logger LOG = LoggerFactory.getLogger(AiProfileService.class);

    private final WineAiProfileRepository profileRepository;
    private final WineRepositoryPort wineRepository;
    private final AiProfilePromptBuilder promptBuilder;
    private final MockAiProfileGenerator mockGenerator;
    private final AiGenerationCoordinator generationCoordinator;
    private final AiProfilePublicationService publicationService;

    @Override
    @Transactional(readOnly = true)
    public Optional<AiProfileResponse> get(UUID wineId, String language) {
        AiContentLanguage requestedLanguage = AiContentLanguage.from(language);
        requireWine(wineId);

        return profileRepository.findByWineIdAndLanguage(
                        wineId, requestedLanguage.code())
                .map(profile -> AiProfileResponse.from(
                    wineId,
                    requestedLanguage.code(),
                    profile.getProfileJson(),
                    profile.getUpdatedAt(),
                    true));
    }

    private boolean hasCompleteLanguageBundle(UUID wineId) {
        for (AiContentLanguage supportedLanguage : AiContentLanguage.values()) {
            if (!profileRepository.existsByWineIdAndLanguage(
                    wineId, supportedLanguage.code())) {
                return false;
            }
        }
        return true;
    }

    @Override
    public AiProfileResponse generate(
            UUID wineId,
            String language,
            boolean forceRegenerate) {
        AiContentLanguage requestedLanguage = AiContentLanguage.from(language);
        Wine wine = requireWine(wineId);
        String generationKey = "wine-profile:" + wineId;
        return forceRegenerate
                ? generationCoordinator.executeExclusively(
                        generationKey,
                        () -> generateAllLanguages(wine, requestedLanguage, true))
                : generationCoordinator.execute(
                        generationKey,
                        () -> findCompleteProfile(wineId, requestedLanguage),
                        () -> generateAllLanguages(wine, requestedLanguage, false));
    }

    @Override
    @Transactional(readOnly = true)
    public AiProfileStatusResponse getStatus(UUID wineId, String language) {
        AiContentLanguage requestedLanguage = AiContentLanguage.from(language);
        requireWine(wineId);
        var requestedProfile = profileRepository.findByWineIdAndLanguage(
                wineId, requestedLanguage.code());
        boolean complete = requestedProfile.isPresent()
                && hasCompleteLanguageBundle(wineId);
        String status = complete ? "GENERATED" : "NONE";
        String generatedAt = requestedProfile
                .filter(ignored -> complete)
                .map(profile -> profile.getUpdatedAt().toString())
                .orElse(null);
        return new AiProfileStatusResponse(
                wineId, requestedLanguage.code(), status, generatedAt);
    }

    /**
     * Updates an existing AI profile's content (admin manual edit).
     */
    @Override
    @Transactional
    public AiProfileResponse update(
            UUID wineId,
            String language,
            Map<String, Object> profileJson) {
        AiContentLanguage requestedLanguage = AiContentLanguage.from(language);
        wineRepository.findByIdForUpdate(wineId)
                .orElseThrow(() -> new EntityNotFoundException("Wine", wineId));

        profileJson = AiContentProvenance.stamp(
                ManualProfileContent.validate(profileJson), "manual", "");
        var existing = profileRepository.findByWineIdAndLanguage(
                wineId, requestedLanguage.code());
        WineAiProfile profile;
        if (existing.isPresent()) {
            profile = existing.get();
            profile.updateProfile(profileJson);
        } else {
            profile = WineAiProfile.create(wineId, requestedLanguage.code(), profileJson);
        }

        var saved = profileRepository.save(profile);
        return AiProfileResponse.from(
                wineId,
                requestedLanguage.code(),
                saved.getProfileJson(),
                saved.getUpdatedAt(),
                false);
    }

    private Optional<AiProfileResponse> findCompleteProfile(
            UUID wineId,
            AiContentLanguage requestedLanguage) {
        String fingerprint = promptBuilder.contextFingerprint(requireWine(wineId));
        return AiProfileBundles.current(profileRepository, wineId, fingerprint)
                .map(bundle -> bundle.get(requestedLanguage))
                .map(profile -> AiProfileResponse.from(
                        wineId,
                        requestedLanguage.code(),
                        profile.getProfileJson(),
                        profile.getUpdatedAt(),
                        true));
    }

    private Wine requireWine(UUID wineId) {
        return wineRepository.findById(wineId)
                .orElseThrow(() -> new EntityNotFoundException("Wine", wineId));
    }

    private AiProfileResponse generateAllLanguages(
            Wine wine,
            AiContentLanguage requestedLanguage, boolean forceRegenerate) {
        MultilingualAiContent generatedContent;

        if (promptBuilder.isProviderAvailable()) {
            LOG.info("Generating multilingual AI profile using the configured provider for wine: {}",
                    wine.getId());
            generatedContent = promptBuilder.generateMultilingual(wine)
                    .orElseThrow(this::unavailable);
        } else if (promptBuilder.isMockMode()) {
            LOG.info("Generating multilingual mock AI profile for wine: {}", wine.getId());
            generatedContent = generateMockContent(wine);
        } else {
            throw unavailable();
        }

        return publicationService.publish(wine, requestedLanguage, generatedContent, forceRegenerate);
    }

    private MultilingualAiContent generateMockContent(Wine wine) {
        Map<AiContentLanguage, Map<String, Object>> translations =
                new EnumMap<>(AiContentLanguage.class);
        for (AiContentLanguage language : AiContentLanguage.values()) {
            Map<String, Object> profile = new HashMap<>(mockGenerator.generateMockProfile(
                    wine, language.code(), false));
            profile.remove("enrichment");
            translations.put(language, profile);
        }
        return MultilingualAiContent.of(translations);
    }

    private ExternalServiceUnavailableException unavailable() {
        return new ExternalServiceUnavailableException("AI_PROFILE_UNAVAILABLE",
                "A wine profile could not be generated. Please try again later.", null);
    }

}
