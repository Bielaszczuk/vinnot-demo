package com.vinnot.community.application.port.out;

import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.time.Instant;
import java.util.UUID;

public interface UserBlockRepositoryPort {
    long countBlocked(UUID blocker);

    boolean userExists(UUID userId);

    void block(UUID blocker, UUID blocked);

    void unblock(UUID blocker, UUID blocked);

    PageResult<BlockedUser> findBlocked(UUID blocker, PageQuery page);

    record BlockedUser(UUID userId, String username, Instant blockedAt) { }
}
