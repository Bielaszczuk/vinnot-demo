package com.vinnot.user.application.command.model;

import java.io.InputStream;
import java.util.UUID;

public record UploadUserAvatarCommand(
        UUID userId,
        InputStream content,
        String originalFilename,
        String contentType,
        long size
) {
}
