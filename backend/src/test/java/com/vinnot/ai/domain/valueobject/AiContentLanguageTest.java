package com.vinnot.ai.domain.valueobject;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiContentLanguageTest {

    @Test
    void resolvesRegionalTagsToCanonicalLanguages() {
        assertThat(AiContentLanguage.from("en-US")).isEqualTo(AiContentLanguage.ENGLISH);
        assertThat(AiContentLanguage.from("EN-gb")).isEqualTo(AiContentLanguage.ENGLISH);
        assertThat(AiContentLanguage.from("es-AR")).isEqualTo(AiContentLanguage.SPANISH);
    }

    @Test
    void defaultsUnsupportedOrMissingLanguagesToSpanish() {
        assertThat(AiContentLanguage.from("pt-BR")).isEqualTo(AiContentLanguage.SPANISH);
        assertThat(AiContentLanguage.from(null)).isEqualTo(AiContentLanguage.SPANISH);
        assertThat(AiContentLanguage.SPANISH.code()).isEqualTo("es");
        assertThat(AiContentLanguage.ENGLISH.code()).isEqualTo("en");
    }
}
