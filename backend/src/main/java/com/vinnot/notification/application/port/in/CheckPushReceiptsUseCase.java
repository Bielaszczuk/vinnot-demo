package com.vinnot.notification.application.port.in;

import java.time.Instant;

/** Reads the provider's delivery receipts and forgets devices that are no longer registered. */
public interface CheckPushReceiptsUseCase {
    /** @return how many receipts were checked */
    int execute(Instant now);
}
