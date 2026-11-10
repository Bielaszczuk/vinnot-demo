package com.vinnot.payment.domain.model;
/** A definitive invalid grant requires the organizer to authorize again. No provider payload retained. */
public final class PaymentAuthorizationRevokedException extends RuntimeException {
    public PaymentAuthorizationRevokedException() { super("Payment authorization requires reconnection"); }
}
