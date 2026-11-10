package com.vinnot.event.infrastructure.persistence.mapper;

import com.vinnot.event.domain.model.EventRegistration;
import com.vinnot.event.domain.valueobject.EventPaymentMethod;
import com.vinnot.event.domain.valueobject.EventPaymentStatus;
import com.vinnot.event.domain.valueobject.EventRegistrationStatus;
import com.vinnot.event.infrastructure.persistence.entity.EventRegistrationJpaEntity;

import java.util.List;
import java.util.Objects;

public final class EventRegistrationPersistenceMapper {

    private EventRegistrationPersistenceMapper() {
    }

    public static EventRegistration toDomain(EventRegistrationJpaEntity entity) {
        return EventRegistration.builder()
                .id(entity.getId())
                .eventId(entity.getEventId())
                .userId(entity.getUserId())
                .attendeeCount(entity.getAttendeeCount())
                .contactName(entity.getContactName())
                .contactEmail(entity.getContactEmail())
                .contactPhone(entity.getContactPhone())
                .note(entity.getNote())
                .companionNames(entity.getCompanionNames())
                .status(EventRegistrationStatus.valueOf(entity.getStatus().name()))
                .paymentStatus(EventPaymentStatus.valueOf(entity.getPaymentStatus().name()))
                .paymentMethod(Objects.isNull(entity.getPaymentMethod())
                        ? null
                        : EventPaymentMethod.valueOf(entity.getPaymentMethod().name()))
                .externallyManagedPayment(entity.isExternallyManagedPayment())
                .totalAmount(entity.getTotalAmount())
                .currency(entity.getCurrency())
                .organizerNote(entity.getOrganizerNote())
                .expiresAt(entity.getExpiresAt())
                .approvedAt(entity.getApprovedAt())
                .confirmedAt(entity.getConfirmedAt())
                .rejectedAt(entity.getRejectedAt())
                .cancelledAt(entity.getCancelledAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public static EventRegistrationJpaEntity toEntity(EventRegistration registration) {
        EventRegistrationJpaEntity entity = new EventRegistrationJpaEntity();
        entity.setId(registration.getId());
        entity.setEventId(registration.getEventId());
        entity.setUserId(registration.getUserId());
        entity.setAttendeeCount(registration.getAttendeeCount());
        entity.setContactName(registration.getContactName());
        entity.setContactEmail(registration.getContactEmail());
        entity.setContactPhone(registration.getContactPhone());
        entity.setNote(registration.getNote());
        entity.setCompanionNames(List.copyOf(registration.getCompanionNames()));
        entity.setStatus(EventRegistrationJpaEntity.RegistrationStatusEnum.valueOf(
                registration.getStatus().name()));
        entity.setPaymentStatus(EventRegistrationJpaEntity.PaymentStatusEnum.valueOf(
                registration.getPaymentStatus().name()));
        entity.setPaymentMethod(Objects.isNull(registration.getPaymentMethod())
                ? null
                : EventRegistrationJpaEntity.PaymentMethodEnum.valueOf(
                        registration.getPaymentMethod().name()));
        entity.setExternallyManagedPayment(registration.isExternallyManagedPayment());
        entity.setTotalAmount(registration.getTotalAmount());
        entity.setCurrency(registration.getCurrency());
        entity.setOrganizerNote(registration.getOrganizerNote());
        entity.setExpiresAt(registration.getExpiresAt());
        entity.setApprovedAt(registration.getApprovedAt());
        entity.setConfirmedAt(registration.getConfirmedAt());
        entity.setRejectedAt(registration.getRejectedAt());
        entity.setCancelledAt(registration.getCancelledAt());
        entity.setCreatedAt(registration.getCreatedAt());
        entity.setUpdatedAt(registration.getUpdatedAt());
        return entity;
    }
}
