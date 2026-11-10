package com.vinnot.admin.application.query.model;

import com.vinnot.shared.application.util.SearchInputLimits;

public record SearchAdminReviewsQuery(
        String search,
        int page,
        int size
) {
    public SearchAdminReviewsQuery {
        SearchInputLimits.text(search);
    }
}
