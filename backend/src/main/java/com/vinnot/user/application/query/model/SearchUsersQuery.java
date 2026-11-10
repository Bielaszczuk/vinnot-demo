package com.vinnot.user.application.query.model;

import com.vinnot.shared.application.util.SearchInputLimits;

public record SearchUsersQuery(String search, int page, int size) {
    public SearchUsersQuery {
        SearchInputLimits.text(search);
    }
}
