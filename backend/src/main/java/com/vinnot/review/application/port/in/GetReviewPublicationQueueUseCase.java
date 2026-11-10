package com.vinnot.review.application.port.in;

import com.vinnot.review.application.query.response.ReviewPublicationQueueItem;
import com.vinnot.shared.domain.valueobject.PageResult;

import java.util.UUID;

public interface GetReviewPublicationQueueUseCase {
    PageResult<ReviewPublicationQueueItem> execute(UUID reviewerId, int page, int size);
}
