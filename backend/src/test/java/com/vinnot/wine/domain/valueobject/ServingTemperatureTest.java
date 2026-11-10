package com.vinnot.wine.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ServingTemperatureTest {

    @Test
    void formatsCompleteAndOpenTemperatureRanges() {
        assertThat(ServingTemperature.of(16, 18).getDisplayRange()).isEqualTo("16-18°C");
        assertThat(ServingTemperature.of(16, null).getDisplayRange()).isEqualTo("16°C+");
        assertThat(ServingTemperature.of(null, 10).getDisplayRange()).isEqualTo("Up to 10°C");
        assertThat(ServingTemperature.of(null, null)).isNull();
    }

    @Test
    void rejectsOutOfBoundsAndInvertedRanges() {
        assertThatThrownBy(() -> ServingTemperature.of(-1, 10))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INVALID_TEMPERATURE");
        assertThatThrownBy(() -> ServingTemperature.of(20, 15))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("INVALID_TEMPERATURE_RANGE");
    }
}
