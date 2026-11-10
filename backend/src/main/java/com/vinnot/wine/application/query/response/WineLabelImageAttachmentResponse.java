package com.vinnot.wine.application.query.response;

import java.util.UUID;

public record WineLabelImageAttachmentResponse(
        UUID wineId, String imageUrl, boolean attached) {
}
