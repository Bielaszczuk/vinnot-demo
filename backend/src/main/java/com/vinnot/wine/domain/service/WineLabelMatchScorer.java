package com.vinnot.wine.domain.service;

import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineLabelCandidate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Pure matching policy. Provider confidence is deliberately excluded from the
 * catalog score: only comparable label/catalog evidence contributes.
 */
public class WineLabelMatchScorer {

    public static final double EXACT_MATCH_THRESHOLD = 0.90;
    public static final double COMPLETE_IDENTITY_MATCH_THRESHOLD = 0.80;
    public static final double SUGGESTION_THRESHOLD = 0.42;
    private static final double CONTRADICTED_VARIETY_SCORE = 0.41;
    private static final double MIN_PRIMARY_SIGNAL = 0.72;
    private static final double MIN_LABEL_IDENTITY_COVERAGE = 0.80;
    private static final double MIN_CATALOG_IDENTITY_COVERAGE = 0.90;
    private static final double MIN_PRODUCT_IDENTITY_COVERAGE = 0.75;
    private static final double EQUIVALENT_IDENTITY_COVERAGE = 0.80;
    private static final double BASE_SCORE_WEIGHT = 0.70;
    private static final double IDENTITY_FIT_WEIGHT = 0.30;

    private static final double NAME_WEIGHT = 0.40;
    private static final double WINERY_WEIGHT = 0.30;
    private static final double VINTAGE_WEIGHT = 0.10;
    private static final double GRAPE_WEIGHT = 0.08;
    private static final double TYPE_WEIGHT = 0.05;
    private static final double COUNTRY_WEIGHT = 0.04;
    private static final double REGION_WEIGHT = 0.03;
    private static final double IDENTITY_DISCRIMINATOR_WEIGHT = 0.35;
    private static final double STRONG_PRODUCT_SIGNAL = 0.90;
    private static final double DIRECT_NAME_SIGNAL_WEIGHT = 0.65;
    private static final double PRODUCT_COVERAGE_WEIGHT = 0.35;
    private static final int RICH_PRODUCT_EVIDENCE_MIN_TOKENS = 2;
    private static final int MAX_PRODUCT_EVIDENCE_LINE_TOKENS = 4;
    private static final int DISTINCTIVE_IDENTITY_MIN_LENGTH = 8;
    private static final double SCORE_PRECISION = 10_000.0;
    private static final double SINGLE_PRIMARY_RELIABILITY = 0.75;
    private static final double VISUAL_ONLY_RELIABILITY = 0.55;

    public List<RankedWineLabelCandidate> rank(
            ExtractedWineLabel label, List<WineLabelCandidate> candidates) {
        boolean fallbackOcrEvidence = candidates.stream()
                .filter(candidate -> !hasText(label.wineryName())
                        || WineLabelIdentityNormalizer.producerSimilarity(
                                label.wineryName(), candidate.wineryName()) >= MIN_PRIMARY_SIGNAL)
                .anyMatch(candidate -> fallbackOcrProductCoverage(label, candidate)
                        >= MIN_PRODUCT_IDENTITY_COVERAGE);
        boolean catalogBackedProductEvidence = candidates.stream()
                .filter(candidate -> hasText(label.wineryName())
                        && WineLabelIdentityNormalizer.producerSimilarity(
                                label.wineryName(), candidate.wineryName()) >= MIN_PRIMARY_SIGNAL)
                .anyMatch(candidate -> !productEvidenceTokens(label, candidate).isEmpty()
                        && productEvidenceCoverage(productEvidenceTokens(label, candidate), candidate.wine().getName())
                                >= MIN_PRODUCT_IDENTITY_COVERAGE);
        return candidates.stream()
                .map(candidate -> new RankedWineLabelCandidate(
                        candidate, score(
                                label, candidate, fallbackOcrEvidence,
                                catalogBackedProductEvidence && !fallbackOcrEvidence)))
                .filter(candidate -> candidate.score() >= SUGGESTION_THRESHOLD)
                .sorted(Comparator.comparingDouble(RankedWineLabelCandidate::score)
                        .reversed()
                        // Canonical producer aliases can tie. Prefer the spelling actually
                        // observed on the label before using a technical catalog ID.
                        .thenComparing(candidate -> !normalize(label.wineryName()).equals(
                                normalize(candidate.candidate().wineryName())))
                        .thenComparing(candidate -> candidate.candidate()
                                .wine().getId().toString()))
                .toList();
    }

