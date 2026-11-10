package com.vinnot.event.application.query.response;

import com.vinnot.event.domain.model.Event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record EventDetailsResponse(
        UUID id,
        String title,
        String description,
        String type,
        Instant startDate,
        Instant endDate,
        String locationName,
        String locationAddress,
        String locationCity,
        String locationRegion,
        String locationCountry,
        BigDecimal latitude,
        BigDecimal longitude,
        String mapEmbedUrl,
        BigDecimal price,
        Integer maxAttendees,
        int currentAttendees,
        int heldAttendees,
        Integer availableSpots,
        String currency,
        Instant registrationDeadline,
        int maxTicketsPerRegistration,
        String approvalMode,
        boolean attendeeConfirmationRequired,
        int registrationHoldMinutes,
        String paymentAlias,
        String paymentQrUrl,
        String paymentInstructions,
        String status,
        String imageUrl,
        UUID organizerId,
        String organizerType,
        String contactEmail,
        String contactPhone,
        String websiteUrl,
        boolean isAvailable,
        /** Whether the event has a public page (published at least once and not a draft), so it can be shared. */
        boolean publiclyVisible,
        Instant createdAt,
        Instant updatedAt
) {

    public static EventDetailsResponse fromDomain(Event event) {
        String locName = null;
        String locAddr = null;
        String locCity = null;
        String locRegion = null;
        String locCountry = null;
        BigDecimal lat = null;
        BigDecimal lng = null;
        String mapUrl = null;

        if (Objects.nonNull(event.getLocation())) {
            locName = event.getLocation().getName();
            locAddr = event.getLocation().getAddress();
            locCity = event.getLocation().getCity();
            locRegion = event.getLocation().getRegion();
            locCountry = event.getLocation().getCountry();
            mapUrl = event.getLocation().getMapEmbedUrl();
            if (event.getLocation().hasCoordinates()) {
                lat = event.getLocation().getCoordinates().getLatitude();
                lng = event.getLocation().getCoordinates().getLongitude();
            }
        }

        return new EventDetailsResponse(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getEventType().name(),
                event.getDateRange().getStartDate(),
                event.getDateRange().getEndDate(),
                locName,
                locAddr,
                locCity,
                locRegion,
                locCountry,
                lat,
                lng,
                mapUrl,
                event.getPrice(),
                event.getCapacity().getMaxAttendees(),
                event.getCapacity().getCurrentAttendees(),
                event.getCapacity().getHeldAttendees(),
                event.getCapacity().getAvailableSpots(),
                event.getRegistrationSettings().getCurrency(),
                event.getRegistrationSettings().getRegistrationDeadline(),
                event.getRegistrationSettings().getMaxTicketsPerRegistration(),
                event.getRegistrationSettings().getApprovalMode().name(),
                event.getRegistrationSettings().isAttendeeConfirmationRequired(),
                event.getRegistrationSettings().getHoldMinutes(),
                event.getRegistrationSettings().getPaymentAlias(),
                event.getRegistrationSettings().getPaymentQrUrl(),
                event.getRegistrationSettings().getPaymentInstructions(),
                event.getStatus().name(),
                event.getImageUrl(),
                event.getOrganizerId(),
                event.getOrganizerType(),
                event.getContactEmail(),
                event.getContactPhone(),
                event.getWebsiteUrl(),
                event.isAvailable(),
                event.isPubliclyVisible(),
                event.getCreatedAt(),
                event.getUpdatedAt()
        );
    }
}
