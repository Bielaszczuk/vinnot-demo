package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.query.response.WineSubmissionImageResponse;

import java.util.UUID;

public interface GetWineSubmissionImageUseCase {

    WineSubmissionImageResponse execute(UUID submissionId);
}
