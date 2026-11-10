package com.vinnot.event.infrastructure.scheduling;

import com.vinnot.event.application.port.in.SendOrganizerDigestsUseCase;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OrganizerDigestSchedulerTest {
    @Test
    void eachRunSendsTheDigestsDueNow() {
        var useCase = mock(SendOrganizerDigestsUseCase.class);
        when(useCase.execute()).thenReturn(2, 0);
        var scheduler = new OrganizerDigestScheduler(useCase);

        scheduler.sendDue();
        scheduler.sendDue();

        verify(useCase, times(2)).execute();
    }
}
