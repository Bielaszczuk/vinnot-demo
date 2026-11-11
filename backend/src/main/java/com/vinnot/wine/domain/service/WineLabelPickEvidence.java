package com.vinnot.wine.domain.service;

import com.vinnot.wine.domain.model.WineLabelCandidate;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Checks a vision model's pick against what the label says, word by word. Models pick the closest candidate even
 * when the scanned wine is missing from the shortlist, so a pick only counts when every product word read on the
 * label is in the candidate and every word of the candidate's name was read on the label.
 */
public final class WineLabelPickEvidence {

    private static final double PRODUCER_SIMILARITY = 0.8;

    private WineLabelPickEvidence() {
    }

    /**
     * @param labelProducer producer or brand as read on the label, may be null
     * @param labelProduct  product name as read on the label (line, vineyard, grape, style), may be null
     * @param observedText  every text line read on the label
     */
    public static boolean supports(String labelProducer, String labelProduct, List<String> observedText,
            WineLabelCandidate candidate) {
        String wineName = candidate.wine().getName();
        String wineryName = Objects.requireNonNullElse(candidate.wineryName(), "");
        Set<String> candidateTokens = withoutVintages(
                WineLabelIdentityNormalizer.significantTokens(wineName + " " + wineryName));
        Set<String> labelTokens = new HashSet<>(WineLabelIdentityNormalizer.significantTokens(
                Objects.requireNonNullElse(labelProducer, "") + " " + Objects.requireNonNullElse(labelProduct, "")));
        observedText.stream().filter(Objects::nonNull)
                .forEach(line -> labelTokens.addAll(WineLabelIdentityNormalizer.significantTokens(line)));

        Set<String> productTokens = withoutVintages(WineLabelIdentityNormalizer.significantTokens(labelProduct));
        productTokens.removeAll(WineLabelIdentityNormalizer.producerTokens(labelProducer));
        if (productTokens.isEmpty() || !candidateTokens.containsAll(productTokens)) {
            return false;
        }
        if (!labelTokens.containsAll(withoutVintages(WineLabelIdentityNormalizer.significantTokens(wineName)))) {
            return false;
        }
        Set<String> producerEvidence = new HashSet<>(labelTokens);
        producerEvidence.removeAll(productTokens);
        return producerAgrees(labelProducer, wineryName, candidateTokens, producerEvidence);
    }

    /** The winery counts as read only from label words outside the product name ("Elementos" is not "5 Elementos"). */
    private static boolean producerAgrees(String labelProducer, String wineryName, Set<String> candidateTokens,
            Set<String> producerEvidence) {
        Set<String> labelProducerTokens = WineLabelIdentityNormalizer.producerTokens(labelProducer);
        if (labelProducerTokens.isEmpty()) {
            return true;
        }
        Set<String> wineryTokens = WineLabelIdentityNormalizer.producerTokens(wineryName);
        return WineLabelIdentityNormalizer.producerSimilarity(labelProducer, wineryName) >= PRODUCER_SIMILARITY
                || candidateTokens.containsAll(labelProducerTokens)
                || (!wineryTokens.isEmpty() && producerEvidence.containsAll(wineryTokens));
    }

    private static Set<String> withoutVintages(Set<String> tokens) {
        return tokens.stream().filter(token -> !WineLabelIdentityNormalizer.isPlausibleVintage(token))
                .collect(Collectors.toCollection(HashSet::new));
    }
}
