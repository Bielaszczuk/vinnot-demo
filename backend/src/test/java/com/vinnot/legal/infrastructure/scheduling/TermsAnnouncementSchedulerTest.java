package com.vinnot.legal.infrastructure.scheduling;

import com.vinnot.legal.application.port.in.AnnounceTermsUpdateUseCase;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TermsAnnouncementSchedulerTest {
    @Test
    void eachRunAnnouncesTheNextBatch() {
        var useCase = mock(AnnounceTermsUpdateUseCase.class);
        when(useCase.execute(any())).thenReturn(500, 0);
        var scheduler = new TermsAnnouncementScheduler(useCase);

        scheduler.announce();
        scheduler.announce();

        verify(useCase, times(2)).execute(any());
    }
}
