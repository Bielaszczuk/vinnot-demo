package com.vinnot.wine.application.port.in;

import com.vinnot.shared.domain.valueobject.PageResult;
import com.vinnot.wine.application.query.model.GetMyWineSubmissionsQuery;
import com.vinnot.wine.application.query.response.WineSubmissionDetailsResponse;

public interface GetMyWineSubmissionsUseCase {
    PageResult<WineSubmissionDetailsResponse> execute(GetMyWineSubmissionsQuery query);
}
