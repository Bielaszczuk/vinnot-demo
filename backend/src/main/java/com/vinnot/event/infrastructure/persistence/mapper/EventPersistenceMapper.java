package com.vinnot.event.infrastructure.persistence.mapper;

import com.vinnot.event.domain.model.Event;
import com.vinnot.event.domain.valueobject.EventApprovalMode;
import com.vinnot.event.domain.valueobject.EventCapacity;
import com.vinnot.event.domain.valueobject.EventDateRange;
import com.vinnot.event.domain.valueobject.EventLocation;
import com.vinnot.event.domain.valueobject.EventRegistrationSettings;
import com.vinnot.event.domain.valueobject.EventStatus;
import com.vinnot.event.domain.valueobject.EventType;
import com.vinnot.event.infrastructure.persistence.entity.EventJpaEntity;
import com.vinnot.shared.domain.valueobject.Coordinates;

import java.util.Objects;

public final class EventPersistenceMapper {

    private EventPersistenceMapper() {
    }

    /**
     * Maps a JPA entity to a domain model.
     *
     * @param entity the JPA entity
     * @return the domain model
     */
    public static Event toDomain(EventJpaEntity entity) {
        if (Objects.isNull(entity)) {
            return null;
        }

        Coordinates coordinates = null;
        if (Objects.nonNull(entity.getLatitude()) && Objects.nonNull(entity.getLongitude())) {
            coordinates = Coordinates.of(entity.getLatitude(), entity.getLongitude());
        }

        EventLocation location = EventLocation.of(
                entity.getLocationName(),
                entity.getLocationAddress(),
                entity.getLocationCity(),
                entity.getLocationRegion(),
                entity.getLocationCountry(),
                coordinates,
                entity.getMapEmbedUrl()
        );

        EventDateRange dateRange = EventDateRange.of(entity.getStartDate(), entity.getEndDate());

        EventCapacity capacity = EventCapacity.of(
                entity.getMaxAttendees(),
                entity.getCurrentAttendees(),
                entity.getHeldAttendees());
        EventRegistrationSettings registrationSettings = EventRegistrationSettings.of(
                entity.getCurrency(),
                entity.getRegistrationDeadline(),
                entity.getMaxTicketsPerRegistration(),
                EventApprovalMode.valueOf(entity.getApprovalMode().name()),
                entity.isAttendeeConfirmationRequired(),
                entity.getRegistrationHoldMinutes(),
                entity.getPaymentAlias(),
                entity.getPaymentQrUrl(),
                entity.getPaymentInstructions());

        return Event.builder()
                .id(entity.getId())
                .publishedOnce(entity.isPublishedOnce())
                .scheduleVersion(entity.getScheduleVersion())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .eventType(Objects.nonNull(entity.getEventType())
                        ? EventType.valueOf(entity.getEventType().name()) : EventType.OTHER)
                .dateRange(dateRange)
                .location(location)
                .price(entity.getPrice())
                .capacity(capacity)
                .registrationSettings(registrationSettings)
                .status(Objects.nonNull(entity.getStatus())
                        ? EventStatus.valueOf(entity.getStatus().name()) : EventStatus.DRAFT)
                .imageUrl(entity.getImageUrl())
                .organizerId(entity.getOrganizerId())
                .organizerType(entity.getOrganizerType())
                .contactEmail(entity.getContactEmail())
                .contactPhone(entity.getContactPhone())
                .websiteUrl(entity.getWebsiteUrl())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /**
     * Maps a domain model to a JPA entity.
     *
     * @param event the domain model
     * @return the JPA entity
     */
    public static EventJpaEntity toEntity(Event event) {
        if (Objects.isNull(event)) {
            return null;
        }

        EventJpaEntity entity = new EventJpaEntity();
        entity.setId(event.getId());
        entity.setPublishedOnce(event.isPublishedOnce());
        entity.setScheduleVersion(event.getScheduleVersion());
        entity.setTitle(event.getTitle());
        entity.setDescription(event.getDescription());
        entity.setEventType(EventJpaEntity.EventTypeEnum.valueOf(event.getEventType().name()));
        entity.setStartDate(event.getDateRange().getStartDate());
        entity.setEndDate(event.getDateRange().getEndDate());

        if (Objects.nonNull(event.getLocation())) {
            entity.setLocationName(event.getLocation().getName());
            entity.setLocationAddress(event.getLocation().getAddress());
            entity.setLocationCity(event.getLocation().getCity());
            entity.setLocationRegion(event.getLocation().getRegion());
            entity.setLocationCountry(event.getLocation().getCountry());
            entity.setMapEmbedUrl(event.getLocation().getMapEmbedUrl());
            if (event.getLocation().hasCoordinates()) {
                entity.setLatitude(event.getLocation().getCoordinates().getLatitude());
                entity.setLongitude(event.getLocation().getCoordinates().getLongitude());
            }
        }

        entity.setPrice(event.getPrice());
        entity.setMaxAttendees(event.getCapacity().getMaxAttendees());
        entity.setCurrentAttendees(event.getCapacity().getCurrentAttendees());
        entity.setHeldAttendees(event.getCapacity().getHeldAttendees());
        entity.setCurrency(event.getRegistrationSettings().getCurrency());
        entity.setRegistrationDeadline(event.getRegistrationSettings().getRegistrationDeadline());
        entity.setMaxTicketsPerRegistration(
                event.getRegistrationSettings().getMaxTicketsPerRegistration());
        entity.setApprovalMode(EventJpaEntity.ApprovalModeEnum.valueOf(
                event.getRegistrationSettings().getApprovalMode().name()));
        entity.setAttendeeConfirmationRequired(
                event.getRegistrationSettings().isAttendeeConfirmationRequired());
        entity.setRegistrationHoldMinutes(event.getRegistrationSettings().getHoldMinutes());
        entity.setPaymentAlias(event.getRegistrationSettings().getPaymentAlias());
        entity.setPaymentQrUrl(event.getRegistrationSettings().getPaymentQrUrl());
        entity.setPaymentInstructions(event.getRegistrationSettings().getPaymentInstructions());
        entity.setStatus(EventJpaEntity.EventStatusEnum.valueOf(event.getStatus().name()));
        entity.setImageUrl(event.getImageUrl());
        entity.setOrganizerId(event.getOrganizerId());
        entity.setOrganizerType(event.getOrganizerType());
        entity.setContactEmail(event.getContactEmail());
        entity.setContactPhone(event.getContactPhone());
        entity.setWebsiteUrl(event.getWebsiteUrl());
        entity.setCreatedAt(event.getCreatedAt());
        entity.setUpdatedAt(event.getUpdatedAt());

        return entity;
    }
}
