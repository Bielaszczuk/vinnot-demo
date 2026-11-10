package com.vinnot.event.domain.valueobject;

import com.vinnot.shared.domain.valueobject.Coordinates;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EventLocationTest {

    @Test
    void formatsOnlyPresentAddressComponentsInOrder() {
        EventLocation location = EventLocation.of(
                "Winery", null, "Mendoza", "Mendoza", "Argentina",
                Coordinates.of(-32.9, -68.8), null);

        assertThat(location.hasCoordinates()).isTrue();
        assertThat(location.getFullAddress())
                .isEqualTo("Winery, Mendoza, Mendoza, Argentina");
        assertThat(location.toString()).isEqualTo(location.getFullAddress());
    }
}
