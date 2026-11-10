package com.vinnot.shared.infrastructure.phone;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LibPhoneNumberNormalizerTest {
    private final LibPhoneNumberNormalizer normalizer = new LibPhoneNumberNormalizer();

    @Test
    void formatsInternationalContactsWithoutInferringTheCountry() {
        assertThat(normalizer.normalizeOptional(" +54 9 (11) 2345-6789 ")).isEqualTo("+5491123456789");
        assertThat(normalizer.normalizeOptional("+1 (415) 555-2671")).isEqualTo("+14155552671");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"  "})
    void emptyContactClearsTheOptionalValue(String input) {
        assertThat(normalizer.normalizeOptional(input)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"1123456789", "+999123456789", "+1", "+1234", "+54abc", "+14155552671 ext 4",
            "+0000000000000000000000000000000000000000000000000000"})
    void rejectsInvalidNumbersWithASafeCode(String input) {
        assertThatThrownBy(() -> normalizer.normalizeOptional(input))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("INVALID_PHONE_NUMBER");
    }
}
