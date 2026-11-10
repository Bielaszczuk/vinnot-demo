package com.vinnot.event.application.port.in;

import java.time.Instant;

/** Reminds confirmed attendees of events starting soon. */
public interface SendEventRemindersUseCase {
    /**
     * @param now the current instant
     * @return how many reminders were queued
     */
    int execute(Instant now);
}
