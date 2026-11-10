package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * The engagement budget (#405), asked by delivery for every engagement push ({@link NotificationType#engagement()}).
 * {@link #admit} runs inside the push reservation, while the accounts are locked, so it decides and records atomically:
 * two planners, or a planned push racing an event-triggered one, never both pass the budget.
 */
public interface EngagementBudgetPort {
    /**
     * Keeps the accounts that may receive this push now and records them (and the held-out ones) in the engagement
     * ledger, in the caller's transaction.
     */
    Admission admit(Push push, List<Recipient> recipients, Instant at);

    /** Forgets recorded sends that never reached the provider, so a retried job decides again. */
    void release(String dedupeKey, Collection<UUID> userIds);

    /** @param contentRef the suggested content ({@link NotificationType#CONTENT_REF}), or null */
    record Push(NotificationType type, String dedupeKey, String contentRef) {
        public Push {
            Objects.requireNonNull(type, "type");
            Objects.requireNonNull(dedupeKey, "dedupeKey");
        }
    }

    /** An account and the time zone its local day follows. */
    record Recipient(UUID userId, ZoneId zone) {
    }

    /**
     * @param admitted   the accounts that may receive it, in the order given
     * @param overBudget accounts past the weekly or daily budget or the 48-hour gap
     * @param fatigued   accounts that stopped opening engagement pushes
     * @param heldOut    accounts in the measurement holdout
     */
    record Admission(List<UUID> admitted, int overBudget, int fatigued, int heldOut) {
        public Admission {
            admitted = List.copyOf(admitted);
        }
    }
}
