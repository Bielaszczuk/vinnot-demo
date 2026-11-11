package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.out.WineLabelCandidateVerificationPort;
import com.vinnot.wine.domain.model.ExtractedWineLabel;
import com.vinnot.wine.domain.model.RankedWineLabelCandidate;
import com.vinnot.wine.domain.model.WineLabelCandidate;
import com.vinnot.wine.domain.service.WineLabelPickEvidence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Second look at a scan the catalog could not settle: the vision model reads the label and picks the product from
 * the best text candidates plus the closest label images. A confident pick that the label's words support becomes
 * the exact match; anything else, including a provider failure or too little time left, keeps the catalog result.
 */
@Service
public class WineLabelCandidateVerifier {

    private static final Logger LOG = LoggerFactory.getLogger(WineLabelCandidateVerifier.class);
    static final int TEXT_CANDIDATES = 5;
    static final int VISUAL_CANDIDATES = 3;
    private static final Duration MIN_REMAINING = Duration.ofSeconds(3);
    private static final Duration MAX_TIMEOUT = Duration.ofSeconds(8);
    private static final Duration RESPONSE_HEADROOM = Duration.ofSeconds(1);

    private final WineLabelCandidateVerificationPort verificationPort;
    private final double minConfidence;

    public WineLabelCandidateVerifier(WineLabelCandidateVerificationPort verificationPort,
            @Value("${app.wine-label.verification.min-confidence:0.85}") double minConfidence) {
        if (minConfidence <= 0.0 || minConfidence > 1.0) {
            throw new IllegalArgumentException("app.wine-label.verification.min-confidence must be in (0, 1]");
        }
        this.verificationPort = verificationPort;
        this.minConfidence = minConfidence;
    }

    public WineLabelCatalogMatcher.MatchResult verify(byte[] photo, String contentType, ExtractedWineLabel label,
            WineLabelCatalogMatcher.MatchResult match, WineLabelScanDeadline deadline) {
        if (match.exact() || !verificationPort.isAvailable()) {
            return match;
        }
        List<WineLabelCandidate> shortlist = shortlist(match);
        Duration remaining = deadline.remaining();
        if (shortlist.isEmpty() || remaining.compareTo(MIN_REMAINING) < 0) {
            return match;
        }
        WineLabelCandidateVerificationPort.Verdict verdict;
        try {
            Duration budget = remaining.minus(RESPONSE_HEADROOM);
            verdict = verificationPort.verify(photo, contentType, shortlist,
                    budget.compareTo(MAX_TIMEOUT) < 0 ? budget : MAX_TIMEOUT);
        } catch (RuntimeException failure) {
            LOG.warn("Label candidate verification unavailable: {}", failure.getClass().getSimpleName());
            return match;
        }
        if (!verdict.chose(shortlist.size()) || verdict.confidence() < minConfidence) {
            return match;
        }
        WineLabelCandidate chosen = shortlist.get(verdict.choice());
        // The model tends to pick the closest candidate even when the scanned wine is missing from the list.
        if (!WineLabelPickEvidence.supports(verdict.labelProducer(), verdict.labelProduct(), label.observedText(),
                chosen)) {
            LOG.debug("Label pick rejected: read '{}' / '{}', picked '{}'", verdict.labelProducer(),
                    verdict.labelProduct(), chosen.wine().getName());
            return match;
        }
        List<RankedWineLabelCandidate> ranked = new ArrayList<>();
        ranked.add(new RankedWineLabelCandidate(chosen, verdict.confidence()));
        match.ranked().stream().filter(candidate -> !candidate.candidate().id().equals(chosen.id()))
                .forEach(ranked::add);
        return new WineLabelCatalogMatcher.MatchResult(List.copyOf(ranked), match.wineries(), true, match.visual());
    }

    /** The best text candidates first, then the closest label images that are not already listed. */
    static List<WineLabelCandidate> shortlist(WineLabelCatalogMatcher.MatchResult match) {
        Map<UUID, WineLabelCandidate> shortlist = new LinkedHashMap<>();
        match.ranked().stream().limit(TEXT_CANDIDATES)
                .forEach(candidate -> shortlist.put(candidate.candidate().id(), candidate.candidate()));
        match.visual().stream()
                .filter(candidate -> !shortlist.containsKey(candidate.candidate().id()))
                .limit(VISUAL_CANDIDATES)
                .forEach(candidate -> shortlist.put(candidate.candidate().id(), candidate.candidate()));
        return List.copyOf(shortlist.values());
    }
}
