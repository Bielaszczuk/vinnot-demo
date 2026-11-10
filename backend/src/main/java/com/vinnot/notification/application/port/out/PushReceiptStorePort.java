package com.vinnot.notification.application.port.out;

import com.vinnot.notification.domain.model.NotificationType;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/** Provider tickets waiting for their delivery receipt. */
public interface PushReceiptStorePort {
    /** Stores the tickets durably even if the calling job later fails. */
    void save(Collection<Pending> tickets, Instant at);

    /**
     * Up to {@code limit} tickets created at or before {@code createdBefore}, oldest first, starting after {@code after}
     * ({@code null} starts from the oldest). Walking the chunks visits every due ticket once, even the ones that stay
     * because their receipt is not ready yet.
     */
    Chunk due(Instant createdBefore, Cursor after, int limit);

    void delete(Collection<String> ticketIds);

    void purgeBefore(Instant before);

    /**
     * {@code type} is the push the ticket belongs to; tickets stored before #310 have none. {@code announcementId} is
     * the announcement it was sent for (#490), absent for every other push and for tickets stored before.
     */
    record Pending(String ticketId, String token, NotificationType type, UUID announcementId) {
        public Pending(String ticketId, String token, NotificationType type) {
            this(ticketId, token, type, null);
        }
    }

    /** A position in the oldest-first order of tickets. */
    record Cursor(Instant createdAt, String ticketId) {
    }

    /** One chunk of due tickets; {@code next} is where the following chunk starts, {@code null} after the last one. */
    record Chunk(List<Pending> tickets, Cursor next) {
        public Chunk {
            tickets = List.copyOf(tickets);
        }
    }
}
