package com.vinnot.payment.application.service;

import com.vinnot.event.application.port.out.*;
import com.vinnot.payment.application.port.out.*;
import com.vinnot.payment.domain.model.*;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.*;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class ApplyProviderPaymentServiceTest {
    @Test void untrustedMoneyRecipientEnvironmentAndReferenceCannotReachPersistence() {
        var events = mock(EventRepositoryPort.class);
        var registrations = mock(EventRegistrationRepositoryPort.class);
        var ledger = mock(PaymentLedger.class);
        var refunds = mock(RefundStore.class);
        var queue = mock(PaymentReconciliationQueue.class);
        var eligibility = mock(CheckoutEligibility.class);
        var now = Instant.now();
        var s = new CheckoutSnapshot(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                "123", "Cata", new TicketPaymentQuote(new BigDecimal("10000"), 1, "ARS", CommissionPolicy.DEFAULT), now.plusSeconds(600));
        var service = new ApplyProviderPaymentService(events, registrations, ledger, refunds, queue, eligibility, Clock.systemUTC(),
                mock(PaymentNoticeService.class));
        var claim = new ReconciliationClaim(s.id(), UUID.randomUUID(), 1);
        for (var p : new ProviderPayment[]{
                payment(s.id(), "123", false, "10000", "ARS", "300", now),
                payment(UUID.randomUUID(), "123", true, "10000", "ARS", "300", now),
                payment(s.id(), "456", true, "10000", "ARS", "300", now),
                payment(s.id(), "123", true, "10001", "ARS", "300", now),
                payment(s.id(), "123", true, "10000", "USD", "300", now),
                payment(s.id(), "123", true, "10000", "ARS", "299", now)}) {
            assertThatThrownBy(() -> service.apply(s, p, claim)).isInstanceOf(IllegalArgumentException.class);
        }
        verifyNoInteractions(events, registrations, ledger, refunds, queue, eligibility);
    }

    /** The buyer deleted the account: the registration is gone, the event and the organizer remain. */
    private static final class Unlinked {
        final EventRepositoryPort events = mock(EventRepositoryPort.class);
        final EventRegistrationRepositoryPort registrations = mock(EventRegistrationRepositoryPort.class);
        final PaymentLedger ledger = mock(PaymentLedger.class);
        final RefundStore refunds = mock(RefundStore.class);
        final PaymentReconciliationQueue queue = mock(PaymentReconciliationQueue.class);
        final CheckoutEligibility eligibility = mock(CheckoutEligibility.class);
        final PaymentNoticeService notices = mock(PaymentNoticeService.class);
        final Instant now = Instant.parse("2026-10-29T12:00:00Z");
        final CheckoutSnapshot snapshot = new CheckoutSnapshot(UUID.randomUUID(), null, UUID.randomUUID(), null, UUID.randomUUID(),
                "123", "Cata", new TicketPaymentQuote(new BigDecimal("10000"), 1, "ARS", CommissionPolicy.DEFAULT), now.plusSeconds(600));
        final ReconciliationClaim claim = new ReconciliationClaim(snapshot.id(), UUID.randomUUID(), 1);
        final ApplyProviderPaymentService service = new ApplyProviderPaymentService(events, registrations, ledger, refunds, queue,
                eligibility, Clock.fixed(now, ZoneOffset.UTC), notices);

        ProviderPayment payment(ProviderPayment.Status status, String refunded, Instant updated) {
            return new ProviderPayment("1", snapshot.id(), "123", true, new BigDecimal("10000"), "ARS", new BigDecimal("300"),
                    new BigDecimal(refunded), status, updated, now.minusSeconds(60));
        }
        void untouchedTicketsAndCapacity() {
            verifyNoInteractions(events, registrations, eligibility);
            verify(notices, never()).receipt(any(), any());
        }
    }

    @Test void anApprovedPaymentNeverCreditedIsRefundedWhenTheBuyerAccountNoLongerExists() {
        var u = new Unlinked();
        var approved = u.payment(ProviderPayment.Status.APPROVED, "0", u.now);
        when(u.ledger.find("1")).thenReturn(Optional.empty());
        when(u.ledger.creditedPayment(u.snapshot.id())).thenReturn(Optional.empty());
        when(u.refunds.requireRefund(u.snapshot.id(), "1", approved.amount())).thenReturn(true);

        u.service.apply(u.snapshot, approved, u.claim);

        verify(u.queue).requireLease(u.claim, u.now);
        verify(u.notices).refundRequested(u.snapshot, approved);
        verify(u.ledger).save(new PaymentLedger.Entry(approved, false, false));
        verify(u.refunds).reconcile("1", false, false);
        u.untouchedTicketsAndCapacity();
    }

    @Test void aCreditedPaymentIsKeptAsItIsAndAnExistingRefundIsNotAnnouncedAgain() {
        var u = new Unlinked();
        var approved = u.payment(ProviderPayment.Status.APPROVED, "0", u.now);
        when(u.ledger.find("1")).thenReturn(Optional.of(new PaymentLedger.Entry(approved, true, false)));
        when(u.ledger.creditedPayment(u.snapshot.id())).thenReturn(Optional.of("1"));
        when(u.refunds.requireRefund(any(), any(), any())).thenReturn(false);

        u.service.apply(u.snapshot, approved, u.claim);
        verify(u.ledger).save(new PaymentLedger.Entry(approved, true, false));
        verify(u.refunds, never()).requireRefund(any(), any(), any());

        // A second payment for the same checkout has nothing to credit and goes back; a refund already required stays silent.
        var second = new ProviderPayment("2", u.snapshot.id(), "123", true, new BigDecimal("10000"), "ARS", new BigDecimal("300"),
                BigDecimal.ZERO, ProviderPayment.Status.APPROVED, u.now, u.now.minusSeconds(60));
        when(u.ledger.find("2")).thenReturn(Optional.empty());
        u.service.apply(u.snapshot, second, u.claim);
        verify(u.refunds).requireRefund(u.snapshot.id(), "2", second.amount());
        verify(u.ledger).save(new PaymentLedger.Entry(second, false, false));
        verifyNoInteractions(u.notices);
        u.untouchedTicketsAndCapacity();
    }

    @Test void reversalsAreRecordedAndAnnouncedWithoutTheRegistration() {
        var u = new Unlinked();
        var approved = u.payment(ProviderPayment.Status.APPROVED, "0", u.now.minusSeconds(30));
        when(u.ledger.creditedPayment(u.snapshot.id())).thenReturn(Optional.of("1"));
        when(u.ledger.find("1")).thenReturn(Optional.of(new PaymentLedger.Entry(approved, true, false)));

        var partial = u.payment(ProviderPayment.Status.APPROVED, "2500", u.now.minusSeconds(20));
        u.service.apply(u.snapshot, partial, u.claim);
        verify(u.notices).refunded(u.snapshot, partial);
        verify(u.ledger).save(new PaymentLedger.Entry(partial, true, true));
        verify(u.refunds).reconcile("1", false, true);

        var full = u.payment(ProviderPayment.Status.REFUNDED, "10000", u.now.minusSeconds(10));
        u.service.apply(u.snapshot, full, u.claim);
        verify(u.ledger).save(new PaymentLedger.Entry(full, true, false));
        verify(u.refunds).reconcile("1", true, false);

        var chargeback = u.payment(ProviderPayment.Status.CHARGED_BACK, "0", u.now);
        u.service.apply(u.snapshot, chargeback, u.claim);
        verify(u.notices).chargeback(u.snapshot, chargeback);
        verify(u.ledger).save(new PaymentLedger.Entry(chargeback, true, false));
        verify(u.refunds, never()).requireRefund(any(), any(), any());
        u.untouchedTicketsAndCapacity();
    }

    @Test void staleOrForeignEvidenceIsNeverRecordedForAnUnlinkedCheckout() {
        var u = new Unlinked();
        var current = u.payment(ProviderPayment.Status.APPROVED, "0", u.now);
        when(u.ledger.find("1")).thenReturn(Optional.of(new PaymentLedger.Entry(current, true, false)));
        u.service.apply(u.snapshot, u.payment(ProviderPayment.Status.PENDING, "0", u.now.minusSeconds(1)), u.claim);
        verify(u.ledger, never()).save(any());

        var foreign = new ProviderPayment("1", UUID.randomUUID(), "123", true, new BigDecimal("10000"), "ARS", new BigDecimal("300"),
                BigDecimal.ZERO, ProviderPayment.Status.APPROVED, u.now, u.now);
        when(u.ledger.find("1")).thenReturn(Optional.of(new PaymentLedger.Entry(foreign, true, false)));
        assertThatThrownBy(() -> u.service.apply(u.snapshot, current, u.claim)).isInstanceOf(IllegalArgumentException.class);
        var otherClaim = new ReconciliationClaim(UUID.randomUUID(), UUID.randomUUID(), 1);
        assertThatThrownBy(() -> u.service.apply(u.snapshot, current, otherClaim)).isInstanceOf(IllegalArgumentException.class);
        verify(u.ledger, never()).save(any());
        verifyNoInteractions(u.refunds, u.notices);
        u.untouchedTicketsAndCapacity();
    }

    private ProviderPayment payment(UUID attempt, String seller, boolean testAccountVerified, String amount, String currency, String fee, Instant now) {
        return new ProviderPayment("1", attempt, seller, testAccountVerified, new BigDecimal(amount), currency, new BigDecimal(fee), BigDecimal.ZERO,
                ProviderPayment.Status.APPROVED, now, now);
    }
}
