package com.vinnot.wine.domain.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WineLabelIdentitySymbolTest {

    @Test
    void recognizesExplicitSymbolsAndStandaloneMultiplicationAliases() {
        assertThat(WineLabelIdentitySymbol.discriminatorTokens(
                "100 X 100 [+] #007"))
                .contains("__symbol_multiplication__", "__symbol_plus__",
                        "__symbol_hash__");
    }

    @Test
    void doesNotTreatAnEmbeddedLetterXAsAMultiplicationSymbol() {
        assertThat(WineLabelIdentitySymbol.discriminatorTokens("Exquisite"))
                .doesNotContain("__symbol_multiplication__");
    }
}
