package com.vinnot.admin.application.query.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ReviewAdminResponse(
        UUID id,
        UUID wineId,
        UUID userId,
        BigDecimal rating,
        String title,
        String comment,
        boolean isVerified,
        int helpfulCount,
        int likesCount,
        Instant createdAt,
        Instant updatedAt,
        ReviewerInfo reviewer,
        WineInfo wine
) {

    public record ReviewerInfo(
            UUID id,
            String username,
            String displayName,
            String avatarUrl,
            String badgeTier
    ) {
    }

    public record WineInfo(
            UUID id,
            String name,
            Integer vintage
    ) {
    }
}

