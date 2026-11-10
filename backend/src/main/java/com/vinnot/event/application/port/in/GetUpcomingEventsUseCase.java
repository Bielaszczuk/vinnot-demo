package com.vinnot.event.application.port.in;

import com.vinnot.event.application.query.model.GetUpcomingEventsQuery;
import com.vinnot.event.application.query.response.EventSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public interface GetUpcomingEventsUseCase {

    PageResult<EventSummaryResponse> execute(GetUpcomingEventsQuery query);
}

