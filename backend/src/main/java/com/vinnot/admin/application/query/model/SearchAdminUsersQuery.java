package com.vinnot.admin.application.query.model;

import com.vinnot.shared.application.util.SearchInputLimits;

public record SearchAdminUsersQuery(
        String search,
        int page,
        int size
) {
    public SearchAdminUsersQuery {
        SearchInputLimits.text(search);
    }
}
