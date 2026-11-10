package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.in.DispatchTicketCheckoutUseCase;
import com.vinnot.payment.application.port.in.PrepareEventCheckoutUseCase;
import java.net.URI;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StartEventCheckoutServiceTest {
    private final PrepareEventCheckoutUseCase preparation = mock(PrepareEventCheckoutUseCase.class);
    private final DispatchTicketCheckoutUseCase dispatch = mock(DispatchTicketCheckoutUseCase.class);
    private final StartEventCheckoutService service = new StartEventCheckoutService(preparation, dispatch);
    private final UUID event = UUID.randomUUID(), registration = UUID.randomUUID(), buyer = UUID.randomUUID(), attempt = UUID.randomUUID();

    @Test void forwardsNativeOriginBeforeDispatch() {
        when(preparation.prepare(event, registration, buyer, true)).thenReturn(attempt);
        when(dispatch.execute(attempt, buyer)).thenReturn(Optional.empty());
        assertEquals(attempt, service.start(event, registration, buyer, true).attemptId());
        var order = inOrder(preparation, dispatch);
        order.verify(preparation).prepare(event, registration, buyer, true);
        order.verify(dispatch).execute(attempt, buyer);
    }

    @Test void dispatchesOnlyAfterAuthorizedPreparationAndReturnsPersistedLink() {
        var url = URI.create("https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=test");
        when(preparation.prepare(event, registration, buyer, false)).thenReturn(attempt);
        when(dispatch.execute(attempt, buyer)).thenReturn(Optional.of(url));
        var result = service.start(event, registration, buyer);
        assertEquals(attempt, result.attemptId());
        assertEquals(url, result.checkoutUrl());
        var order = inOrder(preparation, dispatch);
        order.verify(preparation).prepare(event, registration, buyer, false);
        order.verify(dispatch).execute(attempt, buyer);
    }

    @Test void preservesPendingOutcomeWithoutInventingASecondAttempt() {
        when(preparation.prepare(event, registration, buyer, false)).thenReturn(attempt);
        when(dispatch.execute(attempt, buyer)).thenReturn(Optional.empty());
        assertNull(service.start(event, registration, buyer).checkoutUrl());
        verify(dispatch, times(1)).execute(attempt, buyer);
    }

    @Test void rejectedOwnershipNeverContactsProvider() {
        when(preparation.prepare(event, registration, buyer, false)).thenThrow(new IllegalArgumentException());
        assertThrows(IllegalArgumentException.class, () -> service.start(event, registration, buyer));
        verifyNoInteractions(dispatch);
    }
}
