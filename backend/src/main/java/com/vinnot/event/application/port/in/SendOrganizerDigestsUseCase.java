package com.vinnot.event.application.port.in;

/** Pushes every due organizer digest; returns how many were queued. */
public interface SendOrganizerDigestsUseCase {
    int execute();
}
