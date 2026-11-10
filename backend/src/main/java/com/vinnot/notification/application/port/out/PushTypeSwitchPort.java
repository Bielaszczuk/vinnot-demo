package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** The administrators' on/off switch per push type (#310); a type without a stored switch is on. */
public interface PushTypeSwitchPort {
    boolean isEnabled(NotificationType type);

    Set<NotificationType> disabledTypes();

    /** When each type was last turned from off back on, from the audit; types never turned back on are absent. */
    Map<NotificationType, Instant> lastTurnedOn();

    /**
     * Stores the switch and, when it changes, an audit record of who changed it, from what to what and when.
     *
     * @return whether the type was on before
     */
    boolean change(NotificationType type, boolean enabled, Actor actor, Instant at);

    /** The latest audited changes, newest first. */
    List<Change> recentChanges(int limit);

    /** The administrator making the change; the email keeps the audit readable after the account is gone. */
    record Actor(UUID id, String email) {
    }

    record Change(NotificationType type, boolean previousEnabled, boolean enabled, String changedBy, Instant changedAt) {
    }
}
