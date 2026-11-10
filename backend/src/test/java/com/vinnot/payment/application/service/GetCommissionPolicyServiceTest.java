package com.vinnot.payment.application.service;

import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GetCommissionPolicyServiceTest {
    @Test
    void returnsThePolicyNewCheckoutsArePricedWith() {
        var eight = new CommissionPolicy(800, "VINNOT_8_PERCENT_V1");
        assertThat(new GetCommissionPolicyService(() -> eight).current()).isEqualTo(eight);
        assertThatThrownBy(() -> new GetCommissionPolicyService(null)).isInstanceOf(NullPointerException.class);
    }
}
