package com.vinnot.notification.application.port.out;

import com.vinnot.notification.application.model.PushOpen;
import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public interface PushOpenStorePort {
    /** @return true when the open was new; false for a ref already stored or an account that no longer exists */
    boolean save(UUID userId, String ref, NotificationType type, Instant openedAt);

    List<PushOpen> findSince(Collection<UUID> userIds, Set<NotificationType> types, Instant since);

    Map<NotificationType, Long> countByTypeSince(Instant since);
}
