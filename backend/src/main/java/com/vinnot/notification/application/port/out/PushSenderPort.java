package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.notification.domain.model.PushContent;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The push provider. A failed call throws, so the outbox job is retried; a request the provider refuses as malformed
 * throws {@link RejectedException} instead, which is never retried.
 */
public interface PushSenderPort {
    int MAX_BATCH = 100;
    int MAX_RECEIPTS = 1000;
    /** The provider's error for a token that no longer reaches a device; such tokens are forgotten. */
    String DEVICE_NOT_REGISTERED = "DeviceNotRegistered";

    /** Sends up to {@link #MAX_BATCH} messages; returns one ticket per message, in order. */
    List<Ticket> send(List<Message> messages);

    /** Reads up to {@link #MAX_RECEIPTS} receipts; ids without a receipt yet are left out. */
    Map<String, Receipt> receipts(Collection<String> ticketIds);

    /**
     * One device message. {@code urgent} pushes are delivered at once and may wake the device. {@code ref} is the
     * push's dedupe key, which the app reports back when the push is opened. {@code expiresAt} (optional) is when the
     * push stops being useful, so the provider stops retrying an offline device. {@code channels} says the device
     * created the per-category Android channels.
     */
    record Message(String token, PushContent content, boolean urgent, NotificationType type, String ref, Instant expiresAt,
            boolean channels) {
        public Message {
            Objects.requireNonNull(token, "token");
            Objects.requireNonNull(content, "content");
            Objects.requireNonNull(type, "type");
            Objects.requireNonNull(ref, "ref");
        }
    }

    /** {@code id} is set when the provider accepted the message; otherwise {@code error} says why not. */
    record Ticket(String token, String id, String error) {
        public boolean accepted() {
            return Objects.nonNull(id);
        }

        public boolean deviceNotRegistered() {
            return DEVICE_NOT_REGISTERED.equals(error);
        }
    }

    record Receipt(boolean delivered, String error) {
        public boolean deviceNotRegistered() {
            return DEVICE_NOT_REGISTERED.equals(error);
        }
    }

    /** The provider refused the whole request as malformed: sending the same request again can never succeed. */
    class RejectedException extends RuntimeException {
        public RejectedException(String message) {
            super(message);
        }
    }
}
