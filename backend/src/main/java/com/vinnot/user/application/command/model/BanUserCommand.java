package com.vinnot.user.application.command.model;

import com.vinnot.user.domain.valueobject.SuspensionReason;

import java.util.UUID;

/**
 * Suspend an account. {@code reasonCode} is told to the account holder; {@code note} is the administrator's detail,
 * shared only with {@link SuspensionReason#OTHER}. A client that sends no code (before #309) suspends with OTHER and its
 * note stays internal.
 */
public record BanUserCommand(UUID userId, SuspensionReason reasonCode, String note, UUID actorId) {
    public BanUserCommand(UUID userId, String note) {
        this(userId, null, note, null);
    }

    public BanUserCommand(UUID userId, String note, UUID actorId) {
        this(userId, null, note, actorId);
    }
}