    public boolean isExact(
            ExtractedWineLabel label, RankedWineLabelCandidate rankedCandidate) {
        WineLabelCandidate candidate = rankedCandidate.candidate();
        label = corroborateObservedIdentity(label, candidate);
        Wine wine = candidate.wine();
        double nameSignal = nameSimilarity(label, candidate);
        boolean vintageMatches = Objects.isNull(label.vintage())
                || Objects.isNull(wine.getVintage())
                || Objects.equals(label.vintage(), wine.getVintage());
        boolean grapeMatches = collectionMatches(
                label.grapeVariety(), wine.getGrapes());
        boolean discriminatorsMatch = identityDiscriminatorsMatch(label, candidate);
        IdentityEvidence identity = identityEvidence(label, candidate);
        boolean primarySignalsMatch = nameSignal >= MIN_PRIMARY_SIGNAL
                && identity.producerRepresented()
                && identity.productRepresented()
                && identity.labelCoverage() >= MIN_LABEL_IDENTITY_COVERAGE
                && identity.catalogCoverage() >= MIN_CATALOG_IDENTITY_COVERAGE
                && vintageMatches
                && grapeMatches
                && discriminatorsMatch;
        boolean reachesExactScore = rankedCandidate.score() >= EXACT_MATCH_THRESHOLD;
        boolean hasCompleteCatalogIdentity =
                rankedCandidate.score() >= COMPLETE_IDENTITY_MATCH_THRESHOLD
                        && identity.labelCoverage() >= MIN_LABEL_IDENTITY_COVERAGE
                        && identity.catalogCoverage() >= MIN_CATALOG_IDENTITY_COVERAGE;
        return primarySignalsMatch
                && (reachesExactScore || hasCompleteCatalogIdentity);
    }

    /**
     * Determines whether two catalog rows represent the same visible label
     * identity even when brand and legal producer are stored in opposite fields.
     */
    public boolean representsSameCatalogIdentity(
            ExtractedWineLabel label,
            RankedWineLabelCandidate left,
            RankedWineLabelCandidate right) {
        WineLabelCandidate leftCandidate = left.candidate();
        WineLabelCandidate rightCandidate = right.candidate();
        Set<String> leftTokens = catalogIdentityTokens(label, leftCandidate);
        Set<String> rightTokens = catalogIdentityTokens(label, rightCandidate);
        boolean sameCommercialDiscriminators = WineLabelIdentityNormalizer.identityDiscriminatorTokens(
                        leftCandidate.wine().getName()).equals(
                        WineLabelIdentityNormalizer.identityDiscriminatorTokens(rightCandidate.wine().getName()));
        boolean identitiesOverlap = WineLabelIdentityNormalizer.jaccard(
                        leftTokens, rightTokens) >= EQUIVALENT_IDENTITY_COVERAGE
                && WineLabelIdentityNormalizer.coverage(
                        leftTokens, rightTokens) >= EQUIVALENT_IDENTITY_COVERAGE
                && WineLabelIdentityNormalizer.coverage(
                        rightTokens, leftTokens) >= EQUIVALENT_IDENTITY_COVERAGE;
        return sameCommercialDiscriminators && identitiesOverlap
                && vintagesCompatible(
                        leftCandidate.wine().getVintage(),
                        rightCandidate.wine().getVintage())
                && textValuesCompatible(
                        leftCandidate.wine().getCountryName(),
                        rightCandidate.wine().getCountryName())
                && grapeCollectionsCompatible(
                        leftCandidate.wine().getGrapes(),
                        rightCandidate.wine().getGrapes());
    }

    /** A missing small commercial mark is ambiguous, not evidence for the generic sibling. */
    public boolean isUnobservedSymbolVariant(ExtractedWineLabel label, WineLabelCandidate winner,
                                            WineLabelCandidate alternative) {
        Set<String> marks = WineLabelIdentityNormalizer.symbolDiscriminatorTokens(alternative.wine().getName());
        if (marks.isEmpty() || observedIdentityDiscriminators(label).containsAll(marks)
                || !WineLabelIdentityNormalizer.symbolDiscriminatorTokens(winner.wine().getName()).isEmpty()) {
            return false;
        }
        Set<String> genericName = significantTokens(winner.wine().getName());
        Set<String> variantName = new HashSet<>(significantTokens(alternative.wine().getName()));
        variantName.removeAll(WineLabelIdentitySymbol.tokens(alternative.wine().getName()));
        return !genericName.isEmpty() && genericName.equals(variantName)
                && !WineLabelIdentityNormalizer.producerTokens(winner.wineryName()).isEmpty()
                && WineLabelIdentityNormalizer.producerTokens(winner.wineryName())
                        .equals(WineLabelIdentityNormalizer.producerTokens(alternative.wineryName()))
                && vintagesCompatible(winner.wine().getVintage(), alternative.wine().getVintage())
                && grapeCollectionsCompatible(winner.wine().getGrapes(), alternative.wine().getGrapes());
    }

    double score(ExtractedWineLabel label, WineLabelCandidate candidate) {
        return score(label, candidate, false, false);
    }

