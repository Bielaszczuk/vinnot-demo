package com.vinnot.admin.application.port.in;

import com.vinnot.admin.application.query.model.SearchAdminReviewsQuery;
import com.vinnot.admin.application.query.response.ReviewAdminResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public interface SearchAdminReviewsUseCase {

    /**
     * Executes the search admin reviews query.
     *
     * @param query the query
     * @return page of review admin responses
     */
    PageResult<ReviewAdminResponse> execute(SearchAdminReviewsQuery query);
}

