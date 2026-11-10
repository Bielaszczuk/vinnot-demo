package com.vinnot.event.domain.valueobject;

import com.vinnot.shared.domain.exception.DomainException;

import java.util.Objects;

/**
 * The reason given for cancelling an event. No reason means the preselected default, so cancelling never
 * fails for a missing choice. A note is optional and kept only with {@link EventCancellationReason#OTHER}.
 */
public record EventCancellation(EventCancellationReason reason, String note) {
    public static final int MAXIMUM_NOTE_LENGTH = 280;

    public EventCancellation {
        reason = Objects.requireNonNullElse(reason, EventCancellationReason.UNFORESEEN_CIRCUMSTANCES);
        note = reason == EventCancellationReason.OTHER && Objects.nonNull(note) && !note.isBlank() ? note.strip() : null;
        if (Objects.nonNull(note) && note.length() > MAXIMUM_NOTE_LENGTH) {
            throw new DomainException("CANCELLATION_NOTE_TOO_LONG",
                    "The cancellation note can have at most " + MAXIMUM_NOTE_LENGTH + " characters");
        }
    }

    public static EventCancellation unspecified() {
        return new EventCancellation(null, null);
    }
}
