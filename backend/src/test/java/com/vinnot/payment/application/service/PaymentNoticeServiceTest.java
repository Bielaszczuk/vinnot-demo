package com.vinnot.payment.application.service;

import com.vinnot.notification.application.port.in.NotificationPort;
import com.vinnot.notification.domain.model.NotificationRequest;
import com.vinnot.notification.domain.model.NotificationType;
import com.vinnot.payment.application.port.out.EventTimeZones;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.ProviderPayment;
import com.vinnot.payment.domain.model.RefundIntent;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import com.vinnot.notification.application.port.in.PushNotificationPort;
import com.vinnot.notification.domain.model.PushRequest;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

class PaymentNoticeServiceTest {
    private static final Instant PAID = Instant.parse("2026-10-19T15:00:00Z");
    private final NotificationPort notifications = mock(NotificationPort.class);
    private final EventTimeZones timeZones = mock(EventTimeZones.class);
    private final PushNotificationPort pushes =
            mock(PushNotificationPort.class);
    private final PaymentNoticeService service = new PaymentNoticeService(notifications, timeZones, pushes);
    private final CheckoutSnapshot snapshot = new CheckoutSnapshot(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            UUID.randomUUID(), UUID.randomUUID(), "123", "Cata", new TicketPaymentQuote(new BigDecimal("10000"), 1, "ARS", CommissionPolicy.DEFAULT),
            PAID.plusSeconds(600));

    @Test
    void theReceiptCarriesEventAmountDateReferenceAndTheVenueZoneToTheBuyer() {
        when(timeZones.of(snapshot.eventId())).thenReturn("America/Argentina/Mendoza");
        service.receipt(snapshot, payment(ProviderPayment.Status.APPROVED, "0"));

        var request = sent(1).getFirst();
        assertThat(request.type()).isEqualTo(NotificationType.PAYMENT_RECEIPT);
        assertThat(request.recipient().userId()).isEqualTo(snapshot.buyerId());
        assertThat(request.data()).containsEntry("title", "Cata").containsEntry("amount", "10000.00").containsEntry("currency", "ARS")
                .containsEntry("paidAt", PAID.toString()).containsEntry("reference", "77")
                .containsEntry("timeZone", "America/Argentina/Mendoza")
                .containsEntry("registrationId", snapshot.registrationId().toString());
        assertThat(request.dedupeKey()).isEqualTo("payment-receipt:77");
        assertThat(request.category().transactional()).isTrue();
    }

    @Test
    void refundsReachBuyerAndOrganizerWithTheAmount() {
        service.refundRequested(snapshot, payment(ProviderPayment.Status.APPROVED, "0"));

        var requests = sent(2);
        assertThat(requests).extracting(r -> r.recipient().userId()).containsExactly(snapshot.buyerId(), snapshot.organizerId());
        assertThat(requests).extracting(r -> r.data().get("audience")).containsExactly("BUYER", "ORGANIZER");
        assertThat(requests).allSatisfy(r -> assertThat(r.data()).containsEntry("amount", "10000.00"));
        assertThat(requests).extracting(NotificationRequest::dedupeKey)
                .containsExactly("payment-refund-requested:77:BUYER", "payment-refund-requested:77:ORGANIZER");
    }

    @Test
    void aProcessedRefundReportsTheRefundedTotalAndKeysOnIt() {
        service.refunded(snapshot, payment(ProviderPayment.Status.REFUNDED, "2500.50"));

        var requests = sent(2);
        assertThat(requests).allSatisfy(r -> {
            assertThat(r.type()).isEqualTo(NotificationType.PAYMENT_REFUNDED);
            assertThat(r.data()).containsEntry("amount", "2500.50");
        });
        assertThat(requests.getFirst().dedupeKey()).isEqualTo("payment-refunded:77:2500.50:BUYER");
    }

    @Test
    void aChargebackIsToldOnlyToTheOrganizer() {
        service.chargeback(snapshot, payment(ProviderPayment.Status.CHARGED_BACK, "0"));

        var request = sent(1).getFirst();
        assertThat(request.type()).isEqualTo(NotificationType.PAYMENT_CHARGEBACK);
        assertThat(request.recipient().userId()).isEqualTo(snapshot.organizerId());
        assertThat(request.dedupeKey()).isEqualTo("payment-chargeback:77");
        verify(pushes).push(new PushRequest(
                NotificationType.PAYMENT_CHARGEBACK, List.of(snapshot.organizerId()),
                Map.of("title", "Cata"), "payment-chargeback:77", true));
    }

