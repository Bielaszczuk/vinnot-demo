package com.vinnot.wine.infrastructure.scheduling;

import com.vinnot.wine.application.port.in.ComputeTasteAffinitiesUseCase;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.annotation.Scheduled;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TasteAffinitySchedulerTest {
    @Test
    void eachNightRecomputesTheAffinities() {
        var useCase = mock(ComputeTasteAffinitiesUseCase.class);
        when(useCase.execute(any())).thenReturn(7);

        new TasteAffinityScheduler(useCase).recompute();

        verify(useCase).execute(any());
    }

    @Test
    void theNightlyTimeIsOfAnExplicitZoneNotTheServers() throws NoSuchMethodException {
        Scheduled schedule = TasteAffinityScheduler.class.getMethod("recompute").getAnnotation(Scheduled.class);

        assertThat(schedule.zone()).isEqualTo("${app.recommendations.affinities.zone:UTC}");
    }
}
