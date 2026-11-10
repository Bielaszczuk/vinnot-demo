package com.vinnot.event.domain.model;

import com.vinnot.event.domain.valueobject.EventPaymentMethod;
import com.vinnot.event.domain.valueobject.EventPaymentStatus;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.shared.domain.exception.DomainException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EventRegistrationTest {

    @Test
    void completesThePaidRegistrationLifecycle() {
        EventRegistration registration = paidRequest();
        Instant holdUntil = Instant.now().plus(1, ChronoUnit.DAYS);

        registration.approvePaid(holdUntil);

        assertThat(registration.getStatus())
                .isEqualTo(EventRegistrationStatus.AWAITING_PAYMENT);
        assertThat(registration.getPaymentStatus()).isEqualTo(EventPaymentStatus.PENDING);
        assertThat(registration.getExpiresAt()).isEqualTo(holdUntil);
        assertThat(registration.holdsCapacity()).isTrue();

        registration.reportPayment(EventPaymentMethod.TRANSFER);
        assertThat(registration.getPaymentStatus()).isEqualTo(EventPaymentStatus.REPORTED);

        registration.approvePayment(EventPaymentMethod.TRANSFER);

        assertThat(registration.getStatus()).isEqualTo(EventRegistrationStatus.CONFIRMED);
        assertThat(registration.getPaymentStatus()).isEqualTo(EventPaymentStatus.APPROVED);
        assertThat(registration.getPaymentMethod()).isEqualTo(EventPaymentMethod.TRANSFER);
        assertThat(registration.getExpiresAt()).isNull();
        assertThat(registration.getConfirmedAt()).isNotNull();
    }

    @Test
    void requiresTheAttendeeToConfirmAnApprovedFreeRegistration() {
        EventRegistration registration = freeRequest();
        Instant holdUntil = Instant.now().plus(1, ChronoUnit.DAYS);

        registration.approveFree(holdUntil, true);

        assertThat(registration.getStatus())
                .isEqualTo(EventRegistrationStatus.AWAITING_ATTENDEE_CONFIRMATION);
        assertThat(registration.getPaymentStatus())
                .isEqualTo(EventPaymentStatus.NOT_REQUIRED);
        assertThat(registration.getPaymentMethod()).isEqualTo(EventPaymentMethod.FREE);

        registration.confirmAttendance();

        assertThat(registration.getStatus()).isEqualTo(EventRegistrationStatus.CONFIRMED);
        assertThat(registration.getExpiresAt()).isNull();
    }

    @Test
    void expiresOnlyAnElapsedCapacityHold() {
        EventRegistration registration = paidRequest();
        Instant expiredAt = Instant.now().minus(1, ChronoUnit.MINUTES);
        registration.approvePaid(expiredAt);

        assertThatThrownBy(() -> registration.reportPayment(EventPaymentMethod.TRANSFER))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("REGISTRATION_HOLD_EXPIRED");

        registration.expire(Instant.now());

        assertThat(registration.getStatus()).isEqualTo(EventRegistrationStatus.EXPIRED);
        assertThat(registration.holdsCapacity()).isFalse();
        assertThatThrownBy(registration::cancel)
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_REGISTRATION_TRANSITION");
    }

    @Test
    void validatesGroupSizeAndContactDataAtCreation() {
        assertThatThrownBy(() -> request(21, "Guest", "guest@vinnot.com", BigDecimal.ZERO))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_ATTENDEE_COUNT");
        assertThatThrownBy(() -> request(1, " ", "guest@vinnot.com", BigDecimal.ZERO))
                .isInstanceOf(DomainException.class)
                .extracting("code")
                .isEqualTo("INVALID_REGISTRATION_CONTACT");
    }

    @Test
    void waitlistedAttendeesCanBeReviewedAgainButConfirmedOnesCannot() {
        var free = freeRequest();
        free.waitlist("Capacity full");
        assertThat(free.holdsCapacity()).isFalse();
        free.approveFree(Instant.now().plus(1, ChronoUnit.DAYS), false);
        assertThat(free.getStatus()).isEqualTo(EventRegistrationStatus.CONFIRMED);
        assertThatThrownBy(() -> free.approveFree(Instant.now(), false))
                .isInstanceOf(DomainException.class);
        var paid = paidRequest();
        paid.waitlist("Capacity full");
        paid.approvePaid(Instant.now().plus(1, ChronoUnit.DAYS));
        assertThat(paid.getStatus()).isEqualTo(EventRegistrationStatus.AWAITING_PAYMENT);
    }

    @Test
    void providerManagedPaymentsCannotBeManuallyReportedOrConfirmed() {
        Instant now = Instant.now();
        var registration = paidRequest();
        assertThat(registration.isExternallyManagedPayment()).isFalse();
        registration.approvePaid(now.plusSeconds(600));
        registration.managePaymentExternally(now);
        assertThat(registration.isExternallyManagedPayment()).isTrue();
        for (Runnable action : List.<Runnable>of(
                () -> registration.reportPayment(EventPaymentMethod.MERCADO_PAGO),
                () -> registration.approvePayment(EventPaymentMethod.TRANSFER),
                registration::confirmPayAtVenue)) {
            assertThatThrownBy(action::run).isInstanceOf(DomainException.class)
                    .extracting("code").isEqualTo("PAYMENT_PROVIDER_VERIFICATION_REQUIRED");
        }
        registration.cancel();
        assertThat(registration.isExternallyManagedPayment()).isTrue();
        assertThat(registration.holdsCapacity()).isFalse();
    }

    @Test
    void externalCheckoutRequiresPendingPositivePaymentAndUnexpiredHold() {
        Instant now = Instant.now();
        var requested = paidRequest();
        assertThatThrownBy(() -> requested.managePaymentExternally(now)).isInstanceOf(DomainException.class);
        var reported = paidRequest();
        reported.approvePaid(now.plusSeconds(600));
        reported.reportPayment(EventPaymentMethod.TRANSFER);
        assertThatThrownBy(() -> reported.managePaymentExternally(now)).isInstanceOf(DomainException.class);
        for (BigDecimal total : Arrays.asList(null, BigDecimal.ZERO, BigDecimal.ONE.negate())) {
            var registration = externalCandidate(total, now.plusSeconds(600));
            assertThatThrownBy(() -> registration.managePaymentExternally(now)).isInstanceOf(DomainException.class);
        }
        for (Instant expiry : Arrays.asList(null, now, now.minusSeconds(1))) {
            var registration = externalCandidate(BigDecimal.TEN, expiry);
            assertThatThrownBy(() -> registration.managePaymentExternally(now)).isInstanceOf(DomainException.class);
        }
    }

    private EventRegistration externalCandidate(BigDecimal total, Instant expiry) {
        return EventRegistration.builder().id(UUID.randomUUID()).eventId(UUID.randomUUID()).userId(UUID.randomUUID())
                .status(EventRegistrationStatus.AWAITING_PAYMENT).paymentStatus(EventPaymentStatus.PENDING)
                .attendeeCount(1).totalAmount(total).currency("ARS").expiresAt(expiry)
                .createdAt(Instant.now()).updatedAt(Instant.now()).build();
    }

    private EventRegistration paidRequest() {
        return request(3, "Wine Guest", "guest@vinnot.com", new BigDecimal("15000"));
    }

    private EventRegistration freeRequest() {
        return request(2, "Wine Guest", "guest@vinnot.com", BigDecimal.ZERO);
    }

    private EventRegistration request(
            int attendeeCount,
            String name,
            String email,
            BigDecimal totalAmount) {
        return EventRegistration.request(
                UUID.randomUUID(),
                UUID.randomUUID(),
                attendeeCount,
                name,
                email,
                "+5492970000000",
                "Near the stage",
                List.of("Companion"),
                "ARS",
                totalAmount);
    }
}
