package com.vinnot.review.application.port.in;

import java.util.UUID;

public interface CheckUserReviewUseCase {

    boolean execute(UUID wineId, UUID userId);
}

