package com.vinnot.event.application.port.in;

import com.vinnot.event.application.query.model.SearchEventsQuery;
import com.vinnot.event.application.query.response.EventSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public interface SearchEventsUseCase {

    PageResult<EventSummaryResponse> execute(SearchEventsQuery query);
}

