package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PreferredLanguageTest {

    @Test
    void acceptsSupportedLanguagesCaseInsensitively() {
        assertThat(PreferredLanguage.of("es").getValue()).isEqualTo("es");
        assertThat(PreferredLanguage.of(" EN ").getValue()).isEqualTo("en");
        assertThat(PreferredLanguage.of("en")).isEqualTo(PreferredLanguage.of("EN"));
    }

    @Test
    void defaultsToSpanish() {
        assertThat(PreferredLanguage.DEFAULT.getValue()).isEqualTo("es");
    }

    @Test
    void rejectsUnsupportedOrMissingLanguages() {
        for (String value : new String[]{"pt", "es-AR", "", "  ", null}) {
            assertThatThrownBy(() -> PreferredLanguage.of(value))
                    .isInstanceOf(DomainException.class)
                    .extracting("code")
                    .isEqualTo("INVALID_PREFERRED_LANGUAGE");
        }
    }
}
