package com.vinnot.user.application.port.out;

import java.util.UUID;

public interface ReauthenticationProofPort {
    String issue(UUID userId, String sessionBinding);
    boolean permits(String proof, UUID userId, String sessionBinding);
}
