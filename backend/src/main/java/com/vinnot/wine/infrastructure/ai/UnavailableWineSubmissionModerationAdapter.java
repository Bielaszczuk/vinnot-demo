package com.vinnot.wine.infrastructure.ai;

import com.vinnot.wine.application.port.out.WineSubmissionModerationPort;
import com.vinnot.wine.domain.model.WineContentSafetyReview;
import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineSubmissionSystemReason;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(
        name = "ai.provider",
        havingValue = "mock",
        matchIfMissing = true)
public class UnavailableWineSubmissionModerationAdapter
        implements WineSubmissionModerationPort {

    @Override
    public WineContentSafetyReview reviewSafety(
            WineSubmission submission, byte[] imageBytes, String contentType) {
        return new WineContentSafetyReview(
                false, false, WineSubmissionSystemReason.MODERATION_UNAVAILABLE.storedText());
    }
}
