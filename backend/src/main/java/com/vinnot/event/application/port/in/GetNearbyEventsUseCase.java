package com.vinnot.event.application.port.in;

import com.vinnot.event.application.query.model.GetNearbyEventsQuery;
import com.vinnot.event.application.query.response.EventSummaryResponse;
import com.vinnot.shared.domain.valueobject.PageResult;

public interface GetNearbyEventsUseCase {

    PageResult<EventSummaryResponse> execute(GetNearbyEventsQuery query);
}

