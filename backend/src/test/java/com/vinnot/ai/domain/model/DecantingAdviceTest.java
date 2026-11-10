package com.vinnot.ai.domain.model;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class DecantingAdviceTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "Decantar 45 minutos",
            "Se recomienda decantar 30 minutos antes de servir",
            "Conviene airearlo unos minutos en la copa",
            "Decant for 30-60 minutes to open the tannins",
            "Benefits from aeration",
            "Oxigenar 20 minutos",
            "Sí, 30 minutos",
            "Yes, 30 minutes"})
    void recommendsDecantingWhenTheTextAdvisesIt(String decanting) {
        assertThat(DecantingAdvice.recommends(decanting)).isTrue();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {
            "No requiere decantación",
            "No necesita decantación; servir directamente",
            "No es necesario decantarlo",
            "Decantación innecesaria",
            "No decantar: es un blanco joven",
            "Decanting is not necessary",
            "No need to decant",
            "Decanting unnecessary",
            "Not required",
            "No necesario",
            "Not necessary",
            "Servir directamente",
            "Si el vino es joven, servir directo"})
    void doesNotRecommendDecantingOtherwise(String decanting) {
        assertThat(DecantingAdvice.recommends(decanting)).isFalse();
    }
}
