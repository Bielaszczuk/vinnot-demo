package com.vinnot.payment.domain.model;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class OrganizerPaymentTest {
    @Test void onlyUndisputedFullyPaidUnreservedAndNotAlreadyRequestedCanRefund() {
        for (var status: ProviderPayment.Status.values()) {
            assertThat(RefundEligibility.permits(status,BigDecimal.ZERO,false,false)).isEqualTo(status==ProviderPayment.Status.APPROVED);
        }
        assertThat(RefundEligibility.permits(null,BigDecimal.ZERO,false,false)).isFalse();
        assertThat(RefundEligibility.permits(ProviderPayment.Status.APPROVED,null,false,false)).isFalse();
        assertThat(RefundEligibility.permits(ProviderPayment.Status.APPROVED,BigDecimal.ONE,false,false)).isFalse();
        assertThat(RefundEligibility.permits(ProviderPayment.Status.APPROVED,BigDecimal.ZERO,true,false)).isFalse();
        assertThat(RefundEligibility.permits(ProviderPayment.Status.APPROVED,BigDecimal.ZERO,false,true)).isFalse();
        assertThat(row(null).canRefund()).isTrue();
        for(var refund: RefundIntent.Status.values()) {
            assertThat(row(refund).canRefund()).isEqualTo(refund==RefundIntent.Status.REJECTED);
        }
    }
    @Test void aRefundTheProviderRejectedCanBeRequestedAgainOnlyWhileThePaymentIsStillRefundable() {
        assertThat(row(RefundIntent.Status.REJECTED).canRefund()).isTrue();
        assertThat(new OrganizerPayment(UUID.randomUUID(),UUID.randomUUID(),BigDecimal.TEN,"ARS",ProviderPayment.Status.APPROVED,
                BigDecimal.ZERO,RefundIntent.Status.REJECTED,true,false).canRefund()).isFalse();
    }
    OrganizerPayment row(RefundIntent.Status refund) {
        return new OrganizerPayment(UUID.randomUUID(),UUID.randomUUID(),BigDecimal.TEN,"ARS",ProviderPayment.Status.APPROVED,BigDecimal.ZERO,refund,false,false);
    }
}
