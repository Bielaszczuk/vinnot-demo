package com.vinnot.admin.infrastructure.web.request;

import com.vinnot.event.domain.valueobject.EventCancellation;
import com.vinnot.event.domain.valueobject.EventCancellationReason;
import jakarta.validation.constraints.Size;

import java.util.Objects;

/** Optional body of an administrative cancellation; a missing body or reason uses the preselected default. */
public record CancelEventAdminRequest(
        EventCancellationReason reason, @Size(max = EventCancellation.MAXIMUM_NOTE_LENGTH) String note) {
    public static EventCancellation toCancellation(CancelEventAdminRequest request) {
        return Objects.isNull(request) ? EventCancellation.unspecified() : new EventCancellation(request.reason(), request.note());
    }
}