    private double score(
            ExtractedWineLabel label,
            WineLabelCandidate candidate,
            boolean catalogBackedFallbackOcrEvidence,
            boolean catalogBackedProductEvidence) {
        label = corroborateObservedIdentity(label, candidate);
        Wine wine = candidate.wine();
        List<WeightedSignal> signals = new ArrayList<>();
        double nameSignal = nameSimilarity(label, candidate);
        if (hasText(wine.getName()) && shouldCompareName(label)) {
            signals.add(new WeightedSignal(nameSignal, NAME_WEIGHT));
        }
        double winerySignal = winerySimilarity(label, candidate);
        if (hasText(candidate.wineryName())
                && shouldCompareWinery(label, winerySignal, nameSignal)) {
            signals.add(new WeightedSignal(
                    winerySignal, WINERY_WEIGHT));
        }
        if (Objects.nonNull(label.vintage()) && Objects.nonNull(wine.getVintage())) {
            signals.add(new WeightedSignal(
                    Objects.equals(label.vintage(), wine.getVintage()) ? 1.0 : 0.0,
                    VINTAGE_WEIGHT));
        }
        addCollectionSignal(signals, label.grapeVariety(), wine.getGrapes(), GRAPE_WEIGHT);
        addTextSignal(signals, label.wineType(),
                Objects.nonNull(wine.getWineType()) ? wine.getWineType().name() : null,
                TYPE_WEIGHT);
        addTextSignal(signals, label.country(), wine.getCountryName(), COUNTRY_WEIGHT);
        addTextSignal(signals, label.region(), wine.getRegionName(), REGION_WEIGHT);
        addIdentityDiscriminatorSignal(
                signals, label, candidate, catalogBackedFallbackOcrEvidence);
        Set<String> productEvidence = productEvidenceTokens(label, candidate);
        if (catalogBackedProductEvidence && !productEvidence.isEmpty()) {
            // A catalog-backed cuvee must outweigh generic style/appellation words
            // shared by siblings, without turning unknown descriptive text into fact.
            signals.add(new WeightedSignal(productEvidenceCoverage(productEvidence, wine.getName()),
                    IDENTITY_DISCRIMINATOR_WEIGHT));
        }

        double availableWeight = signals.stream().mapToDouble(WeightedSignal::weight).sum();
        if (availableWeight == 0.0) {
            return 0.0;
        }
        double weightedScore = signals.stream()
                .mapToDouble(signal -> signal.value() * signal.weight())
                .sum();
        double baseScore = weightedScore / availableWeight;
        IdentityEvidence identity = identityEvidence(label, candidate);
        double identityFit = Math.min(
                identity.labelCoverage(), identity.catalogCoverage());
        double blendedScore = identity.hasStructuredEvidence()
                ? (baseScore * BASE_SCORE_WEIGHT)
                        + (identityFit * IDENTITY_FIT_WEIGHT)
                : baseScore;
        double result = round(blendedScore * evidenceReliability(label));
        // Known contradictory varieties must not outrank a supported identity just because
        // the producer and line are the same. Unknown catalog grapes remain unknown.
        return collectionMatches(label.grapeVariety(), wine.getGrapes())
                ? result : Math.min(result, CONTRADICTED_VARIETY_SCORE);
    }

    /** Promotes only literal OCR evidence, never catalog guesses or partial names. */
    private ExtractedWineLabel corroborateObservedIdentity(ExtractedWineLabel label, WineLabelCandidate candidate) {
        if (!structuredPrimaryIdentityTexts(label).isEmpty()) {
            return label;
        }
        Set<String> producer = WineLabelIdentityNormalizer.producerTokens(candidate.wineryName());
        Set<String> product = significantTokens(candidate.wine().getName());
        Set<String> visible = label.observedText().stream().flatMap(line -> significantTokens(line).stream())
                .collect(Collectors.toSet());
        if (producer.isEmpty() || product.isEmpty() || !visible.containsAll(producer) || !visible.containsAll(product)) {
            return label;
        }
        Set<String> explained = new HashSet<>(producer);
        explained.addAll(product);
        addTokens(explained, candidate.wine().getCountryName());
        addTokens(explained, candidate.wine().getRegionName());
        List<String> observedGrapes = candidate.wine().getGrapes().stream()
                .filter(grape -> !significantTokens(grape).isEmpty() && visible.containsAll(significantTokens(grape)))
                .toList();
        observedGrapes.forEach(grape -> addTokens(explained, grape));
        // Unexplained text may be another cuvee or variety: leave it for visual verification.
        if (!explained.containsAll(visible)) {
            return label;
        }
        return new ExtractedWineLabel(candidate.wineryName(), candidate.wine().getName(),
                observedGrapes.isEmpty() ? null : String.join(" ", observedGrapes),
                label.vintage(), label.wineType(), label.region(), label.country(), label.alcoholContent(),
                label.extractionConfidence(), null, label.visualDescription(), label.wineLabel(),
                label.observedText(), label.identitySymbols());
    }

    private double evidenceReliability(ExtractedWineLabel label) {
        long distinctIdentityTerms = structuredPrimaryIdentityTexts(label).stream()
                .map(WineLabelMatchScorer::normalize)
                .filter(term -> !term.isBlank())
                .distinct()
                .count();
        if (distinctIdentityTerms >= 2) {
            return 1.0;
        }
        if (distinctIdentityTerms == 1) {
            return SINGLE_PRIMARY_RELIABILITY;
        }
        return VISUAL_ONLY_RELIABILITY;
    }

    private static List<String> structuredPrimaryIdentityTexts(
            ExtractedWineLabel label) {
        List<String> values = new ArrayList<>();
        addIdentityText(values, label.wineName());
        addIdentityText(values, label.wineryName());
        addIdentityText(values, label.searchKeywords());
        return values;
    }

