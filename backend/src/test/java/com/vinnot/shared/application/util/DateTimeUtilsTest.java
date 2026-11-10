package com.vinnot.shared.application.util;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.format.DateTimeParseException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DateTimeUtilsTest {

    @Test
    void parsesZonedAndLocalFrontendFormatsAsUtc() {
        assertThat(DateTimeUtils.parseFlexibleInstant("2026-03-07T23:26:00Z"))
                .isEqualTo(Instant.parse("2026-03-07T23:26:00Z"));
        assertThat(DateTimeUtils.parseFlexibleInstant("2026-03-07T23:26:00"))
                .isEqualTo(Instant.parse("2026-03-07T23:26:00Z"));
        assertThat(DateTimeUtils.parseFlexibleInstant("2026-03-07T23:26"))
                .isEqualTo(Instant.parse("2026-03-07T23:26:00Z"));
    }

    @Test
    void treatsBlankAsAbsentAndRejectsMalformedValues() {
        assertThat(DateTimeUtils.parseFlexibleInstant(null)).isNull();
        assertThat(DateTimeUtils.parseFlexibleInstant("  ")).isNull();
        assertThatThrownBy(() -> DateTimeUtils.parseFlexibleInstant("not-a-date"))
                .isInstanceOf(DateTimeParseException.class);
    }
}
