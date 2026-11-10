package com.vinnot.payment.application.service;

import com.vinnot.event.application.port.out.*;
import com.vinnot.event.domain.model.*;
import com.vinnot.payment.application.port.out.*;
import com.vinnot.payment.domain.model.*;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Role;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventPaymentMethod;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.event.domain.valueobject.EventType;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class RequestPaymentRefundServiceTest {
    private final CheckoutAttemptStore attempts = mock(CheckoutAttemptStore.class);
    private final EventRepositoryPort events = mock(EventRepositoryPort.class);
    private final EventRegistrationRepositoryPort registrations = mock(EventRegistrationRepositoryPort.class);
    private final UserRepositoryPort users = mock(UserRepositoryPort.class);
    private final PaymentLedger ledger = mock(PaymentLedger.class);
    private final RefundStore refunds = mock(RefundStore.class);
    private final PaymentNoticeService notices = mock(PaymentNoticeService.class);
    private final PaymentReconciliationQueue queue = mock(PaymentReconciliationQueue.class);
    private final RequestPaymentRefundService service = new RequestPaymentRefundService(attempts, events, registrations, users, ledger, refunds, queue, notices);
    private final CheckoutSnapshot snapshot = new CheckoutSnapshot(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
            "123", "Cata", new TicketPaymentQuote(new BigDecimal("10000"), 1, "ARS", CommissionPolicy.DEFAULT), Instant.now().plusSeconds(600));
    private final User actor = mock(User.class);
    @BeforeEach void setup() {
        when(attempts.dispatchedSnapshot(snapshot.id())).thenReturn(Optional.of(snapshot));
        when(users.findById(snapshot.organizerId())).thenReturn(Optional.of(actor));
        when(actor.isActive()).thenReturn(true);
        when(actor.hasRole(Role.PARTNER)).thenReturn(true);
    }
    @Test void currentRoleAndAccountStatusAreRequiredEvenForOriginalOrganizer() {
        when(actor.isActive()).thenReturn(false);
        rejected();
        when(actor.isActive()).thenReturn(true);
        when(actor.isLocked()).thenReturn(true);
        rejected();
        when(actor.isLocked()).thenReturn(false);
        when(actor.hasRole(Role.PARTNER)).thenReturn(false);
        rejected();
        verifyNoInteractions(events, registrations, ledger, refunds, queue);
    }
    @Test void aPaymentWhoseBuyerDeletedTheAccountCannotBeRefundedFromVinnotEvenByAnAdmin() {
        var unlinked = new CheckoutSnapshot(snapshot.id(), null, snapshot.eventId(), null, snapshot.organizerId(),
                "123", "Cata", snapshot.quote(), snapshot.expiresAt());
        when(attempts.dispatchedSnapshot(snapshot.id())).thenReturn(Optional.of(unlinked));
        when(actor.hasRole(Role.ADMIN)).thenReturn(true);
        assertThatThrownBy(() -> service.request(snapshot.id(), snapshot.organizerId()))
                .isInstanceOf(DomainException.class).extracting("code").isEqualTo("PAYMENT_REFUND_UNAVAILABLE");
        verifyNoInteractions(users, events, registrations, ledger, refunds, queue, notices);
    }
    @Test void inconsistentCreditedPaymentWithUnconfirmedHoldRequiresReviewWithoutReleasingCapacity() {
        var event = mock(Event.class);
        when(event.getOrganizerId()).thenReturn(snapshot.organizerId());
        var registration = mock(EventRegistration.class);
        var now = Instant.now();
        var payment = new ProviderPayment("1", snapshot.id(), "123", true, snapshot.quote().total(), "ARS", snapshot.quote().commission(),
                BigDecimal.ZERO, ProviderPayment.Status.APPROVED, now, now);
        when(events.findByIdForUpdate(snapshot.eventId())).thenReturn(Optional.of(event));
        when(registrations.findByIdForUpdate(snapshot.registrationId())).thenReturn(Optional.of(registration));
        when(ledger.creditedPayment(snapshot.id())).thenReturn(Optional.of("1"));
        when(ledger.find("1")).thenReturn(Optional.of(new PaymentLedger.Entry(payment, true, false)));
        when(registration.holdsCapacity()).thenReturn(true);
        rejected();
        verifyNoInteractions(refunds, queue);
        verify(events, never()).save(any());
        verify(registrations, never()).save(any());
        verify(event, never()).releaseHeldAttendees(anyInt());
    }
    @Test void cancelledEventAndRegistrationStillAllowRefundWithoutReleasingCapacityTwice() {
        var now = Instant.now();
        var event = Event.create("Tasting", EventType.TASTING,
                EventDateRange.of(now.plusSeconds(86400), now.plusSeconds(90000)), snapshot.organizerId());
        event.updateCapacity(3);
        event.publish();
        event.confirmAttendees(2);
        event.holdAttendees(1);
        var registration = EventRegistration.request(snapshot.eventId(), snapshot.buyerId(), 1, "Attendee", "test@example.com", null,
                null, List.of(), "ARS", snapshot.quote().total());
        registration.approvePaid(now.plusSeconds(600));
        registration.approvePayment(EventPaymentMethod.TRANSFER);
        event.cancel();
        // EventPersistenceAdapter atomically cancels active registrations when saving a cancelled event.
        registration.cancel();
        var payment = new ProviderPayment("1", snapshot.id(), "123", true, snapshot.quote().total(), "ARS", snapshot.quote().commission(),
                BigDecimal.ZERO, ProviderPayment.Status.APPROVED, now, now);
        when(events.findByIdForUpdate(snapshot.eventId())).thenReturn(Optional.of(event));
        when(registrations.findByIdForUpdate(snapshot.registrationId())).thenReturn(Optional.of(registration));
        when(ledger.creditedPayment(snapshot.id())).thenReturn(Optional.of("1"));
        when(ledger.find("1")).thenReturn(Optional.of(new PaymentLedger.Entry(payment, true, false)));
        when(refunds.requireRefund(snapshot.id(), "1", snapshot.quote().total())).thenReturn(true);
        service.request(snapshot.id(), snapshot.organizerId());
        assertThat(event.getStatus()).isEqualTo(EventStatus.CANCELLED);
        assertThat(event.getCapacity().getCurrentAttendees()).isZero();
        assertThat(event.getCapacity().getHeldAttendees()).isZero();
        assertThat(registration.getStatus()).isEqualTo(EventRegistrationStatus.CANCELLED);
        verify(refunds).requireRefund(snapshot.id(), "1", snapshot.quote().total());
        verify(queue).notify(snapshot.id());
        verify(notices).refundRequested(snapshot, payment);
    }
    @Test void aRefundTheProviderRejectedIsSentAgainWithItsExistingIntentAndNoNewNotice() {
        var now = Instant.now();
        var event = mock(Event.class);
        when(event.getOrganizerId()).thenReturn(snapshot.organizerId());
        var registration = mock(EventRegistration.class);
        when(registration.getStatus()).thenReturn(EventRegistrationStatus.CANCELLED);
        var payment = new ProviderPayment("1", snapshot.id(), "123", true, snapshot.quote().total(), "ARS", snapshot.quote().commission(),
                BigDecimal.ZERO, ProviderPayment.Status.APPROVED, now, now);
        when(events.findByIdForUpdate(snapshot.eventId())).thenReturn(Optional.of(event));
        when(registrations.findByIdForUpdate(snapshot.registrationId())).thenReturn(Optional.of(registration));
        when(ledger.creditedPayment(snapshot.id())).thenReturn(Optional.of("1"));
        when(ledger.find("1")).thenReturn(Optional.of(new PaymentLedger.Entry(payment, true, false)));
        when(refunds.requireRefund(snapshot.id(), "1", snapshot.quote().total())).thenReturn(false);
        when(refunds.retryRejected("1")).thenReturn(true, false);
        service.request(snapshot.id(), snapshot.organizerId());
        service.request(snapshot.id(), snapshot.organizerId());
        verify(refunds, times(2)).retryRejected("1");
        verify(queue, times(2)).notify(snapshot.id());
        verifyNoInteractions(notices);
    }
    private void rejected() { assertThatThrownBy(() -> service.request(snapshot.id(), snapshot.organizerId())).isInstanceOf(DomainException.class); }
}
