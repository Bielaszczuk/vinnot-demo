package com.vinnot.review.application.port.in;

import com.vinnot.review.application.query.model.GetReviewsByWineQuery;
import com.vinnot.review.application.query.response.ReviewResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public interface GetReviewsByWineUseCase {

    PageResult<ReviewResponse> execute(GetReviewsByWineQuery query);
}

