package com.vinnot.event.application.port.out;

import java.util.UUID;

/**
 * Points for attending events (#455), in the transaction that changes the registration. Both calls are idempotent:
 * the same confirmed registration earns once, and ending one that earned nothing changes nothing.
 */
public interface EventRegistrationPointsPort {
    void registrationConfirmed(UUID userId, UUID registrationId, UUID eventId);

    /** The registration was cancelled, rejected or expired. */
    void registrationEnded(UUID userId, UUID registrationId);
}
