package com.vinnot.partner.infrastructure.web.request;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Set;

public record UpdatePartnerEventRequest(
        @Size(max = 255) String title,
        @Size(max = 20000) String description,
        @Size(max = 50) String type,
        @Size(max = 50) String status,
        String startDate,
        String endDate,
        @Size(max = 255) String locationName,
        @Size(max = 500) String locationAddress,
        @Size(max = 100) String locationCity,
        @Size(max = 100) String locationRegion,
        @Size(max = 100) String locationCountry,
        @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
        @Size(max = 1000) String mapEmbedUrl,
        @PositiveOrZero BigDecimal price,
        @PositiveOrZero Integer maxAttendees,
        @Size(min = 3, max = 3) String currency,
        String registrationDeadline,
        @Positive Integer maxTicketsPerRegistration,
        @Size(max = 20) String approvalMode,
        Boolean attendeeConfirmationRequired,
        @Positive Integer registrationHoldMinutes,
        @Size(max = 100) String paymentAlias,
        @Size(max = 500) String paymentQrUrl,
        @Size(max = 5000) String paymentInstructions,
        @Size(max = 500) String imageUrl,
        @Email @Size(max = 255) String contactEmail,
        @Size(max = 50) String contactPhone,
        @Size(max = 500) String websiteUrl,
        @Size(max = 50) Set<@Size(max = 64) String> clearFields
) {
}
