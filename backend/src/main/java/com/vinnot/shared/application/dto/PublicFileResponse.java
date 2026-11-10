package com.vinnot.shared.application.dto;

import java.io.InputStream;

/** Framework-neutral file content returned by a public upload query. */
public record PublicFileResponse(
        InputStream content,
        String contentType,
        long size) {
}
