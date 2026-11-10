package com.vinnot.payment.infrastructure.web;

import com.vinnot.payment.application.port.in.StartEventCheckoutUseCase;
import java.net.URI;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EventCheckoutControllerTest {
    @Test void forwardsOnlyTheBoundedNativeReturnHint() {
        var useCase = mock(StartEventCheckoutUseCase.class);
        var event = UUID.randomUUID(); var registration = UUID.randomUUID(); var buyer = UUID.randomUUID();
        when(useCase.start(event, registration, buyer, true)).thenReturn(new StartEventCheckoutUseCase.Result(UUID.randomUUID(), null));
        var response = new EventCheckoutController(useCase).start(event, registration, buyer.toString(),
                new EventCheckoutController.CheckoutRequest(true));
        assertEquals(202, response.getStatusCode().value());
        verify(useCase).start(event, registration, buyer, true);
    }
    @Test void mapsAuthenticatedBuyerAndUsesNoStoreForReadyAndPendingResponses() {
        var useCase = mock(StartEventCheckoutUseCase.class);
        var controller = new EventCheckoutController(useCase);
        var event = UUID.randomUUID();
        var registration = UUID.randomUUID();
        var buyer = UUID.randomUUID();
        var attempt = UUID.randomUUID();
        when(useCase.start(event, registration, buyer, false)).thenReturn(new StartEventCheckoutUseCase.Result(attempt,
                URI.create("https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=test")));
        var ready = controller.start(event, registration, buyer.toString(), null);
        assertEquals(200, ready.getStatusCode().value());
        assertEquals("no-store", ready.getHeaders().getCacheControl());
        assertEquals(attempt, ready.getBody().attemptId());
        when(useCase.start(event, registration, buyer, false)).thenReturn(new StartEventCheckoutUseCase.Result(attempt, null));
        assertEquals(202, controller.start(event, registration, buyer.toString(), null).getStatusCode().value());
    }
}
