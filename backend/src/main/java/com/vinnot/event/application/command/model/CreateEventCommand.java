package com.vinnot.event.application.command.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CreateEventCommand(
        String title,
        String description,
        String eventType,
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
        String currency,
        Instant registrationDeadline,
        Integer maxTicketsPerRegistration,
        String approvalMode,
        Boolean attendeeConfirmationRequired,
        Integer registrationHoldMinutes,
        String paymentAlias,
        String paymentQrUrl,
        String paymentInstructions,
        String imageUrl,
        UUID organizerId,
        String contactEmail,
        String contactPhone,
        String websiteUrl,
        String status
) {
}
