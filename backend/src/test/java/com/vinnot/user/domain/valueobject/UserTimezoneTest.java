package com.vinnot.user.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserTimezoneTest {

    @Test
    void acceptsIanaZoneIds() {
        UserTimezone madrid = UserTimezone.of(" Europe/Madrid ");

        assertThat(madrid.getValue()).isEqualTo("Europe/Madrid");
        assertThat(madrid.toZoneId()).isEqualTo(ZoneId.of("Europe/Madrid"));
        assertThat(UserTimezone.of("UTC").getValue()).isEqualTo("UTC");
    }

    @Test
    void defaultsToBuenosAires() {
        assertThat(UserTimezone.DEFAULT.getValue()).isEqualTo("America/Argentina/Buenos_Aires");
    }

    @Test
    void rejectsOffsetsUnknownZonesAndMissingValues() {
        for (String value : new String[]{"+03:00", "GMT-3", "Mars/Olympus", "europe/madrid", "", null}) {
            assertThatThrownBy(() -> UserTimezone.of(value))
                    .isInstanceOf(DomainException.class)
                    .extracting("code")
                    .isEqualTo("INVALID_TIMEZONE");
        }
    }
}
