package com.vinnot.payment.application.service;

import com.vinnot.payment.application.port.in.ApplyProviderPaymentUseCase;
import com.vinnot.payment.application.port.out.*;
import com.vinnot.payment.domain.model.*;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.IntStream;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReconcilePaymentsServiceTest {
    private final CheckoutAttemptStore attempts = mock(CheckoutAttemptStore.class);
    private final PaymentReconciliationQueue queue = mock(PaymentReconciliationQueue.class);
    private final PaymentLedger ledger = mock(PaymentLedger.class);
    private final SellerCredentialReader credentials = mock(SellerCredentialReader.class);
    private final PaymentProviderGateway provider = mock(PaymentProviderGateway.class);
    private final ApplyProviderPaymentUseCase settlement = mock(ApplyProviderPaymentUseCase.class);
    private final RefundStore refunds = mock(RefundStore.class);
    private final RefundRejectionRecorder rejections = mock(RefundRejectionRecorder.class);
    private final Instant now = Instant.parse("2026-10-15T12:00:00Z");
    private final CheckoutSnapshot snapshot = new CheckoutSnapshot(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            UUID.randomUUID(), UUID.randomUUID(), "123", "Cata", new TicketPaymentQuote(new BigDecimal("10000"), 2, "ARS", CommissionPolicy.DEFAULT), now.plusSeconds(600));
    private final ReconciliationClaim claim = new ReconciliationClaim(snapshot.id(), UUID.randomUUID(), 1);
    private final SellerCredentials seller = new SellerCredentials("123", "test-access", "test-refresh", now.plusSeconds(3600));
    private final RefundIntent refund = new RefundIntent(UUID.randomUUID(), snapshot.id(), "1", snapshot.quote().total(), RefundIntent.Status.PREPARED);
    private final ReconcilePaymentsService service = new ReconcilePaymentsService(attempts, queue, ledger, credentials, provider,
            settlement, refunds, rejections, Clock.fixed(now, ZoneOffset.UTC));

    @BeforeEach void setup() {
        when(queue.claimDue(now, 1)).thenReturn(List.of(claim), List.of());
        when(attempts.dispatchedSnapshot(snapshot.id())).thenReturn(Optional.of(snapshot));
        when(credentials.findCredentials(snapshot.organizerId())).thenReturn(Optional.of(seller));
    }

    @Test void limitsBatchAndStopsWhenNoWorkIsDue() {
        assertThatThrownBy(() -> service.execute(0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.execute(21)).isInstanceOf(IllegalArgumentException.class);
        service.execute(20);
        verify(queue, times(2)).claimDue(now, 1);
        verify(queue).finish(claim, now.plusSeconds(300), null);
    }

    @Test void unavailableChangedOrExpiredCredentialsNeverReachProvider() {
        for (SellerCredentials value : new SellerCredentials[]{null, new SellerCredentials("456", "a", "r", seller.expiresAt()),
                new SellerCredentials("123", "a", "r", now)}) {
            when(queue.claimDue(now, 1)).thenReturn(List.of(claim));
            when(credentials.findCredentials(snapshot.organizerId())).thenReturn(Optional.ofNullable(value));
            service.execute(1);
        }
        verifyNoInteractions(provider, settlement, refunds);
        verify(queue, times(3)).finish(claim, now.plusSeconds(60), "PAYMENT_RECONCILIATION_REQUIRED");
    }

    @Test void anAttemptWhoseOrganizerDeletedTheAccountIsParkedWithoutReadingTheProvider() {
        var unlinked = new CheckoutSnapshot(snapshot.id(), null, null, snapshot.buyerId(), null, "123", "Cata",
                snapshot.quote(), snapshot.expiresAt());
        when(attempts.dispatchedSnapshot(snapshot.id())).thenReturn(Optional.of(unlinked));
        service.execute(20);
        verify(queue).park(claim);
        verify(queue, never()).finish(any(), any(), any());
        verifyNoInteractions(credentials, provider, settlement, refunds, rejections, ledger);
    }

    @Test void anAttemptWhoseBuyerDeletedTheAccountStillReconcilesWithTheOrganizerConnection() {
        var unlinked = new CheckoutSnapshot(snapshot.id(), null, snapshot.eventId(), null, snapshot.organizerId(), "123", "Cata",
                snapshot.quote(), snapshot.expiresAt());
        when(attempts.dispatchedSnapshot(snapshot.id())).thenReturn(Optional.of(unlinked));
        when(provider.search(snapshot.id(), seller)).thenReturn(List.of("1"));
        var approved = payment(ProviderPayment.Status.APPROVED, "0");
        when(provider.read("1", seller)).thenReturn(approved);
        service.execute(1);
        verify(settlement).apply(unlinked, approved, claim);
        verify(queue).finish(claim, now.plusSeconds(300), null);
    }

    @Test void missingSnapshotOversizedSearchWrongIdentityAndProviderFailureStayRetryable() {
        when(queue.claimDue(now, 1)).thenReturn(List.of(claim));
        when(attempts.dispatchedSnapshot(snapshot.id())).thenReturn(Optional.empty());
        service.execute(1);
        when(attempts.dispatchedSnapshot(snapshot.id())).thenReturn(Optional.of(snapshot));
        when(provider.search(snapshot.id(), seller)).thenReturn(IntStream.rangeClosed(1, 21).mapToObj(Integer::toString).toList());
        service.execute(1);
        when(provider.search(snapshot.id(), seller)).thenReturn(List.of("2"));
        when(provider.read("2", seller)).thenReturn(payment(ProviderPayment.Status.APPROVED, "0"));
        service.execute(1);
        when(provider.search(snapshot.id(), seller)).thenThrow(new IllegalStateException("sensitive provider body"));
        service.execute(1);
        verifyNoInteractions(settlement, refunds);
        verify(queue, times(4)).finish(claim, now.plusSeconds(60), "PAYMENT_RECONCILIATION_REQUIRED");
    }

    @Test void successfulRefundRequiresCommittedClaimAndAuthoritativeReadAfterPost() {
        when(ledger.knownPayments(snapshot.id())).thenReturn(List.of("1"));
        when(provider.search(snapshot.id(), seller)).thenReturn(List.of("1"));
        var approved = payment(ProviderPayment.Status.APPROVED, "0");
        var refunded = payment(ProviderPayment.Status.REFUNDED, "20000");
        when(provider.read("1", seller)).thenReturn(approved, approved, refunded);
        when(refunds.pending(snapshot.id())).thenReturn(List.of(refund));
        when(refunds.claim(refund.id())).thenReturn(Optional.of(refund));
        service.execute(1);
        var order = inOrder(provider, refunds, settlement, queue);
        order.verify(provider).read("1", seller);
        order.verify(settlement).apply(snapshot, approved, claim);
        order.verify(refunds).pending(snapshot.id());
        order.verify(provider).read("1", seller);
        order.verify(settlement).apply(snapshot, approved, claim);
        order.verify(refunds).claim(refund.id());
        order.verify(provider).refund(refund, seller);
        order.verify(refunds).uncertain(refund.id());
        order.verify(provider).read("1", seller);
        order.verify(settlement).apply(snapshot, refunded, claim);
        order.verify(queue).finish(claim, now.plusSeconds(300), null);
    }

    @Test void aDefiniteRejectionIsRecordedForTheOrganizerAndNeverMarkedUncertain() {
        when(provider.search(snapshot.id(), seller)).thenReturn(List.of("1"));
        var approved = payment(ProviderPayment.Status.APPROVED, "0");
        when(provider.read("1", seller)).thenReturn(approved);
        when(refunds.pending(snapshot.id())).thenReturn(List.of(refund));
        when(refunds.claim(refund.id())).thenReturn(Optional.of(refund));
        doThrow(new RefundRejectedException("HTTP_428:insufficient_money_for_refund")).when(provider).refund(refund, seller);
        service.execute(1);
        verify(rejections).rejected(snapshot, refund, "HTTP_428:insufficient_money_for_refund");
        verify(refunds, never()).uncertain(any());
        verify(provider, times(3)).read("1", seller);
        verify(queue).finish(claim, now.plusSeconds(300), null);
    }

    @Test void aRejectionForAPaymentAlreadyRefundedElsewhereIsVerifiedInsteadOfReported() {
        when(provider.search(snapshot.id(), seller)).thenReturn(List.of("1"));
        var approved = payment(ProviderPayment.Status.APPROVED, "0");
        var refunded = payment(ProviderPayment.Status.REFUNDED, "20000");
        when(provider.read("1", seller)).thenReturn(approved, approved, refunded);
        when(refunds.pending(snapshot.id())).thenReturn(List.of(refund));
        when(refunds.claim(refund.id())).thenReturn(Optional.of(refund));
        doThrow(new RefundRejectedException("HTTP_400:2063")).when(provider).refund(refund, seller);
        service.execute(1);
        verifyNoInteractions(rejections);
        verify(refunds).uncertain(refund.id());
        verify(settlement).apply(snapshot, refunded, claim);
    }

    @Test void anUncertainOutcomeStaysUncertainAndIsNotReportedAsRejected() {
        when(provider.search(snapshot.id(), seller)).thenReturn(List.of("1"));
        when(provider.read("1", seller)).thenReturn(payment(ProviderPayment.Status.APPROVED, "0"));
        when(refunds.pending(snapshot.id())).thenReturn(List.of(refund));
        when(refunds.claim(refund.id())).thenReturn(Optional.of(refund));
        doThrow(new IllegalStateException("timeout")).when(provider).refund(refund, seller);
        service.execute(1);
        verify(refunds).uncertain(refund.id());
        verifyNoInteractions(rejections);
        verify(queue).finish(claim, now.plusSeconds(60), "PAYMENT_RECONCILIATION_REQUIRED");
    }

    @Test void aRejectionThatCannotBeRecordedFallsBackToUncertain() {
        when(provider.search(snapshot.id(), seller)).thenReturn(List.of("1"));
        when(provider.read("1", seller)).thenReturn(payment(ProviderPayment.Status.APPROVED, "0"));
        when(refunds.pending(snapshot.id())).thenReturn(List.of(refund));
        when(refunds.claim(refund.id())).thenReturn(Optional.of(refund));
        doThrow(new RefundRejectedException("HTTP_400:2063")).when(provider).refund(refund, seller);
        doThrow(new IllegalStateException("database down")).when(rejections).rejected(snapshot, refund, "HTTP_400:2063");
        service.execute(1);
        verify(refunds).uncertain(refund.id());
        verify(queue).finish(claim, now.plusSeconds(60), "PAYMENT_RECONCILIATION_REQUIRED");
    }

    @Test void partialRefundReversalAndPendingPaymentNeverTriggerMoneyMovement() {
        when(queue.claimDue(now, 1)).thenReturn(List.of(claim));
        when(refunds.pending(snapshot.id())).thenReturn(List.of(refund));
        for (var payment : List.of(payment(ProviderPayment.Status.REFUNDED, "20000"),
                payment(ProviderPayment.Status.APPROVED, "5000"), payment(ProviderPayment.Status.PENDING, "0"))) {
            when(provider.read("1", seller)).thenReturn(payment);
            service.execute(1);
            verify(settlement).apply(snapshot, payment, claim);
        }
        verify(refunds, never()).claim(any());
        verify(provider, never()).refund(any(), any());
    }

    @Test void refundReadsCannotSubstituteAnotherPaymentAndLostClaimNeverPosts() {
        when(queue.claimDue(now, 1)).thenReturn(List.of(claim));
        var otherRefund = new RefundIntent(UUID.randomUUID(), snapshot.id(), "2", snapshot.quote().total(), RefundIntent.Status.PREPARED);
        when(refunds.pending(snapshot.id())).thenReturn(List.of(otherRefund));
        when(provider.read("2", seller)).thenReturn(payment(ProviderPayment.Status.APPROVED, "0"));
        service.execute(1);
        verify(queue).finish(claim, now.plusSeconds(60), "PAYMENT_RECONCILIATION_REQUIRED");
        when(refunds.pending(snapshot.id())).thenReturn(List.of(refund));
        when(provider.read("1", seller)).thenReturn(payment(ProviderPayment.Status.APPROVED, "0"));
        when(refunds.claim(refund.id())).thenReturn(Optional.empty());
        service.execute(1);
        verify(provider, never()).refund(any(), any());
    }

    @Test void activeCheckoutKeepsTheFiveMinutePollEvenWhenItsPaymentsAreFinal() {
        when(provider.search(snapshot.id(), seller)).thenReturn(List.of("1"));
        when(provider.read("1", seller)).thenReturn(payment(ProviderPayment.Status.REJECTED, "0"));
        service.execute(1);
        verify(queue).finish(claim, now.plusSeconds(300), null);
        verify(queue, never()).park(any());
    }

    @Test void settledOrAbandonedAttemptStopsPollingAfterItsCheckoutWindow() {
        expiredAgo(Duration.ofHours(2));
        when(queue.claimDue(now, 1)).thenReturn(List.of(claim));
        service.execute(1);
        when(provider.search(snapshot.id(), seller)).thenReturn(List.of("1"));
        for (var settled : List.of(payment(ProviderPayment.Status.REJECTED, "0"), payment(ProviderPayment.Status.CANCELLED, "0"),
                payment(ProviderPayment.Status.REFUNDED, "20000"), payment(ProviderPayment.Status.CHARGED_BACK, "0"))) {
            when(provider.read("1", seller)).thenReturn(settled);
            service.execute(1);
        }
        verify(queue, times(5)).park(claim);
        verify(queue, never()).finish(any(), any(), any());
    }

    @Test void unsettledAttemptsBackOffOnABoundedScheduleByAge() {
        when(provider.search(snapshot.id(), seller)).thenReturn(List.of("1"));
        when(queue.claimDue(now, 1)).thenReturn(List.of(claim));
        var expectations = new LinkedHashMap<Duration, Duration>();
        expectations.put(Duration.ofHours(2), Duration.ofMinutes(30));
        expectations.put(Duration.ofDays(3), Duration.ofHours(6));
        expectations.put(Duration.ofDays(30), Duration.ofHours(24));
        for (var entry : expectations.entrySet()) {
            expiredAgo(entry.getKey());
            when(provider.read("1", seller)).thenReturn(payment(ProviderPayment.Status.APPROVED, "0"));
            service.execute(1);
            verify(queue).finish(claim, now.plus(entry.getValue()), null);
        }
        for (var status : List.of(ProviderPayment.Status.PENDING, ProviderPayment.Status.IN_MEDIATION)) {
            expiredAgo(Duration.ofHours(2));
            when(provider.read("1", seller)).thenReturn(payment(status, "0"));
            service.execute(1);
        }
        verify(queue, times(3)).finish(claim, now.plus(Duration.ofMinutes(30)), null);
        expiredAgo(Duration.ofDays(200));
        when(provider.read("1", seller)).thenReturn(payment(ProviderPayment.Status.APPROVED, "0"));
        service.execute(1);
        verify(queue).park(claim);
    }

    @Test void pendingRefundKeepsAnExpiredAttemptScheduled() {
        expiredAgo(Duration.ofHours(2));
        when(provider.search(snapshot.id(), seller)).thenReturn(List.of("1"));
        when(provider.read("1", seller)).thenReturn(payment(ProviderPayment.Status.REFUNDED, "20000"));
        when(refunds.pending(snapshot.id())).thenReturn(List.of(refund));
        service.execute(1);
        verify(queue).finish(claim, now.plus(Duration.ofMinutes(30)), null);
        verify(queue, never()).park(any());
    }

    @Test void failuresOfOldAttemptsRetryOnTheAgeScheduleInsteadOfEveryMinute() {
        expiredAgo(Duration.ofDays(3));
        when(provider.search(snapshot.id(), seller)).thenThrow(new IllegalStateException("provider down"));
        service.execute(1);
        verify(queue).finish(claim, now.plus(Duration.ofHours(6)), "PAYMENT_RECONCILIATION_REQUIRED");
    }

    private void expiredAgo(Duration age) {
        var expired = new CheckoutSnapshot(snapshot.id(), snapshot.registrationId(), snapshot.eventId(), snapshot.buyerId(),
                snapshot.organizerId(), snapshot.sellerId(), snapshot.title(), snapshot.quote(), now.minus(age));
        when(attempts.dispatchedSnapshot(snapshot.id())).thenReturn(Optional.of(expired));
    }

    private ProviderPayment payment(ProviderPayment.Status status, String returned) {
        return new ProviderPayment("1", snapshot.id(), "123", true, snapshot.quote().total(), "ARS", snapshot.quote().commission(),
                new BigDecimal(returned), status, now, now.minusSeconds(1));
    }
}
