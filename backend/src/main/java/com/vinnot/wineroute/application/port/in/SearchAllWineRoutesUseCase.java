package com.vinnot.wineroute.application.port.in;

import com.vinnot.wineroute.application.query.model.SearchAllWineRoutesQuery;
import com.vinnot.wineroute.application.query.response.WineRouteSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

/**
 * Input port for searching all wine routes (admin, no status filter).
 */
public interface SearchAllWineRoutesUseCase {

    PageResult<WineRouteSummaryResponse> execute(SearchAllWineRoutesQuery query);
}

