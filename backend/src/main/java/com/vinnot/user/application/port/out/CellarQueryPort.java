package com.vinnot.user.application.port.out;

import java.util.UUID;

public interface CellarQueryPort {

    /**
     * Counts cellar wines for a user.
     *
     * @param userId the user ID
     * @return the count
     */
    long countByUserId(UUID userId);
}
