package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.in.DispatchTicketCheckoutUseCase;
import com.vinnot.payment.application.port.in.PrepareEventCheckoutUseCase;
import com.vinnot.payment.application.port.in.StartEventCheckoutUseCase;
import java.util.UUID;

/** Preparation commits before dispatch; a repeated request reuses the reservation's immutable attempt. */
public final class StartEventCheckoutService implements StartEventCheckoutUseCase {
    private final PrepareEventCheckoutUseCase preparation;
    private final DispatchTicketCheckoutUseCase dispatch;

    public StartEventCheckoutService(PrepareEventCheckoutUseCase preparation, DispatchTicketCheckoutUseCase dispatch) {
        this.preparation = preparation;
        this.dispatch = dispatch;
    }

    @Override
    public Result start(UUID eventId, UUID registrationId, UUID buyerId, boolean returnToApp) {
        var attempt = preparation.prepare(eventId, registrationId, buyerId, returnToApp);
        return new Result(attempt, dispatch.execute(attempt, buyerId).orElse(null));
    }
}
