package com.vinnot.event.application.query.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Private attendee projection; ownership is mandatory in every reader query. */
public record EventTicketResponse(UUID id, UUID eventId, String title, String description,
        String imageUrl, String eventStatus, Instant startDate, Instant endDate,
        String locationName, String locationAddress, String locationCity,
        String contactEmail, String contactPhone, String status, String paymentStatus,
        int attendeeCount, BigDecimal totalAmount, String currency, Instant expiresAt) { }
