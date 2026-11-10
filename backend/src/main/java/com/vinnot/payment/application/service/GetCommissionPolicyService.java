package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.in.GetCommissionPolicyUseCase;
import com.vinnot.payment.application.port.out.CurrentCommissionPolicy;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import java.util.Objects;

public class GetCommissionPolicyService implements GetCommissionPolicyUseCase {
    private final CurrentCommissionPolicy policy;

    public GetCommissionPolicyService(CurrentCommissionPolicy policy) {
        this.policy = Objects.requireNonNull(policy);
    }

    @Override
    public CommissionPolicy current() {
        return policy.current();
    }
}
