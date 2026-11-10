package com.vinnot.user.application.port.out;

import java.util.Set;
import java.util.UUID;

/**
 * Driven port: loads the flat set of permission codes for a given user,
 * aggregated across all their roles.
 */
public interface PermissionRepositoryPort {

    /**
     * Returns all permission codes assigned to the user through their roles.
     * Used at login time to embed permissions in the JWT.
     *
     * @param userId the user ID
     * @return set of permission code strings (e.g. "WINE_CREATE", "EVENT_UPDATE_OWN")
     */
    Set<String> findPermissionCodesByUserId(UUID userId);
}
