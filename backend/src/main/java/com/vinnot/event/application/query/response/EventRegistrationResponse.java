package com.vinnot.event.application.query.response;

import com.vinnot.event.domain.model.EventRegistration;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record EventRegistrationResponse(
        UUID id,
        UUID eventId,
        UUID userId,
        int attendeeCount,
        String contactName,
        String contactEmail,
        String contactPhone,
        String note,
        List<String> companionNames,
        String status,
        String paymentStatus,
        String paymentMethod,
        BigDecimal totalAmount,
        String currency,
        String organizerNote,
        Instant expiresAt,
        Instant approvedAt,
        Instant confirmedAt,
        Instant rejectedAt,
        Instant cancelledAt,
        Instant createdAt,
        Instant updatedAt,
        String contactActionUrl,
        boolean externallyManagedPayment
) {

    public static EventRegistrationResponse fromDomain(EventRegistration registration) {
        return fromDomain(registration, null);
    }

    public static EventRegistrationResponse fromDomain(
            EventRegistration registration,
            String contactActionUrl) {
        return new EventRegistrationResponse(
                registration.getId(),
                registration.getEventId(),
                registration.getUserId(),
                registration.getAttendeeCount(),
                registration.getContactName(),
                registration.getContactEmail(),
                registration.getContactPhone(),
                registration.getNote(),
                registration.getCompanionNames(),
                registration.getStatus().name(),
                registration.getPaymentStatus().name(),
                Objects.nonNull(registration.getPaymentMethod())
                        ? registration.getPaymentMethod().name()
                        : null,
                registration.getTotalAmount(),
                registration.getCurrency(),
                registration.getOrganizerNote(),
                registration.getExpiresAt(),
                registration.getApprovedAt(),
                registration.getConfirmedAt(),
                registration.getRejectedAt(),
                registration.getCancelledAt(),
                registration.getCreatedAt(),
                registration.getUpdatedAt(),
                contactActionUrl,
                registration.isExternallyManagedPayment());
    }
}
