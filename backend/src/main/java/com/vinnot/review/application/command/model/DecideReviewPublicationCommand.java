package com.vinnot.review.application.command.model;

import com.vinnot.review.domain.model.PublicationRejectionReason;
import com.vinnot.review.domain.model.PublicationStatus;
import com.vinnot.review.domain.model.ReviewPublication;

import java.time.Instant;
import java.util.UUID;

public record DecideReviewPublicationCommand(
        ReviewPublication.Type type,
        UUID id,
        UUID reviewerId,
        PublicationStatus status,
        PublicationRejectionReason reasonCode,
        String reason,
        Instant expectedRevision) { }
