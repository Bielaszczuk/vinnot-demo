package com.vinnot.wine.application.service;

import com.vinnot.wine.application.port.out.TasteAffinityStore;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ComputeTasteAffinitiesServiceTest {
    @Test
    void replacesEveryAffinityAtTheGivenTime() {
        Instant now = Instant.parse("2026-10-21T06:40:00Z");
        TasteAffinityStore store = mock(TasteAffinityStore.class);
        when(store.recompute(now)).thenReturn(42);

        assertThat(new ComputeTasteAffinitiesService(store).execute(now)).isEqualTo(42);
    }
}
