package com.vinnot.wine.domain.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WineLabelLanguageVocabularyTest {

    @Test
    void aggregatesMultilingualStopWordsAndWineTerms() {
        assertThat(WineLabelLanguageVocabulary.allStopWords())
                .contains("de", "the", "les", "della", "dos", "und", "wine", "vino")
                .doesNotContain("malbec", "mendoza");
    }

    @Test
    void aggregatesProducerAndLegalEntityDesignators() {
        assertThat(WineLabelLanguageVocabulary.allProducerDesignators())
                .contains("bodega", "winery", "chateau", "cantina", "quinta", "weingut")
                .contains("sa", "srl", "llc")
                .doesNotContain("reserva");
    }
}
