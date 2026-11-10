package com.vinnot.notification.application.port.in;

import com.vinnot.notification.domain.model.PushRequest;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

/**
 * How business modules send a push. The request is stored in the caller's transaction and delivered later to every
 * device of the listed accounts, respecting their preferences, quiet hours and the daily cap.
 */
public interface PushNotificationPort {
    void push(PushRequest request);

    /**
     * Stores pushes that must not be delivered before their instant (an engagement push at the account's usual hour,
     * #405), in one batch write that joins the caller's transaction. A past instant delivers at once.
     */
    void schedule(List<ScheduledPush> pushes);

    record ScheduledPush(PushRequest request, Instant notBefore) {
        public ScheduledPush {
            Objects.requireNonNull(request, "request");
            Objects.requireNonNull(notBefore, "notBefore");
        }
    }
}
