package com.vinnot.user.infrastructure.scheduling;

import com.vinnot.user.application.port.in.PurgeExpiredSecurityEventsUseCase;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SecurityEventRetentionSchedulerTest {
    @Test
    void runsThePurgeOnEveryTick() {
        PurgeExpiredSecurityEventsUseCase purge = mock(PurgeExpiredSecurityEventsUseCase.class);
        when(purge.execute()).thenReturn(3, 0);
        var scheduler = new SecurityEventRetentionScheduler(purge);

        scheduler.purgeExpired();
        scheduler.purgeExpired();

        verify(purge, times(2)).execute();
    }
}
