package com.vinnot.wine.application.port.out;

import com.vinnot.wine.domain.model.WineSubmission;
import com.vinnot.wine.domain.model.WineContentSafetyReview;

public interface WineSubmissionModerationPort {

    WineContentSafetyReview reviewSafety(
            WineSubmission submission, byte[] imageBytes, String contentType);
}
