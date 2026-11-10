package com.vinnot.notification.application.port.in;

import com.vinnot.notification.application.model.PushOpen;
import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Records which pushes users open, and reads them for fatigue rules and metrics (#405). */
public interface PushOpenUseCase {
    /**
     * Records that the user opened the push with this ref (at most 180 characters); a ref already recorded for the
     * user keeps its first open. Every open also counts as an app open.
     */
    void record(UUID userId, String ref, NotificationType type);

    /** Opens of these users and types since an instant, newest first. */
    List<PushOpen> opensSince(Collection<UUID> userIds, Set<NotificationType> types, Instant since);

    /** How many pushes of each type were opened since an instant; types without opens are absent. */
    Map<NotificationType, Long> openCountsSince(Instant since);
}