    private void addTextSignal(
            List<WeightedSignal> signals, String observed, String catalog, double weight) {
        if (hasText(observed) && hasText(catalog)) {
            signals.add(new WeightedSignal(textSimilarity(observed, catalog), weight));
        }
    }

    private void addCollectionSignal(
            List<WeightedSignal> signals, String observed, List<String> catalog, double weight) {
        if (!hasText(observed) || Objects.isNull(catalog) || catalog.isEmpty()) {
            return;
        }
        double best = catalog.stream()
                .mapToDouble(value -> textSimilarity(observed, value))
                .max()
                .orElse(0.0);
        signals.add(new WeightedSignal(best, weight));
    }

    private void addIdentityDiscriminatorSignal(
            List<WeightedSignal> signals,
            ExtractedWineLabel label,
            WineLabelCandidate candidate,
            boolean catalogBackedFallbackOcrEvidence) {
        Set<String> observedDiscriminators = observedIdentityDiscriminators(label);
        if (!observedDiscriminators.isEmpty()) {
            Set<String> catalogDiscriminators = WineLabelIdentityNormalizer
                    .identityDiscriminatorTokens(candidate.wine().getName());
            signals.add(new WeightedSignal(
                    WineLabelIdentityNormalizer.coverage(
                            observedDiscriminators, catalogDiscriminators),
                    IDENTITY_DISCRIMINATOR_WEIGHT));
        }
        if (catalogBackedFallbackOcrEvidence && !fallbackOcrProductEvidence(label, candidate).isEmpty()) {
            signals.add(new WeightedSignal(
                    fallbackOcrProductCoverage(label, candidate),
                    IDENTITY_DISCRIMINATOR_WEIGHT));
        }
    }

    private boolean collectionMatches(String observed, List<String> catalog) {
        if (!hasText(observed) || Objects.isNull(catalog) || catalog.isEmpty()) {
            return true;
        }
        return catalog.stream()
                .mapToDouble(value -> textSimilarity(observed, value))
                .max()
                .orElse(0.0) >= MIN_PRIMARY_SIGNAL;
    }

    private double nameSimilarity(
            ExtractedWineLabel label, WineLabelCandidate candidate) {
        double directSignal = Math.max(
                productIdentityTexts(label).stream()
                        .mapToDouble(value -> textSimilarity(
                                value, candidate.wine().getName()))
                        .max()
                        .orElse(0.0),
                catalogTokenCoverage(candidate.wine().getName(), label));
        Set<String> productEvidence = productEvidenceTokens(label, candidate);
        if (productEvidence.size() < RICH_PRODUCT_EVIDENCE_MIN_TOKENS) {
            return directSignal;
        }
        double productCoverage =
                productEvidenceCoverage(productEvidence, candidate.wine().getName());
        return round((directSignal * DIRECT_NAME_SIGNAL_WEIGHT)
                + (productCoverage * PRODUCT_COVERAGE_WEIGHT));
    }

    public static double textSimilarity(String left, String right) {
        return WineLabelIdentityNormalizer.textSimilarity(left, right);
    }

    private static double winerySimilarity(
            ExtractedWineLabel label, WineLabelCandidate candidate) {
        double direct = hasText(label.wineryName())
                ? WineLabelIdentityNormalizer.producerSimilarity(
                        label.wineryName(), candidate.wineryName())
                : bestIdentityTextSimilarity(candidate.wineryName(), label);
        if (hasText(label.wineryName()) && independentProducerTokens(label, candidate).isEmpty()) {
            return direct;
        }
        double coverage = catalogTokenCoverage(candidate.wineryName(), label);
        double embeddedInWineName =
                WineLabelIdentityNormalizer.producerSimilarity(
                        label.wineryName(), candidate.wine().getName());
        if (!isDistinctiveIdentity(label.wineryName())
                && hasIndependentProductEvidence(label)) {
            return Math.max(direct, coverage);
        }
        return Math.max(Math.max(direct, coverage), embeddedInWineName);
    }

    private static boolean hasIndependentProductEvidence(ExtractedWineLabel label) {
        if (hasText(label.wineName()) || hasText(label.grapeVariety())) {
            return true;
        }
        return hasText(label.searchKeywords())
                && !normalize(label.searchKeywords()).equals(
                        normalize(label.wineryName()));
    }

    private static double bestIdentityTextSimilarity(
            String catalogValue, ExtractedWineLabel label) {
        if (!hasText(catalogValue)) {
            return 0.0;
        }
        return identityTexts(label).stream()
                .mapToDouble(value -> textSimilarity(value, catalogValue))
                .max()
                .orElse(0.0);
    }

    private static double catalogTokenCoverage(
            String catalogValue, ExtractedWineLabel label) {
        Set<String> catalogTokens = significantTokens(catalogValue);
        if (catalogTokens.isEmpty()) {
            return 0.0;
        }
        Set<String> evidenceTokens = new HashSet<>();
        identityTexts(label).forEach(value ->
                evidenceTokens.addAll(significantTokens(value)));
        long matchedTokens = catalogTokens.stream()
                .filter(evidenceTokens::contains)
                .count();
        return round((double) matchedTokens / catalogTokens.size());
    }

