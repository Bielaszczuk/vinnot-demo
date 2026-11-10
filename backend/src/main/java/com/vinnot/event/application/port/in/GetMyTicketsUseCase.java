package com.vinnot.event.application.port.in;

import com.vinnot.event.application.query.response.EventTicketResponse;
import com.vinnot.shared.domain.valueobject.PageResult;
import java.util.UUID;

public interface GetMyTicketsUseCase {
    PageResult<EventTicketResponse> list(UUID attendeeId, int page, int size);
    EventTicketResponse get(UUID attendeeId, UUID ticketId);
}
