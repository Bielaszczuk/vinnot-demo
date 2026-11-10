package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.in.GetMyTicketsUseCase;
import com.vinnot.event.application.port.out.EventTicketReader;
import com.vinnot.event.application.query.response.EventTicketResponse;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.valueobject.PageQuery;
import com.vinnot.shared.domain.valueobject.PageResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GetMyTicketsQueryHandler implements GetMyTicketsUseCase {
    private final EventTicketReader reader;
    @Override
    public PageResult<EventTicketResponse> list(UUID attendeeId, int page, int size) {
        return reader.findByAttendee(attendeeId, PageQuery.bounded(page, size, 50));
    }
    @Override
    public EventTicketResponse get(UUID attendeeId, UUID ticketId) {
        return reader.findByIdAndAttendee(ticketId, attendeeId)
                .orElseThrow(() -> new EntityNotFoundException("EventTicket", ticketId));
    }
}
