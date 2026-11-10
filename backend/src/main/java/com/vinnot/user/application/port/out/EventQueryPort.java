package com.vinnot.user.application.port.out;

import java.util.UUID;

public interface EventQueryPort {

    /**
     * Counts event registrations for a user.
     *
     * @param userId the user ID
     * @return the count
     */
    long countRegistrationsByUserId(UUID userId);
}
