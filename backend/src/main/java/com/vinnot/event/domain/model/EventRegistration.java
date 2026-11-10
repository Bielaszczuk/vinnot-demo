package com.vinnot.event.domain.model;

import com.vinnot.event.domain.valueobject.EventPaymentMethod;
import com.vinnot.event.domain.valueobject.EventPaymentStatus;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.shared.domain.base.AggregateRoot;
import com.vinnot.shared.domain.exception.BusinessRuleViolationException;
import com.vinnot.shared.domain.exception.DomainException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public class EventRegistration extends AggregateRoot<UUID> {

    private static final int MIN_ATTENDEE_COUNT = 1;
    private static final int MAX_ATTENDEE_COUNT = 20;

    private final UUID id;
    private final UUID eventId;
    private final UUID userId;
    private final int attendeeCount;
    private final String contactName;
    private final String contactEmail;
    private final String contactPhone;
    private final String note;
    private final List<String> companionNames;
    private EventRegistrationStatus status;
    private EventPaymentStatus paymentStatus;
    private EventPaymentMethod paymentMethod;
    private boolean externallyManagedPayment;
    private BigDecimal totalAmount;
    private final String currency;
    private String organizerNote;
    private Instant expiresAt;
    private Instant approvedAt;
    private Instant confirmedAt;
    private Instant rejectedAt;
    private Instant cancelledAt;
    private final Instant createdAt;
    private Instant updatedAt;

    private EventRegistration(Builder builder) {
        this.id = builder.id;
        this.eventId = builder.eventId;
        this.userId = builder.userId;
        this.attendeeCount = builder.attendeeCount;
        this.contactName = builder.contactName;
        this.contactEmail = builder.contactEmail;
        this.contactPhone = builder.contactPhone;
        this.note = builder.note;
        this.companionNames = List.copyOf(builder.companionNames);
        this.status = builder.status;
        this.paymentStatus = builder.paymentStatus;
        this.paymentMethod = builder.paymentMethod;
        this.totalAmount = builder.totalAmount;
        this.externallyManagedPayment = builder.externallyManagedPayment;
        this.currency = builder.currency;
        this.organizerNote = builder.organizerNote;
        this.expiresAt = builder.expiresAt;
        this.approvedAt = builder.approvedAt;
        this.confirmedAt = builder.confirmedAt;
        this.rejectedAt = builder.rejectedAt;
        this.cancelledAt = builder.cancelledAt;
        this.createdAt = builder.createdAt;
        this.updatedAt = builder.updatedAt;
    }

    public static EventRegistration request(
            UUID eventId,
            UUID userId,
            int attendeeCount,
            String contactName,
            String contactEmail,
            String contactPhone,
            String note,
            List<String> companionNames,
            String currency,
            BigDecimal totalAmount) {
        if (attendeeCount < MIN_ATTENDEE_COUNT || attendeeCount > MAX_ATTENDEE_COUNT) {
            throw new DomainException("INVALID_ATTENDEE_COUNT", "Attendee count must be between 1 and 20");
        }
        Instant now = Instant.now();
        boolean free = Objects.isNull(totalAmount) || totalAmount.signum() == 0;
        return builder()
                .id(UUID.randomUUID())
                .eventId(eventId)
                .userId(userId)
                .attendeeCount(attendeeCount)
                .contactName(requireText(contactName, "Contact name"))
                .contactEmail(requireText(contactEmail, "Contact email"))
                .contactPhone(contactPhone)
                .note(note)
                .companionNames(Objects.requireNonNullElse(companionNames, List.of()))
                .status(EventRegistrationStatus.REQUESTED)
                .paymentStatus(free ? EventPaymentStatus.NOT_REQUIRED : EventPaymentStatus.PENDING)
                .paymentMethod(free ? EventPaymentMethod.FREE : null)
                .totalAmount(totalAmount)
                .currency(requireText(currency, "Currency").toUpperCase())
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public void approveFree(Instant holdUntil, boolean attendeeConfirmationRequired) {
        approveFree(holdUntil, attendeeConfirmationRequired, organizerNote);
    }

    public void approveFree(
            Instant holdUntil, boolean attendeeConfirmationRequired, String organizerNote) {
        requireReviewable();
        this.organizerNote = organizerNote;
        approvedAt = Instant.now();
        if (attendeeConfirmationRequired) {
            status = EventRegistrationStatus.AWAITING_ATTENDEE_CONFIRMATION;
            expiresAt = Objects.requireNonNull(holdUntil, "Hold expiration cannot be null");
        } else {
            status = EventRegistrationStatus.CONFIRMED;
            confirmedAt = approvedAt;
        }
        updatedAt = approvedAt;
    }

    public void approvePaid(Instant holdUntil) {
        approvePaid(holdUntil, organizerNote);
    }

    public void approvePaid(Instant holdUntil, String organizerNote) {
        requireReviewable();
        this.organizerNote = organizerNote;
        Instant now = Instant.now();
        status = EventRegistrationStatus.AWAITING_PAYMENT;
        paymentStatus = EventPaymentStatus.PENDING;
        approvedAt = now;
        expiresAt = Objects.requireNonNull(holdUntil, "Hold expiration cannot be null");
        updatedAt = now;
    }

    public void confirmAttendance() {
        requireStatus(EventRegistrationStatus.AWAITING_ATTENDEE_CONFIRMATION);
        ensureHoldActive();
        confirmNow();
    }

    public void approvePayment(EventPaymentMethod method) {
        requireManualPayment();
        requireStatus(EventRegistrationStatus.AWAITING_PAYMENT);
        ensureHoldActive();
        if (Objects.isNull(method)
                || method == EventPaymentMethod.FREE
                || method == EventPaymentMethod.CASH) {
            throw new DomainException("INVALID_PAYMENT_METHOD", "A paid payment method is required");
        }
        paymentMethod = method;
        paymentStatus = EventPaymentStatus.APPROVED;
        confirmNow();
    }

    public void confirmPayAtVenue() {
        requireManualPayment();
        if (status != EventRegistrationStatus.REQUESTED
                && status != EventRegistrationStatus.AWAITING_PAYMENT
                && status != EventRegistrationStatus.WAITLISTED) {
            throw invalidTransition("confirm payment at venue");
        }
        if (status == EventRegistrationStatus.AWAITING_PAYMENT) {
            ensureHoldActive();
        }
        paymentMethod = EventPaymentMethod.CASH;
        paymentStatus = EventPaymentStatus.PAY_AT_VENUE;
        approvedAt = Objects.requireNonNullElse(approvedAt, Instant.now());
        confirmNow();
    }

    public void reportPayment(EventPaymentMethod method) {
        requireManualPayment();
        requireStatus(EventRegistrationStatus.AWAITING_PAYMENT);
        ensureHoldActive();
        if (method != EventPaymentMethod.TRANSFER
                && method != EventPaymentMethod.QR
                && method != EventPaymentMethod.MERCADO_PAGO) {
            throw new DomainException("INVALID_PAYMENT_METHOD", "Payment method cannot be reported");
        }
        paymentMethod = method;
        paymentStatus = EventPaymentStatus.REPORTED;
        updatedAt = Instant.now();
    }

    public void prepareOnlinePayment(Instant holdUntil, Instant now) {
        if (status == EventRegistrationStatus.REQUESTED) {
            approvePaid(holdUntil);
        } else if (status == EventRegistrationStatus.AWAITING_PAYMENT
                && paymentStatus == EventPaymentStatus.REPORTED && !externallyManagedPayment) {
            paymentStatus = EventPaymentStatus.PENDING;
        }
        requireExternalPaymentEligible(now);
        requireProviderVerification();
    }

    /** Paid admission is provider-authoritative even before a checkout link exists. */
    public void requireProviderVerification() {
        if (Objects.isNull(totalAmount) || totalAmount.signum() <= 0) {
            throw new DomainException("PAYMENT_NOT_REQUIRED", "A paid registration is required");
        }
        externallyManagedPayment = true;
        paymentMethod = EventPaymentMethod.MERCADO_PAGO;
    }

    /** Transfer payment authority to the provider before creating a checkout; cannot be undone by a client. */
    public void managePaymentExternally(Instant now) {
        requireExternalPaymentEligible(now);
        externallyManagedPayment = true;
        updatedAt = now;
    }

    public void requireExternalPaymentEligible(Instant now) {
        requireStatus(EventRegistrationStatus.AWAITING_PAYMENT);
        if (paymentStatus != EventPaymentStatus.PENDING || Objects.isNull(totalAmount) || totalAmount.signum() <= 0
                || Objects.isNull(expiresAt) || !expiresAt.isAfter(now)) {
            throw new DomainException("PAYMENT_RESERVATION_UNAVAILABLE", "This reservation is not available for checkout");
        }
    }

    /** Called only after server-side provider verification and transactional capacity conversion. */
    public void confirmVerifiedPayment(Instant now) {
        if (!externallyManagedPayment) {
            throw new DomainException("PAYMENT_NOT_PROVIDER_MANAGED", "Provider authority is required");
        }
        requireExternalPaymentEligible(now);
        paymentMethod = EventPaymentMethod.MERCADO_PAGO;
        paymentStatus = EventPaymentStatus.APPROVED;
        status = EventRegistrationStatus.CONFIRMED;
        confirmedAt = now;
        updatedAt = now;
        expiresAt = null;
    }

    public void reverseVerifiedPayment(boolean refunded, Instant now) {
        if (!externallyManagedPayment) {
            throw new DomainException("PAYMENT_NOT_PROVIDER_MANAGED", "Provider authority is required");
        }
        paymentStatus = refunded ? EventPaymentStatus.REFUNDED : EventPaymentStatus.REJECTED;
        status = EventRegistrationStatus.CANCELLED;
        cancelledAt = now;
        expiresAt = null;
        updatedAt = now;
    }

    private void requireManualPayment() {
        if (externallyManagedPayment) {
            throw new DomainException("PAYMENT_PROVIDER_VERIFICATION_REQUIRED", "This payment requires provider verification");
        }
    }

    public boolean isExternallyManagedPayment() { return externallyManagedPayment; }

    public void waitlist(String reason) {
        requireReviewable();
        status = EventRegistrationStatus.WAITLISTED;
        organizerNote = reason;
        updatedAt = Instant.now();
    }

    public void reject(String reason) {
        if (status.isTerminal() || status == EventRegistrationStatus.CONFIRMED) {
            throw invalidTransition("reject");
        }
        status = EventRegistrationStatus.REJECTED;
        organizerNote = reason;
        rejectedAt = Instant.now();
        expiresAt = null;
        updatedAt = rejectedAt;
    }

    /**
     * A provider-verified paid admission is refunded only with the organizer's authorization,
     * so the attendee cannot cancel it on their own.
     */
    public void requireCancellableByAttendee() {
        if (status == EventRegistrationStatus.CONFIRMED && externallyManagedPayment
                && paymentStatus == EventPaymentStatus.APPROVED) {
            throw new BusinessRuleViolationException("PAID_REGISTRATION_REQUIRES_ORGANIZER",
                    "Contact the organizer to cancel a paid registration and request a refund");
        }
    }

    public void cancel() {
        if (status.isTerminal()) {
            throw invalidTransition("cancel");
        }
        status = EventRegistrationStatus.CANCELLED;
        cancelledAt = Instant.now();
        expiresAt = null;
        updatedAt = cancelledAt;
    }

    public void expire(Instant now) {
        if (!status.holdsCapacity() || Objects.isNull(expiresAt) || expiresAt.isAfter(now)) {
            throw invalidTransition("expire");
        }
        status = EventRegistrationStatus.EXPIRED;
        updatedAt = now;
    }

    public boolean holdsCapacity() {
        return status.holdsCapacity();
    }

    public boolean isExpiredHoldAt(Instant instant) {
        return status.holdsCapacity()
                && Objects.nonNull(expiresAt)
                && !expiresAt.isAfter(instant);
    }

    public boolean isConfirmed() {
        return status == EventRegistrationStatus.CONFIRMED;
    }

    private void confirmNow() {
        Instant now = Instant.now();
        status = EventRegistrationStatus.CONFIRMED;
        confirmedAt = now;
        expiresAt = null;
        updatedAt = now;
    }

    private void requireReviewable() {
        if (status != EventRegistrationStatus.REQUESTED && status != EventRegistrationStatus.WAITLISTED) {
            throw invalidTransition("review");
        }
    }

    private void requireStatus(EventRegistrationStatus expected) {
        if (status != expected) {
            throw invalidTransition("change status");
        }
    }

    private void ensureHoldActive() {
        if (Objects.nonNull(expiresAt) && !expiresAt.isAfter(Instant.now())) {
            throw new DomainException(
                    "REGISTRATION_HOLD_EXPIRED",
                    "The registration hold has expired");
        }
    }

    private DomainException invalidTransition(String action) {
        return new DomainException(
                "INVALID_REGISTRATION_TRANSITION",
                "Cannot " + action + " a registration in status " + status);
    }

    private static String requireText(String value, String field) {
        if (Objects.isNull(value) || value.isBlank()) {
            throw new DomainException("INVALID_REGISTRATION_CONTACT", field + " cannot be empty");
        }
        return value.trim();
    }

    public static Builder builder() {
        return new Builder();
    }

    @Override
    public UUID getId() {
        return id;
    }

    public UUID getEventId() {
        return eventId;
    }

    public UUID getUserId() {
        return userId;
    }

    public int getAttendeeCount() {
        return attendeeCount;
    }

    public String getContactName() {
        return contactName;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public String getNote() {
        return note;
    }

    public List<String> getCompanionNames() {
        return companionNames;
    }

    public EventRegistrationStatus getStatus() {
        return status;
    }

    public EventPaymentStatus getPaymentStatus() {
        return paymentStatus;
    }

    public EventPaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getOrganizerNote() {
        return organizerNote;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public Instant getRejectedAt() {
        return rejectedAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }

    @Override
    public Instant getCreatedAt() {
        return createdAt;
    }

    @Override
    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public static class Builder {
        private UUID id;
        private UUID eventId;
        private UUID userId;
        private int attendeeCount;
        private String contactName;
        private String contactEmail;
        private String contactPhone;
        private String note;
        private List<String> companionNames = List.of();
        private EventRegistrationStatus status;
        private EventPaymentStatus paymentStatus;
        private EventPaymentMethod paymentMethod;
        private boolean externallyManagedPayment;
        private BigDecimal totalAmount;
        private String currency;
        private String organizerNote;
        private Instant expiresAt;
        private Instant approvedAt;
        private Instant confirmedAt;
        private Instant rejectedAt;
        private Instant cancelledAt;
        private Instant createdAt;
        private Instant updatedAt;

        public Builder externallyManagedPayment(boolean value) {
            externallyManagedPayment = value;
            return this;
        }

        public Builder id(UUID value) {
            id = value;
            return this;
        }

        public Builder eventId(UUID value) {
            eventId = value;
            return this;
        }

        public Builder userId(UUID value) {
            userId = value;
            return this;
        }

        public Builder attendeeCount(int value) {
            attendeeCount = value;
            return this;
        }

        public Builder contactName(String value) {
            contactName = value;
            return this;
        }

        public Builder contactEmail(String value) {
            contactEmail = value;
            return this;
        }

        public Builder contactPhone(String value) {
            contactPhone = value;
            return this;
        }

        public Builder note(String value) {
            note = value;
            return this;
        }

        public Builder companionNames(List<String> value) {
            companionNames = Objects.requireNonNullElse(value, List.of());
            return this;
        }

        public Builder status(EventRegistrationStatus value) {
            status = value;
            return this;
        }

        public Builder paymentStatus(EventPaymentStatus value) {
            paymentStatus = value;
            return this;
        }

        public Builder paymentMethod(EventPaymentMethod value) {
            paymentMethod = value;
            return this;
        }

        public Builder totalAmount(BigDecimal value) {
            totalAmount = value;
            return this;
        }

        public Builder currency(String value) {
            currency = value;
            return this;
        }

        public Builder organizerNote(String value) {
            organizerNote = value;
            return this;
        }

        public Builder expiresAt(Instant value) {
            expiresAt = value;
            return this;
        }

        public Builder approvedAt(Instant value) {
            approvedAt = value;
            return this;
        }

        public Builder confirmedAt(Instant value) {
            confirmedAt = value;
            return this;
        }

        public Builder rejectedAt(Instant value) {
            rejectedAt = value;
            return this;
        }

        public Builder cancelledAt(Instant value) {
            cancelledAt = value;
            return this;
        }

        public Builder createdAt(Instant value) {
            createdAt = value;
            return this;
        }

        public Builder updatedAt(Instant value) {
            updatedAt = value;
            return this;
        }

        public EventRegistration build() {
            Objects.requireNonNull(id, "Registration ID cannot be null");
            Objects.requireNonNull(eventId, "Event ID cannot be null");
            Objects.requireNonNull(userId, "User ID cannot be null");
            Objects.requireNonNull(status, "Registration status cannot be null");
            Objects.requireNonNull(paymentStatus, "Payment status cannot be null");
            Objects.requireNonNull(currency, "Currency cannot be null");
            Objects.requireNonNull(createdAt, "Created at cannot be null");
            Objects.requireNonNull(updatedAt, "Updated at cannot be null");
            return new EventRegistration(this);
        }
    }
}
