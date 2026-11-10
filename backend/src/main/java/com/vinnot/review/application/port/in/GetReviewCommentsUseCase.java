package com.vinnot.review.application.port.in;

import com.vinnot.review.application.query.model.GetReviewCommentsQuery;
import com.vinnot.review.application.query.response.ReviewCommentResponse;

import java.util.List;

public interface GetReviewCommentsUseCase {

    List<ReviewCommentResponse> execute(GetReviewCommentsQuery query);
}

