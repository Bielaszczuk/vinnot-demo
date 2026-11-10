package com.vinnot.wine.application.query.model;

import java.util.UUID;

public record GetWineSubmissionQuery(
        UUID submissionId, UUID requestingUserId, boolean administrator) {
}
