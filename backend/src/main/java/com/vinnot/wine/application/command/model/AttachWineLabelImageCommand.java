package com.vinnot.wine.application.command.model;

import com.vinnot.shared.application.command.Command;
import com.vinnot.wine.application.query.response.WineLabelImageAttachmentResponse;

import java.util.UUID;

public record AttachWineLabelImageCommand(
        UUID userId,
        UUID wineId,
        byte[] imageBytes,
        String contentType,
        String originalFilename
) implements Command<WineLabelImageAttachmentResponse> {
}
