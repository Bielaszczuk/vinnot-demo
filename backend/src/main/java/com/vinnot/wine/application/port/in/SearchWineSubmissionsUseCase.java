package com.vinnot.wine.application.port.in;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.SearchWineSubmissionsQuery;
import com.vinnot.wine.application.query.response.WineSubmissionDetailsResponse;

public interface SearchWineSubmissionsUseCase {
    PageResult<WineSubmissionDetailsResponse> execute(SearchWineSubmissionsQuery query);
}
