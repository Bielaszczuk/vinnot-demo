package com.vinnot.payment.application.port.in;

import com.vinnot.payment.domain.valueobject.CommissionPolicy;

/** Tells organizers which commission new ticket sales are charged. */
public interface GetCommissionPolicyUseCase {
    CommissionPolicy current();
}