    @Test
    void aRejectedRefundIsToldToTheOrganizerOncePerRejectionWithItsReason() {
        var refund = new RefundIntent(UUID.randomUUID(), snapshot.id(), "77", new BigDecimal("10000.00"), RefundIntent.Status.REJECTED);
        service.refundRejected(snapshot, refund, "HTTP_428:insufficient_money_for_refund", 2);

        var request = sent(1).getFirst();
        assertThat(request.type()).isEqualTo(NotificationType.PAYMENT_REFUND_REJECTED);
        assertThat(request.recipient().userId()).isEqualTo(snapshot.organizerId());
        assertThat(request.data()).containsEntry("title", "Cata").containsEntry("amount", "10000.00").containsEntry("currency", "ARS")
                .containsEntry("reference", "77").containsEntry("reason", "HTTP_428:insufficient_money_for_refund")
                .containsEntry("registrationId", snapshot.registrationId().toString());
        assertThat(request.dedupeKey()).isEqualTo("payment-refund-rejected:77:2");
        assertThat(request.category().transactional()).isTrue();
        verifyNoInteractions(pushes);
    }

    @Test
    void afterTheBuyerDeletedTheAccountOnlyTheOrganizerIsToldAndNoTicketIsNamed() {
        var unlinked = new CheckoutSnapshot(snapshot.id(), null, snapshot.eventId(), null, snapshot.organizerId(), "123", "Cata",
                snapshot.quote(), snapshot.expiresAt());
        service.refundRequested(unlinked, payment(ProviderPayment.Status.APPROVED, "0"));
        service.refunded(unlinked, payment(ProviderPayment.Status.REFUNDED, "10000"));
        service.refundRejected(unlinked, new RefundIntent(UUID.randomUUID(), snapshot.id(), "77", new BigDecimal("10000.00"),
                RefundIntent.Status.REJECTED), "HTTP_400:x", 1);

        var requests = sent(3);
        assertThat(requests).allSatisfy(r -> {
            assertThat(r.recipient().userId()).isEqualTo(snapshot.organizerId());
            assertThat(r.data()).doesNotContainKey("registrationId").containsEntry("title", "Cata");
        });
        assertThat(requests).extracting(NotificationRequest::dedupeKey).containsExactly(
                "payment-refund-requested:77:ORGANIZER", "payment-refunded:77:10000.00:ORGANIZER", "payment-refund-rejected:77:1");
    }

    @Test
    void afterTheOrganizerDeletedTheAccountNoOneIsLeftForOrganizerNotices() {
        var unlinked = new CheckoutSnapshot(snapshot.id(), null, null, snapshot.buyerId(), null, "123", "Cata",
                snapshot.quote(), snapshot.expiresAt());
        service.chargeback(unlinked, payment(ProviderPayment.Status.CHARGED_BACK, "0"));
        service.refundRejected(unlinked, new RefundIntent(UUID.randomUUID(), snapshot.id(), "77", new BigDecimal("10000.00"),
                RefundIntent.Status.REJECTED), "HTTP_400:x", 1);
        // The buyer still exists but their ticket does not, so a buyer email would have nothing to link to.
        service.refundRequested(unlinked, payment(ProviderPayment.Status.APPROVED, "0"));
        verifyNoInteractions(notifications, pushes);
    }

    @Test
    void buyerPaymentEmailsAddNoPushBecauseTheRegistrationPushReportsThem() {
        when(timeZones.of(snapshot.eventId())).thenReturn("UTC");
        service.receipt(snapshot, payment(ProviderPayment.Status.APPROVED, "0"));
        service.refundRequested(snapshot, payment(ProviderPayment.Status.APPROVED, "0"));
        service.refunded(snapshot, payment(ProviderPayment.Status.REFUNDED, "10000"));
        verifyNoInteractions(pushes);
    }

    private List<NotificationRequest> sent(int count) {
        var captor = ArgumentCaptor.forClass(NotificationRequest.class);
        verify(notifications, times(count)).enqueue(captor.capture());
        return captor.getAllValues();
    }

    private ProviderPayment payment(ProviderPayment.Status status, String refunded) {
        return new ProviderPayment("77", snapshot.id(), "123", true, new BigDecimal("10000"), "ARS", new BigDecimal("300"),
                new BigDecimal(refunded), status, PAID, status == ProviderPayment.Status.APPROVED ? PAID : PAID);
    }
}
