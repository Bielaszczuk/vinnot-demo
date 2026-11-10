package com.vinnot.payment.application.port.out;

import com.vinnot.payment.domain.model.CheckoutSnapshot;

/** Rechecks current reservation/account state; does not grant payment approval. */
public interface CheckoutEligibility {
    void verify(CheckoutSnapshot snapshot);
}
