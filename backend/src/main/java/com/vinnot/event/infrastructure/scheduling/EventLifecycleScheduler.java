package com.vinnot.event.infrastructure.scheduling;

import com.vinnot.event.application.port.in.MaintainEventLifecycleUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class EventLifecycleScheduler {

    private final MaintainEventLifecycleUseCase maintainEventLifecycleUseCase;

    @Scheduled(
            initialDelayString = "${app.events.lifecycle-initial-delay-ms:60000}",
            fixedDelayString = "${app.events.lifecycle-delay-ms:300000}")
    public void maintainLifecycle() {
        maintainEventLifecycleUseCase.execute(Instant.now());
    }
}
