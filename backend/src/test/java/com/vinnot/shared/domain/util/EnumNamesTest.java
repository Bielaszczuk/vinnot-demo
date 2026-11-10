package com.vinnot.shared.domain.util;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;

import static org.assertj.core.api.Assertions.assertThat;

class EnumNamesTest {
    @Test
    void findsAConstantByItsExactNameAndNothingForUnknownOrMissingNames() {
        assertThat(EnumNames.find(DayOfWeek.class, "MONDAY")).contains(DayOfWeek.MONDAY);
        assertThat(EnumNames.find(DayOfWeek.class, "monday")).isEmpty();
        assertThat(EnumNames.find(DayOfWeek.class, "HOLIDAY")).isEmpty();
        assertThat(EnumNames.find(DayOfWeek.class, null)).isEmpty();
    }
}
