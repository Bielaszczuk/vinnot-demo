package com.vinnot.event.application.port.out;

import com.vinnot.event.application.query.response.EventTicketResponse;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import java.util.Optional;
import java.util.UUID;

public interface EventTicketReader {
    PageResult<EventTicketResponse> findByAttendee(UUID attendeeId, PageQuery page);
    Optional<EventTicketResponse> findByIdAndAttendee(UUID ticketId, UUID attendeeId);
}
