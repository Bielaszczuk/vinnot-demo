package com.vinnot.wine.application.service;

import com.vinnot.wine.application.exception.WineLabelCatalogSearchTimeoutException;
import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.port.out.WineLabelSearchCriteria;
import com.vinnot.wine.application.port.out.WineRepositoryPort;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.service.WineLabelIdentityNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Retrieves a broad candidate union through independent identity views. A
 * public brand can live in either catalog field, so one blended query is not a
 * sufficient recall strategy.
 */
@Service
@RequiredArgsConstructor
public class WineLabelCandidateRetriever {

    private static final int CANDIDATE_POOL_SIZE = 60;
    private static final int COMMERCIAL_IDENTITY_POOL_SIZE = 60;
    private static final int MAX_SCAN_IDENTITY_TERMS = 2;
    private static final int MAX_INDEXED_IDENTITY_ATTEMPTS = 4;
    private static final int MAX_COMPLEMENTARY_OCR_ATTEMPTS = 2;
    private static final int MAX_OBSERVED_TERMS = 12;
    private static final int MAX_OBSERVED_TERM_TOKENS = 6;
    private static final int MAX_FALLBACK_TOKENS = 12;
    private static final int MIN_IDENTITY_TERM_LENGTH = 3;

    private final WineRepositoryPort wineRepository;

    public List<Wine> retrieve(ExtractedWineLabel label) {
        return retrieve(label, new WineLabelScanDeadline(WineLabelScanDeadline.DEFAULT_BUDGET));
    }

    public List<Wine> retrieve(ExtractedWineLabel label, WineLabelScanDeadline deadline) {
        AtomicBoolean timedOut = new AtomicBoolean();
        Map<UUID, Wine> uniqueCandidates = new LinkedHashMap<>();
        List<String> commercialIdentityTerms = discriminatorTerms(label);
        if (!commercialIdentityTerms.isEmpty()) {
            deadline.remaining();
            try {
                wineRepository.findByCommercialIdentity(criteria(
                                label, commercialIdentityTerms,
                                COMMERCIAL_IDENTITY_POOL_SIZE))
                        .forEach(wine -> uniqueCandidates.putIfAbsent(
                                wine.getId(), wine));
            } catch (WineLabelCatalogSearchTimeoutException ignored) {
                timedOut.set(true);
                // Continue with the general identity retrieval strategy.
            }
        }
        retrieveIndexedEvidence(label, deadline, timedOut).forEach(wine ->
                uniqueCandidates.putIfAbsent(wine.getId(), wine));
        if (!uniqueCandidates.isEmpty()) {
            return List.copyOf(uniqueCandidates.values());
        }
        retrievalCriteria(label).stream().findFirst().ifPresent(criteria -> {
            deadline.remaining();
            List<Wine> candidates = retrieveFuzzy(criteria, timedOut);
            candidates.forEach(wine -> uniqueCandidates.putIfAbsent(
                    wine.getId(), wine));
        });
        deadline.remaining();
        if (uniqueCandidates.isEmpty() && timedOut.get()) {
            throw new ExternalServiceUnavailableException(
                    "LABEL_CATALOG_UNAVAILABLE", "Wine catalog search is temporarily unavailable", null);
        }
        return List.copyOf(uniqueCandidates.values());
    }

    private List<Wine> retrieveIndexedEvidence(ExtractedWineLabel label, WineLabelScanDeadline deadline,
                                             AtomicBoolean timedOut) {
        List<String> terms = new ArrayList<>(indexedIdentityTerms(label).stream()
                .limit(MAX_INDEXED_IDENTITY_ATTEMPTS).toList());
        terms.addAll(complementaryOcrTerms(label));
        Map<UUID, Wine> candidates = new LinkedHashMap<>();
        for (String term : terms) {
            deadline.remaining();
            try {
                wineRepository.findByIndexedIdentity(
                                criteria(label, List.of(term), CANDIDATE_POOL_SIZE))
                        .forEach(wine -> candidates.putIfAbsent(wine.getId(), wine));
            } catch (WineLabelCatalogSearchTimeoutException ignored) {
                timedOut.set(true);
                // A broad term must not prevent a later distinctive term from matching.
            }
        }
        return List.copyOf(candidates.values());
    }

