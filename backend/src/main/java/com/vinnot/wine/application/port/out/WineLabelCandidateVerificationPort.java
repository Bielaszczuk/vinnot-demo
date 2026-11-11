package com.vinnot.wine.application.port.out;

import com.vinnot.wine.domain.model.WineLabelCandidate;

import java.time.Duration;
import java.util.List;
import java.util.Objects;

/**
 * Asks a vision model which catalog candidate is the product in the photo, as label-recognition apps confirm a
 * retrieval shortlist. The model only chooses among the candidates given; it never names a wine itself.
 */
public interface WineLabelCandidateVerificationPort {

    boolean isAvailable();

    Verdict verify(byte[] photo, String contentType, List<WineLabelCandidate> candidates, Duration timeout);

    /**
     * @param choice        zero-based index of the chosen candidate, or null when none is the same product
     * @param confidence    the model's confidence in that choice, 0..1
     * @param labelProducer producer or brand as the model read it on the label, or null
     * @param labelProduct  product name as the model read it (line, vineyard, grape, style), or null
     */
    record Verdict(Integer choice, double confidence, String labelProducer, String labelProduct) {

        public static Verdict none() {
            return new Verdict(null, 0.0, null, null);
        }

        public boolean chose(int candidateCount) {
            return Objects.nonNull(choice) && choice >= 0 && choice < candidateCount;
        }
    }
}
