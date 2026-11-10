package com.vinnot.wine.application.query.model;

import com.vinnot.wine.domain.model.WineSubmissionStatus;
import com.vinnot.shared.application.util.SearchInputLimits;

public record SearchWineSubmissionsQuery(
        WineSubmissionStatus status, String search, int page, int size) {
    public SearchWineSubmissionsQuery {
        SearchInputLimits.text(search);
    }
}
