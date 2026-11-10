package com.vinnot.payment.domain.model;

import java.net.URI;
import java.util.Objects;

/** Checkout creation state, deliberately separate from the provider's payment status. */
public record CheckoutAttempt(CheckoutSnapshot snapshot, Status status, String providerReference, URI checkoutUrl) {
    public enum Status { PREPARED, CREATING, READY, UNCERTAIN }

    public CheckoutAttempt {
        Objects.requireNonNull(snapshot);
        Objects.requireNonNull(status);
        if (status == Status.READY) {
            if (Objects.isNull(providerReference) || providerReference.isBlank() || providerReference.length() > 200
                    || Objects.isNull(checkoutUrl) || !"https".equals(checkoutUrl.getScheme())
                    || Objects.isNull(checkoutUrl.getHost()) || Objects.nonNull(checkoutUrl.getUserInfo())
                    || Objects.nonNull(checkoutUrl.getFragment())) {
                throw new IllegalArgumentException("A ready checkout requires a safe provider reference and URL");
            }
        } else if (Objects.nonNull(providerReference) || Objects.nonNull(checkoutUrl)) {
            throw new IllegalArgumentException("Only ready checkouts have provider details");
        }
    }
}
