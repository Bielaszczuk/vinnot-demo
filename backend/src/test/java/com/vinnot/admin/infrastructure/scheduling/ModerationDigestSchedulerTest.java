package com.vinnot.admin.infrastructure.scheduling;

import com.vinnot.admin.application.port.in.SendModerationDigestUseCase;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ModerationDigestSchedulerTest {
    @Test
    void eachRunSendsTheDigestOfNewWork() {
        var useCase = mock(SendModerationDigestUseCase.class);
        when(useCase.execute(any())).thenReturn(2, 0);
        var scheduler = new ModerationDigestScheduler(useCase);

        scheduler.sendDue();
        scheduler.sendDue();

        verify(useCase, times(2)).execute(any());
    }
}
