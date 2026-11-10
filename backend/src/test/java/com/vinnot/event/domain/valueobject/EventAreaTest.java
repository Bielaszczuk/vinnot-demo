package com.vinnot.event.domain.valueobject;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EventAreaTest {
    @Test
    void anApproximateLocationIsRoundedToATenthOfADegreeAndNeverPrinted() {
        EventArea area = EventArea.approximate(-32.889458, -68.845839);
        assertThat(area.isRegion()).isFalse();
        assertThat(area.latitude()).isEqualTo(new BigDecimal("-32.9"));
        assertThat(area.longitude()).isEqualTo(new BigDecimal("-68.8"));
        assertThat(area.regionId()).isNull();
        assertThat(area).isEqualTo(EventArea.approximate(-32.94, -68.84)).hasSameHashCodeAs(EventArea.approximate(-32.94, -68.84));
        assertThat(area.toString()).isEqualTo("EventArea[approximate]").doesNotContain("32");
    }

    @Test
    void aRegionAreaKeepsOnlyTheRegion() {
        UUID region = UUID.randomUUID();
        EventArea area = EventArea.region(region);
        assertThat(area.isRegion()).isTrue();
        assertThat(area.regionId()).isEqualTo(region);
        assertThat(area.latitude()).isNull();
        assertThat(area).isNotEqualTo(EventArea.approximate(0, 0)).isNotEqualTo("region");
        assertThat(area.toString()).contains(region.toString());
    }

    @Test
    void refusesImpossibleLocationsAndAMissingRegion() {
        assertThatThrownBy(() -> EventArea.approximate(91, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> EventArea.approximate(0, -180.5)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> EventArea.approximate(Double.NaN, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> EventArea.region(null)).isInstanceOf(NullPointerException.class);
    }
}
