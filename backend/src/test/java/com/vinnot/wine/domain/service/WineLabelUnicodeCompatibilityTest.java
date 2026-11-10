package com.vinnot.wine.domain.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WineLabelUnicodeCompatibilityTest {

    @Test
    void transliteratesCompatibilityLettersWithoutChangingOtherScripts() {
        assertThat(WineLabelUnicodeCompatibility.transliterate(
                "ŒUVRE Blåbær Straße Αμαραντον"))
                .isEqualTo("OEUVRE Blåbaer Strasse Αμαραντον");
    }
}
