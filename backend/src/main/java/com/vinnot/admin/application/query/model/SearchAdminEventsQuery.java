package com.vinnot.admin.application.query.model;

import com.vinnot.shared.application.util.SearchInputLimits;

public record SearchAdminEventsQuery(
        String search,
        String type,
        String city,
        int page,
        int size
) {
    public SearchAdminEventsQuery {
        SearchInputLimits.text(search, type, city);
    }
}
