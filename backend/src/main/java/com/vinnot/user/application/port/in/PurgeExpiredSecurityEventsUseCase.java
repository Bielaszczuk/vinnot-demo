package com.vinnot.user.application.port.in;

/** Deletes security events older than the retention window (180 days by default, #482). */
public interface PurgeExpiredSecurityEventsUseCase {
    /** @return how many rows were deleted */
    int execute();
}
