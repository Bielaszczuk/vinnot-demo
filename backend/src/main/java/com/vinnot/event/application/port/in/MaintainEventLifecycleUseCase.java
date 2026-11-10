package com.vinnot.event.application.port.in;

import java.time.Instant;

public interface MaintainEventLifecycleUseCase {

    void execute(Instant now);
}
