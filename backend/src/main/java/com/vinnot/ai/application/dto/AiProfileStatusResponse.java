package com.vinnot.ai.application.dto;

import java.util.UUID;

public record AiProfileStatusResponse(
        UUID wineId,
        String language,
        String status,
        String generatedAt
) {
}