    private static Set<String> significantTokens(String value) {
        return WineLabelIdentityNormalizer.significantTokens(value);
    }

    private static Set<String> productEvidenceTokens(
            ExtractedWineLabel label, WineLabelCandidate candidate) {
        String preferredIdentity = hasText(label.searchKeywords())
                ? label.searchKeywords() : label.wineName();
        Set<String> tokens = new HashSet<>();
        addTokens(tokens, preferredIdentity);
        removeProductContextTokens(tokens, label, candidate);
        removeTokens(tokens, label.grapeVariety());
        removeTokens(tokens, label.wineType());
        return Set.copyOf(tokens);
    }

    /**
     * When the provider only extracts generic context such as producer and
     * grape, a distinctive OCR line is the remaining product identity. An
     * exact match must represent at least one such line; otherwise a generic
     * varietal sibling could incorrectly qualify as the scanned wine.
     */
    private static List<Set<String>> fallbackOcrProductEvidence(
            ExtractedWineLabel label, WineLabelCandidate candidate) {
        List<Set<String>> structuredProductEvidence = new ArrayList<>();
        addFallbackProductEvidenceAlternative(
                structuredProductEvidence, label.wineName(), label, candidate);
        addFallbackProductEvidenceAlternative(
                structuredProductEvidence, label.searchKeywords(), label, candidate);
        Set<String> explainedProduct = structuredProductEvidence.stream()
                .flatMap(Set::stream).collect(Collectors.toSet());

        List<Set<String>> ocrProductEvidence = new ArrayList<>();
        label.observedText().stream()
                .filter(value -> significantTokens(value).size()
                        <= MAX_PRODUCT_EVIDENCE_LINE_TOKENS)
                .forEach(value -> addFallbackProductEvidenceAlternative(
                        ocrProductEvidence, value, label, candidate));
        return ocrProductEvidence.stream().map(evidence -> {
            Set<String> complementary = new HashSet<>(evidence);
            complementary.removeAll(explainedProduct);
            return Set.copyOf(complementary);
        }).filter(evidence -> !evidence.isEmpty()).toList();
    }

    private static double fallbackOcrProductCoverage(
            ExtractedWineLabel label, WineLabelCandidate candidate) {
        return fallbackOcrProductEvidence(label, candidate).stream()
                .mapToDouble(evidence -> productEvidenceCoverage(
                        evidence, candidate.wine().getName()))
                .max()
                .orElse(0.0);
    }

    private static void addFallbackProductEvidenceAlternative(
            List<Set<String>> alternatives,
            String value,
            ExtractedWineLabel label,
            WineLabelCandidate candidate) {
        Set<String> tokens = new HashSet<>();
        addTokens(tokens, value);
        removeProductContextTokens(tokens, label, candidate);
        removeTokens(tokens, label.grapeVariety());
        removeTokens(tokens, label.wineType());
        if (!tokens.isEmpty()) {
            alternatives.add(Set.copyOf(tokens));
        }
    }

    private static void removeProductContextTokens(
            Set<String> tokens,
            ExtractedWineLabel label,
            WineLabelCandidate candidate) {
        removeTokens(tokens, label.wineryName());
        removeTokens(tokens, candidate.wineryName());
        removeTokens(tokens, label.region());
        removeTokens(tokens, label.country());
        removeTokens(tokens, candidate.wine().getRegionName());
        removeTokens(tokens, candidate.wine().getCountryName());
    }

    private static double productEvidenceCoverage(
            Set<String> evidenceTokens, String catalogWineName) {
        Set<String> catalogTokens = significantTokens(catalogWineName);
        long representedTokens = evidenceTokens.stream()
                .filter(catalogTokens::contains)
                .count();
        return round((double) representedTokens / evidenceTokens.size());
    }

    private static void addTokens(Set<String> destination, String value) {
        destination.addAll(significantTokens(value));
    }

    private static void removeTokens(Set<String> destination, String value) {
        destination.removeAll(significantTokens(value));
    }

    private static IdentityEvidence identityEvidence(
            ExtractedWineLabel label, WineLabelCandidate candidate) {
        List<Set<String>> structuredAlternatives = new ArrayList<>(
                structuredIdentityAlternatives(label));
        Set<String> roleInvertedIdentity = roleInvertedIdentityAlternative(
                label, candidate);
        if (!roleInvertedIdentity.isEmpty()) {
            structuredAlternatives.add(roleInvertedIdentity);
        }
        Set<String> structuredEvidence = structuredAlternatives.stream()
                .flatMap(Set::stream)
                .collect(Collectors.toSet());
        Set<String> visibleEvidence = visibleIdentityTokens(label, structuredEvidence);
        Set<String> catalogIdentity = catalogIdentityTokens(label, candidate);
        double labelCoverage = structuredAlternatives.stream()
                .mapToDouble(alternative -> WineLabelIdentityNormalizer.coverage(
                        alternative, catalogIdentity))
                .max()
                .orElse(0.0);
        double catalogCoverage = WineLabelIdentityNormalizer.coverage(
                catalogIdentity, visibleEvidence);
        return new IdentityEvidence(
                labelCoverage,
                catalogCoverage,
                producerRepresented(label, candidate, visibleEvidence, catalogIdentity),
                productRepresented(label, catalogIdentity),
                !structuredEvidence.isEmpty());
    }

