package com.vinnot.user.application.port.in;

import java.util.Set;
import java.util.UUID;

/**
 * Driving port: returns the flat set of permission codes for a given user.
 * Called at login to include permissions in the JWT.
 */
public interface LoadUserPermissionsUseCase {

    /**
     * @param userId the user ID
     * @return permission codes (e.g. ["WINE_CREATE", "EVENT_UPDATE_OWN", ...])
     */
    Set<String> execute(UUID userId);
}

