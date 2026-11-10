package com.vinnot.activity.domain.model;

import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.OptionalInt;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OpenHourHistogramTest {

    @Test
    void theUsualHourIsTheHourWithTheMostOpens() {
        var histogram = new OpenHourHistogram(Map.of(8, 2, 20, 5, 13, 1));

        assertThat(histogram.usualHour()).isEqualTo(OptionalInt.of(20));
        assertThat(histogram.opens()).isEqualTo(8);
    }

    @Test
    void aTieGoesToTheEarliestHour() {
        assertThat(new OpenHourHistogram(Map.of(21, 3, 9, 3)).usualHour()).isEqualTo(OptionalInt.of(9));
    }

    @Test
    void withoutOpensThereIsNoUsualHour() {
        assertThat(OpenHourHistogram.empty().usualHour()).isEmpty();
        assertThat(new OpenHourHistogram(null).usualHour()).isEmpty();
    }

    @Test
    void onlyHoursOfTheDayWithPositiveCountsAreValid() {
        assertThatThrownBy(() -> new OpenHourHistogram(Map.of(24, 1)))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_OPEN_HOUR");
        assertThatThrownBy(() -> new OpenHourHistogram(Map.of(-1, 1)))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> new OpenHourHistogram(Map.of(10, 0)))
                .isInstanceOf(DomainException.class)
                .hasFieldOrPropertyWithValue("code", "INVALID_OPEN_HOUR");
    }

    @Test
    void aRhythmExposesTheUsualOpenHourOfItsHistogram() {
        UUID user = UUID.randomUUID();
        Instant lastActive = Instant.parse("2026-10-20T22:00:00Z");

        assertThat(new ActivityRhythm(user, lastActive, new OpenHourHistogram(Map.of(19, 4))).usualOpenHour())
                .isEqualTo(OptionalInt.of(19));
        assertThat(new ActivityRhythm(user, lastActive, null).usualOpenHour()).isEmpty();
        assertThatThrownBy(() -> new ActivityRhythm(null, lastActive, null)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new ActivityRhythm(user, null, null)).isInstanceOf(NullPointerException.class);
    }

    @Test
    void contentKindsAreTheFourDetailScreens() {
        assertThat(ContentKind.values()).containsExactly(
                ContentKind.WINE, ContentKind.ROUTE, ContentKind.EVENT, ContentKind.WINERY);
    }
}
