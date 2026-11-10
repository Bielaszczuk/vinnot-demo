package com.vinnot.wine.application.query.response;

import java.io.InputStream;

public record WineSubmissionImageResponse(
        InputStream content,
        String contentType,
        long size
) {
}
