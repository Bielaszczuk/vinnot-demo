package com.vinnot.community.application.port.in;

import java.util.UUID;

public interface CheckCommunityProfileUseCase {
    void execute(UUID viewer, UUID author);
}
