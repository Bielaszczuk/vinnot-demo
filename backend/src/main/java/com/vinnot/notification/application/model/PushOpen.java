package com.vinnot.notification.application.model;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.UUID;

/** A push the user opened, identified by its dedupe ref (#405). */
public record PushOpen(UUID userId, String ref, NotificationType type, Instant openedAt) {
}
