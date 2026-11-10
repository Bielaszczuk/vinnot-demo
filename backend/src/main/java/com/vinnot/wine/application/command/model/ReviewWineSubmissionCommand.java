package com.vinnot.wine.application.command.model;

import com.vinnot.shared.application.command.Command;
import com.vinnot.wine.application.query.response.WineSubmissionResponse;
import com.vinnot.wine.domain.model.WineSubmissionDecision;

import java.util.UUID;

public record ReviewWineSubmissionCommand(
        UUID submissionId,
        UUID reviewerId,
        WineSubmissionDecision decision,
        String reason,
        UUID targetWineId,
        WineSubmissionCatalogData catalogData
) implements Command<WineSubmissionResponse> {
}
