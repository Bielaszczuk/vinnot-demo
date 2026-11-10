package com.vinnot.notification.infrastructure.scheduling;

import com.vinnot.notification.application.port.in.DeliverAnnouncementsUseCase;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnnouncementDeliverySchedulerTest {
    @Test
    void eachRunQueuesTheNextBatch() {
        var useCase = mock(DeliverAnnouncementsUseCase.class);
        when(useCase.execute(any())).thenReturn(500, 0);
        var scheduler = new AnnouncementDeliveryScheduler(useCase);

        scheduler.deliver();
        scheduler.deliver();

        verify(useCase, times(2)).execute(any());
    }
}
