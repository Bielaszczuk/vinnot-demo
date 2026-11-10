package com.vinnot.payment.application.service;
import com.vinnot.payment.application.port.out.OrganizerPaymentReader;
import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class GetOrganizerPaymentsServiceTest {
    final OrganizerPaymentReader reader=mock(OrganizerPaymentReader.class);
    final EventRepositoryPort events=mock(EventRepositoryPort.class);
    final UserRepositoryPort users=mock(UserRepositoryPort.class);
    final GetOrganizerPaymentsService service=new GetOrganizerPaymentsService(reader,events,users);
    final UUID actorId=UUID.randomUUID(),eventId=UUID.randomUUID(),registrationId=UUID.randomUUID();
    final User actor=mock(User.class);
    final Event event=mock(Event.class);
    void authorized() {
        when(users.findById(actorId)).thenReturn(Optional.of(actor));
        when(actor.isActive()).thenReturn(true);
        when(actor.hasRole(Role.PARTNER)).thenReturn(true);
        when(events.findById(eventId)).thenReturn(Optional.of(event));
        when(event.getOrganizerId()).thenReturn(actorId);
    }
    void rejected() { assertThatThrownBy(()->service.get(actorId,eventId,List.of(registrationId))).isInstanceOf(DomainException.class); }
    @Test void checksCurrentRoleAccountAndOwnershipBeforeReadingFinancialData() {
        rejected(); authorized();
        when(actor.isActive()).thenReturn(false);rejected();when(actor.isActive()).thenReturn(true);
        when(actor.isLocked()).thenReturn(true);rejected();when(actor.isLocked()).thenReturn(false);
        when(actor.hasRole(Role.PARTNER)).thenReturn(false);rejected();when(actor.hasRole(Role.PARTNER)).thenReturn(true);
        when(events.findById(eventId)).thenReturn(Optional.empty());rejected();when(events.findById(eventId)).thenReturn(Optional.of(event));
        when(event.getOrganizerId()).thenReturn(UUID.randomUUID());rejected();verifyNoInteractions(reader);
        when(actor.hasRole(Role.ADMIN)).thenReturn(true);
        service.get(actorId,eventId,List.of(registrationId));verify(reader).find(eventId,List.of(registrationId));
    }
    @Test void boundsAndDeduplicatesVisiblePage() {
        for(List<UUID> ids: Arrays.asList(null,List.<UUID>of(),Collections.nCopies(51,registrationId),Arrays.asList((UUID)null)))
            assertThatThrownBy(()->service.get(actorId,eventId,ids)).isInstanceOf(DomainException.class);
        verifyNoInteractions(users,events,reader);authorized();
        service.get(actorId,eventId,List.of(registrationId,registrationId));verify(reader).find(eventId,List.of(registrationId));
    }
}
