package com.vinnot.payment.domain.valueobject;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TicketPaymentQuoteTest {
    private static final CommissionPolicy THREE_PERCENT = new CommissionPolicy(300, "VINNOT_3_PERCENT_V1");
    private static final CommissionPolicy EIGHT_PERCENT = new CommissionPolicy(800, "VINNOT_8_PERCENT_V1");

    @Test
    void buyerPaysPublishedPriceAndSellerBearsCommission() {
        var quote = new TicketPaymentQuote(new BigDecimal("10000"), 2, "ARS", THREE_PERCENT);
        assertThat(quote.total()).isEqualByComparingTo("20000");
        assertThat(quote.commission()).isEqualByComparingTo("600");
        assertThat(quote.sellerAmountBeforeProviderFee()).isEqualByComparingTo("19400");
        assertThat(quote.unitPrice()).isEqualTo(new BigDecimal("10000.00"));
        assertThat(quote.quantity()).isEqualTo(2);
        assertThat(quote.currency()).isEqualTo("ARS");
        assertThat(quote.commissionBasisPoints()).isEqualTo(300);
        assertThat(quote.commissionPolicy()).isEqualTo(THREE_PERCENT);
    }

    @Test
    void appliesTheCarriedPolicyRateRoundedHalfUpToCents() {
        var quote = new TicketPaymentQuote(new BigDecimal("10000"), 2, "ARS", EIGHT_PERCENT);
        assertThat(quote.commission()).isEqualTo(new BigDecimal("1600.00"));
        assertThat(quote.sellerAmountBeforeProviderFee()).isEqualByComparingTo("18400");
        assertThat(quote.commissionBasisPoints()).isEqualTo(800);
        // 0.93 x 8% = 0.0744 -> 0.07; 1.25 x 12% = 0.15 exactly.
        assertThat(new TicketPaymentQuote(new BigDecimal("0.31"), 3, "ARS", EIGHT_PERCENT).commission()).isEqualTo(new BigDecimal("0.07"));
        assertThat(new TicketPaymentQuote(new BigDecimal("1.25"), 1, "ARS", new CommissionPolicy(1200, "VINNOT_12_PERCENT_V1"))
                .commission()).isEqualTo(new BigDecimal("0.15"));
        // Exact halves round up: 0.20 x 2.5% = 0.005 -> 0.01 and 0.50 x 3% = 0.015 -> 0.02.
        assertThat(new TicketPaymentQuote(new BigDecimal("0.20"), 1, "ARS", new CommissionPolicy(250, "VINNOT_2_5_PERCENT_V1"))
                .commission()).isEqualTo(new BigDecimal("0.01"));
        assertThat(new TicketPaymentQuote(new BigDecimal("0.50"), 1, "ARS", THREE_PERCENT).commission()).isEqualTo(new BigDecimal("0.02"));
    }

    @Test
    void quotesWithDifferentPoliciesAreDifferentTerms() {
        assertThat(new TicketPaymentQuote(BigDecimal.TEN, 1, "ARS", THREE_PERCENT))
                .isNotEqualTo(new TicketPaymentQuote(BigDecimal.TEN, 1, "ARS", EIGHT_PERCENT))
                .isEqualTo(new TicketPaymentQuote(BigDecimal.TEN, 1, "ARS", THREE_PERCENT));
    }

    @Test
    void roundsCommissionOnceOnTheWholeOrderAndRejectsImplicitPriceRounding() {
        assertThat(new TicketPaymentQuote(new BigDecimal("0.17"), 3, "ARS", THREE_PERCENT).commission()).isEqualByComparingTo("0.02");
        assertThatThrownBy(() -> new TicketPaymentQuote(new BigDecimal("1.001"), 1, "ARS", THREE_PERCENT)).isInstanceOf(ArithmeticException.class);
        for (int quantity : new int[]{0, -1, 21}) {
            assertThatThrownBy(() -> new TicketPaymentQuote(BigDecimal.ONE, quantity, "ARS", THREE_PERCENT)).isInstanceOf(IllegalArgumentException.class);
        }
        for (String currency : new String[]{null, "USD", "ars"}) {
            assertThatThrownBy(() -> new TicketPaymentQuote(BigDecimal.ONE, 1, currency, THREE_PERCENT)).isInstanceOf(IllegalArgumentException.class);
        }
        for (BigDecimal amount : new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ONE.negate()}) {
            assertThatThrownBy(() -> new TicketPaymentQuote(amount, 1, "ARS", THREE_PERCENT)).isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> new TicketPaymentQuote(null, 1, "ARS", THREE_PERCENT)).isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new TicketPaymentQuote(BigDecimal.ONE, 1, "ARS", null)).isInstanceOf(NullPointerException.class);
    }
}
