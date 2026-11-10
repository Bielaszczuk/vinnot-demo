package com.vinnot.wine.application.query.response;

import com.vinnot.wine.domain.model.WineSubmissionStatus;

import java.util.UUID;

public record WineSubmissionResponse(
        UUID submissionId,
        WineSubmissionStatus status,
        String message,
        WineSummaryResponse wine
) {
}