    private static List<Set<String>> structuredIdentityAlternatives(
            ExtractedWineLabel label) {
        Set<String> producerAndProduct = new HashSet<>();
        producerAndProduct.addAll(
                WineLabelIdentityNormalizer.producerTokens(label.wineryName()));
        addTokens(producerAndProduct, label.wineName());
        addTokens(producerAndProduct, label.grapeVariety());

        Set<String> compactSearchIdentity = new HashSet<>();
        if (hasText(label.searchKeywords())) {
            addTokens(compactSearchIdentity, label.searchKeywords());
            compactSearchIdentity.removeAll(significantTokens(label.wineryName()));
            compactSearchIdentity.addAll(
                    WineLabelIdentityNormalizer.producerTokens(label.wineryName()));
            addTokens(compactSearchIdentity, label.grapeVariety());
        }

        List<Set<String>> alternatives = new ArrayList<>();
        if (!compactSearchIdentity.isEmpty()) {
            alternatives.add(Set.copyOf(compactSearchIdentity));
        }
        if (!producerAndProduct.isEmpty()) {
            alternatives.add(Set.copyOf(producerAndProduct));
        }
        return List.copyOf(alternatives);
    }

    private static Set<String> roleInvertedIdentityAlternative(
            ExtractedWineLabel label, WineLabelCandidate candidate) {
        Set<String> catalogProducer = WineLabelIdentityNormalizer.producerTokens(
                candidate.wineryName());
        Set<String> catalogProduct = significantTokens(candidate.wine().getName());
        if (catalogProducer.isEmpty() || catalogProduct.isEmpty()
                || independentProducerTokens(label, candidate).isEmpty()) {
            return Set.of();
        }
        Set<String> observedProducer = WineLabelIdentityNormalizer.producerTokens(
                label.wineryName());
        Set<String> completeCatalogIdentity = new HashSet<>(catalogProducer);
        completeCatalogIdentity.addAll(catalogProduct);
        boolean independentBrandInProductField = catalogProducer.stream().noneMatch(observedProducer::contains)
                && WineLabelIdentityNormalizer.coverage(catalogProducer, significantTokens(label.wineName()))
                        >= MIN_LABEL_IDENTITY_COVERAGE;
        if (!observedProducer.isEmpty() && WineLabelIdentityNormalizer.coverage(
                observedProducer, completeCatalogIdentity) < MIN_LABEL_IDENTITY_COVERAGE
                && !independentBrandInProductField) {
            return Set.of();
        }
        boolean producerAlreadyInExpectedRole = !observedProducer.isEmpty()
                && WineLabelIdentityNormalizer.coverage(
                        observedProducer, catalogProducer)
                        >= MIN_LABEL_IDENTITY_COVERAGE;
        if (producerAlreadyInExpectedRole) {
            return Set.of();
        }
        List<String> observedProducts = new ArrayList<>();
        addIdentityText(observedProducts, label.wineName());
        addIdentityText(observedProducts, label.searchKeywords());
        boolean completeCatalogIdentityVisible = observedProducts.stream()
                .map(WineLabelMatchScorer::significantTokens)
                .anyMatch(observed -> WineLabelIdentityNormalizer.coverage(
                                catalogProducer, observed)
                                >= MIN_LABEL_IDENTITY_COVERAGE
                        && WineLabelIdentityNormalizer.coverage(
                                catalogProduct, observed)
                                >= MIN_PRODUCT_IDENTITY_COVERAGE);
        if (!completeCatalogIdentityVisible) {
            return Set.of();
        }
        Set<String> identity = new HashSet<>(catalogProducer);
        identity.addAll(catalogProduct);
        return Set.copyOf(identity);
    }

    private static Set<String> visibleIdentityTokens(
            ExtractedWineLabel label, Set<String> structuredEvidence) {
        Set<String> contextTokens = new HashSet<>();
        addTokens(contextTokens, label.region());
        addTokens(contextTokens, label.country());
        addTokens(contextTokens, label.wineType());
        Set<String> tokens = new HashSet<>(structuredEvidence);
        label.observedText().stream()
                .filter(value -> significantTokens(value).size()
                        <= MAX_PRODUCT_EVIDENCE_LINE_TOKENS)
                .map(WineLabelMatchScorer::significantTokens)
                .forEach(lineTokens -> {
                    Set<String> identityLineTokens = new HashSet<>(lineTokens);
                    identityLineTokens.removeAll(contextTokens);
                    tokens.addAll(identityLineTokens);
                });
        return tokens;
    }

