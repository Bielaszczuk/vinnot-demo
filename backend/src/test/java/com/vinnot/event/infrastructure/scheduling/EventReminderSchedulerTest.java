package com.vinnot.event.infrastructure.scheduling;

import com.vinnot.event.application.port.in.SendEventRemindersUseCase;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;

class EventReminderSchedulerTest {
    @Test
    void eachRunAsksForTheRemindersDueNow() {
        var useCase = mock(SendEventRemindersUseCase.class);
        when(useCase.execute(any())).thenReturn(3, 0);
        var scheduler = new EventReminderScheduler(useCase);
        Instant before = Instant.now();

        scheduler.sendDue();
        scheduler.sendDue();

        var captor = ArgumentCaptor.forClass(Instant.class);
        verify(useCase, times(2)).execute(captor.capture());
        assertThat(captor.getAllValues()).allSatisfy(now -> assertThat(now).isAfterOrEqualTo(before));
    }
}
