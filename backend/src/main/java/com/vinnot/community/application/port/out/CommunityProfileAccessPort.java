package com.vinnot.community.application.port.out;

import java.util.UUID;

public interface CommunityProfileAccessPort {
    boolean blockedBetween(UUID viewer, UUID author);
}
