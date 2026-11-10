package com.vinnot.payment.application.service;

import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.*;

class PaymentExecutionPolicyTest {
    private static final CommissionPolicy THREE_PERCENT = new CommissionPolicy(300, "VINNOT_3_PERCENT_V1");
    private final PaymentExecutionPolicy pilot = new PaymentExecutionPolicy(PaymentExecutionPolicy.Environment.LIVE_PILOT, "123", "456");
    @Test void pilotRequiresExplicitSeparateRecipient() {
        for (String seller : new String[]{null, "", "bad", "0", "456"}) {
            assertThatThrownBy(() -> new PaymentExecutionPolicy(PaymentExecutionPolicy.Environment.LIVE_PILOT, seller, "456"))
                    .isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> new PaymentExecutionPolicy(PaymentExecutionPolicy.Environment.LIVE_PILOT, "123", ""))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PaymentExecutionPolicy(null, "", "")).isInstanceOf(NullPointerException.class);

    }
    @Test void productionAcceptsMultipleOrganizersAndNormalTicketPricesButPreservesPaymentInvariants() {
        var live = new PaymentExecutionPolicy(PaymentExecutionPolicy.Environment.LIVE, "", "456");
        assertThat(live.isLive()).isTrue();
        assertThat(pilot.isLive()).isTrue();
        assertThat(PaymentExecutionPolicy.sandbox().isLive()).isFalse();
        for (String seller : new String[]{"123", "789"}) {
            var quote = new TicketPaymentQuote(new BigDecimal("10000"), 4, "ARS", THREE_PERCENT);
            live.requireAmount(seller, quote.total(), quote.currency());
            assertThat(quote.commission()).isEqualByComparingTo("1200.00");
        }
        for (String seller : new String[]{null, "", "0", "bad", "456"}) {
            assertThatThrownBy(() -> live.requireSeller(seller)).isInstanceOf(BusinessRuleViolationException.class);
        }
        for (BigDecimal amount : new BigDecimal[]{null, BigDecimal.ZERO, BigDecimal.ONE.negate()}) {
            assertThatThrownBy(() -> live.requireAmount("123", amount, "ARS")).isInstanceOf(BusinessRuleViolationException.class);
        }
        assertThatThrownBy(() -> live.requireAmount("123", BigDecimal.ONE, "USD")).isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(() -> new PaymentExecutionPolicy(PaymentExecutionPolicy.Environment.LIVE, "", ""))
                .isInstanceOf(IllegalArgumentException.class);
    }
    @Test void totalCapIncludesEveryTicketAndCommissionIsExact() {
        var quote = new TicketPaymentQuote(new BigDecimal("25"), 2, "ARS", THREE_PERCENT);
        pilot.requireAmount("123", quote.total(), quote.currency());
        assertThat(quote.commission()).isEqualByComparingTo("1.50");
        for (BigDecimal amount : new BigDecimal[]{null, BigDecimal.ZERO, BigDecimal.ONE.negate(), new BigDecimal("50.01"), new BigDecimal("100")}) {
            assertThatThrownBy(() -> pilot.requireAmount("123", amount, "ARS")).isInstanceOf(BusinessRuleViolationException.class);
        }
        assertThatThrownBy(() -> pilot.requireAmount("123", BigDecimal.ONE, "USD")).isInstanceOf(BusinessRuleViolationException.class);
        assertThatThrownBy(() -> pilot.requireAmount("999", BigDecimal.ONE, "ARS")).isInstanceOf(BusinessRuleViolationException.class);
        PaymentExecutionPolicy.sandbox().requireAmount("999", new BigDecimal("20000"), "ARS");
    }
}
