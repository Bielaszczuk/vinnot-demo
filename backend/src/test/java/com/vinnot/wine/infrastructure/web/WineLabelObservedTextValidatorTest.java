package com.vinnot.wine.infrastructure.web;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WineLabelObservedTextValidatorTest {

    private final WineLabelObservedTextValidator validator =
            new WineLabelObservedTextValidator();

    @Test
    void normalizesWhitespaceAndRemovesCaseInsensitiveDuplicates() {
        List<String> result = validator.validate(List.of(
                "  FORASTERO  ",
                "Malbec",
                "forastero",
                "   "));

        assertThat(result).containsExactly("FORASTERO", "Malbec");
    }

    @Test
    void acceptsMissingOcrEvidenceForVisualFallback() {
        assertThat(validator.validate(null)).isEmpty();
    }

    @Test
    void rejectsAnExcessiveNumberOfLines() {
        List<String> lines = Collections.nCopies(25, "wine");

        assertThatThrownBy(() -> validator.validate(lines))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("too many lines");
    }
}
