package com.vinnot.payment.application.service;

import com.vinnot.event.application.port.out.EventRepositoryPort;
import com.vinnot.event.application.port.out.EventRegistrationRepositoryPort;
import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.payment.application.port.in.PrepareEventCheckoutUseCase;
import com.vinnot.payment.application.port.out.CheckoutAttemptStore;
import com.vinnot.payment.application.port.out.CheckoutEligibility;
import com.vinnot.payment.application.port.out.CurrentCommissionPolicy;
import com.vinnot.payment.application.port.out.SellerCredentialReader;
import com.vinnot.payment.domain.model.CheckoutSnapshot;
import com.vinnot.payment.domain.valueobject.CommissionPolicy;
import com.vinnot.payment.domain.valueobject.TicketPaymentQuote;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.user.application.port.out.UserRepositoryPort;
import com.vinnot.user.domain.model.User;
import com.vinnot.user.domain.valueobject.Role;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import com.vinnot.event.domain.valueobject.EventPaymentStatus;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.shared.domain.exception.DomainException;
import java.util.Objects;

/** Short local transactions, always event before registration. This service never calls the provider. */
public class EventCheckoutReservationService implements PrepareEventCheckoutUseCase, CheckoutEligibility {
    private static final int MONEY_SCALE = 2;
    private final EventRepositoryPort events;
    private final EventRegistrationRepositoryPort registrations;
    private final UserRepositoryPort users;
    private final SellerCredentialReader accounts;
    private final CheckoutAttemptStore attempts;
    private final Clock clock;
    private final PaymentExecutionPolicy policy;
    private final CurrentCommissionPolicy commission;

    public EventCheckoutReservationService(EventRepositoryPort events, EventRegistrationRepositoryPort registrations,
            UserRepositoryPort users, SellerCredentialReader accounts, CheckoutAttemptStore attempts, Clock clock) {
        this(events, registrations, users, accounts, attempts, clock, PaymentExecutionPolicy.sandbox());
    }

    public EventCheckoutReservationService(EventRepositoryPort events, EventRegistrationRepositoryPort registrations,
            UserRepositoryPort users, SellerCredentialReader accounts, CheckoutAttemptStore attempts, Clock clock,
            PaymentExecutionPolicy policy) {
        this(events, registrations, users, accounts, attempts, clock, policy, () -> CommissionPolicy.DEFAULT);
    }

    public EventCheckoutReservationService(EventRepositoryPort events, EventRegistrationRepositoryPort registrations,
            UserRepositoryPort users, SellerCredentialReader accounts, CheckoutAttemptStore attempts, Clock clock,
            PaymentExecutionPolicy policy, CurrentCommissionPolicy commission) {
        this.policy = policy;
        this.commission = Objects.requireNonNull(commission);
        this.events = events;
        this.registrations = registrations;
        this.users = users;
        this.accounts = accounts;
        this.attempts = attempts;
        this.clock = clock;
    }

    @Override
    @Transactional
    public UUID prepare(UUID eventId, UUID registrationId, UUID buyerId) {
        return prepare(eventId, registrationId, buyerId, false);
    }