    private static Set<String> catalogIdentityTokens(
            ExtractedWineLabel label, WineLabelCandidate candidate) {
        Set<String> wineTokens = new HashSet<>(
                significantTokens(candidate.wine().getName()));
        Set<String> visibleTokens = new HashSet<>();
        identityTexts(label).forEach(value ->
                visibleTokens.addAll(significantTokens(value)));
        if (hasText(label.grapeVariety())) {
            candidate.wine().getGrapes().forEach(grape ->
                    wineTokens.addAll(significantTokens(grape)));
        } else if (hasObservedProductDesignation(label, candidate)) {
            // A visible cuvee can identify a product without printed grapes, but a
            // generic varietal alone must never erase the other half of a blend.
            candidate.wine().getGrapes().stream().flatMap(grape -> significantTokens(grape).stream())
                    .filter(token -> !visibleTokens.contains(token)).forEach(wineTokens::remove);
        }
        Set<String> identityTokens = new HashSet<>(wineTokens);
        Set<String> observedProducer = WineLabelIdentityNormalizer.producerTokens(
                label.wineryName());
        boolean publicBrandStoredInWineName = !observedProducer.isEmpty()
                && WineLabelIdentityNormalizer.coverage(
                        observedProducer, wineTokens) >= MIN_LABEL_IDENTITY_COVERAGE;
        if (!publicBrandStoredInWineName) {
            Set<String> catalogProducer = WineLabelIdentityNormalizer.producerTokens(
                    candidate.wineryName());
            boolean observedProducerIsCatalogAlias = !observedProducer.isEmpty()
                    && WineLabelIdentityNormalizer.coverage(
                            observedProducer, catalogProducer)
                            >= MIN_LABEL_IDENTITY_COVERAGE;
            boolean completeCatalogProducerIsVisible = !catalogProducer.isEmpty()
                    && WineLabelIdentityNormalizer.coverage(
                            catalogProducer, visibleTokens)
                            >= MIN_LABEL_IDENTITY_COVERAGE;
            identityTokens.addAll(observedProducerIsCatalogAlias
                    && !completeCatalogProducerIsVisible
                            ? observedProducer : catalogProducer);
        }
        return identityTokens;
    }

    private static boolean hasObservedProductDesignation(ExtractedWineLabel label, WineLabelCandidate candidate) {
        Set<String> designation = new HashSet<>(significantTokens(label.wineName()));
        removeTokens(designation, candidate.wineryName());
        candidate.wine().getGrapes().forEach(grape -> removeTokens(designation, grape));
        return !designation.isEmpty();
    }

    private static boolean producerRepresented(
            ExtractedWineLabel label,
            WineLabelCandidate candidate,
            Set<String> visibleEvidence,
            Set<String> catalogIdentity) {
        Set<String> observedProducer = WineLabelIdentityNormalizer.producerTokens(
                label.wineryName());
        if (!observedProducer.isEmpty()) {
            boolean producerRoleMatches = WineLabelIdentityNormalizer.coverage(
                    observedProducer, catalogIdentity) >= MIN_LABEL_IDENTITY_COVERAGE;
            if (producerRoleMatches) {
                return true;
            }
            return !roleInvertedIdentityAlternative(label, candidate).isEmpty();
        }
        Set<String> catalogProducer = WineLabelIdentityNormalizer.producerTokens(
                candidate.wineryName());
        return !catalogProducer.isEmpty()
                && WineLabelIdentityNormalizer.coverage(
                        catalogProducer, visibleEvidence) >= MIN_LABEL_IDENTITY_COVERAGE;
    }

    /** A varietal repeated in a producer name is not independent evidence of that producer. */
    private static Set<String> independentProducerTokens(
            ExtractedWineLabel label, WineLabelCandidate candidate) {
        Set<String> tokens = new HashSet<>(WineLabelIdentityNormalizer.producerTokens(candidate.wineryName()));
        removeTokens(tokens, label.grapeVariety());
        candidate.wine().getGrapes().forEach(grape -> removeTokens(tokens, grape));
        removeTokens(tokens, label.wineType());
        return tokens;
    }

    private static boolean productRepresented(
            ExtractedWineLabel label, Set<String> catalogIdentity) {
        Set<String> observedProducer = significantTokens(label.wineryName());
        List<Set<String>> alternatives = new ArrayList<>();
        if (hasText(label.searchKeywords())) {
            addProductAlternative(alternatives, label.searchKeywords(), observedProducer);
        } else {
            addProductAlternative(alternatives, label.wineName(), observedProducer);
        }
        return alternatives.stream().anyMatch(productTokens ->
                WineLabelIdentityNormalizer.coverage(productTokens, catalogIdentity)
                        >= MIN_PRODUCT_IDENTITY_COVERAGE);
    }

    private static void addProductAlternative(
            List<Set<String>> alternatives,
            String value,
            Set<String> observedProducer) {
        Set<String> productTokens = new HashSet<>(significantTokens(value));
        productTokens.removeAll(observedProducer);
        if (!productTokens.isEmpty()) {
            alternatives.add(Set.copyOf(productTokens));
        }
    }

    private static boolean vintagesCompatible(Integer left, Integer right) {
        return Objects.isNull(left) || Objects.isNull(right) || Objects.equals(left, right);
    }

    private static boolean textValuesCompatible(String left, String right) {
        return !hasText(left) || !hasText(right)
                || normalize(left).equals(normalize(right));
    }

