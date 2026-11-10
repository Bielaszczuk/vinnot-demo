package com.vinnot.engagement.application.model;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/** Delivery asking the engagement budget about one engagement push, and its answer. */
public final class Admission {
    private Admission() {
    }

    public record Request(NotificationType type, String dedupeKey, String contentRef, List<Account> recipients,
            Instant at) {
        public Request {
            recipients = List.copyOf(recipients);
        }
    }

    public record Account(UUID userId, ZoneId zone) {
    }

    public record Result(List<UUID> admitted, int overBudget, int fatigued, int heldOut) {
        public Result {
            admitted = List.copyOf(admitted);
        }
    }
}
