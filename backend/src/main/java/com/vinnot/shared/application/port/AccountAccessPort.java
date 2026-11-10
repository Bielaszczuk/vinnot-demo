package com.vinnot.shared.application.port;

import java.util.List;
import java.util.UUID;

/** Verifies that a previously issued token still reflects an enabled account. */
public interface AccountAccessPort {
    boolean permits(UUID userId, List<String> tokenRoles, long sessionVersion);
}
