package com.vinnot.wine.application.service;

import com.vinnot.shared.application.exception.ExternalServiceUnavailableException;
import com.vinnot.wine.application.port.out.WineryQueryPort;
import com.vinnot.wine.application.port.out.WineLabelAliasPort;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import com.vinnot.wine.domain.model.Wine;
import com.vinnot.wine.domain.model.WineLabelCandidate;
import com.vinnot.wine.domain.model.WineLabelAliasCategory;
import com.vinnot.wine.domain.service.WineLabelMatchScorer;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Application service that composes candidate retrieval with the pure domain
 * ranking policy.
 */
@Service
@RequiredArgsConstructor
public class WineLabelCatalogMatcher {

    private static final Logger LOG = LoggerFactory.getLogger(
            WineLabelCatalogMatcher.class);
    private static final double MIN_EXACT_LEAD = 0.06;
    private static final Duration EXPANSION_BUDGET = Duration.ofSeconds(2);
    private static final Duration EXPANSION_HEADROOM = Duration.ofSeconds(3);

    private final WineLabelCandidateRetriever candidateRetriever;
    private final WineryQueryPort wineryQueryPort;
    private final WineLabelMatchScorer matchScorer;
    private final WineLabelAliasPort aliasPort;

    public MatchResult match(ExtractedWineLabel label) {
        return match(label, new WineLabelScanDeadline(WineLabelScanDeadline.DEFAULT_BUDGET));
    }

    public MatchResult match(ExtractedWineLabel label, WineLabelScanDeadline deadline) {
        deadline.remaining();
        if (!label.wineLabel()) {
            return MatchResult.empty();
        }
        ExtractedWineLabel canonicalLabel = canonicalize(label);
        List<Wine> wines = candidateRetriever.retrieve(canonicalLabel, deadline);
        MatchResult result = rank(canonicalLabel, wines);
        if (!wines.isEmpty() && !result.exact()
                && (result.ranked().isEmpty() || result.ranked().getFirst().score()
                        < WineLabelMatchScorer.COMPLETE_IDENTITY_MATCH_THRESHOLD)) {
            if (deadline.remaining().compareTo(EXPANSION_HEADROOM) <= 0) {
                if (result.ranked().isEmpty()) {
                    throw new ExternalServiceUnavailableException("LABEL_SCAN_TIMEOUT",
                            "Insufficient time to complete wine-label candidate retrieval", null);
                }
                return result;
            }
            Map<UUID, Wine> union = new LinkedHashMap<>();
            wines.forEach(wine -> union.put(wine.getId(), wine));
            try {
                candidateRetriever.retrieveApproximate(canonicalLabel, deadline.limitedTo(EXPANSION_BUDGET))
                        .forEach(wine -> union.putIfAbsent(wine.getId(), wine));
            } catch (ExternalServiceUnavailableException exception) {
                // A failed optional expansion must not discard usable indexed matches.
                // Without usable matches, a technical failure is never reported as NO_MATCH.
                if (result.ranked().isEmpty() || !("LABEL_CATALOG_UNAVAILABLE".equals(exception.getCode())
                        || "LABEL_SCAN_TIMEOUT".equals(exception.getCode()))) {
                    throw exception;
                }
                LOG.debug("Optional wine-label expansion timed out; retaining indexed suggestions");
            }
            if (union.size() > wines.size()) {
                result = rank(canonicalLabel, List.copyOf(union.values()));
            }
        }
        deadline.remaining();
        return result;
    }