    private List<String> complementaryOcrTerms(ExtractedWineLabel label) {
        if (Objects.isNull(label.wineryName()) || label.wineryName().isBlank()) {
            return List.of();
        }
        Set<String> explained = new LinkedHashSet<>();
        Arrays.asList(label.wineryName(), label.wineName(), label.searchKeywords(),
                        label.grapeVariety(), label.wineType(), label.region(), label.country())
                .forEach(value -> explained.addAll(WineLabelIdentityNormalizer.significantTokens(value)));
        // Keep a detached cuvee/quality line in the candidate pool even when the
        // structured extraction omits it. Qualify it with the producer so generic
        // words cannot fill the bounded pool with unrelated wineries.
        return usefulTerms(label.observedText(), label.vintage()).stream()
                .filter(line -> !isStructuredMetadataOnly(line, label))
                .filter(line -> !explained.containsAll(WineLabelIdentityNormalizer.significantTokens(line)))
                .filter(line -> WineLabelIdentityNormalizer.significantTokens(line).size() <= MAX_OBSERVED_TERM_TOKENS)
                .sorted(Comparator.comparingInt(line -> WineLabelIdentityNormalizer.significantTokens(line).size()))
                .limit(MAX_COMPLEMENTARY_OCR_ATTEMPTS)
                .map(line -> label.wineryName() + " " + line)
                .toList();
    }

    private List<String> indexedIdentityTerms(ExtractedWineLabel label) {
        List<String> terms = new ArrayList<>();
        // A separate OCR product line (e.g. "12 Uvas") may be omitted from the
        // provider's structured name. Retrieve it before broad legal/location lines.
        label.observedText().stream().filter(WineLabelIdentityNormalizer::isNumberedProductLine).forEach(terms::add);
        terms.add(label.wineName());
        terms.add(label.searchKeywords());
        terms.add(label.wineryName());
        terms.addAll(observedTerms(label));
        return usefulTerms(terms, label.vintage()).stream()
                .filter(term -> !isStructuredMetadataOnly(term, label))
                .toList();
    }

    private boolean isStructuredMetadataOnly(
            String term, ExtractedWineLabel label) {
        String normalized = WineLabelIdentityNormalizer.normalize(term);
        Set<String> context = new LinkedHashSet<>();
        Arrays.asList(label.region(), label.country(), label.wineType()).stream()
                .filter(Objects::nonNull)
                .forEach(value -> context.addAll(WineLabelIdentityNormalizer.significantTokens(value)));
        Set<String> tokens = WineLabelIdentityNormalizer.significantTokens(term);
        if (!tokens.isEmpty() && context.containsAll(tokens)) {
            return true;
        }
        return Arrays.asList(
                        label.grapeVariety(), label.wineType(),
                        label.region(), label.country()).stream()
                .filter(Objects::nonNull)
                .map(WineLabelIdentityNormalizer::normalize)
                .anyMatch(normalized::equals);
    }

    private List<Wine> retrieveFuzzy(WineLabelSearchCriteria criteria, AtomicBoolean timedOut) {
        try {
            return wineRepository.findByFuzzyMatch(criteria);
        } catch (WineLabelCatalogSearchTimeoutException ignored) {
            timedOut.set(true);
            return List.of();
        }
    }

    /** An unrelated indexed hit must not suppress approximate identity retrieval. */
    public List<Wine> retrieveApproximate(ExtractedWineLabel label, WineLabelScanDeadline deadline) {
        deadline.remaining();
        AtomicBoolean timedOut = new AtomicBoolean();
        WineLabelSearchCriteria supplement = Objects.nonNull(label.wineryName()) && !label.wineryName().isBlank()
                ? criteria(label, List.of(label.wineryName()), CANDIDATE_POOL_SIZE)
                : retrievalCriteria(label).getFirst();
        List<Wine> candidates = retrieveFuzzy(supplement, timedOut);
        deadline.remaining();
        if (timedOut.get()) {
            throw new ExternalServiceUnavailableException(
                    "LABEL_CATALOG_UNAVAILABLE", "Wine catalog search is temporarily unavailable", null);
        }
        return candidates;
    }

