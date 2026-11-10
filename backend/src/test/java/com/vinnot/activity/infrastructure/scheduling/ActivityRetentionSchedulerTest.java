package com.vinnot.activity.infrastructure.scheduling;

import com.vinnot.activity.application.port.in.PurgeExpiredActivityUseCase;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ActivityRetentionSchedulerTest {
    @Test
    void runsThePurgeOnEveryTick() {
        PurgeExpiredActivityUseCase purge = mock(PurgeExpiredActivityUseCase.class);
        when(purge.execute()).thenReturn(3, 0);
        var scheduler = new ActivityRetentionScheduler(purge);

        scheduler.purgeExpired();
        scheduler.purgeExpired();

        verify(purge, times(2)).execute();
    }
}
