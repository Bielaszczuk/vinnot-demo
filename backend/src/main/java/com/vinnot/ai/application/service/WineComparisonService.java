package com.vinnot.ai.application.service;

import com.vinnot.ai.application.dto.WineComparisonResponse;
import com.vinnot.ai.application.port.in.CompareWinesUseCase;
import com.vinnot.ai.domain.model.WineComparison;
import com.vinnot.ai.domain.repository.WineComparisonRepository;
import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import com.vinnot.ai.domain.valueobject.AiContentProvenance;
import com.vinnot.ai.domain.valueobject.CanonicalWinePair;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.time.Instant;

@Service
public class WineComparisonService implements CompareWinesUseCase {

    private final WineComparisonRepository comparisonRepository;
    private final WineRepositoryPort wineRepository;
    private final WineComparisonContentGenerator contentGenerator;
    private final WineComparisonContentOrienter contentOrienter;
    private final WineComparisonAttributeNormalizer attributeNormalizer;
    private final WineComparisonContentValidator contentValidator;
    private final AiGenerationCoordinator generationCoordinator;

    public WineComparisonService(
            WineComparisonRepository comparisonRepository,
            WineRepositoryPort wineRepository,
            WineComparisonContentGenerator contentGenerator,
            WineComparisonContentOrienter contentOrienter,
            WineComparisonAttributeNormalizer attributeNormalizer,
            WineComparisonContentValidator contentValidator,
            AiGenerationCoordinator generationCoordinator) {
        this.comparisonRepository = comparisonRepository;
        this.wineRepository = wineRepository;
        this.contentGenerator = contentGenerator;
        this.contentOrienter = contentOrienter;
        this.attributeNormalizer = attributeNormalizer;
        this.contentValidator = contentValidator;
        this.generationCoordinator = generationCoordinator;
    }

    @Override
    public WineComparisonResponse compare(UUID wineAId, UUID wineBId, String language) {
        if (Objects.equals(wineAId, wineBId)) {
            throw new BusinessRuleViolationException(
                    "DISTINCT_COMPARISON_WINES",
                    "A wine cannot be compared with itself");
        }
        AiContentLanguage requestedLanguage = AiContentLanguage.from(language);
        Wine requestedWineA = wineRepository.findById(wineAId)
                .orElseThrow(() -> new EntityNotFoundException("Wine", wineAId));
        Wine requestedWineB = wineRepository.findById(wineBId)
                .orElseThrow(() -> new EntityNotFoundException("Wine", wineBId));
        CanonicalWinePair pair = CanonicalWinePair.of(wineAId, wineBId);
        boolean reverseCanonicalOrder = pair.reverses(wineAId);
        Wine canonicalWineA = pair.wineAId().equals(wineAId)
                ? requestedWineA : requestedWineB;
        Wine canonicalWineB = pair.wineBId().equals(wineBId)
                ? requestedWineB : requestedWineA;

        String fingerprint = contentGenerator.contextFingerprint(canonicalWineA, canonicalWineB);
        String generationKey = "wine-comparison:"
                + canonicalWineA.getId() + ":" + canonicalWineB.getId();
        return generationCoordinator.execute(
                generationKey,
                () -> findCachedResponse(
                        canonicalWineA, canonicalWineB,
                        requestedWineA, requestedWineB,
                        requestedLanguage, reverseCanonicalOrder, fingerprint),
                () -> generateComparison(
                        canonicalWineA, canonicalWineB,
                        requestedWineA, requestedWineB,
                        requestedLanguage, reverseCanonicalOrder));
    }

    private Optional<WineComparisonResponse> findCachedResponse(
            Wine canonicalWineA,
            Wine canonicalWineB,
            Wine requestedWineA,
            Wine requestedWineB,
            AiContentLanguage requestedLanguage,
            boolean reverseCanonicalOrder,
            String fingerprint) {
        Map<AiContentLanguage, WineComparison> bundle = new EnumMap<>(AiContentLanguage.class);
        for (AiContentLanguage language : AiContentLanguage.values()) {
            Optional<WineComparison> localized = comparisonRepository.findByWineIdsAndLanguage(
                    canonicalWineA.getId(), canonicalWineB.getId(), language.code());
            if (localized.isEmpty() || !contentValidator.isReusable(localized.get().getComparisonJson())
                    || !AiContentProvenance.matches(localized.get().getComparisonJson(), fingerprint)) {
                return Optional.empty();
            }
            bundle.put(language, localized.get());
        }
        return Optional.of(bundle.get(requestedLanguage))
                .map(comparison -> responseForRequestedOrder(
                        requestedWineA, requestedWineB, requestedLanguage,
                        comparison.getComparisonJson(), comparison.getUpdatedAt(),
                        true, reverseCanonicalOrder));
    }

    private WineComparisonResponse generateComparison(
            Wine canonicalWineA,
            Wine canonicalWineB,
            Wine requestedWineA,
            Wine requestedWineB,
            AiContentLanguage requestedLanguage,
            boolean reverseCanonicalOrder) {

        MultilingualAiContent generatedContent = contentGenerator.generate(
                canonicalWineA, canonicalWineB);

        List<WineComparison> comparisonsToSave = new ArrayList<>();
        for (AiContentLanguage supportedLanguage : AiContentLanguage.values()) {
            comparisonsToSave.add(WineComparison.create(
                    canonicalWineA.getId(), canonicalWineB.getId(),
                    supportedLanguage.code(),
                    generatedContent.content(supportedLanguage)));
        }
        Map<AiContentLanguage, WineComparison> savedComparisons =
                new EnumMap<>(AiContentLanguage.class);
        comparisonRepository.saveBundle(comparisonsToSave).forEach(comparison ->
                savedComparisons.put(
                        AiContentLanguage.from(comparison.getLanguage()), comparison));
        WineComparison saved = savedComparisons.get(requestedLanguage);

        return responseForRequestedOrder(
                requestedWineA, requestedWineB, requestedLanguage,
                saved.getComparisonJson(), saved.getUpdatedAt(), false,
                reverseCanonicalOrder);
    }

    private WineComparisonResponse responseForRequestedOrder(
            Wine requestedWineA,
            Wine requestedWineB,
            AiContentLanguage language,
            Map<String, Object> canonicalContent,
            Instant generatedAt,
            boolean cached,
            boolean reverseCanonicalOrder) {
        return WineComparisonResponse.from(
                requestedWineA.getId(),
                contentGenerator.buildDisplayName(requestedWineA),
                requestedWineB.getId(),
                contentGenerator.buildDisplayName(requestedWineB),
                language.code(),
                attributeNormalizer.normalize(
                        contentOrienter.orient(canonicalContent, reverseCanonicalOrder)),
                generatedAt,
                cached);
    }

}
