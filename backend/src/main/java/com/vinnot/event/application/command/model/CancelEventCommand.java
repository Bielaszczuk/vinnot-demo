package com.vinnot.event.application.command.model;

import com.vinnot.event.domain.valueobject.EventCancellation;
import java.util.UUID;
import java.util.Objects;

public record CancelEventCommand(
        UUID eventId,
        UUID requestingUserId,
        boolean administrator,
        EventCancellation cancellation
) {
    public CancelEventCommand {
        cancellation = Objects.requireNonNullElseGet(cancellation, EventCancellation::unspecified);
    }

    /** A cancellation without a stated reason: the preselected default applies. */
    public CancelEventCommand(UUID eventId, UUID requestingUserId, boolean administrator) {
        this(eventId, requestingUserId, administrator, EventCancellation.unspecified());
    }
}
