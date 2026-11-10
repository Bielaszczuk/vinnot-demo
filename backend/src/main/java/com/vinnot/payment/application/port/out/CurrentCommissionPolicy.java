package com.vinnot.payment.application.port.out;

import com.vinnot.payment.domain.valueobject.CommissionPolicy;

/** The commission policy that new ticket checkouts are priced with. Stored checkouts keep their own policy. */
@FunctionalInterface
public interface CurrentCommissionPolicy {
    CommissionPolicy current();
}
