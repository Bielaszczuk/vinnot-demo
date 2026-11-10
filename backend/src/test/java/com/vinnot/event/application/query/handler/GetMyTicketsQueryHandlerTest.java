package com.vinnot.event.application.query.handler;

import com.vinnot.event.application.port.out.EventTicketReader;
import com.vinnot.shared.domain.exception.EntityNotFoundException;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.valueobject.PageQuery;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class GetMyTicketsQueryHandlerTest {
    private final EventTicketReader reader = mock(EventTicketReader.class);
    private final GetMyTicketsQueryHandler handler = new GetMyTicketsQueryHandler(reader);

    @Test
    void alwaysPassesAuthenticatedOwnerAndBoundsPaginationBeforeReading() {
        UUID owner = UUID.randomUUID();
        handler.list(owner, 2, 20);
        verify(reader).findByAttendee(owner, PageQuery.bounded(2, 20, 50));
        clearInvocations(reader);
        assertThatThrownBy(() -> handler.list(owner, -1, 20)).isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(() -> handler.list(owner, 0, 51)).isInstanceOf(BusinessRuleViolationException.class);
        verifyNoInteractions(reader);
    }

    @Test
    void missingAndForeignTicketsHaveTheSameNotFoundOutcome() {
        UUID owner = UUID.randomUUID(), ticket = UUID.randomUUID();
        when(reader.findByIdAndAttendee(ticket, owner)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> handler.get(owner, ticket)).isInstanceOf(EntityNotFoundException.class);
        verify(reader).findByIdAndAttendee(ticket, owner);
    }
}
