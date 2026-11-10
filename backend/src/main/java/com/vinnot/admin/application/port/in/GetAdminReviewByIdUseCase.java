package com.vinnot.admin.application.port.in;

import com.vinnot.admin.application.query.model.GetAdminReviewByIdQuery;
import com.vinnot.admin.application.query.response.ReviewAdminResponse;

public interface GetAdminReviewByIdUseCase {

    /**
     * Executes the get admin review by ID query.
     *
     * @param query the query
     * @return the review admin response
     */
    ReviewAdminResponse execute(GetAdminReviewByIdQuery query);
}

