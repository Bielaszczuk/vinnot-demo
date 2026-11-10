package com.vinnot.activity.application.port.in;

/** Deletes views and app opens older than the retention window (180 days by default). */
public interface PurgeExpiredActivityUseCase {
    /** @return how many rows were deleted */
    int execute();
}
