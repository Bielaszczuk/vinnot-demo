package com.vinnot.notification.domain.model;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.ArrayList;

/**
 * One push for many accounts: a single outbox job fans out to every device of every listed account. Data holds
 * only what the push template needs (no personal data reaches the payload). Callers' dedupe keys are at most
 * {@link #MAX_CALLER_KEY_LENGTH} characters, which leaves room for the suffix a quiet-hours deferral adds.
 * A {@code deferrable} transactional push (a reminder, an organizer summary) still ignores preferences and the daily
 * cap, but waits out the recipient's quiet hours and is sent at normal priority. A push past {@code expiresAt}
 * (optional) is dropped, and so is a quiet-hours wait that would end after it: a reminder never arrives late.
 */
public record PushRequest(NotificationType type, List<UUID> userIds, Map<String, String> data, String dedupeKey,
        boolean deferrable, Instant expiresAt) {
    public static final int MAX_USERS = 1000;
    public static final int MAX_CALLER_KEY_LENGTH = 180;
    public static final int MAX_DEDUPE_KEY_LENGTH = 200;

    public PushRequest {
        Objects.requireNonNull(type, "type");
        Objects.requireNonNull(userIds, "userIds");
        userIds = List.copyOf(new LinkedHashSet<>(userIds));
        if (userIds.isEmpty() || userIds.size() > MAX_USERS) {
            throw new IllegalArgumentException("A push request needs between 1 and " + MAX_USERS + " accounts");
        }
        data = Map.copyOf(Objects.requireNonNullElse(data, Map.of()));
        if (Objects.isNull(dedupeKey) || dedupeKey.isBlank() || dedupeKey.length() > MAX_DEDUPE_KEY_LENGTH) {
            throw new IllegalArgumentException("A push dedupe key is required (at most " + MAX_DEDUPE_KEY_LENGTH + " characters)");
        }
    }

    /** A push that must reach the user at once (a ticket confirmation, a cancelled event). */
    public PushRequest(NotificationType type, List<UUID> userIds, Map<String, String> data, String dedupeKey) {
        this(type, userIds, data, dedupeKey, false, null);
    }

    /** A push without a deadline. */
    public PushRequest(NotificationType type, List<UUID> userIds, Map<String, String> data, String dedupeKey,
            boolean deferrable) {
        this(type, userIds, data, dedupeKey, deferrable, null);
    }

    /** Whether it is too late to show this push at {@code instant}. */
    public boolean expiredAt(Instant instant) {
        return Objects.nonNull(expiresAt) && !instant.isBefore(expiresAt);
    }

    /** Optional and promotional pushes always wait; transactional ones only when deferrable. */
    public boolean waitsForQuietHours() {
        return deferrable || !category().transactional();
    }

    /** Sent at high priority: only transactional pushes that cannot wait. */
    public boolean urgent() {
        return !waitsForQuietHours();
    }

    public NotificationCategory category() {
        return type.category();
    }

    /**
     * The same push for any number of accounts, split into requests of at most {@link #MAX_USERS}. The first keeps
     * the key; later ones add {@code :<index>}, so a retried caller queues the same requests again.
     */
    public static List<PushRequest> batches(NotificationType type, List<UUID> userIds, Map<String, String> data,
            String dedupeKey, boolean deferrable) {
        return batches(type, userIds, data, dedupeKey, deferrable, null);
    }

    /** {@link #batches(NotificationType, List, Map, String, boolean)} with a deadline for every request. */
    public static List<PushRequest> batches(NotificationType type, List<UUID> userIds, Map<String, String> data,
            String dedupeKey, boolean deferrable, Instant expiresAt) {
        List<UUID> unique = List.copyOf(new LinkedHashSet<>(userIds));
        List<PushRequest> requests = new ArrayList<>();
        for (int start = 0; start < unique.size(); start += MAX_USERS) {
            int index = start / MAX_USERS;
            requests.add(new PushRequest(type, unique.subList(start, Math.min(unique.size(), start + MAX_USERS)), data,
                    index == 0 ? dedupeKey : dedupeKey + ":" + index, deferrable, expiresAt));
        }
        return requests;
    }

    /** The same push for fewer accounts, under another key (used to send it after quiet hours). */
    public PushRequest forUsers(List<UUID> users, String key) {
        return new PushRequest(type, users, data, key, deferrable, expiresAt);
    }
}
