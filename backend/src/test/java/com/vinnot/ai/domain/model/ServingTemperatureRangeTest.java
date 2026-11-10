package com.vinnot.ai.domain.model;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ServingTemperatureRangeTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            16–18 °C                                        | 16 | 18
            16-18 °C                                        | 16 | 18
            16-18C                                          | 16 | 18
            16 a 18 °C                                      | 16 | 18
            Entre 16 y 18 ºC                                | 16 | 18
            Entre 16 °C y 18 °C                             | 16 | 18
            Serve at 10 to 12 °C                            | 10 | 12
            Servir a 8 °C                                   |  8 |  8
            8°C                                             |  8 |  8
            Servir a 14-16 °C (57-61 °F)                    | 14 | 16
            Servir a 16-18 °C; en verano, 15 °C             | 16 | 18
            Entre 16 y 18 grados                            | 16 | 18
            """)
    void readsTheFirstTemperatureRange(String temperature, int min, int max) {
        assertThat(ServingTemperatureRange.fromDescription(temperature)).contains(new ServingTemperatureRange(min, max));
    }

    @Test
    void ordersAReversedRange() {
        assertThat(ServingTemperatureRange.fromDescription("18-16 °C")).contains(new ServingTemperatureRange(16, 18));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"  ", "Bien fresco", "57-61 °F", "Decantar 30-60 minutos", "75 cl"})
    void readsNoTemperatureWithoutACelsiusValue(String temperature) {
        assertThat(ServingTemperatureRange.fromDescription(temperature)).isEmpty();
    }

    @Test
    void rejectsAMinimumAboveTheMaximum() {
        assertThatThrownBy(() -> new ServingTemperatureRange(18, 16)).isInstanceOf(IllegalArgumentException.class);
    }
}
