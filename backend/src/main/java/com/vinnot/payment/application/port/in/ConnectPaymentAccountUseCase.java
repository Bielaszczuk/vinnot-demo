package com.vinnot.payment.application.port.in;

import java.net.URI;
import java.util.UUID;

public interface ConnectPaymentAccountUseCase {
    URI begin(UUID ownerId);
    URI begin(UUID ownerId, boolean returnToApp);
    /** Completes the initiating owner's single-use OAuth attempt, without relying on browser login. */
    boolean completeCallback(String state, String code);
    void complete(UUID ownerId, String state, String code);
    boolean isConnected(UUID ownerId);
}
