package com.vinnot.event.domain.valueobject;

import com.vinnot.shared.domain.base.ValueObject;
import com.vinnot.shared.domain.exception.DomainException;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

public final class EventRegistrationSettings extends ValueObject {

    public static final int DEFAULT_MAX_TICKETS = 6;
    public static final int DEFAULT_HOLD_MINUTES = 1440;
    private static final int CURRENCY_CODE_LENGTH = 3;
    private static final int MIN_MAX_TICKETS = 1;
    private static final int MAX_MAX_TICKETS = 20;
    private static final int MIN_HOLD_MINUTES = 5;
    private static final int MAX_HOLD_MINUTES = 10080;

    private final String currency;
    private final Instant registrationDeadline;
    private final int maxTicketsPerRegistration;
    private final EventApprovalMode approvalMode;
    private final boolean attendeeConfirmationRequired;
    private final int holdMinutes;
    private final String paymentAlias;
    private final String paymentQrUrl;
    private final String paymentInstructions;

    private EventRegistrationSettings(
            String currency,
            Instant registrationDeadline,
            int maxTicketsPerRegistration,
            EventApprovalMode approvalMode,
            boolean attendeeConfirmationRequired,
            int holdMinutes,
            String paymentAlias,
            String paymentQrUrl,
            String paymentInstructions) {
        this.currency = normalizeCurrency(currency);
        this.registrationDeadline = registrationDeadline;
        this.maxTicketsPerRegistration = validateMaxTickets(maxTicketsPerRegistration);
        this.approvalMode = Objects.requireNonNullElse(approvalMode, EventApprovalMode.MANUAL);
        this.attendeeConfirmationRequired = attendeeConfirmationRequired;
        this.holdMinutes = validateHoldMinutes(holdMinutes);
        this.paymentAlias = paymentAlias;
        this.paymentQrUrl = paymentQrUrl;
        this.paymentInstructions = paymentInstructions;
    }

    public static EventRegistrationSettings defaults() {
        return of(
                "ARS",
                null,
                DEFAULT_MAX_TICKETS,
                EventApprovalMode.MANUAL,
                true,
                DEFAULT_HOLD_MINUTES,
                null,
                null,
                null);
    }

    public static EventRegistrationSettings of(
            String currency,
            Instant registrationDeadline,
            Integer maxTicketsPerRegistration,
            EventApprovalMode approvalMode,
            Boolean attendeeConfirmationRequired,
            Integer holdMinutes,
            String paymentAlias,
            String paymentQrUrl,
            String paymentInstructions) {
        return new EventRegistrationSettings(
                currency,
                registrationDeadline,
                Objects.requireNonNullElse(maxTicketsPerRegistration, DEFAULT_MAX_TICKETS),
                approvalMode,
                Objects.requireNonNullElse(attendeeConfirmationRequired, true),
                Objects.requireNonNullElse(holdMinutes, DEFAULT_HOLD_MINUTES),
                paymentAlias,
                paymentQrUrl,
                paymentInstructions);
    }

    public Instant effectiveDeadline(Instant eventStart) {
        if (Objects.isNull(registrationDeadline) || registrationDeadline.isAfter(eventStart)) {
            return eventStart;
        }
        return registrationDeadline;
    }

    public boolean acceptsRegistrationsAt(Instant now, Instant eventStart) {
        return now.isBefore(effectiveDeadline(eventStart));
    }

    /** How long an approved place stays held: the configured time, but never past the event start. */
    public Instant holdUntil(Instant now, Instant eventStart) {
        Instant held = now.plus(Duration.ofMinutes(holdMinutes));
        return held.isBefore(eventStart) ? held : eventStart;
    }

    public String getCurrency() {
        return currency;
    }

    public Instant getRegistrationDeadline() {
        return registrationDeadline;
    }

    public int getMaxTicketsPerRegistration() {
        return maxTicketsPerRegistration;
    }

    public EventApprovalMode getApprovalMode() {
        return approvalMode;
    }

    public boolean isAttendeeConfirmationRequired() {
        return attendeeConfirmationRequired;
    }

    public int getHoldMinutes() {
        return holdMinutes;
    }

    public String getPaymentAlias() {
        return paymentAlias;
    }

    public String getPaymentQrUrl() {
        return paymentQrUrl;
    }

    public String getPaymentInstructions() {
        return paymentInstructions;
    }

    private static String normalizeCurrency(String value) {
        String normalized = Objects.requireNonNullElse(value, "ARS").trim().toUpperCase();
        if (normalized.length() != CURRENCY_CODE_LENGTH) {
            throw new DomainException("INVALID_CURRENCY", "Currency must use a three-letter code");
        }
        return normalized;
    }

    private static int validateMaxTickets(int value) {
        if (value < MIN_MAX_TICKETS || value > MAX_MAX_TICKETS) {
            throw new DomainException(
                    "INVALID_REGISTRATION_LIMIT",
                    "Maximum tickets per registration must be between 1 and 20");
        }
        return value;
    }

    private static int validateHoldMinutes(int value) {
        if (value < MIN_HOLD_MINUTES || value > MAX_HOLD_MINUTES) {
            throw new DomainException(
                    "INVALID_HOLD_DURATION",
                    "Registration hold must be between 5 minutes and 7 days");
        }
        return value;
    }

    @Override
    protected Object[] getEqualityComponents() {
        return new Object[]{
                currency,
                registrationDeadline,
                maxTicketsPerRegistration,
                approvalMode,
                attendeeConfirmationRequired,
                holdMinutes,
                paymentAlias,
                paymentQrUrl,
                paymentInstructions
        };
    }
}