    @Override
    @Transactional
    public UUID prepare(UUID eventId, UUID registrationId, UUID buyerId, boolean returnToApp) {
        var locked = loadEligible(eventId, registrationId, buyerId, true);
        var event = locked.event();
        var registration = locked.registration();
        Instant start = event.getDateRange().getStartDate();
        Instant holdUntil = Objects.nonNull(registration.getExpiresAt()) ? registration.getExpiresAt()
                : event.getRegistrationSettings().holdUntil(clock.instant(), start);
        Instant expiry = holdUntil.isBefore(start) ? holdUntil : start;
        var seller = accounts.findCredentials(event.getOrganizerId())
                .filter(value -> value.expiresAt().isAfter(expiry)).orElseThrow(this::unavailable);
        policy.requireAmount(seller.sellerId(), registration.getTotalAmount(), registration.getCurrency());
        if (registration.getStatus() == EventRegistrationStatus.REQUESTED) {
            if (!event.hasAvailableCapacity(registration.getAttendeeCount())) { throw unavailable(); }
            event.holdAttendees(registration.getAttendeeCount());
            events.save(event);
        }
        registration.prepareOnlinePayment(expiry, clock.instant());
        registrations.save(registration);
        var existing = attempts.findByRegistration(registrationId, buyerId);
        if (existing.isPresent()) {
            requireMatching(existing.get(), locked);
            if (!existing.get().sellerId().equals(seller.sellerId())) {
                throw unavailable();
            }
            return existing.get().id();
        }
        TicketPaymentQuote quote;
        try {
            quote = new TicketPaymentQuote(registration.getTotalAmount().divide(
                    BigDecimal.valueOf(registration.getAttendeeCount()), MONEY_SCALE, RoundingMode.UNNECESSARY),
                    registration.getAttendeeCount(), registration.getCurrency(), commission.current());
        } catch (IllegalArgumentException | ArithmeticException exception) {
            throw unavailable();
        }
        return attempts.prepare(new CheckoutSnapshot(UUID.randomUUID(), registrationId, eventId, buyerId,
                event.getOrganizerId(), seller.sellerId(), event.getTitle(), quote, expiry, returnToApp)).id();
    }

    @Override
    @Transactional(noRollbackFor = DomainException.class)
    public void verify(CheckoutSnapshot snapshot) {
        policy.requireAmount(snapshot.sellerId(), snapshot.quote().total(), snapshot.quote().currency());
        requireMatching(snapshot, loadEligible(snapshot.eventId(), snapshot.registrationId(), snapshot.buyerId(), false));
    }

    private LockedReservation loadEligible(UUID eventId, UUID registrationId, UUID buyerId, boolean preparing) {
        var event = events.findByIdForUpdate(eventId).orElseThrow(this::unavailable);
        var registration = registrations.findByIdForUpdate(registrationId).orElseThrow(this::unavailable);
        if (!registration.getEventId().equals(eventId) || !registration.getUserId().equals(buyerId)
                || (event.getStatus() != EventStatus.PUBLISHED && event.getStatus() != EventStatus.SOLD_OUT)
                || !event.getDateRange().getStartDate().isAfter(clock.instant())) {
            throw unavailable();
        }
        requireActive(buyerId);
        var organizer = requireActive(event.getOrganizerId());
        if (!organizer.hasRole(Role.PARTNER) && !organizer.hasRole(Role.ADMIN)) {
            throw unavailable();
        }
        boolean legacyRequest = preparing && registration.getStatus() == EventRegistrationStatus.REQUESTED
                && Objects.nonNull(registration.getTotalAmount()) && registration.getTotalAmount().signum() > 0;
        boolean legacyReported = preparing && !registration.isExternallyManagedPayment()
                && registration.getStatus() == EventRegistrationStatus.AWAITING_PAYMENT
                && registration.getPaymentStatus() == EventPaymentStatus.REPORTED;
        if (!legacyRequest && !legacyReported) { registration.requireExternalPaymentEligible(clock.instant()); }
        return new LockedReservation(event, registration);
    }

    private User requireActive(UUID id) {
        var user = users.findById(id).orElseThrow(this::unavailable);
        if (!user.isActive() || user.isLocked()) {
            throw unavailable();
        }
        return user;
    }

    private void requireMatching(CheckoutSnapshot snapshot, LockedReservation locked) {
        var registration = locked.registration();
        if (!registration.isExternallyManagedPayment()
                || !snapshot.organizerId().equals(locked.event().getOrganizerId())
                || snapshot.quote().total().compareTo(registration.getTotalAmount()) != 0
                || !snapshot.quote().currency().equals(registration.getCurrency())
                || snapshot.quote().quantity() != registration.getAttendeeCount()
                || snapshot.expiresAt().isAfter(registration.getExpiresAt())
                || snapshot.expiresAt().isAfter(locked.event().getDateRange().getStartDate())
                || !snapshot.expiresAt().isAfter(clock.instant())) {
            throw unavailable();
        }
    }

    private BusinessRuleViolationException unavailable() {
        return new BusinessRuleViolationException("PAYMENT_RESERVATION_UNAVAILABLE",
                "Esta reserva no está disponible para iniciar el pago.");
    }

    private record LockedReservation(Event event, EventRegistration registration) { }
}
