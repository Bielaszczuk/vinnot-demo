package com.vinnot.admin.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AppVersionTest {

    @Test
    void parsesThreeNumericPartsAndPrintsThemBack() {
        assertThat(AppVersion.parse("1.10.3")).isEqualTo(new AppVersion(1, 10, 3));
        assertThat(AppVersion.parse("0.2.0")).hasToString("0.2.0");
        assertThat(AppVersion.parse("9999.9999.9999")).hasToString("9999.9999.9999");
        assertThat(AppVersion.parse("01.2.3")).as("one canonical form").hasToString("1.2.3");
    }

    @Test
    void comparesNumericallyPartByPart() {
        assertThat(AppVersion.parse("0.10.0")).isGreaterThan(AppVersion.parse("0.9.9"));
        assertThat(AppVersion.parse("1.0.0")).isGreaterThan(AppVersion.parse("0.9999.9999"));
        assertThat(AppVersion.parse("0.2.1")).isGreaterThan(AppVersion.parse("0.2.0"));
        assertThat(AppVersion.parse("0.2.0")).isEqualByComparingTo(AppVersion.parse("0.2.0"));
        assertThat(AppVersion.parse("0.2.0").isOlderThan(AppVersion.parse("0.3.0"))).isTrue();
        assertThat(AppVersion.parse("0.3.0").isOlderThan(AppVersion.parse("0.3.0"))).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"1.2", "a.b.c", "1.2.3.4", "-1.0.0", "10000.0.0", "1.2.3 ", " 1.2.3", "", "1..3", "1.2.x", "v1.2.3",
            "1.2.3-beta", "١.٢.٣"})
    void rejectsAnythingButThreeIntegersFromZeroTo9999(String value) {
        assertThatThrownBy(() -> AppVersion.parse(value))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_APP_VERSION");
        assertThatThrownBy(() -> AppVersion.parse(null)).isInstanceOf(DomainException.class);
    }

    @Test
    void noValueMeansNoMinimum() {
        assertThat(AppVersion.parseOptional(null)).isEmpty();
        assertThat(AppVersion.parseOptional("0.3.0")).contains(new AppVersion(0, 3, 0));
        assertThatThrownBy(() -> AppVersion.parseOptional("1.2"))
                .hasFieldOrPropertyWithValue("code", "INVALID_APP_VERSION");
    }

    @Test
    void partsOutOfRangeAreRejectedWhenBuiltDirectly() {
        assertThatThrownBy(() -> new AppVersion(-1, 0, 0)).hasFieldOrPropertyWithValue("code", "INVALID_APP_VERSION");
        assertThatThrownBy(() -> new AppVersion(0, 10000, 0)).hasFieldOrPropertyWithValue("code", "INVALID_APP_VERSION");
        assertThatThrownBy(() -> new AppVersion(0, 0, 10000)).hasFieldOrPropertyWithValue("code", "INVALID_APP_VERSION");
    }
}
