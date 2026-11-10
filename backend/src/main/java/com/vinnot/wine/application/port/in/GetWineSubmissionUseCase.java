package com.vinnot.wine.application.port.in;

import com.vinnot.wine.application.query.model.GetWineSubmissionQuery;
import com.vinnot.wine.application.query.response.WineSubmissionDetailsResponse;

public interface GetWineSubmissionUseCase {
    WineSubmissionDetailsResponse execute(GetWineSubmissionQuery query);
}
