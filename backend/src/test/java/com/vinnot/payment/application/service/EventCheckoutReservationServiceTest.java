package com.vinnot.payment.application.service;

import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.*;
import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.model.SellerCredentials;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.shared.domain.exception.DomainException;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import java.time.temporal.ChronoUnit;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class EventCheckoutReservationServiceTest {
    private final EventRepositoryPort events = mock(EventRepositoryPort.class);
    private final EventRegistrationRepositoryPort registrations = mock(EventRegistrationRepositoryPort.class);
    private final UserRepositoryPort users = mock(UserRepositoryPort.class);
    private final SellerCredentialReader accounts = mock(SellerCredentialReader.class);
    private final CheckoutAttemptStore attempts = mock(CheckoutAttemptStore.class);
    private final UUID eventId = UUID.randomUUID(), registrationId = UUID.randomUUID(), buyer = UUID.randomUUID(), organizer = UUID.randomUUID();
    private final Instant now = Instant.now().truncatedTo(ChronoUnit.SECONDS);
    private static final CommissionPolicy THREE_PERCENT = new CommissionPolicy(300, "VINNOT_3_PERCENT_V1");
    private static final CommissionPolicy EIGHT_PERCENT = new CommissionPolicy(800, "VINNOT_8_PERCENT_V1");
    private CommissionPolicy currentPolicy = THREE_PERCENT;
    private final EventCheckoutReservationService service = new EventCheckoutReservationService(events, registrations, users,
            accounts, attempts, Clock.fixed(now, ZoneOffset.UTC), PaymentExecutionPolicy.sandbox(), () -> currentPolicy);
    private EventRegistration current;

    @BeforeEach
    void setup() {
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event().build()));
        current = registration().build();
        when(registrations.findByIdForUpdate(registrationId)).thenAnswer(call -> Optional.of(current));
        when(users.findById(buyer)).thenReturn(Optional.of(user(buyer).roles(Set.of(Role.USER)).build()));
        when(users.findById(organizer)).thenReturn(Optional.of(user(organizer).roles(Set.of(Role.PARTNER)).build()));
        when(accounts.findCredentials(organizer)).thenReturn(Optional.of(new SellerCredentials("123", "a", "r", now.plusSeconds(7200))));
        when(attempts.prepare(any())).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void persistsNativeReturnWithoutChangingCommercialTerms() {
        service.prepare(eventId, registrationId, buyer, true);
        var captured = ArgumentCaptor.forClass(CheckoutSnapshot.class);
        verify(attempts).prepare(captured.capture());
        assertThat(captured.getValue().returnToApp()).isTrue();
        assertThat(captured.getValue().quote().commission()).isEqualByComparingTo("600");
    }

    @Test
    void newCheckoutsArePricedWithTheCurrentPolicy() {
        currentPolicy = EIGHT_PERCENT;
        prepare();
        var captured = ArgumentCaptor.forClass(CheckoutSnapshot.class);
        verify(attempts).prepare(captured.capture());
        assertThat(captured.getValue().quote().commissionPolicy()).isEqualTo(EIGHT_PERCENT);
        assertThat(captured.getValue().quote().commission()).isEqualByComparingTo("1600");
        assertThat(captured.getValue().quote().total()).isEqualByComparingTo("20000");
    }

    @Test
    void anExistingAttemptKeepsItsStoredPolicyAfterTheRateChanges() {
        var stored = prepared();
        currentPolicy = EIGHT_PERCENT;
        assertThat(prepare()).isEqualTo(stored.id());
        service.verify(stored);
        verify(attempts, times(1)).prepare(any());
        assertThat(stored.quote().commissionPolicy()).isEqualTo(THREE_PERCENT);
    }

    @Test
    void constructorsWithoutAPolicySourceKeepTheOriginalThreePercentTerms() {
        new EventCheckoutReservationService(events, registrations, users, accounts, attempts, Clock.fixed(now, ZoneOffset.UTC))
                .prepare(eventId, registrationId, buyer);
        var captured = ArgumentCaptor.forClass(CheckoutSnapshot.class);
        verify(attempts).prepare(captured.capture());
        assertThat(captured.getValue().quote().commissionPolicy()).isEqualTo(CommissionPolicy.DEFAULT);
        assertThat(captured.getValue().quote().commission()).isEqualByComparingTo("600");
    }

    @Test
    void pilotRefusesExcessWithoutMutatingReservationOrCreatingAttempt() {
        var pilot = new EventCheckoutReservationService(events, registrations, users, accounts, attempts,
                Clock.fixed(now, ZoneOffset.UTC), new PaymentExecutionPolicy(PaymentExecutionPolicy.Environment.LIVE_PILOT, "123", "999"));
        assertThatThrownBy(() -> pilot.prepare(eventId, registrationId, buyer)).isInstanceOf(BusinessRuleViolationException.class);
        assertThat(current.isExternallyManagedPayment()).isFalse();
        verify(registrations, never()).save(any());
        verify(attempts, never()).prepare(any());
    }

    @Test
    void freezesRegistrationTotalUnderOrderedLocksAndPreservesCapacity() {
        UUID result = prepare();
        var captured = ArgumentCaptor.forClass(CheckoutSnapshot.class);
        verify(attempts).prepare(captured.capture());
        assertThat(captured.getValue().id()).isEqualTo(result);
        assertThat(captured.getValue().quote().unitPrice()).isEqualByComparingTo("10000");
        assertThat(captured.getValue().quote().commission()).isEqualByComparingTo("600");
        assertThat(captured.getValue().expiresAt()).isEqualTo(now.plusSeconds(600));
        assertThat(current.isExternallyManagedPayment()).isTrue();
        var ordered = inOrder(events, registrations, attempts);
        ordered.verify(events).findByIdForUpdate(eventId);
        ordered.verify(registrations).findByIdForUpdate(registrationId);
        ordered.verify(registrations).save(current);
        ordered.verify(attempts).findByRegistration(registrationId, buyer);
        ordered.verify(attempts).prepare(any());
        verify(events, never()).save(any());
    }

    @Test
    void capsCheckoutAtEventStartAndAllowsSoldOutEventWithExistingHold() {
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event().status(EventStatus.SOLD_OUT)
                .dateRange(EventDateRange.of(now.plusSeconds(100), now.plusSeconds(7200))).build()));
        when(users.findById(organizer)).thenReturn(Optional.of(user(organizer).roles(Set.of(Role.ADMIN)).build()));
        prepare();
        var captured = ArgumentCaptor.forClass(CheckoutSnapshot.class);
        verify(attempts).prepare(captured.capture());
        assertThat(captured.getValue().expiresAt()).isEqualTo(now.plusSeconds(100));
    }

    @Test
    void repeatedPreparationReusesSnapshotDespiteChangedEventTitleOrPrice() {
        var snapshot = prepared();
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event().title("Changed title").price(BigDecimal.ONE).build()));
        assertThat(prepare()).isEqualTo(snapshot.id());
        service.verify(snapshot);
        verify(attempts, times(1)).prepare(any());
        when(accounts.findCredentials(organizer)).thenReturn(Optional.of(new SellerCredentials("456", "a", "r", now.plusSeconds(7200))));
        assertUnavailable();
    }

    @Test
    void missingRecordsOrWrongRelationshipsCannotPrepare() {
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.empty()); assertUnavailable();
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event().build()));
        when(registrations.findByIdForUpdate(registrationId)).thenReturn(Optional.empty()); assertUnavailable();
        when(registrations.findByIdForUpdate(registrationId)).thenAnswer(call -> Optional.of(current));
        current = registration().eventId(UUID.randomUUID()).build(); assertUnavailable();
        current = registration().userId(UUID.randomUUID()).build(); assertUnavailable();
        verify(attempts, never()).prepare(any());
    }

    @Test
    void rejectsClosedEventsAndStartedEvents() {
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event().status(EventStatus.CANCELLED).build())); assertUnavailable();
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event().dateRange(EventDateRange.of(now, now.plusSeconds(7200))).build())); assertUnavailable();
    }

    @Test
    void requiresActiveBuyerAndCurrentOrganizerRole() {
        when(users.findById(buyer)).thenReturn(Optional.empty()); assertUnavailable();
        when(users.findById(buyer)).thenReturn(Optional.of(user(buyer).active(false).build())); assertUnavailable();
        when(users.findById(buyer)).thenReturn(Optional.of(user(buyer).locked(true).build())); assertUnavailable();
        when(users.findById(buyer)).thenReturn(Optional.of(user(buyer).build()));
        when(users.findById(organizer)).thenReturn(Optional.of(user(organizer).roles(Set.of(Role.USER)).build())); assertUnavailable();
    }

    @Test
    void rejectsMissingOrShortLivedSellerAndInvalidMonetaryTerms() {
        when(accounts.findCredentials(organizer)).thenReturn(Optional.empty()); assertUnavailable();
        when(accounts.findCredentials(organizer)).thenReturn(Optional.of(new SellerCredentials("123", "a", "r", now.plusSeconds(600)))); assertUnavailable();
        when(accounts.findCredentials(organizer)).thenReturn(Optional.of(new SellerCredentials("123", "a", "r", now.plusSeconds(7200))));
        current = registration().currency("USD").build(); assertUnavailable();
        current = registration().attendeeCount(3).totalAmount(new BigDecimal("100")).build(); assertUnavailable();
    }

    @Test
    void snapshotMustStillMatchManagedReservationAndCurrentOrganizer() {
        var snapshot = prepared();
        current = registration().externallyManagedPayment(false).build(); assertVerifyUnavailable(snapshot);
        current = registration().externallyManagedPayment(true).build();
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event().organizerId(buyer).build()));
        when(users.findById(buyer)).thenReturn(Optional.of(user(buyer).roles(Set.of(Role.ADMIN)).build())); assertVerifyUnavailable(snapshot);
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event().build()));
        current = registration().externallyManagedPayment(true).totalAmount(BigDecimal.ONE).build(); assertVerifyUnavailable(snapshot);
        current = registration().externallyManagedPayment(true).currency("USD").build(); assertVerifyUnavailable(snapshot);
        current = registration().externallyManagedPayment(true).attendeeCount(1).build(); assertVerifyUnavailable(snapshot);
        current = registration().externallyManagedPayment(true).expiresAt(now.plusSeconds(300)).build(); assertVerifyUnavailable(snapshot);
        current = registration().externallyManagedPayment(true).build();
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event().dateRange(EventDateRange.of(now.plusSeconds(300), now.plusSeconds(7200))).build())); assertVerifyUnavailable(snapshot);
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event().build()));
        var expired = new CheckoutSnapshot(snapshot.id(), registrationId, eventId, buyer, organizer, "123", "Cata", snapshot.quote(), now);
        assertVerifyUnavailable(expired);
    }

    @Test
    void legacyRequestedReservationGoesStraightToCheckoutAndHoldsOnce() {
        var event = event().capacity(EventCapacity.of(10, 0)).registrationSettings(EventRegistrationSettings.defaults()).build();
        when(events.findByIdForUpdate(eventId)).thenReturn(Optional.of(event));
        current = registration().status(EventRegistrationStatus.REQUESTED).expiresAt(null).build();
        var snapshot = prepared();
        assertThat(current.getStatus()).isEqualTo(EventRegistrationStatus.AWAITING_PAYMENT);
        assertThat(current.getPaymentMethod()).isEqualTo(EventPaymentMethod.MERCADO_PAGO);
        assertThat(current.isExternallyManagedPayment()).isTrue();
        assertThat(event.getCapacity().getHeldAttendees()).isEqualTo(2);
        assertThat(prepare()).isEqualTo(snapshot.id());
        assertThat(event.getCapacity().getHeldAttendees()).isEqualTo(2);
    }

    @Test
    void legacyReportedPaymentRequiresVerifiedCheckoutWithoutAnotherCapacityHold() {
        current = registration().paymentStatus(EventPaymentStatus.REPORTED).build();
        prepare();
        assertThat(current.getPaymentStatus()).isEqualTo(EventPaymentStatus.PENDING);
        assertThat(current.isExternallyManagedPayment()).isTrue();
        verify(events, never()).save(any());
        current = registration().paymentStatus(EventPaymentStatus.REPORTED).expiresAt(now).build();
        assertUnavailable();
    }

    private CheckoutSnapshot prepared() {
        prepare();
        var captured = ArgumentCaptor.forClass(CheckoutSnapshot.class);
        verify(attempts).prepare(captured.capture());
        when(attempts.findByRegistration(registrationId, buyer)).thenReturn(Optional.of(captured.getValue()));
        return captured.getValue();
    }
    private UUID prepare() { return service.prepare(eventId, registrationId, buyer); }
    private void assertUnavailable() { assertThatThrownBy(this::prepare).isInstanceOf(DomainException.class); }
    private void assertVerifyUnavailable(CheckoutSnapshot snapshot) { assertThatThrownBy(() -> service.verify(snapshot)).isInstanceOf(DomainException.class); }
    private Event.Builder event() { return Event.builder().id(eventId).eventType(EventType.TASTING).organizerId(organizer).title("Cata").price(new BigDecimal("99999"))
            .status(EventStatus.PUBLISHED).dateRange(EventDateRange.of(now.plusSeconds(3600), now.plusSeconds(7200))); }
    private EventRegistration.Builder registration() { return EventRegistration.builder().id(registrationId).eventId(eventId).userId(buyer)
            .createdAt(now).updatedAt(now).attendeeCount(2).totalAmount(new BigDecimal("20000")).currency("ARS").expiresAt(now.plusSeconds(600))
            .status(EventRegistrationStatus.AWAITING_PAYMENT).paymentStatus(EventPaymentStatus.PENDING); }
    private User.Builder user(UUID id) { return User.builder().id(id).username("test").email(Email.of("test@example.com"))
            .password(Password.fromHash("hash")).active(true).locked(false).roles(Set.of(Role.USER)); }
}
