package com.vinnot.ai.application.service;

import com.vinnot.ai.domain.valueobject.AiContentLanguage;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiProfilePromptLocaleTest {

    @Test
    void resolvesSpanishLocaleAndVocabulary() {
        AiProfilePromptLocale locale = AiProfilePromptLocale.from(AiContentLanguage.SPANISH);

        assertThat(locale).isEqualTo(AiProfilePromptLocale.SPANISH);
        assertThat(locale.languageLabel()).isEqualTo("Spanish (Argentina)");
        assertThat(locale.profileSchema())
                .contains("\"summary\": \"\"", "\"bodyScore\": null", "\"primaryAromas\": []")
                .doesNotContain("No documentado", "Not documented", "Cristalino", "Guardar 2-5 años");
    }

    @Test
    void exposesEnglishVocabulary() {
        assertThat(AiProfilePromptLocale.from(AiContentLanguage.ENGLISH))
                .isEqualTo(AiProfilePromptLocale.ENGLISH);
        assertThat(AiProfilePromptLocale.ENGLISH.languageLabel()).isEqualTo("English");
        assertThat(AiProfilePromptLocale.ENGLISH.profileSchema())
                .contains("\"summary\": \"\"", "\"bodyScore\": null", "\"primaryAromas\": []")
                .doesNotContain("No documentado", "Not documented", "Crystal clear", "Age 2-5 years");
    }
}