    List<WineLabelSearchCriteria> retrievalCriteria(ExtractedWineLabel label) {
        List<String> terms = new ArrayList<>(primaryTerms(label));
        if (terms.size() < MAX_SCAN_IDENTITY_TERMS) {
            fallbackTokens(label).stream()
                    .filter(term -> terms.stream().noneMatch(existing ->
                            WineLabelIdentityNormalizer.normalize(existing).equals(
                                    WineLabelIdentityNormalizer.normalize(term))))
                    .limit(MAX_SCAN_IDENTITY_TERMS - terms.size())
                    .forEach(terms::add);
        }
        List<String> boundedTerms = terms.stream()
                .limit(MAX_SCAN_IDENTITY_TERMS)
                .toList();
        return List.of(criteria(label, boundedTerms, CANDIDATE_POOL_SIZE));
    }

    private List<String> primaryTerms(ExtractedWineLabel label) {
        List<String> terms = new ArrayList<>();
        terms.add(label.wineName());
        terms.add(label.wineryName());
        terms.add(label.searchKeywords());
        terms.addAll(observedTerms(label));
        return usefulTerms(terms, label.vintage());
    }

    private List<String> observedTerms(ExtractedWineLabel label) {
        return usefulTerms(label.observedText(), label.vintage()).stream()
                .filter(term -> WineLabelIdentityNormalizer.significantTokens(term).size()
                        <= MAX_OBSERVED_TERM_TOKENS)
                .sorted(Comparator
                        .comparingInt((String term) -> WineLabelIdentityNormalizer
                                .significantTokens(term).size())
                        .reversed()
                        .thenComparing(Comparator.comparingInt(String::length).reversed()))
                .limit(MAX_OBSERVED_TERMS)
                .toList();
    }

    private List<String> fallbackTokens(ExtractedWineLabel label) {
        final Set<String> tokens = new LinkedHashSet<>();
        List<String> evidence = new ArrayList<>();
        evidence.add(label.wineName());
        evidence.add(label.wineryName());
        evidence.add(label.searchKeywords());
        evidence.add(label.grapeVariety());
        evidence.addAll(label.observedText());
        evidence.stream()
                .filter(Objects::nonNull)
                .flatMap(value -> WineLabelIdentityNormalizer.searchTokens(value).stream())
                .filter(token -> isUsefulIdentityTerm(token, label.vintage()))
                .limit(MAX_FALLBACK_TOKENS)
                .forEach(tokens::add);
        return List.copyOf(tokens);
    }

    private List<String> discriminatorTerms(ExtractedWineLabel label) {
        Set<String> terms = new LinkedHashSet<>();
        Arrays.asList(label.wineName(), label.searchKeywords()).stream()
                .filter(Objects::nonNull)
                .flatMap(value -> WineLabelIdentityNormalizer
                        .commercialIdentifierSearchTerms(value).stream())
                .forEach(terms::add);
        return List.copyOf(terms);
    }

    private List<String> usefulTerms(List<String> rawTerms, Integer observedVintage) {
        Set<String> normalizedTerms = new LinkedHashSet<>();
        Map<String, String> values = new LinkedHashMap<>();
        rawTerms.stream()
                .filter(term -> isUsefulIdentityTerm(term, observedVintage))
                .forEach(term -> {
                    String normalized = WineLabelIdentityNormalizer.normalize(term);
                    if (normalizedTerms.add(normalized)) {
                        values.put(normalized, term.trim());
                    }
                });
        return List.copyOf(values.values());
    }

    private boolean isUsefulIdentityTerm(String value, Integer observedVintage) {
        if (Objects.isNull(value) || value.isBlank()) {
            return false;
        }
        String normalized = WineLabelIdentityNormalizer.normalize(value)
                .replace(" ", "");
        return normalized.length() >= MIN_IDENTITY_TERM_LENGTH
                && !Objects.equals(normalized,
                        Objects.nonNull(observedVintage)
                                ? String.valueOf(observedVintage) : null)
                && !isPlausibleVintageWithoutStructuredConfirmation(
                        normalized, observedVintage);
    }

    private boolean isPlausibleVintageWithoutStructuredConfirmation(
            String normalized, Integer observedVintage) {
        if (Objects.nonNull(observedVintage)) {
            return false;
        }
        return WineLabelIdentityNormalizer.isPlausibleVintage(normalized);
    }

    private WineLabelSearchCriteria criteria(
            ExtractedWineLabel label, List<String> terms, int limit) {
        return new WineLabelSearchCriteria(
                terms,
                label.vintage(),
                label.grapeVariety(),
                label.wineType(),
                limit);
    }

}
