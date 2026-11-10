package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.query.model.SearchWineRoutesQuery;
import com.vinnot.wineroute.application.query.response.WineRouteSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

/**
 * Input port for searching published wine routes.
 */
public interface SearchWineRoutesUseCase {

    PageResult<WineRouteSummaryResponse> execute(SearchWineRoutesQuery query);
}

