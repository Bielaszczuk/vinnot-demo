package com.vinnot.notification.application.port.in;

import com.vinnot.notification.domain.model.NotificationCategory;
import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * What the engagement planner (#405) needs from notifications before it picks a push: which categories each account
 * receives by push and which types are switched off. Delivery checks both again, so this only avoids wasting an
 * account's daily pick on a push that would be dropped.
 */
public interface PushPlanningUseCase {
    /** The categories each account receives by push now, read in one batch; one entry per requested account. */
    Map<UUID, Set<NotificationCategory>> pushCategories(Collection<UUID> userIds);

    /** Types an administrator, or an automatic pause, turned off. */
    Set<NotificationType> switchedOff();

    /**
     * When each type was last turned from off back on (by an administrator), so an automatic pause only judges the
     * pushes sent after that; types never turned back on are absent.
     */
    Map<NotificationType, Instant> lastTurnedOn();

    /**
     * Turns an engagement type off because too many recipients opt out after it (#405), audited as an automatic
     * change; non-engagement types are refused.
     *
     * @return whether the type was on before
     */
    boolean pauseAutomatically(NotificationType type);
}