    private MatchResult rank(ExtractedWineLabel canonicalLabel, List<Wine> wines) {
        Map<UUID, WineryQueryPort.WineryData> wineries = wineryQueryPort.findAllByIds(
                        wines.stream()
                                .map(Wine::getWineryId)
                                .filter(Objects::nonNull)
                                .distinct()
                                .toList())
                .stream()
                .collect(Collectors.toMap(WineryQueryPort.WineryData::id, Function.identity()));
        List<RankedWineLabelCandidate> rawRanked = matchScorer.rank(
                canonicalLabel,
                wines.stream()
                        .map(wine -> new WineLabelCandidate(
                                wine, wineryName(wine, wineries)))
                        .toList());
        LOG.debug("Wine-label matcher retrieved={} ranked={}",
                wines.size(), rawRanked.size());
        List<RankedWineLabelCandidate> ranked = consolidateEquivalent(
                canonicalLabel, rawRanked);
        if (!ranked.isEmpty() && matchScorer.isExact(canonicalLabel, ranked.getFirst())) {
            List<RankedWineLabelCandidate> symbolVariants = ranked.stream().skip(1)
                    .filter(candidate -> matchScorer.isUnobservedSymbolVariant(
                            canonicalLabel, rawRanked.getFirst().candidate(), candidate.candidate())).toList();
            if (!symbolVariants.isEmpty()) {
                List<RankedWineLabelCandidate> ambiguous = new ArrayList<>();
                ambiguous.add(ranked.getFirst());
                ambiguous.addAll(symbolVariants);
                return new MatchResult(List.copyOf(ambiguous), wineries, false);
            }
        }
        boolean exact = isUnambiguousExact(canonicalLabel, ranked);
        return new MatchResult(
                ranked,
                wineries,
                exact);
    }

    private ExtractedWineLabel canonicalize(ExtractedWineLabel label) {
        return new ExtractedWineLabel(
                aliasPort.canonicalize(WineLabelAliasCategory.WINERY, label.wineryName()),
                label.wineName(),
                aliasPort.canonicalize(WineLabelAliasCategory.GRAPE, label.grapeVariety()),
                label.vintage(), label.wineType(),
                aliasPort.canonicalize(WineLabelAliasCategory.REGION, label.region()),
                label.country(), label.alcoholContent(), label.extractionConfidence(),
                label.searchKeywords(), label.visualDescription(), label.wineLabel(),
                label.observedText(), label.identitySymbols());
    }

    private boolean isUnambiguousExact(
            ExtractedWineLabel label, List<RankedWineLabelCandidate> ranked) {
        if (ranked.isEmpty() || !matchScorer.isExact(label, ranked.getFirst())) {
            return false;
        }
        RankedWineLabelCandidate competingExact = ranked.stream()
                .skip(1)
                .filter(candidate -> matchScorer.isExact(label, candidate))
                .findFirst()
                .orElse(null);
        if (Objects.isNull(competingExact)) {
            return true;
        }
        return ranked.getFirst().score() - competingExact.score() >= MIN_EXACT_LEAD;
    }

    private List<RankedWineLabelCandidate> consolidateEquivalent(
            ExtractedWineLabel label, List<RankedWineLabelCandidate> ranked) {
        List<RankedWineLabelCandidate> consolidated = new ArrayList<>();
        for (RankedWineLabelCandidate candidate : ranked) {
            boolean alreadyRepresented = consolidated.stream().anyMatch(existing ->
                    matchScorer.representsSameCatalogIdentity(
                            label, existing, candidate));
            if (!alreadyRepresented) {
                consolidated.add(candidate);
            }
        }
        return List.copyOf(consolidated);
    }

    private String wineryName(
            Wine wine, Map<UUID, WineryQueryPort.WineryData> wineries) {
        if (Objects.isNull(wine.getWineryId())) {
            return null;
        }
        WineryQueryPort.WineryData winery = wineries.get(wine.getWineryId());
        return Objects.nonNull(winery) ? winery.name() : null;
    }

    public record MatchResult(
            List<RankedWineLabelCandidate> ranked,
            Map<UUID, WineryQueryPort.WineryData> wineries,
            boolean exact
    ) {
        private static MatchResult empty() {
            return new MatchResult(List.of(), Map.of(), false);
        }
    }
}
