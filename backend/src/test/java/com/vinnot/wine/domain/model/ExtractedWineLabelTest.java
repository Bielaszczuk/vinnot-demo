package com.vinnot.wine.domain.model;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExtractedWineLabelTest {

    @Test
    void clampsConfidenceAndDefensivelyCopiesObservedText() {
        List<String> observed = new ArrayList<>(List.of("Malbec"));
        ExtractedWineLabel label = label(1.5, observed);
        observed.add("Mendoza");

        assertThat(label.extractionConfidence()).isEqualTo(1.0);
        assertThat(label.observedText()).containsExactly("Malbec");
        assertThatThrownBy(() -> label.observedText().add("Other"))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThat(label(-1.0, null).extractionConfidence()).isZero();
    }

    @Test
    void createsNeutralEmptyExtraction() {
        ExtractedWineLabel empty = ExtractedWineLabel.empty();

        assertThat(empty.wineLabel()).isFalse();
        assertThat(empty.observedText()).isEmpty();
        assertThat(empty.extractionConfidence()).isZero();
    }

    private ExtractedWineLabel label(double confidence, List<String> observed) {
        return new ExtractedWineLabel(
                null, null, null, null, null, null, null, null,
                confidence, null, null, true, observed);
    }
}
