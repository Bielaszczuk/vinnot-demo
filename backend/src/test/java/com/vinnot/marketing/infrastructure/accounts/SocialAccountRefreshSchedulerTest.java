package com.vinnot.marketing.infrastructure.accounts;

import com.vinnot.marketing.application.port.in.RefreshSocialAccountsUseCase;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** #510 S5: the scheduler runs the refresh use case. */
class SocialAccountRefreshSchedulerTest {

    @Test
    void runsTheRefresh() {
        RefreshSocialAccountsUseCase refresh = mock(RefreshSocialAccountsUseCase.class);
        when(refresh.refreshDue()).thenReturn(0, 2);
        SocialAccountRefreshScheduler scheduler = new SocialAccountRefreshScheduler(refresh);

        scheduler.refreshDue();
        scheduler.refreshDue();

        verify(refresh, times(2)).refreshDue();
    }
}