    private static boolean grapeCollectionsCompatible(
            List<String> left, List<String> right) {
        if (Objects.isNull(left) || left.isEmpty()
                || Objects.isNull(right) || right.isEmpty()) {
            return true;
        }
        return left.stream().anyMatch(leftGrape -> right.stream()
                .anyMatch(rightGrape -> textSimilarity(leftGrape, rightGrape)
                        >= MIN_PRIMARY_SIGNAL));
    }

    private static boolean identityDiscriminatorsMatch(
            ExtractedWineLabel label, WineLabelCandidate candidate) {
        Set<String> observedDiscriminators = observedIdentityDiscriminators(label);
        return observedDiscriminators.isEmpty()
                || WineLabelIdentityNormalizer.coverage(
                        observedDiscriminators,
                        WineLabelIdentityNormalizer.identityDiscriminatorTokens(
                                candidate.wine().getName())) == 1.0;
    }

    private static Set<String> observedIdentityDiscriminators(ExtractedWineLabel label) {
        Set<String> discriminators = new HashSet<>();
        discriminators.addAll(WineLabelIdentityNormalizer.identityDiscriminatorTokens(
                label.wineName()));
        discriminators.addAll(WineLabelIdentityNormalizer.identityDiscriminatorTokens(
                label.searchKeywords()));
        label.observedText().stream().filter(WineLabelIdentityNormalizer::isNumberedProductLine)
                .flatMap(line -> WineLabelIdentityNormalizer.identityDiscriminatorTokens(line).stream())
                .forEach(discriminators::add);
        label.identitySymbols().stream()
                .map(String::trim)
                .filter(symbol -> identitySymbolIsCorroborated(label, symbol))
                .flatMap(symbol -> WineLabelIdentityNormalizer
                        .symbolDiscriminatorTokens(symbol).stream())
                .forEach(discriminators::add);
        return Set.copyOf(discriminators);
    }

    private static boolean identitySymbolIsCorroborated(
            ExtractedWineLabel label, String symbol) {
        return label.observedText().stream()
                .filter(value -> value.length() > 1)
                .filter(value -> !WineLabelIdentityNormalizer.isMeasurementLine(value))
                .anyMatch(value -> value.contains(symbol));
    }

    private static List<String> identityTexts(ExtractedWineLabel label) {
        List<String> values = new ArrayList<>(primaryIdentityTexts(label));
        addIdentityText(values, label.grapeVariety());
        return values;
    }

    private static List<String> primaryIdentityTexts(ExtractedWineLabel label) {
        List<String> values = new ArrayList<>();
        addIdentityText(values, label.wineName());
        addIdentityText(values, label.wineryName());
        addIdentityText(values, label.searchKeywords());
        label.observedText().forEach(value -> addIdentityText(values, value));
        return values;
    }

    private static List<String> productIdentityTexts(ExtractedWineLabel label) {
        List<String> values = new ArrayList<>();
        addIdentityText(values, label.wineName());
        addIdentityText(values, label.searchKeywords());
        addIdentityText(values, label.grapeVariety());
        label.observedText().forEach(value -> addIdentityText(values, value));
        return values;
    }

    private static void addIdentityText(List<String> values, String value) {
        if (hasText(value)) {
            values.add(value);
        }
    }

    private static boolean hasIdentityEvidence(ExtractedWineLabel label) {
        return !primaryIdentityTexts(label).isEmpty();
    }

    private static boolean shouldCompareWinery(
            ExtractedWineLabel label, double winerySignal, double nameSignal) {
        if (nameSignal >= STRONG_PRODUCT_SIGNAL
                && winerySignal < MIN_PRIMARY_SIGNAL
                && !observedIdentityDiscriminators(label).isEmpty()) {
            return false;
        }
        if (hasText(label.wineryName()) || winerySignal >= MIN_PRIMARY_SIGNAL) {
            return true;
        }
        return primaryIdentityTexts(label).stream()
                .map(WineLabelMatchScorer::normalize)
                .filter(term -> !term.isBlank())
                .distinct()
                .limit(2)
                .count() >= 2;
    }

    private static boolean shouldCompareName(ExtractedWineLabel label) {
        if (!hasIdentityEvidence(label)) {
            return false;
        }
        if (hasText(label.wineName())
                || hasText(label.searchKeywords())
                || hasText(label.grapeVariety())) {
            return true;
        }
        String normalizedWinery = normalize(label.wineryName());
        return label.observedText().stream()
                .map(WineLabelMatchScorer::normalize)
                .anyMatch(term -> !term.isBlank() && !term.equals(normalizedWinery));
    }

    private static boolean isDistinctiveIdentity(String value) {
        return normalize(value).replace(" ", "").length()
                >= DISTINCTIVE_IDENTITY_MIN_LENGTH;
    }

    static String normalize(String value) {
        return WineLabelIdentityNormalizer.normalize(value);
    }

    private static boolean hasText(String value) {
        return Objects.nonNull(value) && !value.isBlank();
    }

    private static double round(double value) {
        return Math.round(value * SCORE_PRECISION) / SCORE_PRECISION;
    }

    private record WeightedSignal(double value, double weight) {
    }

    private record IdentityEvidence(
            double labelCoverage,
            double catalogCoverage,
            boolean producerRepresented,
            boolean productRepresented,
            boolean hasStructuredEvidence
    ) {
    }
}
